import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import js from "@eslint/js";
import onlyWarn from "eslint-plugin-only-warn";
import pluginNext from "@next/eslint-plugin-next";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import turboPlugin from "eslint-plugin-turbo";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.FlatConfig[]}
 */
export const eslintConfig = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
  },
  {
    plugins: {
      onlyWarn, // This plugin typically changes severity of all rules to warn
    },
  },
  {
    ignores: ["dist/**"],
  },
  {
    // This configuration object applies to files processed by React/Next.js.
    // `tseslint.configs.recommended` from baseConfig already sets up the parser for .ts, .tsx.
    // `pluginReact.configs.flat.recommended` adds JSX parsing feature and React specific rules.

    // If this specific block should ONLY apply to certain files, add a `files` key, e.g.:
    // files: ["**/*.{js,jsx,ts,tsx}"],

    ...pluginReact.configs.flat.recommended, // Base for React plugin, JSX feature, React rules, React settings

    languageOptions: {
      // Inherit parserOptions from pluginReact.configs.flat.recommended (e.g., ecmaFeatures: { jsx: true })
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        // It's good practice to include globals from the recommended config if they exist,
        // though pluginReact.configs.flat.recommended.languageOptions typically doesn't set globals.
        ...(pluginReact.configs.flat.recommended.languageOptions?.globals ||
          {}),
        ...globals.browser, // For client-side React code
        ...globals.node, // For Next.js server-side code (API routes, SSR)
        ...globals.serviceworker, // As specified in the original config
      },
    },

    plugins: {
      // pluginReact.configs.flat.recommended.plugins is { react: pluginReact }
      ...pluginReact.configs.flat.recommended.plugins,
      "react-hooks": pluginReactHooks,
      "@next/next": pluginNext,
    },

    // settings are inherited from `...pluginReact.configs.flat.recommended`,
    // which includes `settings: { react: { version: "detect" } }`.
    // If you need to override or add other settings, do it here:
    // settings: {
    //   ...pluginReact.configs.flat.recommended.settings,
    //   // other settings
    // },

    rules: {
      // Inherit rules from pluginReact.configs.flat.recommended
      ...pluginReact.configs.flat.recommended.rules,
      // Add rules from other plugins
      ...pluginReactHooks.configs.recommended.rules,
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,

      // Custom rule overrides/additions
      // React scope no longer necessary with new JSX transform.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off", // Often disabled if using TypeScript or prefer not to use prop-types
    },
  },
];

// If you intend to use this as the default export for your eslint.config.js:
// export default eslintConfig;
