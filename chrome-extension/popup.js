/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-vars */
const DEFAULT_API_URL = 'https://croxync.vercel.app';

let apiUrl = DEFAULT_API_URL;
let userCode = '';
let allClips = [];
let activeCategory = 'all';
let copiedId = null;
let copiedTimeout = null;

async function init() {
  const result = await chrome.storage.sync.get(['croxyncApiUrl', 'croxyncCode', 'autoSave', 'autoPasteUrl']);
  apiUrl = result.croxyncApiUrl || DEFAULT_API_URL;
  userCode = result.croxyncCode || '';

  document.getElementById('api-url').value = apiUrl;

  if (userCode) {
    showMainSection();
    fetchClips();
  } else {
    showSetupSection();
  }

  document.getElementById('generate-btn').addEventListener('click', generateNewCode);
  document.getElementById('save-settings').addEventListener('click', saveSettings);
  document.getElementById('qr-done-btn').addEventListener('click', showMainSectionThenFetch);
  document.getElementById('settings-btn').addEventListener('click', showSettings);
  document.getElementById('settings-close').addEventListener('click', hideSettings);
  document.getElementById('change-code').addEventListener('click', showSetupSection);
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('refresh-btn').addEventListener('click', () => fetchClips());
  document.getElementById('save-url').addEventListener('click', saveCurrentUrl);
  document.getElementById('paste-submit').addEventListener('click', onPasteSubmit);
  document.getElementById('paste-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onPasteSubmit();
  });

  // QR mini opens dashboard in new tab
  document.getElementById('qr-mini').addEventListener('click', () => {
    chrome.tabs.create({ url: `${apiUrl}/dashboard?code=${userCode}` });
  });

  document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.getAttribute('data-cat');
      renderClips();
      if (activeCategory !== 'all') {
        document.getElementById('paste-category').value = activeCategory;
      }
    });
  });

  const autoSaveToggle = document.getElementById('auto-save');
  autoSaveToggle.checked = result.autoSave === true;
  autoSaveToggle.addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ autoSave: e.target.checked });
  });

  const autoPasteUrlToggle = document.getElementById('auto-paste-url');
  autoPasteUrlToggle.checked = result.autoPasteUrl !== false;
  autoPasteUrlToggle.addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ autoPasteUrl: e.target.checked });
  });

  // Read clipboard on open and pre-fill if it contains a URL
  try {
    const clipText = await navigator.clipboard.readText();
    if (clipText && isUrl(clipText.trim())) {
      document.getElementById('paste-input').value = clipText.trim();
      document.getElementById('paste-category').value = 'links';
    }
  } catch (e) {
    // Clipboard read may fail — that's fine
  }
}

function showSetupSection() {
  document.getElementById('setup-section').classList.remove('hidden');
  document.getElementById('main-section').classList.add('hidden');
  document.getElementById('qr-section').classList.add('hidden');
  document.getElementById('settings-overlay').classList.add('hidden');
  document.getElementById('user-code').value = userCode;
  clearStatus('setup-status');
}

function showMainSection() {
  document.getElementById('setup-section').classList.add('hidden');
  document.getElementById('main-section').classList.remove('hidden');
  document.getElementById('qr-section').classList.add('hidden');
  document.getElementById('settings-overlay').classList.add('hidden');
  document.getElementById('display-code').textContent = userCode;
  document.getElementById('display-code-main').textContent = userCode;
  document.getElementById('qr-mini').src = `${apiUrl}/api/qr?code=${encodeURIComponent(userCode)}`;
  const indicator = document.getElementById('status-indicator');
  indicator.className = 'badge connected';
  indicator.title = 'Connected';
}

function showMainSectionThenFetch() {
  showMainSection();
  fetchClips();
}

function showSettings() {
  document.getElementById('settings-overlay').classList.remove('hidden');
}

function hideSettings() {
  document.getElementById('settings-overlay').classList.add('hidden');
}

function showQrSection(code) {
  document.getElementById('setup-section').classList.add('hidden');
  document.getElementById('main-section').classList.add('hidden');
  document.getElementById('qr-section').classList.remove('hidden');
  document.getElementById('settings-overlay').classList.add('hidden');
  document.getElementById('qr-code-text').textContent = code;
  document.getElementById('qr-image').src = `${apiUrl}/api/qr?code=${encodeURIComponent(code)}`;
}

function logout() {
  chrome.storage.sync.remove(['croxyncCode', 'croxyncApiUrl']);
  userCode = '';
  showSetupSection();
}

async function fetchClips() {
  if (!userCode) return;
  try {
    const res = await fetch(`${apiUrl}/api/clips?code=${userCode}`);
    const data = await res.json();
    if (data.clips) {
      allClips = data.clips;
      renderClips();
    }
  } catch (err) {
    console.error('Failed to fetch clips:', err);
  }
}

