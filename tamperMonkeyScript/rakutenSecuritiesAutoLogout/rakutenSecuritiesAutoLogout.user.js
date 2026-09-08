// ==UserScript==
// @name         Rakuten Securities Stop Auto Logout
// @namespace    https://github.com/ballban/ballbanTools
// @version      1.0.0
// @description  Automatically disables the auto logout feature on Rakuten Securities.
// @author       ballban
// @match        https://member.rakuten-sec.co.jp/app/*
// @run-at       document-idle
// @noframes
// @icon         https://www.google.com/s2/favicons?sz=64&domain=rakuten-sec.co.jp
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const AUTO_LOGOUT_SELECTOR = ".pcm-gl-s-header-auto-logout__btn";
  const CHECK_INTERVAL_MS = 1000;

  let lastAutoLogoutButton = null;
  let handledCheckedState = false;

  function disableAutoLogout() {
    const autoLogoutButton = document.querySelector(AUTO_LOGOUT_SELECTOR);

    if (autoLogoutButton !== lastAutoLogoutButton) {
      lastAutoLogoutButton = autoLogoutButton;
      handledCheckedState = false;
    }

    if (!autoLogoutButton || !autoLogoutButton.checked) {
      handledCheckedState = false;
      return;
    }

    if (handledCheckedState) {
      return;
    }

    handledCheckedState = true;
    autoLogoutButton.click();
  }

  disableAutoLogout();
  window.setInterval(disableAutoLogout, CHECK_INTERVAL_MS);
})();
