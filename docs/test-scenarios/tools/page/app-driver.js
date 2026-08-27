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
// `var`, not `const`, and for the same reason `theme-audit.js` declares a function:
// this file is injected into a live document, sometimes more than once. A top-level
// `const` makes the second injection a `SyntaxError` — which is not how a file that
// advertises "paste or inject the whole file" should behave.
var agenticDriver = {
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

  /** What the Game list currently offers, so a caller can choose which row to open. */
  gameRows() {
    return [...document.querySelectorAll("table tbody tr")].map((tr, index) => ({
      index,
      text: tr.innerText.replace(/\s+/g, " ").trim(),
      openable: Boolean(tr.querySelector("button")),
    }));
  },

  /** Open a Game from the list. The row is a `button`, not a link. */
  openGameRow(index = 0) {
    const rows = [...document.querySelectorAll("table tbody tr")];
    const button = rows[index] && rows[index].querySelector("button");
    if (!button) return false;
    button.click();
    return true;
  },

  /** Open the first Game from the list. */
  openFirstGame() {
    return this.openGameRow(0);
  },

  /** Open the first Profile from the list of Profiles. */
  openFirstProfile() {
    const link = document.querySelector('a[href*="/profiles/"]:not([href*="#"])');
    if (!link) return false;
    link.click();
    return true;
  },

  /** The Profiles this screen currently offers, so a miss can say what it saw. */
  profilesOffered() {
    return [...document.querySelectorAll('a[href*="/profiles/"]:not([href*="#"])')].map((a) =>
      a.textContent.trim(),
    );
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
    const before = el.value;
    const put = (v) => {
      setter.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    put(value);
    const read = el.value;
    /* If the value did not land, put the field back where it was. The setter has
       already reached the framework by then, so a failed attempt would otherwise leave
       the form holding an empty value — and a scenario that caught the error and
       carried on would submit that. */
    if (read !== value) {
      put(before);
      return { set: value, read, restored: el.value, was: before };
    }
    return { set: value, read };
  },
};

/* Injected as a whole file and called by name from outside it. */
void agenticDriver;
