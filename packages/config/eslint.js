// Require the needed packages
try {
  require('eslint-config-turbo');
} catch (e) {
  // Package might be installed elsewhere
}

module.exports = {
  extends: ['next', 'turbo', 'prettier', 'plugin:tailwindcss/recommended'],
  plugins: ['tailwindcss'],
  settings: {
    tailwindcss: {
      callees: ['cn', 'cva'],
      config: 'tailwind.config.js',
    },
    next: {
      rootDir: ['apps/*/'],
    },
  },
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
    'react/jsx-key': 'warn',
    'tailwindcss/no-custom-classname': 'off',
  },
  ignorePatterns: ['node_modules', '.next', 'out', 'dist', 'build'],
};
