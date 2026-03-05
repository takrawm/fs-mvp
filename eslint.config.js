import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/", "**/node_modules/", "**/*.js"],
  },
  ...tseslint.configs.strict,
  {
    rules: {
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },
  {
    files: ["packages/domain/src/account/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["../period/*", "../rule/*", "../computation/*", "../statement/*"] },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/domain/src/money/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["../account/*", "../period/*", "../rule/*", "../computation/*", "../statement/*"] },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/domain/src/period/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["../rule/*", "../computation/*", "../statement/*"] },
          ],
        },
      ],
    },
  },
);
