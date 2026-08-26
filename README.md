# UserNameHunter (GhostUsernameHunter)

A Node.js command-line tool that generates candidate usernames and probes a
target login/registration endpoint (via HTTP GET or POST) to determine which
ones are valid, using rotating HTTP proxies to distribute requests.

> **Use only against systems you own or are explicitly authorized to test.**
> Automated username enumeration against third-party services without
> permission may violate their terms of service and applicable law. This
> project is intended for authorized security testing and research.

## How it works

- `src/main.js` runs the main loop: it generates a random username (via
  `generateAlphaNumUsername`/`generateUsername` in `src/Utils.js`), skips it
  if already tested (tracked in `tested_usernames.txt`), sends a request to
  the configured `url`, and classifies the response as valid or invalid.
- `src/Utils.js` builds the outgoing request (`sendRequest`), picks a random
  proxy from `src/proxies.js` for each request, and optionally sends a
  logout request (`Logout`) after a valid hit.
- `src/config.js` / `src/config.json` hold the runtime settings (target URL,
  HTTP method, username length/prefix/suffix, character set, and how many
  usernames to generate). `src/config.js` is polled for changes so you can
  edit `src/config.json` while the tool is running and have it reload.
- `src/variables.js` derives the request headers and the random-part length
  from the config.
- `src/Logger.js` prints a startup banner with the current settings and logs
  valid hits (with timestamp) to `valid_usernames.txt`; invalid attempts are
  only printed to the console.
- `tested_usernames.txt` accumulates every username tried so re-runs don't
  repeat work.
- `EnterValues.js` is an interactive CLI (`npm run config` / `node
  EnterValues.js`) for editing `src/config.json` without hand-editing JSON.
- `RunTool.js` is the program's entry point; it simply imports and calls
  `run()` from `src/main.js`.

## Requirements

- [Node.js](https://nodejs.org/) 18+ (the project uses ES modules and
  top-level `import`/`export` syntax, set via `"type": "module"` in
  `package.json`).
- npm (bundled with Node.js).

## Installation

```bash
git clone https://github.com/GHOST3030/UserNameHunter.git
cd UserNameHunter
npm install axios chalk https-proxy-agent
```

> The repository's `package.json` does not currently list dependencies, so
> install them explicitly as shown above. This installs:
> - `axios` – HTTP client used to send login/probe requests
> - `chalk` – colored console output
> - `https-proxy-agent` – routes requests through an HTTP/HTTPS proxy

## Configuration

Before running the tool, configure the target and username-generation
settings. You can either edit `src/config.json` directly or use the
interactive editor.

### Option A: Interactive editor

```bash
node EnterValues.js
```

You'll be prompted for:

| Prompt | Meaning |
|---|---|
| Server URL | The endpoint to test usernames against |
| Logout URL | Optional endpoint hit after a valid username is found |
| Method | `GET` or `POST` |
| Total Username Length | Full length of generated usernames |
| Digits for Random Part | Character set used for the numeric generator |
| Username Prefix / Suffix | Fixed text added before/after the random part |
| Usernames to Generate | How many attempts to run in this session |

This writes the values to `src/config.json`.

### Option B: Edit `src/config.json` directly

```json
{
  "url": "http://example.com/login",
  "logout_url": "http://example.com/logout?erase-cookie=yes&var=callBack",
  "method": "POST",
  "length": 10,
  "digits": "0123456789",
  "prefix": "2",
  "suffix": "505",
  "count": 200000000
}
```

- `url` – target endpoint to send username-check requests to.
- `logout_url` – optional endpoint called after a valid username is found.
- `method` – `POST` or `GET`.
- `length` – total length of each generated username (prefix + random part
  + suffix).
- `digits` – character pool used by the numeric-only generator
  (`generateUsername`).
- `prefix` / `suffix` – fixed text glued to the start/end of each generated
  username.
- `count` – number of usernames to attempt in one run.

The tool detects changes to `src/config.json` while running and reloads
automatically (see the file-modified check in `src/main.js`).

### Proxies

Edit `src/proxies.js` and list the HTTP/HTTPS proxies you want requests
routed through:

```js
export const proxies = [
  'http://192.168.1.100:8080',
  'http://192.168.1.101:8080',
  'http://192.168.1.102:8080'
];
```

A proxy is picked at random for every request. At least one entry is
required, or requests will fail.

### Response validation logic

`checkfromResponse` in `src/Utils.js` decides whether a username is valid:

- If the response body is a string, it's treated as **valid** unless it
  contains an `<input` tag (e.g., a login form was re-rendered).
- If the response body is JSON, it's treated as **valid** when
  `logged_in === "yes"`.

Adjust this function if your target's success/failure signal differs.

## Usage

Run the tool from the project root:

```bash
node RunTool.js
```

What happens:

1. A banner prints the current configuration (target, method, username
   format, count).
2. The tool waits for network connectivity to `url` before starting.
3. For each iteration (up to `count`), it generates a new username, skips it
   if already recorded in `tested_usernames.txt`, and sends the configured
   request through a random proxy.
4. Valid usernames are logged to `valid_usernames.txt` with a timestamp and
   printed in green; invalid ones are printed in red.
5. If `logout_url` is set, a logout request is fired after each valid hit.
6. The run stops after `count` iterations or can be interrupted with
   `Ctrl+C`.

### Output files

- `tested_usernames.txt` – every username attempted so far (prevents
  duplicate work across runs).
- `valid_usernames.txt` – usernames confirmed valid, with timestamps.

## Notes

- `RunTool.js`, `src/config.js`, `src/variables.js`, and `src/Logger.js`
  ship in an obfuscated/minified form but are functionally equivalent to
  the logic described above (confirmed by cross-referencing with
  `src/Utils.js`, which contains both obfuscated and readable versions).
- There is no test suite or linter configured in this project.
