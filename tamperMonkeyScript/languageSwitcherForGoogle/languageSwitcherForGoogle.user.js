// ==UserScript==
// @name         Language Switcher for Google
// @namespace    https://github.com/ballban/ballbanTools
// @version      1.0.0
// @description  Add a compact language switcher to Google pages
// @author       ballban
// @match        https://www.google.com/*
// @match        https://www.google.com.hk/*
// @match        https://www.google.co.jp/*
// @match        https://www.google.co.kr/*
// @icon         https://www.google.com/favicon.ico
// ==/UserScript==

(function () {
  "use strict";

  const SWITCHER_ID = "language-switcher-for-google";
  const STYLE_ID = `${SWITCHER_ID}-styles`;

  const LANGUAGE_OPTIONS = Object.freeze([
    { label: "en", hl: "en", lr: "lang_en", domain: "com" },
    { label: "cn", hl: "zh-CN", lr: "lang_zh-CN", domain: "com.hk" },
    { label: "jp", hl: "ja", lr: "lang_ja", domain: "co.jp" },
    { label: "ko", hl: "ko", lr: "lang_ko", domain: "co.kr" },
  ]);

  const INSERTION_POINTS = [
    { selector: "#rhs > div:first-of-type", placement: "rhs", method: "before" },
    { selector: "#appbar", placement: "appbar", method: "after" },
  ];

  let injectionScheduled = false;
  let hiddenByUser = false;

  function getGoogleDomain(hostname) {
    const match = hostname.toLowerCase().match(/(?:^|\.)google\.(com(?:\.hk)?|co\.jp|co\.kr)$/);

    return match ? match[1] : null;
  }

  function getSelectedLanguage() {
    const url = new URL(window.location.href);
    const currentLanguage = url.searchParams.get("lr");
    const currentInterface = url.searchParams.get("hl");

    const selectedByLanguage = LANGUAGE_OPTIONS.find((option) => option.lr === currentLanguage);

    if (selectedByLanguage) {
      return selectedByLanguage;
    }

    const selectedByInterface = LANGUAGE_OPTIONS.find((option) => option.hl === currentInterface);

    if (selectedByInterface) {
      return selectedByInterface;
    }

    const currentDomain = getGoogleDomain(url.hostname);
    return (
      LANGUAGE_OPTIONS.find((option) => option.domain === currentDomain) || LANGUAGE_OPTIONS[0]
    );
  }

  function switchLanguage(option) {
    const url = new URL(window.location.href);
    const googleIndex = url.hostname.indexOf("google.");

    if (googleIndex !== -1) {
      const hostPrefix = url.hostname.slice(0, googleIndex);
      url.hostname = `${hostPrefix}google.${option.domain}`;
    }

    url.searchParams.set("hl", option.hl);
    url.searchParams.set("lr", option.lr);
    window.location.assign(url.href);
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${SWITCHER_ID} {
        display: block;
        box-sizing: border-box;
        width: fit-content;
        max-width: 100%;
        margin: 6px 0;
        padding: 7px 10px;
        border: 1px solid #dadce0;
        border-radius: 8px;
        background: #fff;
        color: #202124;
        font: 13px/1.3 Arial, sans-serif;
      }

      #${SWITCHER_ID}[data-placement='appbar'] {
        position: relative;
        z-index: 1;
        margin: 8px 0;
      }

      #${SWITCHER_ID} .language-switcher-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 5px;
      }

      #${SWITCHER_ID} .language-switcher-title {
        font-weight: 600;
      }

      #${SWITCHER_ID} fieldset {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 0;
        padding: 0;
        border: 0;
      }

      #${SWITCHER_ID} legend {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      #${SWITCHER_ID} .language-option {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        cursor: pointer;
        white-space: nowrap;
      }

      #${SWITCHER_ID} input {
        margin: 0;
        accent-color: #1a73e8;
      }

      #${SWITCHER_ID} button {
        min-width: 22px;
        min-height: 22px;
        padding: 0 5px;
        border: 1px solid transparent;
        border-radius: 4px;
        background: transparent;
        color: #5f6368;
        cursor: pointer;
        font: inherit;
        line-height: 1;
      }

      #${SWITCHER_ID} button:hover,
      #${SWITCHER_ID} button:focus-visible {
        border-color: #dadce0;
        background: #f8f9fa;
        color: #202124;
        outline: none;
      }
    `;

    (document.head || document.documentElement).append(style);
  }

  function createSwitcher() {
    const selectedLanguage = getSelectedLanguage();
    const container = document.createElement("div");
    container.id = SWITCHER_ID;
    container.setAttribute("role", "group");
    container.setAttribute("aria-label", "Google language switcher");

    const header = document.createElement("div");
    header.className = "language-switcher-header";

    const title = document.createElement("span");
    title.className = "language-switcher-title";
    title.textContent = "Language";

    const hideButton = document.createElement("button");
    hideButton.type = "button";
    hideButton.textContent = "×";
    hideButton.title = "Hide language switcher";
    hideButton.setAttribute("aria-label", "Hide language switcher");
    hideButton.addEventListener("click", () => {
      hiddenByUser = true;
      container.remove();
    });

    header.append(title, hideButton);

    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = "Select Google language";
    fieldset.append(legend);

    for (const option of LANGUAGE_OPTIONS) {
      const label = document.createElement("label");
      label.className = "language-option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = `${SWITCHER_ID}-language`;
      input.value = option.hl;
      input.checked = option === selectedLanguage;
      input.addEventListener("change", () => {
        if (input.checked) {
          switchLanguage(option);
        }
      });

      label.append(input, document.createTextNode(option.label));
      fieldset.append(label);
    }

    container.append(header, fieldset);
    return container;
  }

  function findInsertionPoint() {
    for (const insertionPoint of INSERTION_POINTS) {
      const target = document.querySelector(insertionPoint.selector);

      if (target) {
        return { ...insertionPoint, target };
      }
    }

    return null;
  }

  function tryInject() {
    if (hiddenByUser || document.getElementById(SWITCHER_ID)) {
      return;
    }

    const insertionPoint = findInsertionPoint();

    if (!insertionPoint) {
      return;
    }

    addStyles();

    const switcher = createSwitcher();
    switcher.dataset.placement = insertionPoint.placement;

    if (insertionPoint.method === "before") {
      insertionPoint.target.before(switcher);
    } else {
      insertionPoint.target.after(switcher);
    }
  }

  function scheduleInjection() {
    if (injectionScheduled) {
      return;
    }

    injectionScheduled = true;
    window.setTimeout(() => {
      injectionScheduled = false;
      tryInject();
    }, 0);
  }

  addStyles();
  tryInject();

  const observer = new MutationObserver(scheduleInjection);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
