import { defineConfig } from "vitest/config";

/*
 * The agentic suite's driver library runs in its own cycle.
 *
 * `npm test` builds and checks the *application*; this target checks the tooling
 * that drives it. They are kept apart deliberately (US-18): the application's
 * suite must stay fast and readable, and a broken helper must not read as a broken
 * app. The price of the separation is a rule — a slice that touches
 * `docs/test-scenarios/tools/` passes BOTH `npm test` and `npm run test:tools` —
 * written into `.claude/skills/agentic-tests/SKILL.md` so no gate forgets it.
 *
 * `vitest` itself is not declared here: it is already an installed, locked
 * dependency of the `server` workspace, hoisted to the repo's `node_modules`.
 */
export default defineConfig({
  test: {
    include: ["docs/test-scenarios/tools/**/*.test.mjs"],
    environment: "node",
  },
});
