import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(
  new URL("../languageSwitcherForGoogle.user.js", import.meta.url),
  "utf8",
);
const options = [
  { label: "en", hl: "en", lr: "lang_en", domain: "com" },
  { label: "cn", hl: "zh-CN", lr: "lang_zh-CN", domain: "com.hk" },
  { label: "jp", hl: "ja", lr: "lang_ja", domain: "co.jp" },
  { label: "ko", hl: "ko", lr: "lang_ko", domain: "co.kr" },
];
const switcherId = "language-switcher-for-google";

function loadPage(href, { iframe = false } = {}) {
  class Element {
    constructor(tagName) {
      this.tagName = tagName;
      this.children = [];
      this.listeners = {};
      this.checked = false;
    }
    append(...children) {
      for (const child of children) {
        child.parent = this;
        this.children.push(child);
      }
    }
    setAttribute() {}
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    }
    remove() {
      this.parent.children = this.parent.children.filter((child) => child !== this);
    }
  }
  const root = new Element("html");
  const head = new Element("head");
  const body = new Element("body");
  root.append(head, body);
  function descendants(element) {
    return [element, ...element.children.flatMap(descendants)];
  }
  const document = {
    documentElement: root,
    head,
    body,
    createElement: (tag) => new Element(tag),
    createTextNode: (text) => Object.assign(new Element("#text"), { textContent: text }),
    getElementById: (id) => descendants(root).find((element) => element.id === id),
  };
  const navigations = [];
  const timers = [];
  let notify;
  let disconnected = false;
  const location = {
    href,
    get pathname() { return new URL(this.href).pathname; },
    assign: (url) => navigations.push(url),
  };
  const window = { location, setTimeout: (callback) => timers.push(callback) };
  window.self = window;
  window.top = iframe ? {} : window;
  class MutationObserver {
    constructor(callback) { notify = callback; }
    observe() {}
    disconnect() { disconnected = true; }
  }
  vm.runInNewContext(source, { window, document, URL, MutationObserver });
  return {
    document,
    location,
    navigations,
    radios: () => descendants(body).filter((element) => element.type === "radio"),
    selected: () => descendants(body).filter((element) => element.checked).map((input) => input.value),
    select(hl) {
      const radios = this.radios();
      const input = radios.find((radio) => radio.value === hl);
      for (const radio of radios) radio.checked = radio === input;
      input.listeners.change();
    },
    reinject(nextHref = location.href) {
      location.href = nextHref;
      document.getElementById(switcherId).remove();
      if (!disconnected) notify();
      while (timers.length) timers.shift()();
    },
  };
}

for (const option of options) {
  test(`ordinary google.${option.domain} pages do not preselect a language`, () => {
    for (const query of ["", "?q=test", "?q=test&hl=en"]) {
      const page = loadPage(`https://www.google.${option.domain}/search${query}`);
      assert.equal(page.radios().length, 4);
      assert.deepEqual(page.selected(), []);
      assert.deepEqual(page.navigations, []);
    }
  });

  test(`${option.label} navigation preserves parameters and restores selection on load and refresh`, () => {
    const page = loadPage("https://www.google.com/search?q=hello%20world&hl=en&start=10&safe=active&extra=a&extra=b#results");
    assert.deepEqual(page.selected(), []);
    page.select(option.hl);
    assert.equal(page.navigations.length, 1);
    const url = new URL(page.navigations[0]);
    assert.equal(url.hostname, `www.google.${option.domain}`);
    assert.equal(url.pathname, "/search");
    assert.equal(url.searchParams.get("hl"), option.hl);
    assert.equal(url.searchParams.get("lr"), option.lr);
    assert.equal(url.searchParams.get("q"), "hello world");
    assert.equal(url.searchParams.get("start"), "10");
    assert.equal(url.searchParams.get("safe"), "active");
    assert.deepEqual(url.searchParams.getAll("extra"), ["a", "b"]);
    assert.equal(url.hash, "#results");
    for (let refresh = 0; refresh < 2; refresh++) {
      const reloaded = loadPage(url.href);
      assert.deepEqual(reloaded.selected(), [option.hl]);
      assert.deepEqual(reloaded.navigations, []);
    }
  });

  test(`${option.lr} determines selection regardless of hl or domain`, () => {
    for (const hl of ["", "&hl=fr", "&hl=en"]) {
      const page = loadPage(`https://www.google.com.hk/search?lr=${option.lr}${hl}`);
      assert.deepEqual(page.selected(), [option.hl]);
      assert.deepEqual(page.navigations, []);
    }
  });
}

test("empty, unsupported and combined lr values do not preselect", () => {
  for (const lr of ["", "lang_fr", "lang_en|lang_ja", "lang_en.lang_ja", "-lang_en", "LANG_EN", "lang_en "]) {
    const page = loadPage(`https://www.google.com/search?hl=en&lr=${encodeURIComponent(lr)}`);
    assert.deepEqual(page.selected(), []);
    assert.deepEqual(page.navigations, []);
  }
});

test("DOM reinjection reads the current URL, and ordinary pages inherit no preference", () => {
  const page = loadPage("https://www.google.com/search?lr=lang_en");
  page.reinject();
  assert.deepEqual(page.selected(), ["en"]);
  page.reinject("https://www.google.co.jp/search?hl=en&lr=lang_ja");
  assert.deepEqual(page.selected(), ["ja"]);
  page.reinject("https://www.google.com/search?q=test&hl=en");
  assert.deepEqual(page.selected(), []);
  assert.deepEqual(page.navigations, []);
  assert.deepEqual(loadPage("https://www.google.com/").selected(), []);
});

test("close button removes the switcher and disconnects observation", () => {
  const page = loadPage("https://www.google.com/search?lr=lang_en");
  const header = page.document.getElementById(switcherId).children[0];
  header.children[1].listeners.click();
  assert.equal(page.document.getElementById(switcherId), undefined);
  assert.equal(page.document.getElementById(`${switcherId}-styles`), undefined);
  assert.deepEqual(page.navigations, []);
});

test("iframes and recaptcha pages are left untouched", () => {
  for (const page of [
    loadPage("https://www.google.com/search?lr=lang_en", { iframe: true }),
    loadPage("https://www.google.com/recaptcha/api2/anchor?lr=lang_en"),
  ]) {
    assert.equal(page.radios().length, 0);
    assert.equal(page.document.getElementById(`${switcherId}-styles`), undefined);
    assert.deepEqual(page.navigations, []);
  }
});
