// Expo依存なしのMetro設定（NativeWind対応/ESM形式）
import { getDefaultConfig } from 'metro-config';

const configPromise = getDefaultConfig();

export default (async () => {
  const config = await configPromise;
  config.transformer = {
    ...config.transformer,
    babelTransformerPath: require.resolve('nativewind/babel'),
  };
  return config;
})();
