import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/*.db", "**/*.db-*"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["server/**/*.ts", "server/**/*.mts"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["client/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["**/*.config.{js,mjs,ts}", "client/vite.config.ts"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Agentic-test tooling that runs **inside the page under test**: it is
    // injected and evaluated by the driver, so it lives in the browser's globals
    // and its entry point is called from outside the file by design. Linted as
    // node/unused, it reports 18 errors that say nothing about the code.
    files: ["docs/test-scenarios/tools/**/*.js"],
    languageOptions: { globals: { ...globals.browser } },
    rules: { "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^themeAudit$" }] },
  },
  {
    // The other half of the same library, the one that runs **on the machine**:
    // it launches the app, restores snapshots and reads transcripts, so it lives
    // in node's globals. The two halves never import each other, and they do not
    // share a globals block either.
    files: ["docs/test-scenarios/tools/**/*.mjs"],
    languageOptions: { globals: { ...globals.node } },
  },
);
