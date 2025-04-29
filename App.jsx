import React from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { NativeWindStyleSheet } from 'nativewind';
import TestComponent from './src/components/TestComponent';
import './global.css';

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
      <View style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 999 }}>
        <TestComponent />
      </View>
      <AppNavigator />
    </SafeAreaProvider>
  );
};

export default App;
