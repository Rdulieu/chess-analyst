/*
 * Theme audit — the measurable half of the theme pass (see `../theme-pass.md`).
 *
 * Browser-side, dependency-free, driver-agnostic: paste or inject the whole file
 * into the page under test and call `themeAudit()`. It returns a plain object, so
 * any driver that can evaluate an expression (CDP `Runtime.evaluate`, a MCP
 * `evaluate_script`, a devtools console) can read the result.
 *
 *   const report = themeAudit();            // audits the screen as rendered
 *
 * It measures what a stylesheet makes observable and nothing about how it is
 * achieved: that every colour resolves, that text contrast holds against the
 * background actually painted behind it, that the page does not scroll sideways,
 * that meaning-bearing tints still carry a non-chromatic cue, and what the
 * theme-invariant tokens currently resolve to (the caller compares those between
 * the two themes — a single render cannot).
 *
 * The theme is NOT switched here: emulating `prefers-color-scheme` is the
 * driver's job (CDP `Emulation.setEmulatedMedia`), and doing it from the page
 * would test a different mechanism than the one that ships.
 */
function themeAudit() {
  const CONSTANT_TOKENS = [
    "--white-share",
    "--black-share",
    "--square-light",
    "--square-dark",
    "--square-inaccuracy",
    "--square-mistake",
    "--square-blunder",
    /* The board's coordinate ink belongs to the same constant family (a
       chessboard is a chessboard in both themes — see client/src/chess/
       boardTheme.ts) and was missing from this list, so its invariance was
       asserted by nobody. */
    "--square-notation",
  ];

  /* Findings already recorded as open on US-13's slices and on earlier stories.
     They are reported, never silently dropped — but they do not turn a replay
     red, because that would make the suite report the same known facts as new
     breakage at every run. Anything not matched here is a real finding. */
  const KNOWN = [
    {
      what: "a disabled control's label — 2.63:1 light, 3.51:1 dark (WCAG exempts inactive controls; the `not-allowed` cursor carries the state)",
      match: (el) => el.closest(":disabled") !== null || el.disabled === true,
    },
    /* The board's coordinate labels used to belong here at ~2.3:1. They now
       measure 12.89:1 on the light square and 4.66:1 on the dark one, because the
       board consumes `--square-notation`. The entry is gone rather than kept as a
       never-matching matcher: a regression there must go red. */
  ];

  const parse = (c) => {
    const m = String(c).match(/[\d.]+/g);
    if (!m) return null;
    const [r, g, b, a] = m.map(Number);
    return { r, g, b, a: a === undefined ? 1 : a };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = ({ r, g, b }) =>
    [r, g, b]
      .map((v) => v / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  /* The background actually painted behind an element: the first ancestor whose
     own background is not fully transparent, composited downwards. */
  const groundOf = (el) => {
    let ground = { r: 255, g: 255, b: 255, a: 1 };
    const stack = [];
    for (let node = el; node; node = node.parentElement) {
      const bg = parse(getComputedStyle(node).backgroundColor);
      if (bg && bg.a > 0) stack.push(bg);
      if (bg && bg.a === 1) break;
    }
    while (stack.length) ground = over(stack.pop(), ground);
    return ground;
  };

  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const ownText = (el) =>
    Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();

  const all = Array.from(document.querySelectorAll("main *, header *, main, header"));

  /* 1. Unresolved colour. A `var(--typo)` that resolves to nothing leaves the
     computed value empty or literal — never a colour. */
  const unresolved = [];
  for (const el of all) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    for (const prop of ["color", "backgroundColor", "borderTopColor", "fill", "stroke", "outlineColor"]) {
      const v = s[prop];
      if (v === undefined || v === "") continue;
      if (String(v).includes("var(") || parse(v) === null) {
        if (v === "none" || v === "currentcolor") continue;
        unresolved.push({ tag: el.tagName.toLowerCase(), prop, value: v });
      }
    }
  }
  const declaredEmpty = CONSTANT_TOKENS.filter(
    (t) => getComputedStyle(document.documentElement).getPropertyValue(t).trim() === ""
  );

  /* 2. Text contrast against the ground actually rendered. `worst` records the
     lowest ratio measured on the screen even when nothing fails, because "no
     failure" and "nothing was measured" look identical in a report otherwise. */
  const contrast = [];
  let worst = null;
  for (const el of all) {
    const text = ownText(el);
    if (!text || !visible(el)) continue;
    const s = getComputedStyle(el);
    const fg = parse(s.color);
    if (!fg) continue;
    const ground = groundOf(el);
    const px = parseFloat(s.fontSize);
    const bold = Number(s.fontWeight) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const required = large ? 3 : 4.5;
    const measured = ratio(over({ ...fg, a: fg.a * Number(s.opacity || 1) }, ground), ground);
    if (!worst || measured < worst.measured) {
      worst = {
        measured: Number(measured.toFixed(2)),
        required,
        text: text.slice(0, 40),
        tag: el.tagName.toLowerCase(),
      };
    }
    if (measured + 0.005 < required) {
      const known = KNOWN.find((k) => {
        try {
          return k.match(el);
        } catch {
          return false;
        }
      });
      contrast.push({
        text: text.slice(0, 40),
        tag: el.tagName.toLowerCase(),
        measured: Number(measured.toFixed(2)),
        required,
        known: known ? known.what : null,
      });
    }
  }

  /* 3. Horizontal overflow — of the page, and of anything wider than its own
     container that is not a declared horizontal scroller. */
  const doc = document.documentElement;
  const overflow = {
    page: { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, overflows: doc.scrollWidth > doc.clientWidth + 1 },
    boxes: all
      .filter((el) => visible(el) && el.scrollWidth > el.clientWidth + 1)
      .filter((el) => !el.matches("[data-scroll='x']") && getComputedStyle(el).overflowX === "visible")
      .map((el) => ({ tag: el.tagName.toLowerCase(), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }))
      .slice(0, 10),
  };

  /* 4. Non-chromatic cues wherever a tint carries meaning. Each rule names what
     must be readable with no colour perception at all. */
  const tinted = (sel) => Array.from(document.querySelectorAll(sel)).filter(visible);
  const cues = [
    {
      cue: "weak-opening rows carry the ⚠ marker",
      subjects: tinted("[data-weak='true']"),
      holds: (el) => (el.textContent || "").includes("⚠"),
    },
    {
      cue: "danger cards carry the ⚠ marker",
      subjects: tinted("[data-serious='true']"),
      holds: (el) => (el.textContent || "").includes("⚠"),
    },
    {
      cue: "severity tints are carried by their glyph (?!, ?, ??)",
      subjects: tinted("[data-severity]"),
      holds: (el) => /\?/.test(el.textContent || ""),
    },
    {
      cue: "a failed month states its failure in words",
      subjects: tinted("[data-failed='true']"),
      holds: (el) => /échec/i.test(el.textContent || ""),
    },
    {
      cue: "the analysée badge carries a word and a checkmark",
      subjects: tinted("[data-part='state']").filter((el) => (el.textContent || "").trim() !== ""),
      holds: (el) => /analys/i.test(el.textContent || "") && /[✓✔]/.test(el.textContent || ""),
    },
    {
      cue: "the current tab is marked by more than a colour (aria-current + weight/border)",
      subjects: tinted("nav [aria-current='page']"),
      holds: (el) => {
        const s = getComputedStyle(el);
        return Number(s.fontWeight) >= 600 || parseFloat(s.borderBottomWidth) > 0;
      },
    },
  ]
    .filter((r) => r.subjects.length > 0)
    .map((r) => ({
      cue: r.cue,
      subjects: r.subjects.length,
      failures: r.subjects.filter((el) => !r.holds(el)).length,
      /* Name the offending elements: a bare count gives the runner nothing to
         act on. Rules with no subject on this screen are dropped above — read
         `cues` as "what this state exercised", never as "all cues verified". */
      failing: r.subjects
        .filter((el) => !r.holds(el))
        .slice(0, 5)
        .map((el) => (el.textContent || el.tagName).trim().slice(0, 60)),
    }));

  /* 5. Theme-invariant tokens, for the caller to compare across the two themes. */
  const root = getComputedStyle(document.documentElement);
  const constants = {};
  for (const t of CONSTANT_TOKENS) constants[t] = root.getPropertyValue(t).trim();

  const problems =
    unresolved.length +
    declaredEmpty.length +
    contrast.filter((c) => !c.known).length +
    (overflow.page.overflows ? 1 : 0) +
    overflow.boxes.length +
    cues.reduce((n, c) => n + c.failures, 0);

  return {
    url: location.pathname,
    viewport: { width: innerWidth, height: innerHeight },
    dark: matchMedia("(prefers-color-scheme: dark)").matches,
    ground: root.getPropertyValue("--ground").trim(),
    ink: root.getPropertyValue("--ink").trim(),
    unresolved,
    declaredEmpty,
    contrast,
    worst,
    textsMeasured: all.filter((el) => ownText(el) && visible(el)).length,
    overflow,
    cues,
    constants,
    problems,
    pass: problems === 0,
  };
}
