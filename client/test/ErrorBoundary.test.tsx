import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ErrorBoundary } from "../src/components/ErrorBoundary";

function Boom(): never {
  throw new Error("render blew up");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("shows a fallback message instead of crashing when a child throws while rendering", () => {
    // React logs caught render errors to console.error; silence it for a clean run.
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/couldn't be displayed/i)).toBeTruthy();
  });

  it("renders its children unchanged when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("all good")).toBeTruthy();
  });
});
