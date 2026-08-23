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
    files: ["**/*.config.{js,ts}", "client/vite.config.ts"],
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
);
