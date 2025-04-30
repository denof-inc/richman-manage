// NativeWind + tailwindcss 対応のためのMetro設定
import { getDefaultConfig } from 'expo/metro-config';

const config = getDefaultConfig(__dirname);
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('nativewind/babel'),
};
export default config;