function renderClips() {
  const container = document.getElementById('clips-list');
  const filtered = activeCategory === 'all'
    ? allClips
    : allClips.filter(c => (c.category || 'general') === activeCategory);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="clips-empty">${allClips.length === 0 ? 'No clips yet. Select text on any page or paste below.' : 'No clips in this category'}</div>`;
    return;
  }

  container.innerHTML = filtered.map(clip => {
    const isLink = clip.type === 'url' || isUrl(clip.content);
    const cat = clip.category || 'general';
    const isCode = cat === 'code';
    const catLabel = { links: 'Link', code: 'Code', notes: 'Note', lists: 'List', general: 'Other' }[cat] || 'Other';
    const contentClass = isLink ? 'is-url' : isCode ? 'is-code' : '';
    const itemClass = `clip-item${isLink ? ' is-link' : ''}${isCode ? ' is-code' : ''}`;
    const titleHtml = clip.title ? `<div class="clip-title">${escapeHtml(clip.title.slice(0, 80))}</div>` : '';
    const displayContent = clip.content.length > 120 ? clip.content.slice(0, 120) + '...' : clip.content;
    const timeAgo = formatTimeAgo(clip.createdAt);
    const copiedSvg = copiedId === clip.id
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

    return `
      <div class="${itemClass}" data-id="${clip.id}">
        <div class="clip-item-header">
          <div class="clip-item-meta">
            <span class="clip-cat-badge cat-${cat}">${catLabel}</span>
            <span class="clip-time">${timeAgo}</span>
          </div>
          <div class="clip-item-actions">
            <button class="clip-action-btn" title="Copy" data-action="copy" data-content="${escapeAttr(clip.content)}" data-id="${clip.id}">
              ${copiedSvg}
            </button>
            <button class="clip-action-btn delete" title="Delete" data-action="delete" data-id="${clip.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
        ${titleHtml}
        <div class="clip-content ${contentClass}" data-action="copy" data-content="${escapeAttr(clip.content)}" data-id="${clip.id}">
          ${isLink ? `<a href="${escapeAttr(clip.content)}" target="_blank" style="color:inherit;text-decoration:none">${escapeHtml(displayContent)}</a>` : escapeHtml(displayContent)}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-action="copy"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      copyText(el.getAttribute('data-content'), el.getAttribute('data-id'));
    });
  });

  container.querySelectorAll('[data-action="delete"]').forEach(el => {
    el.addEventListener('click', () => {
      deleteClip(el.getAttribute('data-id'));
    });
  });
}

async function copyText(content, id) {
  try {
    await navigator.clipboard.writeText(content);
    copiedId = id;
    clearTimeout(copiedTimeout);
    renderClips();
    copiedTimeout = setTimeout(() => { copiedId = null; renderClips(); }, 1500);
  } catch {
    showStatus('Cannot copy', 'error');
  }
}

async function deleteClip(id) {
  try {
    await fetch(`${apiUrl}/api/clips/${id}`, { method: 'DELETE' });
    allClips = allClips.filter(c => c.id !== id);
    renderClips();
  } catch (err) {
    showStatus('Delete failed', 'error');
  }
}

function formatTimeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function generateNewCode() {
  clearStatus('setup-status');
  const btn = document.getElementById('generate-btn');
  btn.disabled = true;
  btn.textContent = 'Generating...';
  try {
    const res = await fetch(`${apiUrl}/api/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const data = await res.json();
    if (!res.ok || !data.user) { showSetupStatus('Failed to generate code', 'error'); return; }
    userCode = data.user.code;
    await chrome.storage.sync.set({ croxyncApiUrl: apiUrl, croxyncCode: userCode });
    showQrSection(userCode);
  } catch (err) {
    showSetupStatus(`Cannot reach ${apiUrl}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Generate New Code';
  }
}

async function saveSettings() {
  const urlInput = document.getElementById('api-url').value.trim() || DEFAULT_API_URL;
  const codeInput = document.getElementById('user-code').value.trim().toUpperCase();
  if (!codeInput) { showSetupStatus('Enter your sync code', 'error'); return; }
  showSetupStatus('Connecting...', 'success');
  const testUrl = urlInput.replace(/\/$/, '');
  try {
    const res = await fetch(`${testUrl}/api/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: codeInput }) });
    const data = await res.json();
    if (!res.ok || !data.user) { showSetupStatus(data.error || 'Invalid code', 'error'); return; }
    apiUrl = testUrl;
    userCode = data.user.code;
    await chrome.storage.sync.set({ croxyncApiUrl: apiUrl, croxyncCode: userCode });
    showMainSection();
    fetchClips();
  } catch (err) {
    showSetupStatus(`Cannot reach ${testUrl}`, 'error');
  }
}

async function onPasteSubmit() {
  const input = document.getElementById('paste-input');
  const catSelect = document.getElementById('paste-category');
  const text = input.value.trim();
  if (!text) { showStatus('Paste something first', 'error'); return; }
  const isLink = isUrl(text);
  const category = catSelect.value;
  await sendClip({ content: text, type: isLink ? 'url' : 'text', category: category, title: null, source: null });
  input.value = '';
  fetchClips();
}

async function saveCurrentUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  await sendClip({ content: tab.url, type: 'url', category: 'links', title: tab.title || tab.url, source: tab.url });
  fetchClips();
}

async function sendClip(data) {
  if (!userCode) { showStatus('Set up your code first', 'error'); showSetupSection(); return; }
  try {
    const res = await fetch(`${apiUrl}/api/clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: userCode, content: data.content, type: data.type, category: data.category, title: data.title, source: data.source }),
    });
    const responseData = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 404) throw new Error(responseData.error || 'Code not found');
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
  if (type === 'success') {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'statusPop 0.3s ease-out';
  }
  setTimeout(() => { el.textContent = ''; el.className = 'status'; el.style.animation = ''; }, 3000);
}

function showSetupStatus(msg, type) {
  const el = document.getElementById('setup-status');
  el.textContent = msg;
  el.className = 'status ' + type;
}

function clearStatus(id) {
  const el = document.getElementById(id);
  if (el) { el.textContent = ''; el.className = 'status'; }
}

function isUrl(text) {
  try { new URL(text); return true; } catch { return false; }
}

document.addEventListener('DOMContentLoaded', init);
