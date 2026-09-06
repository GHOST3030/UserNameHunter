const form = document.getElementById('config-form');
const statusBadge = document.getElementById('status-badge');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const configMsg = document.getElementById('config-msg');
const logBox = document.getElementById('log-box');
const resultsList = document.getElementById('results-list');
const resultsCount = document.getElementById('results-count');

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
        method: 'POST',
        length: Number(data.get('length')),
        digits: data.get('digits').trim() || '0123456789',
        prefix: data.get('prefix').trim(),
        suffix: data.get('suffix').trim(),
        count: Number(data.get('count'))
    };
    return { config };
}

function fillForm({ config }) {
    form.url.value = config.url || '';
    form.logout_url.value = config.logout_url || '';
    form.length.value = config.length ?? '';
    form.digits.value = config.digits || '0123456789';
    form.prefix.value = config.prefix || '';
    form.suffix.value = config.suffix || '';
    form.count.value = config.count ?? '';
}

async function loadConfig() {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (res.ok) fillForm(data);
}

function parseResultLine(line) {
    const [user, timePart] = line.split(' - Time: ');
    return { user: user.trim(), time: (timePart || '').trim() };
}

async function loadResults() {
    const res = await fetch('/api/results');
    const data = await res.json();
    const results = data.results || [];
    resultsCount.textContent = results.length;
    resultsList.innerHTML = '';
    for (const line of results) {
        const { user, time } = parseResultLine(line);
        const li = document.createElement('li');
        li.className = 'card';
        li.innerHTML = `
            <span class="card-user"></span>
            <span class="card-time"></span>
            <button type="button" class="copy-btn">📋 نسخ</button>
        `;
        li.querySelector('.card-user').textContent = user;
        li.querySelector('.card-time').textContent = time;
        li.querySelector('.copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(user);
        });
        li.addEventListener('click', () => {
            const cardUsernameInput = document.querySelector('#card-form [name="cardUsername"]');
            if (cardUsernameInput) cardUsernameInput.value = user;
        });
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

const cardForm = document.getElementById('card-form');
const cardStatusBtn = document.getElementById('card-status-btn');
const cardUpdateBtn = document.getElementById('card-update-btn');
const cardMsg = document.getElementById('card-msg');
const cardDetails = document.getElementById('card-details');

function formatBytes(bytes) {
    if (bytes === null || bytes === undefined) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i++;
    }
    return `${value.toFixed(1)} ${units[i]}`;
}

function renderCardDetails(details) {
    cardDetails.hidden = false;
    document.getElementById('card-time-left').textContent = details.sessionTimeLeft || '-';
    document.getElementById('card-uptime').textContent = details.uptime || '-';
    document.getElementById('card-remaining').textContent = formatBytes(details.remainBytesTotal);
    document.getElementById('card-traffic').textContent =
        `⬆ ${formatBytes(details.bytesIn)} / ⬇ ${formatBytes(details.bytesOut)}`;
    document.getElementById('card-current-speed').textContent = details.speed || '-';
}

async function fetchCardStatus() {
    const username = cardForm.cardUsername.value.trim();
    if (!username) return;

    cardMsg.textContent = '⏳ جاري الجلب...';
    const res = await fetch('/api/card/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });
    const data = await res.json();

    if (!res.ok) {
        cardMsg.textContent = `❌ ${data.error}`;
        return;
    }
    cardMsg.textContent = '✅ تم الجلب';
    renderCardDetails(data.details);
}

async function updateCardRequest() {
    const username = cardForm.cardUsername.value.trim();
    const speed = cardForm.cardSpeed.value;
    const updatesEnabled = cardForm.cardUpdates.value === '1';
    if (!username) return;

    cardMsg.textContent = '⏳ جاري التحديث...';
    const res = await fetch('/api/card/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, speed, updatesEnabled })
    });
    const data = await res.json();

    if (!res.ok) {
        cardMsg.textContent = `❌ ${data.error}`;
        return;
    }
    cardMsg.textContent = '✅ تم تحديث الكرت';
    renderCardDetails(data.details);
}

cardStatusBtn.addEventListener('click', fetchCardStatus);
cardUpdateBtn.addEventListener('click', updateCardRequest);

const stream = new EventSource('/api/stream');
stream.addEventListener('status', (e) => {
    const data = JSON.parse(e.data);
    setRunning(data.running);
    if (!data.running) loadResults();
});
stream.addEventListener('log', (e) => {
    const data = JSON.parse(e.data);
    appendLog(data.line);
    if (data.line.includes('صحيح')) loadResults();
});

loadConfig();
loadResults();
