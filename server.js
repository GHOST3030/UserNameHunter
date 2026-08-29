import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, 'src', 'config.json');
const PROXIES_PATH = path.join(__dirname, 'src', 'proxies.js');
const VALID_PATH = path.join(__dirname, 'valid_usernames.txt');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let child = null;
const clients = new Set();

function stripAnsi(text) {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
}

function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) {
        res.write(payload);
    }
}

app.get('/api/config', (req, res) => {
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        const proxiesSrc = fs.readFileSync(PROXIES_PATH, 'utf-8');
        const proxies = [...proxiesSrc.matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
        res.json({ config, proxies });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/config', (req, res) => {
    try {
        const { config, proxies } = req.body;

        const required = ['url', 'method', 'length', 'digits', 'count'];
        for (const key of required) {
            if (config[key] === undefined || config[key] === null || config[key] === '') {
                return res.status(400).json({ error: `Missing field: ${key}` });
            }
        }
        for (const key of ['prefix', 'suffix', 'logout_url']) {
            if (config[key] === undefined || config[key] === null) {
                return res.status(400).json({ error: `Missing field: ${key}` });
            }
        }

        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');

        if (Array.isArray(proxies)) {
            const list = proxies
                .map(p => String(p).trim())
                .filter(Boolean)
                .map(p => `  ${JSON.stringify(p)}`)
                .join(',\n');
            const proxiesSrc = `export const proxies = [\n${list}\n];\n`;
            fs.writeFileSync(PROXIES_PATH, proxiesSrc, 'utf-8');
        }

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/start', (req, res) => {
    if (child) {
        return res.status(409).json({ error: 'Already running' });
    }

    child = spawn(process.execPath, ['RunTool.js'], { cwd: __dirname });
    broadcast('status', { running: true });

    child.stdout.on('data', (chunk) => {
        const text = stripAnsi(chunk.toString());
        for (const line of text.split('\n')) {
            if (line.trim()) broadcast('log', { line });
        }
    });
    child.stderr.on('data', (chunk) => {
        const text = stripAnsi(chunk.toString());
        for (const line of text.split('\n')) {
            if (line.trim()) broadcast('log', { line: `[stderr] ${line}` });
        }
    });
    child.on('exit', (code) => {
        broadcast('status', { running: false, code });
        child = null;
    });

    res.json({ ok: true });
});

app.post('/api/stop', (req, res) => {
    if (!child) {
        return res.status(409).json({ error: 'Not running' });
    }
    child.kill('SIGTERM');
    res.json({ ok: true });
});

app.get('/api/status', (req, res) => {
    res.json({ running: Boolean(child) });
});

app.get('/api/results', (req, res) => {
    try {
        if (!fs.existsSync(VALID_PATH)) {
            return res.json({ results: [] });
        }
        const results = fs.readFileSync(VALID_PATH, 'utf-8')
            .split(/\r?\n/)
            .filter(Boolean)
            .reverse();
        res.json({ results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
    });
    res.write(`event: status\ndata: ${JSON.stringify({ running: Boolean(child) })}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`UserNameHunter web UI running at http://localhost:${PORT}`);
});
