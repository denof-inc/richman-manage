module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-native/all",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["react", "@typescript-eslint", "react-native", "tailwindcss"],
  env: {
    browser: true,
    es6: true,
    node: true,
    "react-native/react-native": true
  },
  settings: {
    react: {
      version: "detect"
    }
  },
  rules: {
    "tailwindcss/classnames-order": "warn",
    "tailwindcss/no-custom-classname": "off",
    "react-native/no-inline-styles": "off",
    "react/react-in-jsx-scope": "off"
  }
};
