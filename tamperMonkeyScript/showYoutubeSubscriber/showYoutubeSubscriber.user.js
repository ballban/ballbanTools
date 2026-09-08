// ==UserScript==
// @name         Show YouTube Subscriber
// @namespace    https://github.com/ballban/ballbanTools
// @version      1.0.1
// @description  Modify the subscriber text on YouTube video pages
// @author       ballban
// @icon         https://www.youtube.com/favicon.ico
// @match        https://www.youtube.com/watch*
// @run-at       document-idle
// @noframes
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const lastWrittenText = new WeakMap();

  function updateSubscriberText() {
    const element = document.getElementById('owner-sub-count');

    if (!element) {
      return;
    }

    const text = (element.textContent || '')
      .replace(/[\s\u00a0]+/g, ' ')
      .trim();

    if (!text || lastWrittenText.get(element) === text) {
      return;
    }

    // Strip a leading label only when the next token starts with the count.
    const newText = text.replace(/^[^\p{Decimal_Number}\s]+\s+(?=\p{Decimal_Number})/u, '').trim();

    if (newText === text) {
      lastWrittenText.set(element, text);
      return;
    }

    lastWrittenText.set(element, newText);
    element.textContent = newText;
  }

  updateSubscriberText();

  const observer = new MutationObserver(updateSubscriberText);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();
