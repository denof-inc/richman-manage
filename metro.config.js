const { getDefaultConfig } = require('expo/metro-config');
const { createRequire } = require('module');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = [...config.resolver.sourceExts, 'css'];

config.transformer.babelTransformerPath = require.resolve('react-native-css-transformer');

module.exports = config;
