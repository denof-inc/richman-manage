const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve('react-native-css-interop/transformer');

config.resolver.sourceExts = [...config.resolver.sourceExts, 'css'];

module.exports = config;
