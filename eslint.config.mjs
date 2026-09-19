import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // Repository functions keep the actor in their signature even when the
      // query does not need it (rule 3), so `_actor` is intentionally unused.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  // CLAUDE.md rule 3: the repository layer is the security boundary.
  // Nothing outside lib/db/** may touch mongoose or a model directly.
  {
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    ignores: ["lib/db/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "mongoose",
              message: "Only lib/db/** may use mongoose. Go through lib/db/repositories/*.",
            },
          ],
          patterns: [
            {
              group: ["@/lib/db/models", "@/lib/db/models/*", "**/db/models", "**/db/models/*"],
              message: "Models are only importable by lib/db/repositories/*. Use a repository.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
