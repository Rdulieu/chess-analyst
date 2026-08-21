import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WinningChancesBar } from "../src/components/WinningChancesBar";

describe("WinningChancesBar", () => {
  it("exposes White's and Black's winning chances as text, not color alone", () => {
    render(<WinningChancesBar whiteWinChances={70} />);

    const bar = screen.getByRole("img", { name: /blancs.*70.*noirs.*30/i });
    expect(bar).toBeTruthy();
  });

  it("splits its fill proportionally to White's winning chances", () => {
    render(<WinningChancesBar whiteWinChances={70} />);

    const [whiteFill, blackFill] = screen.getByRole("img").children;
    expect((whiteFill as HTMLElement).style.width).toBe("70%");
    expect((blackFill as HTMLElement).style.width).toBe("30%");
  });

  it("paints each share with its player's own token, which no theme touches", () => {
    // A colour that says "White" does not say "background" (ADR-0013): the two
    // shares must look identical in both themes, or the picture lies about which
    // side is which. They are declared once, outside the dark block.
    render(<WinningChancesBar whiteWinChances={70} />);

    const [whiteFill, blackFill] = screen.getByRole("img").children;
    expect((whiteFill as HTMLElement).style.backgroundColor).toBe("var(--white-share)");
    expect((blackFill as HTMLElement).style.backgroundColor).toBe("var(--black-share)");
  });
});
