import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeclaredSeverityControl } from "../src/features/personal/DeclaredSeverityControl";
import {
  DECLARED_SEVERITY_GLYPH,
  DECLARED_SEVERITY_LABEL,
  DECLARED_SEVERITY_MEANING,
} from "../src/features/personal/declaredSeverity";
import { DECLARED_SEVERITIES } from "../src/types";

/**
 * The verdict as a **segmented control** (US-23, D8): five full-width rows, each
 * carrying the glyph, the word, and what the value claims.
 *
 * Two facts founded the decision. The glyph table already existed and already
 * served the move list, so the "logo of the kind of error" the requester asked
 * for is a **reuse** — pose and re-read then need no translation. And the
 * discomfort was **layout**: the fieldset was a wrapping flex, so five values
 * reflowed into two or three rows of tiny targets inside a 14rem column.
 */
const control = (over: Partial<Parameters<typeof DeclaredSeverityControl>[0]> = {}) =>
  render(
    <DeclaredSeverityControl
      ply={4}
      posed={null}
      playersOwnMove
      onPose={() => {}}
      onWithdraw={() => {}}
      {...over}
    />,
  );

/** The five rows, in the order the control shows them. */
const rows = () =>
  screen
    .getAllByRole("radio")
    .map((radio) => radio.closest("label")!);

describe("the five rows", () => {
  it("shows every value with its glyph, its word and what it claims — no hovering", () => {
    // The sentence carries the most loaded phrase in the model ("j'ai regardé, je
    // ne trouve rien à reprocher") and used to be a `title`: invisible to the
    // keyboard, invisible to touch, readable only by hovering a mouse.
    control();

    expect(rows()).toHaveLength(5);
    for (const [i, severity] of DECLARED_SEVERITIES.entries()) {
      const row = rows()[i];
      expect(row.textContent).toContain(DECLARED_SEVERITY_GLYPH[severity]);
      expect(row.textContent).toContain(DECLARED_SEVERITY_LABEL[severity]);
      expect(row.textContent).toContain(DECLARED_SEVERITY_MEANING[severity]);
    }
  });

  it("keeps the claims visible for ALL five, not only for the chosen one", () => {
    // Revealing them on choice would move the other four rows under the Player's
    // finger, which is exactly what ADR-0021 forbids.
    control({ posed: "blunder" });

    for (const severity of DECLARED_SEVERITIES) {
      expect(screen.getByText(DECLARED_SEVERITY_MEANING[severity])).toBeTruthy();
    }
  });

  it("takes the glyph from the shared table rather than retyping it", () => {
    // The control and the list say the verdict with the SAME mark, so posing and
    // re-reading need no translation.
    control({ posed: "sound" });

    const chosen = rows()[DECLARED_SEVERITIES.indexOf("sound")];
    expect(chosen.textContent).toContain(DECLARED_SEVERITY_GLYPH.sound);
  });

  it("shows them worst to best, in the order the digits pose them", () => {
    control();

    const words = rows().map((r) => DECLARED_SEVERITIES.find((s) => r.textContent?.includes(DECLARED_SEVERITY_LABEL[s])));
    expect(words).toEqual(DECLARED_SEVERITIES);
  });
});

describe("what the control still is", () => {
  it("stays one exclusive group, so the native arrows and the rank announcement survive", () => {
    // Real buttons with a state — what the note asked for literally — would lose
    // the group, and with it the arrows, the "3 of 5" announcement and the
    // keyboard module's own exemption: the arrows would go back to changing the
    // Move while the Player is choosing a verdict.
    control();

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(5);
    // One group: same name, so the browser treats them as one choice.
    expect(new Set(radios.map((r) => r.getAttribute("name"))).size).toBe(1);
  });

  it("preselects nothing when the Player has said nothing — silence is not a value", () => {
    control();

    expect(screen.getAllByRole("radio").filter((r) => (r as HTMLInputElement).checked)).toHaveLength(0);
  });

  it("lets the Player withdraw a verdict, which is not the same as never having spoken", async () => {
    const onWithdraw = vi.fn();
    const user = userEvent.setup();
    control({ posed: "mistake", onWithdraw });

    await user.click(screen.getByRole("button", { name: /retirer mon verdict/i }));
    expect(onWithdraw).toHaveBeenCalled();
  });

  it("poses the value when its row is chosen — the label is the target", async () => {
    const onPose = vi.fn();
    const user = userEvent.setup();
    control({ onPose });

    // The form input stays UNDER the appearance and the label is what one clicks.
    await user.click(screen.getByText(DECLARED_SEVERITY_LABEL.good));
    expect(onPose).toHaveBeenCalledWith("good");
  });

  it("says nothing at the starting Position — there is no Move to judge", () => {
    const { container } = control({ ply: 0 });
    expect(container.firstChild).toBeNull();
  });
});

describe("what the row must NOT inherit", () => {
  it("does not carry `data-severity`, which is the move-list chip's own hook", () => {
    /*
     * `_semantics.scss` tints ANY `[data-severity]` with the chrome's severity
     * pair — it exists for the move list's glyph. Putting that attribute on these
     * labels tinted the three fault rows **while unchosen**, which said "this
     * verdict is posed" about five rows at once, and dropped the claim's contrast
     * to 2.75:1 on `Bévue` (measured by the FP, both in this shape and in the
     * stacked one). The tint of a chosen row is this control's own business, and
     * it is drawn from the SQUARE family, not the chrome's.
     */
    control({ posed: "blunder" });

    for (const row of rows()) {
      expect(row.hasAttribute("data-severity")).toBe(false);
      // It still names its value, for the sheet to reinforce the chosen one.
      expect(row.getAttribute("data-verdict")).toBeTruthy();
    }
  });

  it("names every value on its own row, in the displayed order", () => {
    control();
    expect(rows().map((r) => r.getAttribute("data-verdict"))).toEqual([...DECLARED_SEVERITIES]);
  });
});
