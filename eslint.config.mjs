import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      react: {
        // ESLint 10 removed context.getFilename(); explicit version avoids plugin crash.
        version: "19",
      },
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Tooling / config (no React rules)
    "commitlint.config.mjs",
    "postcss.config.mjs",
    "release.config.cjs",
    "scripts/**",
  ]),
]);

export default eslintConfig;
