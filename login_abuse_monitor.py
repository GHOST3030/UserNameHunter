#!/usr/bin/env python3
"""Defensive login-abuse / username-enumeration monitor.

Watches an access log (Apache/Nginx "combined" format, or a simple CSV of
`timestamp,ip,username,status`) for login-endpoint requests and flags
source IPs that look like they're running an automated username-enumeration
or credential-stuffing tool: high request rate, many distinct usernames
tried in a short window, a high failure ratio, or usernames that match a
generated pattern (fixed prefix/suffix around a random alphanumeric core,
like `2xxxxxxxxx505`).

This is a detection aid, not a firewall: on each flagged IP it prints an
alert and appends the IP to `blocked_ips.txt` so it can be fed into a
firewall / WAF / fail2ban rule - it does not block traffic itself.

Usage:
    python3 login_abuse_monitor.py --log /var/log/nginx/access.log --follow
    python3 login_abuse_monitor.py --log attempts.csv --csv
"""

import argparse
import re
import sys
import time
from collections import defaultdict, deque
from datetime import datetime

from colorama import Fore, init as colorama_init

colorama_init(autoreset=True)

DEFAULT_WINDOW_SECONDS = 60
DEFAULT_REQUEST_THRESHOLD = 20       # requests/IP within the window
DEFAULT_USERNAME_THRESHOLD = 10      # distinct usernames/IP within the window
DEFAULT_FAILURE_RATIO_THRESHOLD = 0.9  # 90%+ failed attempts, with enough volume
DEFAULT_MIN_SAMPLES_FOR_RATIO = 10

BLOCKLIST_FILE = "blocked_ips.txt"

# Apache/Nginx "combined" log format:
# 1.2.3.4 - - [21/Sep/2026:12:00:00 +0000] "POST /login?username=abc123 HTTP/1.1" 200 512 "-" "UA"
COMBINED_LOG_RE = re.compile(
    r'(?P<ip>\S+)\s+\S+\s+\S+\s+\[(?P<time>[^\]]+)\]\s+'
    r'"(?P<method>\S+)\s+(?P<path>\S+)\s+\S+"\s+(?P<status>\d{3})\s+\S+'
    r'(?:\s+"[^"]*"\s+"(?P<ua>[^"]*)")?'
)

USERNAME_PARAM_RE = re.compile(r'[?&]username=([^&\s]+)')

# Matches the exact family of usernames this repo's generator produces:
# a fixed prefix/suffix wrapped around a run of random alphanumerics.
GENERATED_PATTERN_RE = re.compile(r'^\D*[a-zA-Z0-9]{6,}\D*$')


def log(msg, color=Fore.WHITE):
    stamp = datetime.now().strftime("%c")
    print(color + f"[{stamp}] {msg}")


def parse_combined_line(line):
    match = COMBINED_LOG_RE.search(line)
    if not match:
        return None

    path = match.group("path")
    username_match = USERNAME_PARAM_RE.search(path)
    if not username_match and "/login" not in path and "/logout" not in path:
        return None
    if not username_match:
        return None

    status = int(match.group("status"))
    return {
        "ip": match.group("ip"),
        "username": username_match.group(1),
        "status": status,
        "success": status < 400,
        "ua": match.group("ua") or "",
    }


def parse_csv_line(line):
    parts = [p.strip() for p in line.strip().split(",")]
    if len(parts) < 4:
        return None
    _timestamp, ip, username, status = parts[:4]
    try:
        status_code = int(status)
        success = status_code < 400
    except ValueError:
        success = status.lower() in ("valid", "success", "ok", "true")
    return {"ip": ip, "username": username, "status": status, "success": success, "ua": ""}


class IpStats:
    def __init__(self, window_seconds):
        self.window_seconds = window_seconds
        self.timestamps = deque()
        self.usernames = deque()  # (time, username)
        self.results = deque()    # (time, success bool)
        self.user_agents = set()

    def _evict(self, now):
        while self.timestamps and now - self.timestamps[0] > self.window_seconds:
            self.timestamps.popleft()
        while self.usernames and now - self.usernames[0][0] > self.window_seconds:
            self.usernames.popleft()
        while self.results and now - self.results[0][0] > self.window_seconds:
            self.results.popleft()

    def record(self, username, success, ua):
        now = time.time()
        self._evict(now)
        self.timestamps.append(now)
        self.usernames.append((now, username))
        self.results.append((now, success))
        if ua:
            self.user_agents.add(ua)

    def request_count(self):
        return len(self.timestamps)

    def distinct_usernames(self):
        return len({u for _, u in self.usernames})

    def failure_ratio(self):
        if not self.results:
            return 0.0
        failures = sum(1 for _, success in self.results if not success)
        return failures / len(self.results)

    def sample_count(self):
        return len(self.results)

    def looks_like_generated_usernames(self, min_samples=5):
        recent = [u for _, u in list(self.usernames)[-min_samples:]]
        if len(recent) < min_samples:
            return False
        return all(GENERATED_PATTERN_RE.match(u) for u in recent)


