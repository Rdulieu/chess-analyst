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
});
