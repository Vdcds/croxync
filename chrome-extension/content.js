(function () {
  'use strict';

  const CONTAINER_ID = 'croxync-floating-widget';
  let widget = null;
  let shadowRoot = null;
  let isVisible = false;
  let isExpanded = false;
  let hideTimeout = null;
  let lastSaveTime = 0;
  let currentSelection = '';
  let savedPillTimeout = null;

  function shadow() {
    return shadowRoot;
  }

  function createWidget() {
    // Wait for body to be available
    if (!document.body) {
      setTimeout(createWidget, 100);
      return;
    }
    
    if (document.getElementById(CONTAINER_ID)) {
      widget = document.getElementById(CONTAINER_ID);
      return;
    }

    widget = document.createElement('div');
    widget.id = CONTAINER_ID;
    shadowRoot = widget.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      * { margin:0; padding:0; box-sizing:border-box; }

      :host {
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      @keyframes croxync-pop-in {
        0% { opacity:0; transform:translateY(6px) scale(0.95); }
        100% { opacity:1; transform:translateY(0) scale(1); }
      }
      @keyframes croxync-pop-out {
        0% { opacity:1; transform:translateY(0) scale(1); }
        100% { opacity:0; transform:translateY(6px) scale(0.95); }
      }
      @keyframes croxync-link-flash {
        0% { opacity:1; transform:scale(1); }
        50% { opacity:0.8; transform:scale(1.05); }
        100% { opacity:1; transform:scale(1); }
      }
      @keyframes croxync-success-pulse {
        0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.5); }
        70% { box-shadow: 0 0 0 8px rgba(74,222,128,0); }
        100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
      }
      @keyframes croxync-slide-up {
        0% { opacity:0; transform:translateX(-50%) translateY(12px); }
        100% { opacity:1; transform:translateX(-50%) translateY(0); }
      }
      @keyframes croxync-sync-flash {
        0% { opacity:0; transform:translate(-50%, 0) scale(0.8); }
        20% { opacity:1; transform:translate(-50%, 0) scale(1); }
        80% { opacity:1; transform:translate(-50%, 0) scale(1); }
        100% { opacity:0; transform:translate(-50%, -8px) scale(0.95); }
      }

      .wrapper {
        position: fixed;
        z-index: 2147483647;
        pointer-events: none;
        animation: croxync-pop-in 0.18s ease-out forwards;
      }

      .wrapper.hiding {
        animation: croxync-pop-out 0.12s ease-in forwards;
      }

      .pill {
        display: flex;
        align-items: center;
        gap: 4px;
        background: linear-gradient(135deg, #0ea5e9, #6366f1);
        border-radius: 22px;
        padding: 4px 4px 4px 12px;
        box-shadow: 0 2px 12px rgba(14,165,233,0.3), 0 0 0 1px rgba(255,255,255,0.08) inset;
        cursor: default;
        pointer-events: auto;
        white-space: nowrap;
        user-select: none;
        transition: box-shadow 0.15s;
      }

      .pill:hover {
        box-shadow: 0 4px 20px rgba(14,165,233,0.4), 0 0 0 1px rgba(255,255,255,0.12) inset;
      }

      .pill-label {
        font-size: 12px;
        font-weight: 600;
        color: #fff;
        letter-spacing: 0.02em;
        cursor: pointer;
      }

      .pill-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.2);
        border: none;
        border-radius: 50%;
        width: 26px;
        height: 26px;
        cursor: pointer;
        transition: background 0.15s, transform 0.1s;
        color: #fff;
        flex-shrink: 0;
      }

      .pill-btn:hover { background: rgba(255,255,255,0.35); }
      .pill-btn:active { background: rgba(255,255,255,0.15); transform: scale(0.92); }

      .pill-btn svg { width: 14px; height: 14px; }

      .pill-btn.saved {
        background: rgba(74,222,128,0.4);
        animation: croxync-success-pulse 0.6s ease-out;
      }

      .pill.is-link .pill-label { color: #fbbf24; }
      .pill.is-link {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        box-shadow: 0 2px 12px rgba(99,102,241,0.3), 0 0 0 1px rgba(255,255,255,0.08) inset;
      }
      .pill.is-link:hover {
        box-shadow: 0 4px 20px rgba(99,102,241,0.4), 0 0 0 1px rgba(255,255,255,0.12) inset;
      }

      .pill.is-link-saved {
        background: linear-gradient(135deg, #059669, #10b981) !important;
        box-shadow: 0 0 16px rgba(16,185,129,0.5) !important;
        animation: croxync-link-flash 0.4s ease-out;
      }

      .panel {
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 16px;
        width: 320px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
        overflow: hidden;
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px 8px;
      }

      .panel-brand {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .panel-brand-icon {
        width: 22px;
        height: 22px;
        background: linear-gradient(135deg, #0ea5e9, #6366f1);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .panel-brand-icon svg { width: 13px; height: 13px; color: #fff; }
      .panel-brand-text { font-size: 14px; font-weight: 700; color: #e2e8f0; }

      .panel-type-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 10px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .panel-type-badge.url {
        background: rgba(99,102,241,0.2);
        color: #a5b4fc;
      }

      .panel-type-badge.text {
        background: rgba(14,165,233,0.2);
        color: #7dd3fc;
      }

      .panel-close {
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.15s, background 0.15s;
      }

      .panel-close:hover { color: #e2e8f0; background: #1e293b; }
      .panel-close svg { width: 16px; height: 16px; }

      .panel-preview {
        margin: 0 14px;
        padding: 10px 12px;
        background: #1e293b;
        border-radius: 8px;
        font-size: 13px;
        line-height: 1.5;
        color: #cbd5e1;
        max-height: 80px;
        overflow: hidden;
        word-break: break-word;
        position: relative;
      }

      .panel-preview.is-url {
        color: #93c5fd;
        border-left: 3px solid #6366f1;
      }

      .panel-preview.fade::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 24px;
        background: linear-gradient(transparent, #1e293b);
      }

      .panel-categories {
        padding: 8px 14px;
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .cat-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 5px 10px;
        border-radius: 16px;
        border: 1px solid #334155;
        background: #1e293b;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
      }

      .cat-btn:hover { border-color: #475569; color: #e2e8f0; background: #263349; }
      .cat-btn:active { transform: scale(0.95); }

      .cat-btn.active {
        border-color: #0ea5e9;
        background: rgba(14,165,233,0.1);
        color: #7dd3fc;
      }

      .cat-btn svg { width: 12px; height: 12px; }

      .panel-actions {
        padding: 8px 14px 14px;
        display: flex;
        gap: 6px;
      }

      .panel-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex: 1;
        padding: 9px 12px;
        border-radius: 10px;
        border: none;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }

      .panel-btn svg { width: 15px; height: 15px; }

      .panel-btn-primary {
        background: linear-gradient(135deg, #0ea5e9, #6366f1);
        color: #fff;
      }

      .panel-btn-primary:hover { filter: brightness(1.1); }
      .panel-btn-primary:active { filter: brightness(0.95); }

      .panel-btn-primary.saved {
        background: #166534;
        pointer-events: none;
      }

      .panel-btn-secondary {
        background: #1e293b;
        color: #94a3b8;
        border: 1px solid #334155;
      }

      .panel-btn-secondary:hover { color: #e2e8f0; background: #263349; }

      .panel-link-saved {
        margin: 0 14px 6px;
        padding: 8px 12px;
        border-radius: 8px;
        background: rgba(16,185,129,0.1);
        border: 1px solid rgba(16,185,129,0.3);
        color: #6ee7b7;
        font-size: 12px;
        font-weight: 600;
        display: none;
        align-items: center;
        gap: 6px;
      }

      .panel-link-saved.visible { display: flex; }
      .panel-link-saved svg { width: 14px; height: 14px; flex-shrink: 0; }

      .paste-section {
        border-top: 1px solid #1e293b;
        padding: 10px 14px 14px;
      }

      .paste-label {
        font-size: 10px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 6px;
      }

      .paste-row { display: flex; gap: 6px; }

      .paste-input {
        flex: 1;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid #334155;
        background: #1e293b;
        color: #e2e8f0;
        font-size: 13px;
        outline: none;
        transition: border-color 0.15s;
      }

      .paste-input:focus { border-color: #0ea5e9; }
      .paste-input::placeholder { color: #475569; }

      .paste-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px 12px;
        border-radius: 8px;
        border: none;
        background: linear-gradient(135deg, #0ea5e9, #6366f1);
        color: #fff;
        cursor: pointer;
        transition: filter 0.15s;
        flex-shrink: 0;
      }

      .paste-btn:hover { filter: brightness(1.1); }
      .paste-btn svg { width: 16px; height: 16px; }

      .toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(12px);
        color: #e2e8f0;
        padding: 10px 20px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        opacity: 0;
        pointer-events: none;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .toast.visible { animation: croxync-slide-up 0.2s ease-out forwards; }
      .toast.hiding { animation: croxync-pop-out 0.15s ease-in forwards; }

      .toast.success {
        background: linear-gradient(135deg, #052e16, #0f172a);
        border: 1px solid rgba(16,185,129,0.4);
      }

      .toast.success-link {
        background: linear-gradient(135deg, #1e1b4b, #0f172a);
        border: 1px solid rgba(129,140,248,0.4);
      }

      .toast.error {
        background: linear-gradient(135deg, #450a0a, #0f172a);
        border: 1px solid rgba(248,113,113,0.4);
      }

      .toast svg { width: 16px; height: 16px; flex-shrink: 0; }

      .sync-indicator {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483646;
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: 12px;
        background: rgba(16,185,129,0.12);
        border: 1px solid rgba(16,185,129,0.3);
        color: #6ee7b7;
        font-size: 13px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        backdrop-filter: blur(12px);
        animation: croxync-sync-flash 2s ease-out forwards;
      }

      .sync-indicator svg { width: 16px; height: 16px; }
    `;

    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';
    wrapper.innerHTML = `
      <div class="pill" id="croxync-pill">
        <span class="pill-label" id="croxync-pill-label">Croxync</span>
        <button class="pill-btn" id="croxync-pill-save" title="Save to phone">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <div class="panel" id="croxync-panel" style="display:none">
        <div class="panel-header">
          <div class="panel-brand">
            <div class="panel-brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
            </div>
            <span class="panel-brand-text">Save</span>
            <span class="panel-type-badge text" id="croxync-type-badge">text</span>
          </div>
          <button class="panel-close" id="croxync-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="panel-preview" id="croxync-preview"></div>
        <div class="panel-link-saved" id="croxync-link-saved">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span id="croxync-link-saved-text">Link saved!</span>
        </div>
        <div class="panel-categories" id="croxync-categories">
          <button class="cat-btn active" data-cat="links" id="croxync-cat-links">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            Links
          </button>
          <button class="cat-btn" data-cat="code" id="croxync-cat-code">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Code
          </button>
          <button class="cat-btn" data-cat="notes" id="croxync-cat-notes">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Notes
          </button>
          <button class="cat-btn" data-cat="lists" id="croxync-cat-lists">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Lists
          </button>
          <button class="cat-btn" data-cat="general" id="croxync-cat-general">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            Other
          </button>
        </div>
        <div class="panel-actions">
          <button class="panel-btn panel-btn-primary" id="croxync-save-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Save
          </button>
          <button class="panel-btn panel-btn-secondary" id="croxync-copy-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          </button>
        </div>
        <div class="paste-section">
          <div class="paste-label">Or paste something</div>
          <div class="paste-row">
            <input type="text" class="paste-input" id="croxync-paste-input" placeholder="Paste a link or text..." />
            <button class="paste-btn" id="croxync-paste-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    shadowRoot.appendChild(style);
    shadowRoot.appendChild(wrapper);
    document.body.appendChild(widget);

    shadowRoot.getElementById('croxync-pill-save').addEventListener('click', onPillSave);
    shadowRoot.getElementById('croxync-close').addEventListener('click', dismiss);
    shadowRoot.getElementById('croxync-save-btn').addEventListener('click', onPanelSave);
    shadowRoot.getElementById('croxync-copy-btn').addEventListener('click', onCopyAndSave);
    shadowRoot.getElementById('croxync-paste-btn').addEventListener('click', onPasteSubmit);
    shadowRoot.getElementById('croxync-paste-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') onPasteSubmit();
    });

    const catButtons = shadowRoot.querySelectorAll('.cat-btn');
    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        catButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Click pill label to expand panel
    const pillLabel = shadowRoot.getElementById('croxync-pill-label');
    if (pillLabel) {
      pillLabel.style.cursor = 'pointer';
      pillLabel.addEventListener('click', () => {
        const text = getSelectedText();
        if (text) {
          showPanel(text);
          positionNearSelection();
        }
      });
    }

    document.addEventListener('mousedown', onDocumentClick);
    document.addEventListener('keydown', onKeyDown);
  }

  let selectedCategory = 'links';

  function getSelectedText() {
    const sel = window.getSelection();
    return sel ? sel.toString().trim() : '';
  }

  function ensureWidget() {
    if (!widget || !document.getElementById(CONTAINER_ID)) {
      createWidget();
    }
  }

  function positionNearSelection() {
    const s = shadow();
    if (!s) return;
    const wrapper = s.querySelector('.wrapper');
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.toString().trim()) {
      hideWidget();
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (!isExpanded) {
      let top = rect.top + window.scrollY - 44;
      let left = rect.left + window.scrollX + rect.width / 2;
      if (top < 8) top = rect.bottom + window.scrollY + 10;
      left = Math.max(80, Math.min(left, window.innerWidth - 80));
      wrapper.style.top = top + 'px';
      wrapper.style.left = left + 'px';
      wrapper.style.transform = `translateX(-50%)`;
    }

    if (!isVisible) {
      isVisible = true;
      wrapper.classList.remove('hiding');
      requestAnimationFrame(() => {
        wrapper.style.animation = 'croxync-pop-in 0.18s ease-out forwards';
      });
    }
  }

  function showPill(text) {
    const s = shadow();
    if (!s) return;
    isExpanded = false;
    s.getElementById('croxync-panel').style.display = 'none';
    s.getElementById('croxync-pill').style.display = 'flex';

    const isLink = isUrl(text);
    const pill = s.getElementById('croxync-pill');
    const label = s.getElementById('croxync-pill-label');
    const saveBtn = s.getElementById('croxync-pill-save');

    pill.classList.toggle('is-link', isLink);
    pill.classList.remove('is-link-saved');
    label.textContent = isLink ? 'Link' : 'Croxync';

    saveBtn.classList.remove('saved');
    saveBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`;

    selectedCategory = typeof detectCategory === 'function' ? detectCategory(text, isLink ? 'url' : 'text') : (isLink ? 'links' : 'general');
    const catBtns = s.querySelectorAll('.cat-btn');
    catBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-cat') === selectedCategory);
    });
  }

  function showPanel(selectedText) {
    const s = shadow();
    if (!s) return;
    isExpanded = true;

    s.getElementById('croxync-pill').style.display = 'none';
    s.getElementById('croxync-panel').style.display = 'block';

    const isLink = isUrl(selectedText);
    const badge = s.getElementById('croxync-type-badge');
    badge.textContent = isLink ? 'link' : 'text';
    badge.className = 'panel-type-badge ' + (isLink ? 'url' : 'text');

    const preview = s.getElementById('croxync-preview');
    const truncated = selectedText.length > 200 ? selectedText.slice(0, 200) + '...' : selectedText;
    preview.textContent = truncated;
    preview.classList.toggle('fade', selectedText.length > 200);
    preview.classList.toggle('is-url', isLink);

    selectedCategory = typeof detectCategory === 'function' ? detectCategory(selectedText, isLink ? 'url' : 'text') : (isLink ? 'links' : 'general');
    const catBtns = s.querySelectorAll('.cat-btn');
    catBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-cat') === selectedCategory);
    });

    const saveBtn = s.getElementById('croxync-save-btn');
    saveBtn.classList.remove('saved');
    saveBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
      Save
    `;

    s.getElementById('croxync-link-saved').classList.remove('visible');
    s.getElementById('croxync-paste-input').value = '';

    positionPanel();
  }

  function positionPanel() {
    const s = shadow();
    if (!s) return;
    const wrapper = s.querySelector('.wrapper');
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      let top = rect.bottom + window.scrollY + 10;
      let left = rect.left + window.scrollX + rect.width / 2;
      left = Math.max(160, Math.min(left, window.innerWidth - 160));
      wrapper.style.top = top + 'px';
      wrapper.style.left = left + 'px';
      wrapper.style.transform = 'translateX(-50%)';
    }
  }

  function hideWidget() {
    const s = shadow();
    if (!s) return;
    const wrapper = s.querySelector('.wrapper');
    wrapper.classList.add('hiding');
    setTimeout(() => {
      if (!isVisible && s) {
        s.getElementById('croxync-pill').style.display = 'flex';
        s.getElementById('croxync-panel').style.display = 'none';
      }
    }, 120);
    isVisible = false;
    isExpanded = false;
  }

  function dismiss() {
    window.getSelection().removeAllRanges();
    hideWidget();
  }

  function getActiveCategory() {
    const s = shadow();
    if (!s) return 'general';
    const active = s.querySelector('.cat-btn.active');
    return active ? active.getAttribute('data-cat') : 'general';
  }

  function showToast(msg, type, isLink) {
    const s = shadow();
    if (!s) return;

    let toast = s.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      s.appendChild(toast);
    }

    let icon = '';
    if (type === 'success') {
      if (isLink) {
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
        type = 'success-link';
      } else {
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      }
    } else {
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    }

    toast.innerHTML = icon + msg;
    toast.className = 'toast ' + type;

    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      toast.classList.add('hiding');
    }, 2200);
  }

  // Subtle top-of-page sync indicator
  function showSyncIndicator(msg) {
    const existing = document.getElementById('croxync-sync-indicator');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'croxync-sync-indicator';
    el.className = 'sync-indicator';
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>${msg}`;
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 2000);
  }

  function flashLinkSaved() {
    const s = shadow();
    if (!s) return;

    const pill = s.getElementById('croxync-pill');
    if (pill) {
      pill.classList.add('is-link-saved');
      setTimeout(() => pill.classList.remove('is-link-saved'), 600);
    }

    const banner = s.getElementById('croxync-link-saved');
    if (banner) {
      banner.classList.add('visible');
      setTimeout(() => banner.classList.remove('visible'), 2000);
    }
  }

  function sendToBackground(data) {
    if (Date.now() - lastSaveTime < 800) return false;
    lastSaveTime = Date.now();

    chrome.runtime.sendMessage({
      type: 'SAVE_CLIP',
      data: data,
    }, (response) => {
      if (chrome.runtime.lastError) {
        showToast('Not connected', 'error');
        return;
      }
      if (response && response.success) {
        const isLink = data.type === 'url';
        showToast(isLink ? 'Link synced!' : 'Synced to phone!', 'success', isLink);
        showSyncIndicator(isLink ? 'Link synced' : 'Clip synced');
        if (isLink) flashLinkSaved();
      } else if (response && response.error) {
        showToast(response.error, 'error');
      }
    });
    return true;
  }

  function onPillSave() {
    const text = getSelectedText();
    if (!text) return;
    const isLink = isUrl(text);
    sendToBackground({
      content: text,
      type: isLink ? 'url' : 'text',
      category: typeof detectCategory === 'function' ? detectCategory(text, isLink ? 'url' : 'text') : (isLink ? 'links' : 'general'),
      title: document.title,
      source: location.href,
    });
    const s = shadow();
    if (s) {
      const btn = s.getElementById('croxync-pill-save');
      btn.classList.add('saved');
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      clearTimeout(savedPillTimeout);
      savedPillTimeout = setTimeout(() => {
        btn.classList.remove('saved');
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`;
      }, 1500);
    }
  }

  function onPanelSave() {
    const text = getSelectedText();
    if (!text) {
      showToast('Nothing selected', 'error');
      return;
    }
    const isLink = isUrl(text);
    const category = getActiveCategory();
    sendToBackground({
      content: text,
      type: isLink ? 'url' : 'text',
      category: category,
      title: document.title,
      source: location.href,
    });

    const s = shadow();
    if (s) {
      const saveBtn = s.getElementById('croxync-save-btn');
      saveBtn.classList.add('saved');
      saveBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Saved!
      `;
      setTimeout(() => {
        saveBtn.classList.remove('saved');
        saveBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Save
        `;
      }, 1500);
    }
  }

  function onCopyAndSave() {
    const text = getSelectedText();
    if (!text) {
      showToast('Nothing selected', 'error');
      return;
    }
    const isLink = isUrl(text);
    const category = getActiveCategory();

    navigator.clipboard.writeText(text).then(() => {
      sendToBackground({
        content: text,
        type: isLink ? 'url' : 'text',
        category: category,
        title: document.title,
        source: location.href,
      });
      showToast('Copied & saved!', 'success', isLink);
    }).catch(() => {
      sendToBackground({
        content: text,
        type: isLink ? 'url' : 'text',
        category: category,
        title: document.title,
        source: location.href,
      });
    });
  }

  function onPasteSubmit() {
    const s = shadow();
    if (!s) return;
    const input = s.getElementById('croxync-paste-input');
    const text = input.value.trim();
    if (!text) return;

    const isLink = isUrl(text);
    const category = getActiveCategory();
    sendToBackground({
      content: text,
      type: isLink ? 'url' : 'text',
      category: category,
      title: document.title,
      source: location.href,
    });
    input.value = '';
  }

  function onDocumentClick(e) {
    if (widget && widget.contains(e.target)) return;
    const s = shadow();
    if (!s) return;
    const wrapper = s.querySelector('.wrapper');
    if (wrapper && (e.target === wrapper || wrapper.contains(e.target))) return;
    if (sitePopup && sitePopup.contains(e.target)) return;
    if (isVisible) {
      const text = getSelectedText();
      if (!text) hideWidget();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && isVisible) dismiss();
  }

  function isUrl(text) {
    try { new URL(text); return true; } catch { return false; }
  }

  let selectionDebounce = null;
  let lastSelectionText = '';

  document.addEventListener('mouseup', () => {
    clearTimeout(selectionDebounce);
    selectionDebounce = setTimeout(() => {
      const text = getSelectedText();
      if (text && text.length > 0) {
        if (text !== lastSelectionText || !isVisible) {
          lastSelectionText = text;
          ensureWidget();
          const s = shadow();
          if (!s) return;
          showPill(text);
          positionNearSelection();
        } else if (isVisible && !isExpanded) {
          positionNearSelection();
        }
      } else if (!text) {
        lastSelectionText = '';
        if (isVisible && !isExpanded) {
          clearTimeout(hideTimeout);
          hideTimeout = setTimeout(() => {
            if (!getSelectedText()) hideWidget();
          }, 200);
        }
      }
    }, 60);
  });

  document.addEventListener('mousedown', (e) => {
    // Check if click is inside our widget or shadow DOM
    if (widget && widget.contains(e.target)) return;
    const s = shadow();
    if (!s) return;
    // Also check shadow root elements
    const wrapper = s.querySelector('.wrapper');
    if (wrapper && (e.target === wrapper || wrapper.contains(e.target))) return;
    // Check if clicking inside any popup we created
    if (sitePopup && sitePopup.contains(e.target)) return;
    
    const text = getSelectedText();
    if (!text && isVisible) {
      hideWidget();
    }
  });

  document.addEventListener('selectionchange', () => {
    const text = getSelectedText();
    if (!text && isVisible) {
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        if (!getSelectedText()) hideWidget();
      }, 200);
    }
  });

// === Auto-save on copy + URL popup + site detection ===
  let lastCopiedContent = '';
  let lastCopiedTime = 0;

  function handleCopiedText(text) {
    if (!text || text.length < 2) return;
    
    const trimmedText = text.trim();
    const now = Date.now();
    
    if (trimmedText === lastCopiedContent && (now - lastCopiedTime) < 2000) return;
    
    const copiedIsUrl = isUrl(trimmedText);

    // Always show URL popup for URLs when copied
    if (copiedIsUrl) {
      showSitePopup(trimmedText);
      lastCopiedContent = trimmedText;
      lastCopiedTime = now;
    }

    // Save to backend if code is set
    chrome.storage.sync.get(['croxyncCode', 'autoSave', 'autoPasteUrl'], (settings) => {
      if (!settings.croxyncCode) return;

      let shouldSave = false;
      if (copiedIsUrl && settings.autoPasteUrl !== false) shouldSave = true;
      else if (!copiedIsUrl && settings.autoSave === true) shouldSave = true;

      if (shouldSave) {
        lastCopiedContent = trimmedText;
        lastCopiedTime = Date.now();

        const category = typeof detectCategory === 'function' ? detectCategory(trimmedText, copiedIsUrl ? 'url' : 'text') : (copiedIsUrl ? 'links' : 'general');
        const siteInfo = getSiteInfo(trimmedText);

        chrome.runtime.sendMessage({
          type: 'AUTO_SAVE_CLIP',
          data: {
            content: trimmedText,
            type: copiedIsUrl ? 'url' : 'text',
            category: category,
            title: siteInfo.title || document.title,
            source: location.href,
          },
        }, (response) => {
          if (chrome.runtime.lastError) return;
          if (response && response.success && !response.dedup) {
            showToast(copiedIsUrl ? 'Link auto-synced!' : 'Copied & synced!', 'success', copiedIsUrl);
            showSyncIndicator(copiedIsUrl ? 'Link synced' : 'Clip synced');
            if (copiedIsUrl) flashLinkSaved();
          }
        });
      }
    });
  }

  // Primary: capture selected text on copy event (works for text selections)
  document.addEventListener('copy', () => {
    // Capture selection text synchronously before the event clears it
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    if (text && text.length >= 2) {
      handleCopiedText(text);
    }
  });

  // Secondary: detect Ctrl/Cmd+C via keydown (works even if copy event doesn't fire)
  // and for cases where the copy event doesn't bubble (e.g. address bar copy)
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.key !== 'c') return;
    if (e.shiftKey) return; // Don't trigger on Ctrl+Shift+C
    
    // Small delay to let clipboard update
    setTimeout(() => {
      // Try to read from the current selection first
      const sel = window.getSelection();
      const selectedText = sel ? sel.toString().trim() : '';
      if (selectedText && selectedText.length >= 2) {
        handleCopiedText(selectedText);
      } else {
        // Fallback: try clipboard (may fail due to permissions)
        navigator.clipboard.readText().then((clipText) => {
          if (clipText && clipText.trim().length >= 2) {
            handleCopiedText(clipText);
          }
        }).catch(() => {});
      }
    }, 100);
  });

  function getSiteInfo(url) {
    try {
      const u = new URL(url);
      const host = u.hostname;
      const info = { title: null, type: 'url' };

      if (host.includes('youtube.com') || host.includes('youtu.be')) {
        const vid = u.searchParams.get('v') || (host.includes('youtu.be') ? u.pathname.slice(1) : null);
        if (vid) {
          info.title = 'YouTube: ' + (document.title.replace(/\s*[-|].*$/, '').trim() || vid);
          info.type = 'youtube';
        }
      } else if (host.includes('github.com')) {
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          info.title = 'GitHub: ' + parts[0] + '/' + parts[1];
          info.type = 'github';
        }
      } else if (host.includes('twitter.com') || host.includes('x.com')) {
        info.title = 'X/Twitter post';
        info.type = 'twitter';
      } else if (host.includes('reddit.com')) {
        info.title = 'Reddit: ' + u.pathname.split('/').filter(Boolean).slice(-1)[0];
        info.type = 'reddit';
      } else if (host.includes('stackoverflow.com')) {
        info.title = 'Stack Overflow';
        info.type = 'stackoverflow';
      } else if (host.includes('medium.com')) {
        info.title = 'Medium article';
        info.type = 'medium';
      } else if (host.includes('figma.com')) {
        info.title = 'Figma';
        info.type = 'figma';
      } else if (host.includes('notion.so') || host.includes('notion.site')) {
        info.title = 'Notion page';
        info.type = 'notion';
      }

      return info;
    } catch { return { title: null, type: 'url' }; }
  }

  // === Site-specific popups ===
  let sitePopup = null;

  function getSiteIcon(type) {
    const icons = {
      youtube: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="4" fill="#ff0000"/><path d="M10 8l6 4-6 4V8z" fill="white"/></svg>',
      github: '<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>',
      twitter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
      reddit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10" fill="#ff4500"/><circle cx="9" cy="13" r="1.5" fill="white"/><circle cx="15" cy="13" r="1.5" fill="white"/><path d="M8 16c1 1.5 2.5 2 4 2s3-.5 4-2" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>',
      stackoverflow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15.725 0l-1.72 2.143 5.895 4.714 1.72-2.143zM4.5 14.25l6.75 3.75 6.75-3.75M4.5 18l6.75 3.75L18 18" stroke="#f48024" stroke-width="2"/><rect x="3" y="12" width="18" height="3" rx="0.5" fill="#bcbbbb"/></svg>',
      figma: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="4" fill="#a259ff"/><rect x="13" y="3" width="8" height="8" rx="4" fill="#f24e1e"/><rect x="3" y="13" width="8" height="8" rx="4" fill="#1abcfe"/><path d="M13 17a4 4 0 014-4h-4v4z" fill="#0acf83"/></svg>',
    };
    return icons[type] || '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
  }

  function getSiteColor(type) {
    const colors = {
      youtube: '#ff0000',
      github: '#333',
      twitter: '#1da1f2',
      reddit: '#ff4500',
      stackoverflow: '#f48024',
      medium: '#000',
      figma: '#a259ff',
      notion: '#000',
    };
    return colors[type] || '#6366f1';
  }

  function showSitePopup(url) {
    // Dismiss any existing popup first
    if (sitePopup) {
      dismissSitePopup();
    }

    const siteInfo = getSiteInfo(url);
    const siteType = siteInfo.type;
    const color = getSiteColor(siteType);
    const icon = getSiteIcon(siteType);
    const truncated = url.length > 45 ? url.slice(0, 45) + '...' : url;
    const label = {
      youtube: 'Video copied!',
      github: 'Repo copied!',
      twitter: 'Post copied!',
      reddit: 'Post copied!',
      stackoverflow: 'Answer copied!',
      medium: 'Article copied!',
      figma: 'Design copied!',
      notion: 'Page copied!',
      url: 'Link copied!',
    }[siteType] || 'Link copied!';

    // Create the popup element
    sitePopup = document.createElement('div');
    sitePopup.id = 'croxync-site-popup';
    
    // Apply all styles directly to the element
    sitePopup.style.cssText = `
      position: fixed !important;
      bottom: 28px !important;
      right: 28px !important;
      z-index: 2147483647 !important;
      background: #0f172a !important;
      border: 1px solid rgba(255,255,255,0.08) !important;
      border-radius: 16px !important;
      box-shadow: 0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) !important;
      min-width: 300px !important;
      max-width: 420px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      backdrop-filter: blur(12px) !important;
      animation: croxync-site-slide 0.3s cubic-bezier(0.16,1,0.3,1) !important;
      pointer-events: auto !important;
    `;

    sitePopup.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:14px 18px;">
        <div style="flex-shrink:0;width:40px;height:40px;border-radius:12px;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px ${color}40;">
          ${icon}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${label}</div>
          <div style="font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin-top:2px;">${truncated}</div>
        </div>
        <div style="flex-shrink:0;display:flex;align-items:center;gap:4px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span style="font-size:11px;color:#4ade80;font-weight:600;">Copied</span>
        </div>
      </div>
    `;

    // Add animation keyframes to document head
    const styleId = 'croxync-site-popup-styles';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        @keyframes croxync-site-slide {
          0% { opacity:0; transform:translateY(16px) scale(0.96); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes croxync-site-out {
          0% { opacity:1; transform:translateY(0) scale(1); }
          100% { opacity:0; transform:translateY(12px) scale(0.96); }
        }
      `;
      document.head.appendChild(styleEl);
    }

    document.body.appendChild(sitePopup);

    setTimeout(function() {
      dismissSitePopup();
    }, 2500);
  }

  function dismissSitePopup() {
    if (!sitePopup) return;
    sitePopup.style.animation = 'croxync-site-out 0.2s ease-in forwards';
    var popup = sitePopup;
    setTimeout(function() {
      if (popup.parentNode) popup.parentNode.removeChild(popup);
    }, 200);
    sitePopup = null;
  }

  // Obsolete: showUrlPopup is now showSitePopup (replaced above)
  // showUrlPopup kept as alias for compatibility
  function showUrlPopup(url) { showSitePopup(url); }

  chrome.runtime.onMessage.addListener((msg) => {
    // Future: handle messages from background
  });

  // === Site-specific auto-popups ===
  // YouTube video detection
  function isYouTubeVideoPage() {
    return location.hostname.includes('youtube.com') && location.pathname === '/watch' && new URLSearchParams(location.search).get('v');
  }

  function getYouTubeVideoId() {
    return new URLSearchParams(location.search).get('v');
  }

  function getYouTubeVideoTitle() {
    var titleEl = document.querySelector('ytd-watch-metadata h1') || document.querySelector('h1.ytd-watch-metadata') || document.querySelector('h1.title');
    return titleEl ? titleEl.textContent.trim() : document.title.replace(/\s*[-|].*$/, '').trim();
  }

  let ytBannerDismissed = false;
  let ytBanner = null;

  function showYouTubeBanner() {
    if (ytBannerDismissed || ytBanner) return;

    ytBanner = document.createElement('div');
    ytBanner.id = 'croxync-yt-banner';

    var videoId = getYouTubeVideoId();
    var videoUrl = 'https://www.youtube.com/watch?v=' + videoId;
    var videoTitle = getYouTubeVideoTitle();

    ytBanner.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;">
        <div style="flex-shrink:0;width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#ff0000,#cc0000);display:flex;align-items:center;justify-content:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:2px;">Save this video?</div>
          <div style="font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;">${videoTitle}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button id="croxync-yt-save" style="padding:6px 14px;border-radius:8px;border:none;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:white;font-size:12px;font-weight:600;cursor:pointer;transition:filter 0.15s;">Save</button>
          <button id="croxync-yt-dismiss" style="padding:6px 10px;border-radius:8px;border:1px solid #334155;background:transparent;color:#94a3b8;font-size:12px;cursor:pointer;transition:all 0.15s;">Later</button>
        </div>
      </div>
    `;

    var style = document.createElement('style');
    style.textContent = `
      #croxync-yt-banner {
        position: fixed;
        top: 70px;
        right: 20px;
        z-index: 2147483646;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 14px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        min-width: 320px;
        max-width: 400px;
        animation: croxync-yt-slide 0.25s ease-out;
      }
      #croxync-yt-save:hover { filter: brightness(1.1); }
      #croxync-yt-dismiss:hover { background: #1e293b; color: #e2e8f0; }
      @keyframes croxync-yt-slide {
        0% { opacity:0; transform:translateX(20px); }
        100% { opacity:1; transform:translateX(0); }
      }
      @keyframes croxync-yt-out {
        0% { opacity:1; transform:translateX(0); }
        100% { opacity:0; transform:translateX(20px); }
      }
    `;
    ytBanner.appendChild(style);

    document.body.appendChild(ytBanner);

    ytBanner.querySelector('#croxync-yt-save').addEventListener('click', function() {
      sendToBackground({
        content: videoUrl,
        type: 'url',
        category: 'links',
        title: videoTitle,
        source: location.href,
      });
      dismissYtBanner();
    });

    ytBanner.querySelector('#croxync-yt-dismiss').addEventListener('click', function() {
      dismissYtBanner();
    });
  }

  function dismissYtBanner() {
    if (!ytBanner) return;
    ytBanner.style.animation = 'croxync-yt-out 0.2s ease-in forwards';
    var banner = ytBanner;
    setTimeout(function() {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 200);
    ytBanner = null;
    ytBannerDismissed = true;
    setTimeout(function() { ytBannerDismissed = false; }, 600000);
  }

  // GitHub repo detection
  function isGitHubRepoPage() {
    return location.hostname === 'github.com' && /^\/[^/]+\/[^/]+/.test(location.pathname);
  }

  let ghBannerDismissed = false;
  let ghBanner = null;

  function showGitHubBanner() {
    if (ghBannerDismissed || ghBanner) return;

    var repoPath = location.pathname.split('/').slice(0, 3).join('/');
    var repoUrl = location.origin + repoPath;
    var repoName = location.pathname.split('/').slice(1, 3).join('/');

    ghBanner = document.createElement('div');
    ghBanner.id = 'croxync-gh-banner';

    ghBanner.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;">
        <div style="flex-shrink:0;width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#24292e,#40464d);display:flex;align-items:center;justify-content:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:2px;">Save this repo?</div>
          <div style="font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;">${repoName}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button id="croxync-gh-save" style="padding:6px 14px;border-radius:8px;border:none;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:white;font-size:12px;font-weight:600;cursor:pointer;">Save</button>
          <button id="croxync-gh-dismiss" style="padding:6px 10px;border-radius:8px;border:1px solid #334155;background:transparent;color:#94a3b8;font-size:12px;cursor:pointer;">Later</button>
        </div>
      </div>
    `;

    var style = document.createElement('style');
    style.textContent = `
      #croxync-gh-banner {
        position: fixed;
        top: 70px;
        right: 20px;
        z-index: 2147483646;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 14px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.5);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        min-width: 300px;
        max-width: 400px;
        animation: croxync-gh-slide 0.25s ease-out;
      }
      #croxync-gh-save:hover { filter: brightness(1.1); }
      #croxync-gh-dismiss:hover { background: #1e293b; color: #e2e8f0; }
      @keyframes croxync-gh-slide {
        0% { opacity:0; transform:translateX(20px); }
        100% { opacity:1; transform:translateX(0); }
      }
      @keyframes croxync-gh-out {
        0% { opacity:1; transform:translateX(0); }
        100% { opacity:0; transform:translateX(20px); }
      }
    `;
    ghBanner.appendChild(style);
    document.body.appendChild(ghBanner);

    ghBanner.querySelector('#croxync-gh-save').addEventListener('click', function() {
      sendToBackground({
        content: repoUrl,
        type: 'url',
        category: 'links',
        title: 'GitHub: ' + repoName,
        source: location.href,
      });
      dismissGhBanner();
    });

    ghBanner.querySelector('#croxync-gh-dismiss').addEventListener('click', function() {
      dismissGhBanner();
    });
  }

  function dismissGhBanner() {
    if (!ghBanner) return;
    ghBanner.style.animation = 'croxync-gh-out 0.2s ease-in forwards';
    var banner = ghBanner;
    setTimeout(function() {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 200);
    ghBanner = null;
    ghBannerDismissed = true;
    setTimeout(function() { ghBannerDismissed = false; }, 600000);
  }

  // Trigger site-specific banners
  if (isYouTubeVideoPage()) {
    setTimeout(showYouTubeBanner, 1500);
  }

  if (isGitHubRepoPage()) {
    setTimeout(showGitHubBanner, 1500);
  }

  // Detect SPA navigation
  var lastUrl = location.href;
  setInterval(function() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      ytBannerDismissed = false;
      ghBannerDismissed = false;

      if (ytBanner && ytBanner.parentNode) { ytBanner.parentNode.removeChild(ytBanner); ytBanner = null; }
      if (ghBanner && ghBanner.parentNode) { ghBanner.parentNode.removeChild(ghBanner); ghBanner = null; }

      if (isYouTubeVideoPage()) {
        setTimeout(showYouTubeBanner, 1500);
      }
      if (isGitHubRepoPage()) {
        setTimeout(showGitHubBanner, 1500);
      }
    }
  }, 1000);
})();