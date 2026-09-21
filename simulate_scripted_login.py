#!/usr/bin/env python3
"""Generate a synthetic access-log file that mimics an automated
login/enumeration script, for testing login_abuse_monitor.py's detection
locally - no real requests are sent anywhere.

Usage:
    python3 simulate_scripted_login.py --out test_attack.csv
    python3 login_abuse_monitor.py --log test_attack.csv --csv \
        --window 120 --request-threshold 10 --username-threshold 5
"""

import argparse
import csv
import random
import string
from datetime import datetime, timedelta

SCRIPT_UA = (
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/91.0.4472.77 Mobile Safari/537.36"
)


def generate_username(prefix, suffix, length):
    chars = string.ascii_lowercase + string.digits
    return prefix + "".join(random.choice(chars) for _ in range(length)) + suffix


def build_rows(attempts, ip, prefix, suffix, length, interval_seconds, csv_format):
    rows = []
    now = datetime.now()
    for i in range(attempts):
        username = generate_username(prefix, suffix, length)
        is_last = i == attempts - 1
        status = 200 if is_last else 404
        timestamp = now + timedelta(seconds=i * interval_seconds)

        if csv_format:
            rows.append([timestamp.isoformat(), ip, username, status])
        else:
            log_time = timestamp.strftime("%d/%b/%Y:%H:%M:%S +0000")
            rows.append(
                f'{ip} - - [{log_time}] "POST /login?username={username} HTTP/1.1" '
                f'{status} 512 "-" "{SCRIPT_UA}"'
            )
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="test_attack.csv", help="Output log file path")
    parser.add_argument("--csv", action="store_true", help="Write CSV format instead of combined log format")
    parser.add_argument("--attempts", type=int, default=15, help="Number of enumeration attempts before the hit")
    parser.add_argument("--ip", default="203.0.113.5", help="Source IP to simulate")
    parser.add_argument("--prefix", default="2")
    parser.add_argument("--suffix", default="505")
    parser.add_argument("--length", type=int, default=8, help="Length of the random part of each username")
    parser.add_argument("--interval", type=float, default=0.5, help="Seconds between each simulated request")
    args = parser.parse_args()

    rows = build_rows(
        attempts=args.attempts,
        ip=args.ip,
        prefix=args.prefix,
        suffix=args.suffix,
        length=args.length,
        interval_seconds=args.interval,
        csv_format=args.csv,
    )

    with open(args.out, "w", newline="", encoding="utf-8") as f:
        if args.csv:
            csv.writer(f).writerows(rows)
        else:
            f.write("\n".join(rows) + "\n")

    print(f"Wrote {len(rows)} simulated lines to {args.out} ({'CSV' if args.csv else 'combined log'} format).")
    print("Feed it to the monitor with, e.g.:")
    if args.csv:
        print(f"  python3 login_abuse_monitor.py --log {args.out} --csv "
              f"--window 60 --request-threshold {max(5, args.attempts // 2)} --username-threshold 5")
    else:
        print(f"  python3 login_abuse_monitor.py --log {args.out} "
              f"--window 60 --request-threshold {max(5, args.attempts // 2)} --username-threshold 5")


if __name__ == "__main__":
    main()
