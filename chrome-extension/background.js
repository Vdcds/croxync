const DEFAULT_API_URL = 'http://localhost:3000';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'croxync-save-selection',
    title: 'Save to Croxync',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'croxync-save-link',
    title: 'Save Link to Croxync',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'croxync-save-page',
    title: 'Save Page URL to Croxync',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { croxyncApiUrl, croxyncCode } = await chrome.storage.sync.get([
    'croxyncApiUrl',
    'croxyncCode',
  ]);

  const apiUrl = (croxyncApiUrl || DEFAULT_API_URL).replace(/\/$/, '');
  const code = croxyncCode;

  if (!code) {
    chrome.action.openPopup();
    return;
  }

  let data;

  if (info.menuItemId === 'croxync-save-selection' && info.selectionText) {
    data = {
      content: info.selectionText.trim(),
      type: isUrl(info.selectionText.trim()) ? 'url' : 'text',
      category: isUrl(info.selectionText.trim()) ? 'links' : 'general',
      title: tab?.title || null,
      source: tab?.url || null,
    };
  } else if (info.menuItemId === 'croxync-save-link' && info.linkUrl) {
    data = {
      content: info.linkUrl,
      type: 'url',
      category: 'links',
      title: tab?.title || null,
      source: tab?.url || null,
    };
  } else if (info.menuItemId === 'croxync-save-page' && tab?.url) {
    data = {
      content: tab.url,
      type: 'url',
      category: 'links',
      title: tab.title || tab.url,
      source: tab.url,
    };
  }

  if (data) {
    const result = await sendClip(apiUrl, code, data);
    if (result.success) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Croxync',
        message: 'Clip saved!',
      });
    }
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_CLIP') {
    handleSaveFromContent(message.data, sender.tab)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async response
  }

  if (message.type === 'CLIPBOARD_COPY') {
    handleClipboardCopy(message.data, sender.tab)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false }));
    return true;
  }
});

async function handleSaveFromContent(data, tab) {
  const { croxyncApiUrl, croxyncCode } = await chrome.storage.sync.get([
    'croxyncApiUrl',
    'croxyncCode',
  ]);

  if (!croxyncCode) {
    return { success: false, error: 'Not set up — open the extension popup and enter your code' };
  }

  const apiUrl = (croxyncApiUrl || DEFAULT_API_URL).replace(/\/$/, '');

  const result = await sendClip(apiUrl, croxyncCode, {
    content: data.content,
    type: data.type || (isUrl(data.content) ? 'url' : 'text'),
    category: data.category || (isUrl(data.content) ? 'links' : 'general'),
    title: data.title || tab?.title || null,
    source: data.source || tab?.url || null,
  });

  if (result.success) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Croxync',
      message: 'Clip synced!',
    });
  }

  return result;
}

async function handleClipboardCopy(content, tab) {
  const { croxyncApiUrl, croxyncCode, autoSave } = await chrome.storage.sync.get([
    'croxyncApiUrl',
    'croxyncCode',
    'autoSave',
  ]);

  if (!croxyncCode || autoSave === false) return { success: false };

  const apiUrl = (croxyncApiUrl || DEFAULT_API_URL).replace(/\/$/, '');

  const result = await sendClip(apiUrl, croxyncCode, {
    content: content.trim(),
    type: isUrl(content.trim()) ? 'url' : 'text',
    category: isUrl(content.trim()) ? 'links' : 'general',
    title: tab?.title || null,
    source: tab?.url || null,
  });

  if (result.success) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Croxync',
      message: 'Auto-saved from copy',
    });
  }

  return result;
}

async function sendClip(apiUrl, code, data) {
  try {
    const res = await fetch(`${apiUrl}/api/clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        content: data.content,
        type: data.type,
        category: data.category || (data.type === 'url' ? 'links' : 'general'),
        title: data.title,
        source: data.source,
      }),
    });

    const responseData = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 404) {
        return { success: false, error: 'Code not found — check your sync code' };
      }
      return { success: false, error: responseData.error || `Server error: ${res.status}` };
    }

    return { success: true, clip: responseData.clip };
  } catch (err) {
    return { success: false, error: `Cannot reach server at ${apiUrl}` };
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