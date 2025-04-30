import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { styled } from 'nativewind';

// NativeWindの設定: styled-components風に利用可能
const StyledView = styled('View');
const StyledText = styled('Text');

/**
 * RichmanManage アプリのメインコンポーネント
 * モバイルアプリ全体のエントリーポイント
 */
const App = () => {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* NativeWindの動作確認用サンプル */}
      <StyledView className="flex-1 justify-center items-center bg-primary-100">
        <StyledText className="text-lg font-bold text-primary-700">NativeWindスタイル適用テスト</StyledText>
      </StyledView>
      <AppNavigator />
    </SafeAreaProvider>
  );
};

export default App;
