(function () {
  'use strict';

  const CONTAINER_ID = 'croxync-floating-widget';
  let widget = null;
  let isVisible = false;
  let isExpanded = false;
  let hideTimeout = null;
  let lastSaveTime = 0;
  let currentSelection = '';
  let savedPillTimeout = null;

  function shadow() {
    return widget ? widget.shadowRoot : null;
  }

  function createWidget() {
    if (document.getElementById(CONTAINER_ID)) return;

    widget = document.createElement('div');
    widget.id = CONTAINER_ID;
    const sr = widget.attachShadow({ mode: 'closed' });

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
        bottom: 20px;
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

    sr.appendChild(style);
    sr.appendChild(wrapper);
    document.body.appendChild(widget);

    sr.getElementById('croxync-pill-save').addEventListener('click', onPillSave);
    sr.getElementById('croxync-close').addEventListener('click', dismiss);
    sr.getElementById('croxync-save-btn').addEventListener('click', onPanelSave);
    sr.getElementById('croxync-copy-btn').addEventListener('click', onCopyAndSave);
    sr.getElementById('croxync-paste-btn').addEventListener('click', onPasteSubmit);
    sr.getElementById('croxync-paste-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') onPasteSubmit();
    });

    // Category buttons
    const catButtons = sr.querySelectorAll('.cat-btn');
    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        catButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.addEventListener('mousedown', onDocumentClick);
    document.addEventListener('keydown', onKeyDown);
  }

  let selectedCategory = 'links';

  function getSelectedText() {
    const sel = window.getSelection();
    return sel ? sel.toString().trim() : '';
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
    const pillWidth = 160;
    const panelWidth = 320;

    if (!isExpanded) {
      let top = rect.top + window.scrollY - 44;
      let left = rect.left + window.scrollX + rect.width / 2;
      if (top < 8) top = rect.bottom + window.scrollY + 10;
      left = Math.max(pillWidth / 2, Math.min(left, window.innerWidth - pillWidth / 2));
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

    // Auto-select category based on content type
    selectedCategory = isLink ? 'links' : 'general';
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

    // Auto-select category
    selectedCategory = isLink ? 'links' : 'general';
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

    // Reset link saved banner
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

  function flashLinkSaved() {
    const s = shadow();
    if (!s) return;

    // Flash on pill
    const pill = s.getElementById('croxync-pill');
    if (pill) {
      pill.classList.add('is-link-saved');
      setTimeout(() => pill.classList.remove('is-link-saved'), 600);
    }

    // Show link banner in panel
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
        showToast(data.type === 'url' ? 'Link synced!' : 'Synced to phone!', 'success', data.type === 'url');
        if (data.type === 'url') flashLinkSaved();
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
      category: isLink ? 'links' : 'general',
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
    const internalEls = s.querySelectorAll('.wrapper *');
    const isInternal = Array.from(internalEls).some(el => el === e.target || el.contains(e.target));
    if (isInternal) return;
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
          if (!widget) createWidget();
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

  // Click on pill → expand to panel
  document.addEventListener('click', (e) => {
    if (!widget) return;
  });

  // Double-click on pill was the old way; now just clicking save pill expands
  // So we add a click on the pill label to expand
  function setupPillExpand() {
    const s = shadow();
    if (!s) return;
    const pillLabel = s.getElementById('croxync-pill-label');
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
  }

  // Re-setup events when widget is created
  const origCreateWidget = createWidget;
  const _createWidget = createWidget;
  createWidget = function() {
    _createWidget();
    setupPillExpand();
  };

  // Also add mouseup on pill to expand
  // We'll handle this in the creation

  document.addEventListener('mousedown', (e) => {
    if (widget && widget.contains(e.target)) return;
    const s = shadow();
    if (!s) return;
    const internalEls = s.querySelectorAll('.wrapper *');
    const isInternal = Array.from(internalEls).some(el => el === e.target || el.contains(e.target));
    if (isInternal) return;
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

  // Setup the pill label click after initial creation
  setTimeout(() => {
    if (widget) setupPillExpand();
  }, 100);

  chrome.runtime.onMessage.addListener((msg) => {
    // Future: handle messages from background
  });
})();