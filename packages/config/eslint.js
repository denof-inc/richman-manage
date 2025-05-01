module.exports = {
  extends: [
    "next",
    "prettier",
    "plugin:tailwindcss/recommended",
  ],
  plugins: ["tailwindcss"],
  settings: {
    tailwindcss: {
      callees: ["cn", "cva"],
      config: "tailwind.config.js",
    },
    next: {
      rootDir: ["apps/*/"],
    },
  },
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "react/jsx-key": "warn",
    "tailwindcss/no-custom-classname": "off",
  },
  ignorePatterns: [
    "node_modules",
    ".next",
    "out",
    "dist",
    "build",
  ],
};
