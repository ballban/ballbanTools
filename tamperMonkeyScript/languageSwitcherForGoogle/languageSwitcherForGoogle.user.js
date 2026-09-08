// ==UserScript==
// @name         Language Switcher for Google
// @namespace    https://github.com/ballban/ballbanTools
// @version      1.1.2
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

  let injectionScheduled = false;
  let removedByUser = false;
  let observer = null;

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
        position: fixed;
        top: 92px;
        right: 16px;
        z-index: 2147483647;
        display: block;
        box-sizing: border-box;
        width: max-content;
        max-width: calc(100vw - 32px);
        margin: 0;
        padding: 5px 7px 6px;
        border: 1px solid #dadce0;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 1px 3px rgba(60, 64, 67, 0.24);
        color: #202124;
        font: 16px/1.2 Arial, sans-serif;
      }

      #${SWITCHER_ID} .language-switcher-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 7px;
        margin-bottom: 3px;
      }

      #${SWITCHER_ID} .language-switcher-title {
        font-weight: 600;
        white-space: nowrap;
      }

      #${SWITCHER_ID} fieldset {
        display: grid;
        grid-template-columns: repeat(2, max-content);
        column-gap: 7px;
        row-gap: 2px;
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
        gap: 2px;
        cursor: pointer;
        white-space: nowrap;
      }

      #${SWITCHER_ID} input {
        width: 13px;
        height: 13px;
        margin: 0;
        accent-color: #1a73e8;
      }

      #${SWITCHER_ID} button {
        min-width: 0;
        min-height: 0;
        padding: 1px 3px;
        border: 1px solid transparent;
        border-radius: 3px;
        background: transparent;
        color: #5f6368;
        cursor: pointer;
        font: inherit;
        line-height: 1.1;
      }

      #${SWITCHER_ID} button:hover,
      #${SWITCHER_ID} button:focus-visible {
        border-color: #dadce0;
        background: #f8f9fa;
        color: #202124;
        outline: none;
      }

      @media (max-width: 600px) {
        #${SWITCHER_ID} {
          top: 76px;
          right: 8px;
        }
      }

      @media (prefers-color-scheme: dark) {
        #${SWITCHER_ID} {
          border-color: #5f6368;
          background: rgba(48, 49, 52, 0.96);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
          color: #e8eaed;
        }

        #${SWITCHER_ID} button {
          color: #bdc1c6;
        }

        #${SWITCHER_ID} button:hover,
        #${SWITCHER_ID} button:focus-visible {
          border-color: #5f6368;
          background: #3c4043;
          color: #e8eaed;
        }
      }
    `;

    (document.head || document.documentElement).append(style);
  }

  function removeSwitcher() {
    removedByUser = true;
    document.getElementById(SWITCHER_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    observer?.disconnect();
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
    title.textContent = "Language:";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "del";
    deleteButton.title = "Remove language switcher";
    deleteButton.setAttribute("aria-label", "Remove language switcher");
    deleteButton.addEventListener("click", removeSwitcher);

    header.append(title, deleteButton);

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

  function tryInject() {
    if (removedByUser || document.getElementById(SWITCHER_ID) || !document.body) {
      return;
    }

    addStyles();
    document.body.append(createSwitcher());
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

  observer = new MutationObserver(scheduleInjection);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
