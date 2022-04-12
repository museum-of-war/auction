module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "standard",
    "plugin:prettier/recommended",
    "plugin:node/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    "node/no-missing-import": ["warn"],
    "node/no-unpublished-import": ["warn"],
    "node/no-unsupported-features/es-syntax": [
      "warn",
      { ignores: ["modules"] },
    ],
  },
};
