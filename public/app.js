const form = document.getElementById('config-form');
const statusBadge = document.getElementById('status-badge');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const configMsg = document.getElementById('config-msg');
const logBox = document.getElementById('log-box');
const resultsList = document.getElementById('results-list');

function setRunning(running) {
    statusBadge.textContent = running ? 'شغّال' : 'متوقف';
    statusBadge.className = 'badge ' + (running ? 'running' : 'idle');
    startBtn.disabled = running;
    stopBtn.disabled = !running;
}

function appendLog(line) {
    logBox.textContent += line + '\n';
    logBox.scrollTop = logBox.scrollHeight;
}

function readForm() {
    const data = new FormData(form);
    const config = {
        url: data.get('url').trim(),
        logout_url: data.get('logout_url').trim(),
        method: data.get('method'),
        length: Number(data.get('length')),
        digits: data.get('digits').trim() || '0123456789',
        prefix: data.get('prefix').trim(),
        suffix: data.get('suffix').trim(),
        count: Number(data.get('count'))
    };
    const proxies = data.get('proxies')
        .split('\n')
        .map(p => p.trim())
        .filter(Boolean);
    return { config, proxies };
}

function fillForm({ config, proxies }) {
    form.url.value = config.url || '';
    form.logout_url.value = config.logout_url || '';
    form.method.value = config.method || 'POST';
    form.length.value = config.length ?? '';
    form.digits.value = config.digits || '0123456789';
    form.prefix.value = config.prefix || '';
    form.suffix.value = config.suffix || '';
    form.count.value = config.count ?? '';
    form.proxies.value = (proxies || []).join('\n');
}

async function loadConfig() {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (res.ok) fillForm(data);
}

async function loadResults() {
    const res = await fetch('/api/results');
    const data = await res.json();
    resultsList.innerHTML = '';
    for (const line of data.results || []) {
        const li = document.createElement('li');
        li.textContent = line;
        resultsList.appendChild(li);
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = readForm();
    const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    configMsg.textContent = res.ok ? '✅ تم الحفظ' : `❌ ${data.error}`;
});

startBtn.addEventListener('click', async () => {
    const res = await fetch('/api/start', { method: 'POST' });
    if (!res.ok) {
        const data = await res.json();
        configMsg.textContent = `❌ ${data.error}`;
        return;
    }
    logBox.textContent = '';
});

stopBtn.addEventListener('click', async () => {
    await fetch('/api/stop', { method: 'POST' });
});

const stream = new EventSource('/api/stream');
stream.addEventListener('status', (e) => {
    const data = JSON.parse(e.data);
    setRunning(data.running);
    if (!data.running) loadResults();
});
stream.addEventListener('log', (e) => {
    const data = JSON.parse(e.data);
    appendLog(data.line);
    if (data.line.includes('MATCH')) loadResults();
});

loadConfig();
loadResults();
