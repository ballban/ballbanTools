// ==UserScript==
// @name         Twitter Bot Filter
// @namespace    https://github.com/ballban/ballbanTools
// @version      1.0.0
// @description  过滤 X/Twitter 推文内容和作者，一键拉黑用户
// @match        https://x.com/*
// @match        https://twitter.com/*
// @exclude      https://x.com/home*
// @exclude      https://twitter.com/home*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  // ============================================================
  // 1. 存储管理模块
  // ============================================================

  const STORAGE_KEYS = {
    contentFilters: "tbf_contentFilters",
    authorFilters: "tbf_authorFilters",
  };

  function loadFilters(key) {
    try {
      const raw = GM_getValue(key, "[]");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  function saveFilters(key, filters) {
    GM_setValue(key, JSON.stringify(filters));
  }

  function addFilter(key, pattern, isRegex, name) {
    const filters = loadFilters(key);
    // 如果是正则，先验证语法
    if (isRegex) {
      try {
        new RegExp(pattern, "iu");
      } catch (e) {
        alert("正则表达式语法错误: " + e.message);
        return false;
      }
    }
    filters.push({ pattern, isRegex, enabled: true, name: name || "" });
    saveFilters(key, filters);
    return true;
  }

  function updateFilter(key, index, pattern, isRegex, name) {
    const filters = loadFilters(key);
    if (!filters[index]) return false;
    if (isRegex) {
      try {
        new RegExp(pattern, "iu");
      } catch (e) {
        alert("正则表达式语法错误: " + e.message);
        return false;
      }
    }
    filters[index].pattern = pattern;
    filters[index].isRegex = isRegex;
    filters[index].name = name || "";
    saveFilters(key, filters);
    return true;
  }

  function removeFilter(key, index) {
    const filters = loadFilters(key);
    filters.splice(index, 1);
    saveFilters(key, filters);
  }

  function toggleFilter(key, index) {
    const filters = loadFilters(key);
    if (filters[index]) {
      filters[index].enabled = !filters[index].enabled;
      saveFilters(key, filters);
    }
  }

  function exportFiltersJSON() {
    const data = {
      contentFilters: loadFilters(STORAGE_KEYS.contentFilters),
      authorFilters: loadFilters(STORAGE_KEYS.authorFilters),
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
    };
    return JSON.stringify(data, null, 2);
  }

  function importFiltersJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.contentFilters && Array.isArray(data.contentFilters)) {
        saveFilters(STORAGE_KEYS.contentFilters, data.contentFilters);
      }
      if (data.authorFilters && Array.isArray(data.authorFilters)) {
        saveFilters(STORAGE_KEYS.authorFilters, data.authorFilters);
      }
      return true;
    } catch (e) {
      alert("导入失败: JSON 格式错误\n" + e.message);
      return false;
    }
  }

  // ============================================================
  // 2. 过滤统计
  // ============================================================

  let filteredCount = 0;

  function updateFilteredCount(delta) {
    filteredCount += delta;
    const badge = document.getElementById("tbf-badge");
    if (badge) {
      badge.textContent = filteredCount > 0 ? filteredCount : "";
      badge.style.display = filteredCount > 0 ? "flex" : "none";
    }
    const statsEl = document.getElementById("tbf-stats");
    if (statsEl) {
      statsEl.textContent = `已过滤 ${filteredCount} 条推文`;
    }
  }

  // ============================================================
  // 3. CSS 样式注入
  // ============================================================

  GM_addStyle(`
    /* ---- 悬浮按钮 ---- */
    #tbf-float-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      background: rgba(29, 155, 240, 0.85);
      color: #fff;
      box-shadow: 0 4px 16px rgba(29, 155, 240, 0.35);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: fixed;
      z-index: 10000;
      left: 18px;
      bottom: 82px;
    }
    #tbf-float-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 24px rgba(29, 155, 240, 0.5);
      background: rgba(29, 155, 240, 1);
    }
    #tbf-float-btn:active {
      transform: scale(0.95);
    }

    /* 徽章 */
    #tbf-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      background: #f4212e;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 0 5px;
      line-height: 1;
    }

    /* ---- 设置面板 ---- */
    #tbf-panel-overlay {
      position: fixed;
      inset: 0;
      background: transparent;
      z-index: 10001;
      display: none;
      pointer-events: none;
    }
    #tbf-panel-overlay.tbf-visible {
      display: block;
    }

    #tbf-panel {
      position: fixed;
      width: 500px;
      max-width: calc(100vw - 32px);
      max-height: 75vh;
      background: rgba(22, 24, 28, 0.95);
      backdrop-filter: blur(24px) saturate(1.4);
      -webkit-backdrop-filter: blur(24px) saturate(1.4);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.05) inset;
      color: #e7e9ea;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      pointer-events: auto;
      animation: tbf-slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* 面板头部 */
    .tbf-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 22px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .tbf-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      background: linear-gradient(135deg, #1d9bf0, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .tbf-close-btn {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: none;
      background: rgba(255,255,255,0.06);
      color: #8899a6;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .tbf-close-btn:hover {
      background: rgba(244, 33, 46, 0.15);
      color: #f4212e;
    }

    /* Tab 栏 */
    .tbf-tabs {
      display: flex;
      padding: 0 22px;
      gap: 4px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .tbf-tab {
      flex: 1;
      padding: 12px 0;
      border: none;
      background: none;
      color: #8899a6;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      position: relative;
      transition: color 0.2s;
    }
    .tbf-tab:hover {
      color: #e7e9ea;
    }
    .tbf-tab.tbf-active {
      color: #1d9bf0;
    }
    .tbf-tab.tbf-active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 20%;
      right: 20%;
      height: 3px;
      background: #1d9bf0;
      border-radius: 3px 3px 0 0;
    }

    /* Tab 内容 */
    .tbf-tab-content {
      display: none;
      flex-direction: column;
      padding: 16px 22px;
      overflow-y: auto;
      flex: 1;
    }
    .tbf-tab-content.tbf-active {
      display: flex;
    }

    /* 添加规则区 */
    .tbf-add-row {
      display: flex;
      gap: 6px;
      margin-bottom: 14px;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
    }
    .tbf-add-row input[type="text"] {
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      color: #e7e9ea;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      min-width: 0;
      box-sizing: border-box;
    }
    .tbf-input-name {
      flex: 1;
      max-width: 120px;
    }
    .tbf-input-pattern {
      flex: 2;
    }
    .tbf-add-row input[type="text"]:focus {
      border-color: rgba(29, 155, 240, 0.5);
      box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.12);
    }
    .tbf-add-row input[type="text"]::placeholder {
      color: #555e68;
    }

    /* 类型切换按钮 */
    .tbf-type-toggle {
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      color: #8899a6;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      min-width: 56px;
      text-align: center;
    }
    .tbf-type-toggle.tbf-regex {
      background: rgba(139, 92, 246, 0.15);
      color: #a78bfa;
      border-color: rgba(139, 92, 246, 0.3);
    }

    /* 添加按钮 */
    .tbf-add-btn {
      padding: 8px 16px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, #1d9bf0, #1a8cd8);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .tbf-add-btn:hover {
      background: linear-gradient(135deg, #1aa3f5, #1d9bf0);
      box-shadow: 0 4px 12px rgba(29, 155, 240, 0.35);
    }

    /* 规则列表 */
    .tbf-rules-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }
    .tbf-rule-empty {
      text-align: center;
      color: #555e68;
      padding: 32px 0;
      font-size: 14px;
    }
    .tbf-rule-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
      transition: background 0.15s;
    }
    .tbf-rule-item:hover {
      background: rgba(255,255,255,0.06);
    }
    .tbf-rule-details {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .tbf-rule-name-display {
      font-size: 12px;
      font-weight: 700;
      color: #1d9bf0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tbf-rule-pattern {
      font-size: 12px;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      word-break: break-all;
      color: #c4c9ce;
    }
    .tbf-rule-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .tbf-rule-tag.tbf-tag-str {
      background: rgba(29, 155, 240, 0.15);
      color: #1d9bf0;
    }
    .tbf-rule-tag.tbf-tag-regex {
      background: rgba(139, 92, 246, 0.15);
      color: #a78bfa;
    }

    /* 规则开关 */
    .tbf-toggle-switch {
      position: relative;
      width: 36px;
      height: 20px;
      flex-shrink: 0;
    }
    .tbf-toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .tbf-toggle-slider {
      position: absolute;
      inset: 0;
      border-radius: 20px;
      background: rgba(255,255,255,0.12);
      cursor: pointer;
      transition: background 0.25s;
    }
    .tbf-toggle-slider::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .tbf-toggle-switch input:checked + .tbf-toggle-slider {
      background: #1d9bf0;
    }
    .tbf-toggle-switch input:checked + .tbf-toggle-slider::after {
      transform: translateX(16px);
    }

    /* 编辑 & 删除按钮 */
    .tbf-edit-btn, .tbf-delete-btn {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: #8899a6;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .tbf-edit-btn:hover {
      background: rgba(29, 155, 240, 0.15);
      color: #1d9bf0;
    }
    .tbf-delete-btn:hover {
      background: rgba(244, 33, 46, 0.12);
      color: #f4212e;
    }

    /* 底部工具栏 */
    .tbf-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 22px;
      border-top: 1px solid rgba(255,255,255,0.06);
      gap: 10px;
    }
    .tbf-stats {
      font-size: 12px;
      color: #555e68;
    }
    .tbf-footer-actions {
      display: flex;
      gap: 8px;
    }
    .tbf-footer-btn {
      padding: 7px 14px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      color: #8899a6;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tbf-footer-btn:hover {
      background: rgba(255,255,255,0.1);
      color: #e7e9ea;
    }

    /* ---- 推文折叠提示 ---- */
    .tbf-collapsed-hint {
      padding: 5px 12px;
      margin: 2px 0;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px dashed rgba(255, 255, 255, 0.08);
      color: #555e68;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
      user-select: none;
    }
    .tbf-collapsed-hint:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #8899a6;
      border-color: rgba(255, 255, 255, 0.12);
    }
    .tbf-collapsed-hint .tbf-hint-icon {
      font-size: 12px;
      flex-shrink: 0;
    }
    .tbf-collapsed-hint .tbf-hint-expand {
      margin-left: auto;
      font-size: 10px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .tbf-collapsed-hint:hover .tbf-hint-expand {
      opacity: 1;
    }

    /* ---- 推文拉黑按钮 ---- */
    .tbf-block-btn {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: #71767b;
      font-size: 15px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
      margin-left: 4px;
    }
    .tbf-block-btn:hover {
      background: rgba(244, 33, 46, 0.1);
      color: #f4212e;
    }
    .tbf-block-btn.tbf-blocking {
      pointer-events: none;
      opacity: 0.5;
      animation: tbf-spin 0.8s linear infinite;
    }
    @keyframes tbf-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    /* ---- Toast 通知 ---- */
    .tbf-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: rgba(22, 24, 28, 0.95);
      backdrop-filter: blur(12px);
      color: #e7e9ea;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10010;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.08);
      pointer-events: none;
    }
    .tbf-toast.tbf-show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* 隐藏文件输入 */
    #tbf-import-input {
      display: none;
    }
  `);

  // ============================================================
  // 4. UI 模块
  // ============================================================

  // ---- 4a. Toast 通知 ----
  function showToast(msg, duration = 2500) {
    let toast = document.getElementById("tbf-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "tbf-toast";
      toast.className = "tbf-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    // 强制重排触发动画
    toast.classList.remove("tbf-show");
    void toast.offsetWidth;
    toast.classList.add("tbf-show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove("tbf-show");
    }, duration);
  }

  // ---- 4b. 悬浮按钮 ----
  function createFloatButton() {
    const btn = document.createElement("button");
    btn.id = "tbf-float-btn";
    btn.innerHTML = "🛡️";
    btn.title = "Twitter Bot Filter 设置";

    const badge = document.createElement("span");
    badge.id = "tbf-badge";
    btn.appendChild(badge);

    btn.addEventListener("click", togglePanel);
    document.body.appendChild(btn);

    // 尝试定位在侧边栏账号信息上方
    positionFloatButton();
  }

  function positionFloatButton() {
    const btn = document.getElementById("tbf-float-btn");
    if (!btn) return;

    const accountBtn = document.querySelector(
      '[data-testid="SideNav_AccountSwitcher_Button"]'
    );
    if (accountBtn) {
      const rect = accountBtn.getBoundingClientRect();
      btn.style.position = "fixed";
      btn.style.left = rect.left + "px";
      btn.style.bottom = window.innerHeight - rect.top + 12 + "px";
    }
    // 如果找不到，保持 CSS 默认的 fixed 定位
  }

  // ---- 4c. 设置面板 ----
  let panelOpen = false;
  let editingState = null; // { type: 'content' | 'author', idx: number }

  function positionPanel() {
    const btn = document.getElementById("tbf-float-btn");
    const panel = document.getElementById("tbf-panel");
    if (!btn || !panel) return;

    const btnRect = btn.getBoundingClientRect();
    const panelWidth = panel.offsetWidth || 500;
    const panelHeight = panel.offsetHeight || 420;

    let left = btnRect.left;
    let bottom = window.innerHeight - btnRect.top + 10;

    if (left + panelWidth > window.innerWidth - 16) {
      left = window.innerWidth - panelWidth - 16;
    }
    if (btnRect.top - panelHeight - 10 < 10) {
      bottom = 16;
    }

    panel.style.position = "fixed";
    panel.style.left = Math.max(12, left) + "px";
    panel.style.bottom = bottom + "px";
  }

  function togglePanel() {
    panelOpen = !panelOpen;
    let overlay = document.getElementById("tbf-panel-overlay");

    if (!overlay) {
      overlay = createPanel();
    }

    if (panelOpen) {
      editingState = null;
      refreshRulesList("content");
      refreshRulesList("author");
      updateFilteredCount(0);
      overlay.classList.add("tbf-visible");
      setTimeout(positionPanel, 0);
    } else {
      overlay.classList.remove("tbf-visible");
    }
  }

  function createPanel() {
    const overlay = document.createElement("div");
    overlay.id = "tbf-panel-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) togglePanel();
    });

    overlay.innerHTML = `
      <div id="tbf-panel">
        <div class="tbf-header">
          <h2>🛡️ Twitter Bot Filter</h2>
          <button class="tbf-close-btn" id="tbf-close">✕</button>
        </div>

        <div class="tbf-tabs">
          <button class="tbf-tab tbf-active" data-tab="content">📝 内容过滤</button>
          <button class="tbf-tab" data-tab="author">👤 作者过滤</button>
        </div>

        <div class="tbf-tab-content tbf-active" data-tab-content="content">
          <div class="tbf-add-row">
            <input type="text" id="tbf-content-name" class="tbf-input-name" placeholder="名称(可选)" />
            <input type="text" id="tbf-content-input" class="tbf-input-pattern" placeholder="过滤文字或正则..." />
            <button class="tbf-type-toggle" id="tbf-content-type" data-regex="false">字符串</button>
            <button class="tbf-add-btn" id="tbf-content-add">添加</button>
          </div>
          <div class="tbf-rules-list" id="tbf-content-rules"></div>
        </div>

        <div class="tbf-tab-content" data-tab-content="author">
          <div class="tbf-add-row">
            <input type="text" id="tbf-author-name" class="tbf-input-name" placeholder="名称(可选)" />
            <input type="text" id="tbf-author-input" class="tbf-input-pattern" placeholder="作者 ID 或显示名称..." />
            <button class="tbf-type-toggle" id="tbf-author-type" data-regex="false">字符串</button>
            <button class="tbf-add-btn" id="tbf-author-add">添加</button>
          </div>
          <div class="tbf-rules-list" id="tbf-author-rules"></div>
        </div>

        <div class="tbf-footer">
          <span class="tbf-stats" id="tbf-stats">已过滤 0 条推文</span>
          <div class="tbf-footer-actions">
            <button class="tbf-footer-btn" id="tbf-import-btn">📥 导入</button>
            <button class="tbf-footer-btn" id="tbf-export-btn">📤 导出</button>
          </div>
        </div>
      </div>
      <input type="file" id="tbf-import-input" accept=".json" />
    `;

    document.body.appendChild(overlay);

    // 事件绑定
    overlay.querySelector("#tbf-close").addEventListener("click", togglePanel);

    // Tab 切换
    overlay.querySelectorAll(".tbf-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        overlay
          .querySelectorAll(".tbf-tab")
          .forEach((t) => t.classList.remove("tbf-active"));
        overlay
          .querySelectorAll(".tbf-tab-content")
          .forEach((c) => c.classList.remove("tbf-active"));
        tab.classList.add("tbf-active");
        overlay
          .querySelector(`[data-tab-content="${tab.dataset.tab}"]`)
          .classList.add("tbf-active");
      });
    });

    // 类型切换
    ["content", "author"].forEach((type) => {
      const toggle = overlay.querySelector(`#tbf-${type}-type`);
      toggle.addEventListener("click", () => {
        const isRegex = toggle.dataset.regex === "true";
        toggle.dataset.regex = String(!isRegex);
        toggle.textContent = isRegex ? "字符串" : "正则";
        toggle.classList.toggle("tbf-regex", !isRegex);
      });
    });

    // 添加规则
    ["content", "author"].forEach((type) => {
      const key =
        type === "content"
          ? STORAGE_KEYS.contentFilters
          : STORAGE_KEYS.authorFilters;
      const addBtn = overlay.querySelector(`#tbf-${type}-add`);
      const input = overlay.querySelector(`#tbf-${type}-input`);
      const typeToggle = overlay.querySelector(`#tbf-${type}-type`);

      const nameInput = overlay.querySelector(`#tbf-${type}-name`);

      const doAdd = () => {
        const pattern = input.value.trim();
        if (!pattern) return;
        const isRegex = typeToggle.dataset.regex === "true";
        const name = nameInput.value.trim();
        if (addFilter(key, pattern, isRegex, name)) {
          input.value = "";
          nameInput.value = "";
          refreshRulesList(type);
          reprocessAllTweets();
        }
      };

      addBtn.addEventListener("click", doAdd);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") doAdd();
      });
    });

    // 导出
    overlay.querySelector("#tbf-export-btn").addEventListener("click", () => {
      const json = exportFiltersJSON();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `twitter-bot-filter-rules-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("✅ 规则已导出");
    });

    // 导入
    const importInput = overlay.querySelector("#tbf-import-input");
    overlay.querySelector("#tbf-import-btn").addEventListener("click", () => {
      importInput.click();
    });
    importInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (importFiltersJSON(ev.target.result)) {
          refreshRulesList("content");
          refreshRulesList("author");
          reprocessAllTweets();
          showToast("✅ 规则已导入");
        }
      };
      reader.readAsText(file);
      importInput.value = ""; // 重置以允许重复导入相同文件
    });

    return overlay;
  }

  function refreshRulesList(type) {
    const key =
      type === "content"
        ? STORAGE_KEYS.contentFilters
        : STORAGE_KEYS.authorFilters;
    const container = document.getElementById(`tbf-${type}-rules`);
    if (!container) return;

    const filters = loadFilters(key);

    if (filters.length === 0) {
      container.innerHTML = `<div class="tbf-rule-empty">暂无过滤规则，添加一条试试吧 ✨</div>`;
      return;
    }

    container.innerHTML = filters
      .map((f, i) => {
        const isEditing = editingState && editingState.type === type && editingState.idx === i;
        if (isEditing) {
          return `
            <div class="tbf-rule-item tbf-rule-editing">
              <input type="text" class="tbf-edit-name-in" value="${escapeHtml(f.name || "")}" placeholder="名称" style="width: 90px; padding: 4px 6px; font-size: 12px; border-radius: 6px; border: 1px solid rgba(29,155,240,0.6); background: rgba(0,0,0,0.4); color: #fff; outline:none;" />
              <input type="text" class="tbf-edit-pattern-in" value="${escapeHtml(f.pattern)}" placeholder="表达式" style="flex: 1; min-width: 0; padding: 4px 6px; font-size: 12px; border-radius: 6px; border: 1px solid rgba(29,155,240,0.6); background: rgba(0,0,0,0.4); color: #fff; outline:none;" />
              <button class="tbf-type-toggle tbf-edit-type-btn ${f.isRegex ? "tbf-regex" : ""}" data-regex="${f.isRegex}" style="padding: 4px 8px; font-size: 11px;">${f.isRegex ? "正则" : "文本"}</button>
              <button class="tbf-edit-save-btn" data-idx="${i}" data-action="save-edit" title="保存" style="padding: 4px 8px; border-radius: 6px; border: none; background: #1d9bf0; color: #fff; font-size: 11px; cursor: pointer; font-weight: 600;">💾</button>
              <button class="tbf-edit-cancel-btn" data-idx="${i}" data-action="cancel-edit" title="取消" style="padding: 4px 8px; border-radius: 6px; border: none; background: rgba(255,255,255,0.1); color: #8899a6; font-size: 11px; cursor: pointer;">✕</button>
            </div>
          `;
        }

        return `
          <div class="tbf-rule-item">
            <span class="tbf-rule-tag ${f.isRegex ? "tbf-tag-regex" : "tbf-tag-str"}">
              ${f.isRegex ? "正则" : "文本"}
            </span>
            <div class="tbf-rule-details">
              ${f.name ? `<div class="tbf-rule-name-display">${escapeHtml(f.name)}</div>` : ''}
              <div class="tbf-rule-pattern">${escapeHtml(f.pattern)}</div>
            </div>
            <label class="tbf-toggle-switch">
              <input type="checkbox" ${f.enabled ? "checked" : ""} data-idx="${i}" data-action="toggle" />
              <span class="tbf-toggle-slider"></span>
            </label>
            <button class="tbf-edit-btn" data-idx="${i}" data-action="edit" title="编辑规则">✏️</button>
            <button class="tbf-delete-btn" data-idx="${i}" data-action="delete" title="删除规则">🗑️</button>
          </div>
        `;
      })
      .join("");

    // 绑定事件
    container.querySelectorAll("[data-action]").forEach((el) => {
      const action = el.dataset.action;
      const idx = parseInt(el.dataset.idx);

      if (action === "toggle") {
        el.addEventListener("change", (e) => {
          e.stopPropagation();
          toggleFilter(key, idx);
          reprocessAllTweets();
        });
      } else if (action === "delete") {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          removeFilter(key, idx);
          if (editingState && editingState.type === type && editingState.idx === idx) {
            editingState = null;
          }
          refreshRulesList(type);
          reprocessAllTweets();
        });
      } else if (action === "edit") {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          editingState = { type, idx };
          refreshRulesList(type);
        });
      } else if (action === "save-edit") {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const itemEl = el.closest(".tbf-rule-editing");
          const nameInput = itemEl.querySelector(".tbf-edit-name-in");
          const patternInput = itemEl.querySelector(".tbf-edit-pattern-in");
          const typeBtn = itemEl.querySelector(".tbf-edit-type-btn");
          const isRegex = typeBtn.dataset.regex === "true";

          const newPattern = patternInput.value.trim();
          const newName = nameInput.value.trim();

          if (!newPattern) return;

          if (updateFilter(key, idx, newPattern, isRegex, newName)) {
            editingState = null;
            refreshRulesList(type);
            reprocessAllTweets();
            showToast("✅ 规则已更新");
          }
        });
      } else if (action === "cancel-edit") {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          editingState = null;
          refreshRulesList(type);
        });
      }
    });

    // 编辑模式中的类型切换按钮绑定
    container.querySelectorAll(".tbf-edit-type-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isRegex = btn.dataset.regex === "true";
        btn.dataset.regex = String(!isRegex);
        btn.textContent = isRegex ? "正则" : "文本";
        btn.classList.toggle("tbf-regex", !isRegex);
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================
  // 5. 推文处理模块
  // ============================================================

  const PROCESSED_ATTR = "data-tbf-processed";
  const COLLAPSED_ATTR = "data-tbf-collapsed";

  function matchesFilter(text, filters) {
    if (!text) return null;
    for (const f of filters) {
      if (!f.enabled) continue;
      try {
        if (f.isRegex) {
          if (new RegExp(f.pattern, "iu").test(text)) return f;
        } else {
          if (text.toLowerCase().includes(f.pattern.toLowerCase())) return f;
        }
      } catch {
        // 正则语法错误，跳过
      }
    }
    return null;
  }

  function extractAuthorHandle(tweetEl) {
    const userNameEl = tweetEl.querySelector('[data-testid="User-Name"]');
    if (!userNameEl) return null;
    // 查找 @handle 链接
    const links = userNameEl.querySelectorAll("a[href]");
    for (const link of links) {
      const href = link.getAttribute("href");
      // 格式: /username 或 /username/status/...
      const match = href.match(/^\/([A-Za-z0-9_]+)$/);
      if (match) return match[1];
    }
    // fallback: 查找以 @ 开头的文本
    const spans = userNameEl.querySelectorAll("span");
    for (const span of spans) {
      const text = span.textContent.trim();
      if (text.startsWith("@")) return text.slice(1);
    }
    return null;
  }

  /**
   * 提取作者显示名称（含 emoji）。
   * 显示名称中的 emoji 同样被渲染为 <img alt="emoji">，需要用 extractTextWithEmoji。
   */
  function extractAuthorDisplayName(tweetEl) {
    const userNameEl = tweetEl.querySelector('[data-testid="User-Name"]');
    if (!userNameEl) return null;
    // 显示名称在第一个 <a> 链接内
    const firstLink = userNameEl.querySelector('a[href]');
    if (!firstLink) return null;
    return extractTextWithEmoji(firstLink);
  }

  /**
   * 提取推文文本内容。
   * Twitter 会将 emoji 渲染为 <img alt="emoji"> 标签，
   * innerText 无法读取 img 的 alt 属性，所以需要递归遍历 DOM 节点。
   */
  function extractTextWithEmoji(el) {
    let result = "";
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === "IMG" && node.alt) {
          result += node.alt;
        } else {
          result += extractTextWithEmoji(node);
        }
      }
    }
    return result;
  }

  function extractTweetText(tweetEl) {
    const textEl = tweetEl.querySelector('[data-testid="tweetText"]');
    return textEl ? extractTextWithEmoji(textEl) : "";
  }

  function processTweet(tweetEl) {
    // 如果当前处于 /home 页面，跳过推文过滤处理
    if (window.location.pathname.startsWith("/home")) return;

    if (tweetEl.getAttribute(PROCESSED_ATTR)) return;
    tweetEl.setAttribute(PROCESSED_ATTR, "1");

    const contentFilters = loadFilters(STORAGE_KEYS.contentFilters);
    const authorFilters = loadFilters(STORAGE_KEYS.authorFilters);

    const tweetText = extractTweetText(tweetEl);
    const authorHandle = extractAuthorHandle(tweetEl);
    const authorDisplayName = extractAuthorDisplayName(tweetEl);

    // 检查内容过滤
    const contentMatch = matchesFilter(tweetText, contentFilters);
    if (contentMatch) {
      collapseTweet(tweetEl, "内容规则", contentMatch);
      return;
    }

    // 检查作者过滤（同时匹配 handle 和 显示名称）
    const authorMatch =
      matchesFilter(authorHandle, authorFilters) ||
      matchesFilter(authorDisplayName, authorFilters);
    if (authorMatch) {
      collapseTweet(tweetEl, "作者规则", authorMatch);
      return;
    }

    // 未匹配 → 注入拉黑按钮
    injectBlockButton(tweetEl);
  }

  function collapseTweet(tweetEl, ruleType, matchedFilter) {
    // 如果已经折叠过，先还原
    if (tweetEl.getAttribute(COLLAPSED_ATTR)) return;
    tweetEl.setAttribute(COLLAPSED_ATTR, "1");

    // 规则显示名：优先用自定义名称，否则回退到 "规则类型: 匹配模式"
    const ruleName = matchedFilter.name
      ? matchedFilter.name
      : `${ruleType}: ${truncate(matchedFilter.pattern, 30)}`;

    // 隐藏推文原有内容
    const originalDisplay = tweetEl.style.display;
    tweetEl.style.display = "none";

    // 创建折叠提示
    const hint = document.createElement("div");
    hint.className = "tbf-collapsed-hint";
    hint.innerHTML = `
      <span class="tbf-hint-icon">🛡️</span>
      <span>此推文已被过滤 — ${escapeHtml(ruleName)}</span>
      <span class="tbf-hint-expand">点击展开 ▼</span>
    `;

    let expanded = false;
    hint.addEventListener("click", () => {
      expanded = !expanded;
      if (expanded) {
        tweetEl.style.display = originalDisplay || "";
        hint.querySelector(".tbf-hint-expand").textContent = "点击折叠 ▲";
        hint.style.borderColor = "rgba(29, 155, 240, 0.3)";
      } else {
        tweetEl.style.display = "none";
        hint.querySelector(".tbf-hint-expand").textContent = "点击展开 ▼";
        hint.style.borderColor = "rgba(255, 255, 255, 0.08)";
      }
    });

    tweetEl.parentNode.insertBefore(hint, tweetEl);
    updateFilteredCount(1);
  }

  function truncate(str, maxLen) {
    return str.length > maxLen ? str.slice(0, maxLen) + "…" : str;
  }

  function uncollapseAll() {
    document.querySelectorAll(".tbf-collapsed-hint").forEach((hint) => {
      hint.remove();
    });
    document
      .querySelectorAll(`[${COLLAPSED_ATTR}]`)
      .forEach((el) => {
        el.style.display = "";
        el.removeAttribute(COLLAPSED_ATTR);
      });
    filteredCount = 0;
    updateFilteredCount(0);
  }

  function reprocessAllTweets() {
    // 清除所有折叠和标记
    uncollapseAll();
    document
      .querySelectorAll(`[${PROCESSED_ATTR}]`)
      .forEach((el) => {
        el.removeAttribute(PROCESSED_ATTR);
        // 移除拉黑按钮
        el.querySelectorAll(".tbf-block-btn").forEach((btn) => btn.remove());
      });
    // 重新处理所有推文
    document
      .querySelectorAll('article[data-testid="tweet"]')
      .forEach(processTweet);
  }

  // ---- 拉黑按钮 ----
  function injectBlockButton(tweetEl) {
    // 避免重复注入
    if (tweetEl.querySelector(".tbf-block-btn")) return;

    const btn = document.createElement("button");
    btn.className = "tbf-block-btn";
    btn.innerHTML = "🚫";
    btn.title = "快速拉黑此用户";

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      performBlock(tweetEl, btn);
    });

    // 找到推文中 caret 按钮所在的区域并插入旁边
    const caretBtn = tweetEl.querySelector('[data-testid="caret"]');
    if (caretBtn && caretBtn.parentElement) {
      caretBtn.parentElement.insertBefore(btn, caretBtn);
    } else {
      // fallback: 插入到推文的第一行末尾
      const firstRow = tweetEl.querySelector(
        '[data-testid="User-Name"]'
      );
      if (firstRow && firstRow.parentElement) {
        firstRow.parentElement.appendChild(btn);
      }
    }
  }

  async function performBlock(tweetEl, blockBtn) {
    blockBtn.classList.add("tbf-blocking");
    blockBtn.innerHTML = "⏳";

    try {
      // Step 1: 点击 caret 菜单
      const caret = tweetEl.querySelector('[data-testid="caret"]');
      if (!caret) throw new Error("找不到推文菜单按钮");
      caret.click();

      // Step 2: 等待菜单出现并点击拉黑
      const blockMenuItem = await waitForElement(
        '[data-testid="block"]',
        2000
      );
      if (!blockMenuItem) throw new Error("找不到拉黑选项");
      blockMenuItem.click();

      // Step 3: 等待确认弹窗并点击确认
      const confirmBtn = await waitForElement(
        '[data-testid="confirmationSheetConfirm"]',
        2000
      );
      if (!confirmBtn) throw new Error("找不到确认按钮");
      confirmBtn.click();

      // 成功
      blockBtn.innerHTML = "✅";
      blockBtn.classList.remove("tbf-blocking");
      const handle = extractAuthorHandle(tweetEl);
      showToast(`✅ 已拉黑 @${handle || "用户"}`);

      // 渐隐推文
      tweetEl.style.transition = "opacity 0.5s";
      tweetEl.style.opacity = "0.3";
    } catch (err) {
      blockBtn.innerHTML = "❌";
      blockBtn.classList.remove("tbf-blocking");
      showToast("❌ 拉黑失败: " + err.message);

      // 尝试关闭可能打开的菜单
      const closeMenu = document.querySelector('[data-testid="Dropdown"]');
      if (closeMenu) {
        document.body.click();
      }

      // 恢复按钮
      setTimeout(() => {
        blockBtn.innerHTML = "🚫";
      }, 2000);
    }
  }

  function waitForElement(selector, timeout = 2000) {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) {
        resolve(el);
        return;
      }

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          clearTimeout(timer);
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  // ============================================================
  // 6. MutationObserver — 核心监听
  // ============================================================

  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          // 如果添加的节点本身是推文
          if (
            node.matches &&
            node.matches('article[data-testid="tweet"]')
          ) {
            processTweet(node);
          }

          // 检查子元素中的推文
          if (node.querySelectorAll) {
            node
              .querySelectorAll('article[data-testid="tweet"]')
              .forEach(processTweet);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ============================================================
  // 7. 初始化
  // ============================================================

  // ---- 默认规则初始化（仅首次运行） ----
  function initDefaultRules() {
    const DEFAULTS_KEY = "tbf_defaultsInitialized";
    if (GM_getValue(DEFAULTS_KEY, false)) return;

    const defaultContentFilters = [
      {
        pattern: "^\\s*\\p{Extended_Pictographic}(\\uFE0F|\\u200D\\p{Extended_Pictographic}|\\p{Emoji_Modifier})*\\s*$",
        isRegex: true,
        enabled: true,
        name: "单个Emoji"
      }
    ];

    // 仅在没有已有规则时写入默认值
    const existing = loadFilters(STORAGE_KEYS.contentFilters);
    if (existing.length === 0) {
      saveFilters(STORAGE_KEYS.contentFilters, defaultContentFilters);
    }

    GM_setValue(DEFAULTS_KEY, true);
    console.log("[Twitter Bot Filter] 📋 已初始化默认过滤规则");
  }

  function init() {
    // 初始化默认规则（仅首次）
    initDefaultRules();

    // 创建悬浮按钮
    createFloatButton();

    // 处理页面上已有的推文
    document
      .querySelectorAll('article[data-testid="tweet"]')
      .forEach(processTweet);

    // 启动 MutationObserver
    startObserver();

    // 监听窗口大小变化，重新定位按钮与面板
    window.addEventListener("resize", () => {
      positionFloatButton();
      if (panelOpen) positionPanel();
    });

    // 点击外部区域自动关闭设置面板
    document.addEventListener("click", (e) => {
      if (!panelOpen) return;
      // 如果点击的目标元素已经被从 DOM 树中离线/移除，忽略该点击
      if (e.target && !e.target.isConnected) return;

      const panel = document.getElementById("tbf-panel");
      const btn = document.getElementById("tbf-float-btn");
      if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
        togglePanel();
      }
    });

    // 定期重试按钮定位（侧边栏可能延迟加载）
    let posRetries = 0;
    const posInterval = setInterval(() => {
      positionFloatButton();
      if (panelOpen) positionPanel();
      posRetries++;
      if (posRetries > 20) clearInterval(posInterval);
    }, 1500);

    console.log("[Twitter Bot Filter] ✅ 脚本已加载");
  }

  // 等待 body 就绪后初始化
  if (document.body) {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
