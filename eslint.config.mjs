import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The Next 16 upgrade promoted this react-hooks rule to error. It
      // flags legitimate patterns (syncing state from matchMedia, audio-
      // player teardown) that pre-date the upgrade, so keep it a warning
      // rather than force risky refactors of working components.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Niet-productie design-exploration bestanden (worden niet gedeployed).
    "src/design-exploration/**",
    "src/app/design-exploration/**",
  ]),
]);

export default eslintConfig;
