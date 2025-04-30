# NativeWind スタイリング問題の解決策

## 問題の概要
Expo v52とNativeWind v4の組み合わせでスタイルが適用されない問題が発生しています。この問題は、Expoのバージョンとの互換性、Babelの設定、およびMetro bundlerの設定に関連しています。

## 推奨解決策: Expo SDK 48 + NativeWind v2への移行

### 1. Expoのダウングレード
```bash
npx expo install expo@48.0.18 react-native@0.71.8 react@18.2.0
```

### 2. NativeWindのダウングレード
```bash
npm install nativewind@2.0.11 --legacy-peer-deps
npm install --save-dev tailwindcss@3.3.2
```

### 3. 必要な依存関係のインストール
```bash
npm install --save-dev react-native-css-transformer
npm install react-native-reanimated@~2.14.4 --legacy-peer-deps
```

### 4. 設定ファイルの更新

#### babel.config.js
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['nativewind/babel', { mode: 'compileOnly' }],
      // 他のプラグイン...
      'react-native-reanimated/plugin'
    ]
  };
};
```

#### metro.config.js (新規作成)
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts = [...config.resolver.sourceExts, 'css'];
config.transformer.babelTransformerPath = require.resolve('react-native-css-transformer');

module.exports = config;
```

#### global.css (新規作成)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### tailwind.config.js
```javascript
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

#### postcss.config.js (新規作成)
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
  },
};
```

### 5. コンポーネントでの使用方法
```jsx
import React from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);

const MyComponent = () => {
  return (
    <StyledView className="p-4 bg-blue-500 rounded-lg">
      <StyledText className="text-white font-bold">Hello NativeWind</StyledText>
    </StyledView>
  );
};
```

### 6. App.jsでのインポート
```jsx
import './global.css';
// 他のインポート...
```

### 7. 起動時の設定
```bash
export NODE_OPTIONS=--openssl-legacy-provider && npx expo start
```

## 解決策の根拠

1. **互換性の問題**: Expo v52とNativeWind v4の組み合わせには互換性の問題があります。Expo SDK 48とNativeWind v2の組み合わせは安定していることが確認されています。

2. **設定の複雑さ**: 新しいバージョンでは設定が複雑化し、特にMetro bundlerとBabelの設定に関する問題が発生しやすくなっています。

3. **依存関係の競合**: 新しいバージョンでは依存関係の競合が発生しやすく、特にreact-native-reanimatedとの互換性に問題があります。

4. **コミュニティのサポート**: NativeWind v2はコミュニティでの使用実績が豊富で、問題解決のためのリソースが多く存在します。

## 代替案: 現在のバージョンでの解決策

現在のExpo v52とNativeWind v4を使用する場合は、以下の点に注意する必要があります：

1. NativeWind v4では、styled HOCの使用方法が変更されています。
2. Babelプラグインの設定が異なります。
3. postcss.config.jsの設定が必要です。
4. webpack.config.jsの設定が必要になる場合があります。

しかし、これらの設定を適切に行っても、依存関係の競合や互換性の問題が解決されない可能性があります。そのため、Expo SDK 48とNativeWind v2への移行が最も確実な解決策です。
