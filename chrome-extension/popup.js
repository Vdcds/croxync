const DEFAULT_API_URL = 'http://localhost:3000';

let apiUrl = DEFAULT_API_URL;
let userCode = '';

async function init() {
  const result = await chrome.storage.sync.get(['croxyncApiUrl', 'croxyncCode', 'autoSave']);
  apiUrl = result.croxyncApiUrl || DEFAULT_API_URL;
  userCode = result.croxyncCode || '';

  document.getElementById('api-url').value = apiUrl;

  if (userCode) {
    showMainSection();
  } else {
    showSetupSection();
  }

  document.getElementById('generate-btn').addEventListener('click', generateNewCode);
  document.getElementById('save-settings').addEventListener('click', saveSettings);
  document.getElementById('show-qr').addEventListener('click', toggleInlineQr);
  document.getElementById('change-code').addEventListener('click', showSetupSection);
  document.getElementById('qr-done-btn').addEventListener('click', showMainSection);
  document.getElementById('save-url').addEventListener('click', saveCurrentUrl);
  document.getElementById('save-clipboard').addEventListener('click', saveClipboard);
  document.getElementById('paste-submit').addEventListener('click', onPasteSubmit);
  document.getElementById('paste-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onPasteSubmit();
  });

  const autoSaveToggle = document.getElementById('auto-save');
  autoSaveToggle.checked = result.autoSave !== false;
  autoSaveToggle.addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ autoSave: e.target.checked });
  });
}

function showSetupSection() {
  document.getElementById('setup-section').classList.remove('hidden');
  document.getElementById('main-section').classList.add('hidden');
  document.getElementById('qr-section').classList.add('hidden');
  document.getElementById('user-code').value = userCode;
  clearStatus('setup-status');
}

function showMainSection() {
  document.getElementById('setup-section').classList.add('hidden');
  document.getElementById('main-section').classList.remove('hidden');
  document.getElementById('qr-section').classList.add('hidden');
  document.getElementById('display-code').textContent = userCode;

  // Load inline QR
  const qrInlineImg = document.getElementById('qr-inline-image');
  qrInlineImg.src = `${apiUrl}/api/qr?code=${encodeURIComponent(userCode)}`;

  const indicator = document.getElementById('status-indicator');
  indicator.className = 'badge connected';
  indicator.title = 'Connected';
}

function showQrSection(code) {
  document.getElementById('setup-section').classList.add('hidden');
  document.getElementById('main-section').classList.add('hidden');
  document.getElementById('qr-section').classList.remove('hidden');

  document.getElementById('qr-code-text').textContent = code;
  const qrImg = document.getElementById('qr-image');
  const qrUrl = `${apiUrl}/dashboard?code=${code}`;
  qrImg.src = `${apiUrl}/api/qr?code=${encodeURIComponent(code)}`;
}

async function generateNewCode() {
  clearStatus('setup-status');
  const btn = document.getElementById('generate-btn');
  btn.disabled = true;
  btn.textContent = 'Generating...';

  try {
    const res = await fetch(`${apiUrl}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    if (!res.ok || !data.user) {
      showSetupStatus('Failed to generate code', 'error');
      return;
    }

    userCode = data.user.code;
    await chrome.storage.sync.set({
      croxyncApiUrl: apiUrl,
      croxyncCode: userCode,
    });

    showQrSection(userCode);
  } catch (err) {
    showSetupStatus(`Cannot reach ${apiUrl}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> Generate New Code`;
  }
}

async function saveSettings() {
  const urlInput = document.getElementById('api-url').value.trim() || DEFAULT_API_URL;
  const codeInput = document.getElementById('user-code').value.trim().toUpperCase();

  if (!codeInput) {
    showSetupStatus('Enter your sync code', 'error');
    return;
  }

  showSetupStatus('Connecting...', 'success');

  const testUrl = urlInput.replace(/\/$/, '');

  try {
    const res = await fetch(`${testUrl}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codeInput }),
    });

    const data = await res.json();

    if (!res.ok || !data.user) {
      showSetupStatus(data.error || 'Invalid code', 'error');
      return;
    }

    apiUrl = testUrl;
    userCode = data.user.code;

    await chrome.storage.sync.set({
      croxyncApiUrl: apiUrl,
      croxyncCode: userCode,
    });

    showMainSection();
    showStatus('Connected!', 'success');
  } catch (err) {
    showSetupStatus(`Cannot reach ${testUrl}`, 'error');
  }
}

function toggleInlineQr() {
  const el = document.getElementById('qr-inline');
  el.classList.toggle('hidden');
}

async function onPasteSubmit() {
  const input = document.getElementById('paste-input');
  const text = input.value.trim();
  if (!text) {
    showStatus('Paste something first', 'error');
    return;
  }

  await sendClip({
    content: text,
    type: isUrl(text) ? 'url' : 'text',
    category: isUrl(text) ? 'links' : 'general',
    title: null,
    source: null,
  });

  input.value = '';
}

async function saveCurrentUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  await sendClip({
    content: tab.url,
    type: 'url',
    title: tab.title || tab.url,
    source: tab.url,
  });
}

async function saveClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      showStatus('Clipboard is empty', 'error');
      return;
    }

    await sendClip({
      content: text.trim(),
      type: isUrl(text.trim()) ? 'url' : 'text',
      title: null,
      source: null,
    });
  } catch (err) {
    showStatus('Cannot read clipboard', 'error');
  }
}

async function sendClip(data) {
  if (!userCode) {
    showStatus('Set up your code first', 'error');
    showSetupSection();
    return;
  }

  try {
    const res = await fetch(`${apiUrl}/api/clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: userCode,
        content: data.content,
        type: data.type,
        title: data.title,
        source: data.source,
      }),
    });

    const responseData = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(responseData.error || 'Code not found');
      }
      throw new Error(responseData.error || `Error: ${res.status}`);
    }

    showStatus('Synced!', 'success');
  } catch (err) {
    showStatus(err.message || 'Failed to save', 'error');
  }
}

function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = 'status ' + type;
  setTimeout(() => {
    el.textContent = '';
    el.className = 'status';
  }, 3000);
}

function showSetupStatus(msg, type) {
  const el = document.getElementById('setup-status');
  el.textContent = msg;
  el.className = 'status ' + type;
}

function clearStatus(id) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = '';
    el.className = 'status';
  }
}

function isUrl(text) {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', init);