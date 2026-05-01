const DEFAULT_API_URL = 'http://localhost:3000';

let lastAutoContent = '';

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
    'croxyncApiUrl', 'croxyncCode',
  ]);

  const apiUrl = (croxyncApiUrl || DEFAULT_API_URL).replace(/\/$/, '');
  const code = croxyncCode;

  if (!code) {
    chrome.action.openPopup();
    return;
  }

  let data;

  if (info.menuItemId === 'croxync-save-selection' && info.selectionText) {
    const content = info.selectionText.trim();
    data = {
      content: content,
      type: isUrl(content) ? 'url' : 'text',
      category: isUrl(content) ? 'links' : detectCategorySimple(content),
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_CLIP') {
    handleSaveFromContent(message.data, sender.tab)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'AUTO_SAVE_CLIP') {
    const contentKey = message.data.content?.trim();
    if (contentKey && contentKey === lastAutoContent) {
      sendResponse({ success: true, dedup: true });
      return true;
    }
    lastAutoContent = contentKey;
    setTimeout(() => { lastAutoContent = ''; }, 5000);

    handleSaveFromContent(message.data, sender.tab)
      .then(result => {
        if (result.success) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Croxync',
            message: message.data.type === 'url' ? 'Link auto-synced!' : 'Clip auto-synced!',
          });
        }
        sendResponse(result);
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
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
    category: data.category || detectCategorySimple(data.content) || (data.type === 'url' ? 'links' : 'general'),
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

function detectCategorySimple(text) {
  if (isUrl(text.trim())) return 'links';
  var lines = text.split('\n');
  var codePatterns = [/\bfunction\b/, /\bclass\b/, /\bimport\b/, /\bconst\b.*=/, /\blet\b.*=/, /\breturn\b/, /\bdef\b/, /\basync\b/, /\binterface\b/, /\btype\b.*=/, /\bconsole\./, /\bdocument\./, /\{/, /\}/, /;/];
  var matches = 0;
  for (var i = 0; i < codePatterns.length; i++) {
    if (codePatterns[i].test(text)) matches++;
  }
  if (matches >= 2) return 'code';
  var bulletCount = 0;
  var numberedCount = 0;
  for (var j = 0; j < lines.length; j++) {
    var t = lines[j].trim();
    if (/^[-*•]\s/.test(t)) bulletCount++;
    if (/^\d+[.)]\s/.test(t)) numberedCount++;
  }
  if (lines.length >= 2 && (bulletCount + numberedCount) / lines.length > 0.5) return 'lists';
  if (lines.length >= 3 || text.length > 100) return 'notes';
  return 'general';
}