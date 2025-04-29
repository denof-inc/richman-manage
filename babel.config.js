module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@screens': './src/screens',
            '@components': './src/components',
            '@utils': './src/utils'
          }
        }
      ],
      'nativewind/babel',
      'react-native-reanimated/plugin'
    ]
  };
};