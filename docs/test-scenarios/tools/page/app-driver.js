/*
 * The gestures every scenario repeats, done inside the page (see `../../README.md`).
 *
 * Browser-side, dependency-free, driver-agnostic: paste or inject the whole file into
 * the page under test and call `agenticDriver.<something>()`. It returns plain objects,
 * so any driver that can evaluate an expression can read the result.
 *
 * It **reports what it did and what it read**. It never says whether what it read is
 * correct: that is the scenario's judgement, and taking it away here would take the
 * agent out of the loop (ADR-0020).
 *
 * Two facts about this app are encoded here rather than rediscovered every run,
 * because rediscovering them has produced false findings:
 *
 * - **A Game row is a `button`, not a link.** A driver hunting for an `href` matching
 *   `/analyse/` finds nothing and records the screen as unreachable (2026-08-19).
 * - **Month fields are framework-controlled**, so assigning `value` does nothing at
 *   all: it takes the native value setter plus an event — and then a read-back, since
 *   the same run that discovered this nearly imported the wrong months (2026-08-19).
 *
 * Navigation happens **in the page**, never at the driver level: driver-level
 * navigation is the operation that lands on the wrong page, and it throws away the
 * document anything injected was injected into.
 */
const agenticDriver = {
  /** Where we are and how much the main landmark currently holds. */
  where() {
    const main = document.querySelector("main") || document.body;
    return { path: location.pathname, text: main.innerText.length };
  },

  /** The routes the navigation offers, as the navigation itself declares them. */
  navRoutes() {
    return [...document.querySelectorAll('nav[aria-label="main"] a')].map((a) => new URL(a.href).pathname);
  },

  /** Follow a navigation entry. Returns false when this state does not offer it. */
  followNav(route) {
    const link = [...document.querySelectorAll('nav[aria-label="main"] a')].find(
      (a) => new URL(a.href).pathname === route,
    );
    if (!link) return false;
    link.click();
    return true;
  },

  /** Open the first Game from the list. The row is a `button`, not a link. */
  openFirstGame() {
    const button = document.querySelector("table tbody tr button");
    if (!button) return false;
    button.click();
    return true;
  },

  /** Open the first Profile from the list of Profiles. */
  openFirstProfile() {
    const link = document.querySelector('a[href*="/profiles/"]:not([href*="#"])');
    if (!link) return false;
    link.click();
    return true;
  },

  /** Make a Profile current, by clicking it the way a Player would. */
  selectProfile(username) {
    const row = [...document.querySelectorAll("tr, li")].find(
      (r) => r.textContent.includes(username) && r.querySelector("button"),
    );
    if (!row) return null;
    const button = [...row.querySelectorAll("button")].find((b) => /s[ée]lectionner/i.test(b.textContent));
    if (!button) return "already";
    button.click();
    return "clicked";
  },

  /**
   * Put a value into a field the framework controls, then **read it back**.
   *
   * Assigning `value` is silently ignored: the framework holds the value in its own
   * state and re-renders over it. The native setter plus an `input` event is what
   * actually reaches the framework — and the read-back is what proves it did.
   *
   * Returns `{ set, read }`. Whether `read` is the *right* value for the journey is
   * the scenario's business; whether it is the value that was *asked for* is the
   * mechanism's, and the host half throws on that.
   */
  setField(selector, value) {
    const el = document.querySelector(selector);
    if (!el) return { missing: selector };
    const prototype = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { set: value, read: el.value };
  },
};

/* Injected as a whole file and called by name from outside it. */
void agenticDriver;
