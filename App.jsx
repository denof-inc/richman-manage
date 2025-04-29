import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { NativeWindStyleSheet } from 'nativewind';

// NativeWindのスタイルシートを最適化（ネイティブ出力設定）
NativeWindStyleSheet.setOutput({
  default: 'native',
});

/**
 * RichmanManage アプリのメインコンポーネント
 * モバイルアプリ全体のエントリーポイント
 */
const App = () => {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppNavigator />
    </SafeAreaProvider>
  );
};

export default App;
