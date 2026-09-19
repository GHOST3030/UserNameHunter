#!/usr/bin/env python3
"""Python port of EnterValues.js - interactive config.json editor."""

import json
import os

from colorama import Fore, init as colorama_init

colorama_init(autoreset=True)

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "src", "config.json")


def prompt(question):
    return input(Fore.CYAN + question)


def edit_config():
    os.system("cls" if os.name == "nt" else "clear")
    print(Fore.YELLOW + "=== GhostUsernameHunterPY - Config Editor ===\n")

    config = {}
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            config = json.load(f)
    else:
        print(Fore.RED + "No config.json file found. Creating a new one.\n")

    config["url"] = prompt(f"Server URL [{config.get('url', '')}]: ") or config.get("url", "")
    config["logout_url"] = prompt(f"Logout URL [{config.get('logout_url', '')}]: ") or config.get("logout_url", "")
    config["method"] = (prompt(f"Method (GET or POST) [{config.get('method', 'POST')}]: ").upper()
                         or config.get("method", "POST"))

    length_input = prompt(f"Total Username Length [{config.get('length', 8)}]: ")
    try:
        config["length"] = int(length_input)
    except ValueError:
        config["length"] = config.get("length", 8)

    config["digits"] = prompt(f"Digits for Random Part [{config.get('digits', '0123456789')}]: ") or config.get("digits", "0123456789")
    config["prefix"] = prompt(f"Username Prefix [{config.get('prefix', '')}]: ") or ""
    config["suffix"] = prompt(f"Username Suffix [{config.get('suffix', '')}]: ") or ""

    count_input = prompt(f"Usernames to Generate [{config.get('count', 50)}]: ")
    try:
        config["count"] = int(count_input)
    except ValueError:
        config["count"] = config.get("count", 50)

    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    print(Fore.GREEN + "\nConfiguration updated successfully!\n")


if __name__ == "__main__":
    edit_config()
