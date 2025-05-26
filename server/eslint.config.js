import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  // 1. Global ignores
  {
    ignores: [
      "node_modules/",
      "dist/", // Common build output directory
      "build/", // Another common build output directory
      ".env*", // Environment variable files (e.g., .env, .env.local)
      "*.log", // Log files
      "coverage/", // Code coverage reports
    ],
  },

  // 2. Base ESLint recommended rules and global settings
  // This configuration applies to all linted files (JavaScript and TypeScript).
  // TypeScript-specific configurations later will override or extend these settings for .ts files.
  {
    ...js.configs.recommended, // Start with ESLint's recommended JavaScript rules
    languageOptions: {
      // Override/extend languageOptions from js.configs.recommended if needed
      ...js.configs.recommended.languageOptions, // Retains ecmaVersion, sourceType from ESLint's recommended
      globals: {
        ...globals.node, // Enable Node.js global variables (e.g., process, require)
        ...globals.es2021, // Enable ECMAScript 2021 globals (or a newer version like es2022, es2023)
      },
    },
    linterOptions: {
      // Warn about unused `eslint-disable` comments
      reportUnusedDisableDirectives: "warn",
    },
    rules: {
      // Override or add to the rules from js.configs.recommended
      ...js.configs.recommended.rules,
      "no-console": process.env.NODE_ENV === "production" ? "error" : "warn", // Disallow console in prod
      "prefer-const": "error", // Require const for variables never reassigned
      eqeqeq: ["error", "always"], // Require === and !==

      // The `no-unused-vars` rule from `js.configs.recommended` will apply to JavaScript files.
      // For TypeScript files, `typescript-eslint` configurations (below) will disable
      // this base rule and enable its own `@typescript-eslint/no-unused-vars` rule.
    },
  },

  // 3. TypeScript-specific configurations
  // Uses `tseslint.config` to create an array of configurations tailored for TypeScript.
  // These configurations apply to `.ts`, `.tsx`, `.mts`, `.cts` files.
  ...tseslint.config(
    // Apply TypeScript ESLint's recommended type-checked rules.
    // This includes rules that require type information.
    ...tseslint.configs.recommendedTypeChecked,

    // Optional: Apply stylistic rules that also require type information.
    // ...tseslint.configs.stylisticTypeChecked,

    // Customizations specifically for TypeScript files
    {
      // This object is merged by `tseslint.config` with the extended configurations.
      // It applies to files matched by the extended configs (i.e., TypeScript files).
      languageOptions: {
        parserOptions: {
          project: true, // Enable type-aware linting (requires tsconfig.json)
          // Assumes eslint.config.js is at the project root.
          // If tsconfig.json is elsewhere, adjust this path.
          // e.g., process.cwd() if eslint.config.js is not at root but tsconfig.json is.
          // or './tsconfig.eslint.json' if you have a separate tsconfig for ESLint.
          tsconfigRootDir: import.meta.dirname,
        },
      },
      rules: {
        // Override or add TypeScript-specific rules.
        // `@typescript-eslint/no-unused-vars` is already configured by `recommendedTypeChecked`.
        // The following customizes it (e.g., to change severity or options).
        "@typescript-eslint/no-unused-vars": [
          "warn", // `recommendedTypeChecked` sets this to "error"
          {
            argsIgnorePattern: "^_", // Ignore unused function arguments starting with _
            varsIgnorePattern: "^_", // Ignore unused variables starting with _
            caughtErrorsIgnorePattern: "^_", // Ignore unused caught error variables starting with _
            ignoreRestSiblings: true, // Allow unused rest siblings
          },
        ],
        // Allow omitting explicit return types for functions, common in Express handlers for brevity.
        "@typescript-eslint/explicit-function-return-type": "off",
        // Warn on usage of 'any' type, rather than erroring, for flexibility during development.
        "@typescript-eslint/no-explicit-any": "warn",
        // Ensure Promises in async functions (like Express handlers) are correctly handled.
        "@typescript-eslint/no-misused-promises": [
          "error",
          {
            checksVoidReturn: {
              attributes: false, // Relevant for JSX/TSX, less so for typical Express servers
            },
          },
        ],
        // The `@typescript-eslint/no-floating-promises` rule is included in `recommendedTypeChecked`.
      },
    },
  ),
];
