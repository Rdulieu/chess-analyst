import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Catches render errors in its subtree and shows a message instead of letting
 * the whole app white-screen. Used around the game viewer: an unparseable Game
 * degrades gracefully rather than taking the page down. Give it a `key` that
 * changes with the content (e.g. the Game id) so it resets when the content does.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Render error caught by ErrorBoundary:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return <p role="alert">This game couldn't be displayed.</p>;
    }
    return this.props.children;
  }
}