class AbuseMonitor:
    def __init__(self, window_seconds, request_threshold, username_threshold,
                 failure_ratio_threshold, min_samples_for_ratio):
        self.window_seconds = window_seconds
        self.request_threshold = request_threshold
        self.username_threshold = username_threshold
        self.failure_ratio_threshold = failure_ratio_threshold
        self.min_samples_for_ratio = min_samples_for_ratio
        self.stats = defaultdict(lambda: IpStats(window_seconds))
        self.flagged = set()

    def process(self, event):
        ip = event["ip"]
        stats = self.stats[ip]
        stats.record(event["username"], event["success"], event["ua"])
        self._evaluate(ip, stats)

    def _evaluate(self, ip, stats):
        reasons = []

        if stats.request_count() >= self.request_threshold:
            reasons.append(
                f"{stats.request_count()} requests in {self.window_seconds}s "
                f"(threshold {self.request_threshold})"
            )

        if stats.distinct_usernames() >= self.username_threshold:
            reasons.append(
                f"{stats.distinct_usernames()} distinct usernames tried in "
                f"{self.window_seconds}s (threshold {self.username_threshold})"
            )

        if (stats.sample_count() >= self.min_samples_for_ratio
                and stats.failure_ratio() >= self.failure_ratio_threshold):
            reasons.append(
                f"{stats.failure_ratio():.0%} failure rate over "
                f"{stats.sample_count()} attempts"
            )

        if stats.looks_like_generated_usernames():
            reasons.append("recent usernames match an auto-generated pattern")

        if reasons and ip not in self.flagged:
            self.flagged.add(ip)
            self._alert(ip, reasons)
        elif not reasons and ip in self.flagged:
            # Traffic died down / fell back under thresholds; allow re-alerting later.
            self.flagged.discard(ip)

    def _alert(self, ip, reasons):
        log(f"[ALERT] Suspected login enumeration from {ip}:", Fore.RED)
        for reason in reasons:
            log(f"    - {reason}", Fore.YELLOW)
        with open(BLOCKLIST_FILE, "a", encoding="utf-8") as f:
            f.write(f"{ip}\n")
        log(f"    -> appended {ip} to {BLOCKLIST_FILE}", Fore.CYAN)


def iter_lines(path, follow):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        if follow:
            f.seek(0, 2)  # start at end of file
        while True:
            line = f.readline()
            if line:
                yield line
                continue
            if not follow:
                return
            time.sleep(1)


def main():
    parser = argparse.ArgumentParser(description="Monitor a login access log for enumeration/brute-force patterns.")
    parser.add_argument("--log", required=True, help="Path to the access log to read")
    parser.add_argument("--csv", action="store_true",
                         help="Log is `timestamp,ip,username,status` CSV instead of Apache/Nginx combined format")
    parser.add_argument("--follow", action="store_true", help="Keep watching the file for new lines (like tail -f)")
    parser.add_argument("--window", type=int, default=DEFAULT_WINDOW_SECONDS, help="Sliding window in seconds")
    parser.add_argument("--request-threshold", type=int, default=DEFAULT_REQUEST_THRESHOLD)
    parser.add_argument("--username-threshold", type=int, default=DEFAULT_USERNAME_THRESHOLD)
    parser.add_argument("--failure-ratio-threshold", type=float, default=DEFAULT_FAILURE_RATIO_THRESHOLD)
    parser.add_argument("--min-samples-for-ratio", type=int, default=DEFAULT_MIN_SAMPLES_FOR_RATIO)
    args = parser.parse_args()

    monitor = AbuseMonitor(
        window_seconds=args.window,
        request_threshold=args.request_threshold,
        username_threshold=args.username_threshold,
        failure_ratio_threshold=args.failure_ratio_threshold,
        min_samples_for_ratio=args.min_samples_for_ratio,
    )

    parse_line = parse_csv_line if args.csv else parse_combined_line

    log(f"Watching {args.log} ({'CSV' if args.csv else 'combined log'} format, "
        f"window={args.window}s, follow={args.follow})", Fore.CYAN)

    try:
        for line in iter_lines(args.log, args.follow):
            event = parse_line(line)
            if event is None:
                continue
            monitor.process(event)
    except FileNotFoundError:
        log(f"Log file not found: {args.log}", Fore.RED)
        sys.exit(1)
    except KeyboardInterrupt:
        log("Stopped by user.", Fore.RED)
        sys.exit(0)


if __name__ == "__main__":
    main()
