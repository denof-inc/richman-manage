module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.tsx', '**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '@supabase/supabase-js': '<rootDir>/__mocks__/@supabase/supabase-js.js',
    '@supabase/ssr': '<rootDir>/__mocks__/@supabase/ssr.js',
    'next/headers': '<rootDir>/__mocks__/next/headers.js',
    'next/server': '<rootDir>/__mocks__/next/server.js',
    'zod-openapi': '<rootDir>/__mocks__/zod-openapi.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleDirectories: ['node_modules', '../../node_modules'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(@supabase)/)'],
};
