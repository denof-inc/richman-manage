import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';

/**
 * ログイン / サインアップ画面
 * - メール／パスワード入力フォーム
 * - ログイン、新規登録、パスワード忘れボタン
 * - レスポンシブな配置
 */
const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-6">
            {/* ヘッダー部分 */}
            <View className="mb-10 items-center">
              <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-primary-50">
                {/* ロゴを配置 */}
                <Text className="text-3xl font-bold text-primary-600">RM</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-800">
                RichmanManage
              </Text>
              <Text className="mt-1 text-sm text-gray-500">
                不動産投資家向け資産管理アプリ
              </Text>
            </View>

            {/* フォーム部分 */}
            <View className="rounded-xl border border-gray-100 bg-white px-4 py-6 shadow-sm">
              <Text className="mb-6 text-xl font-bold text-gray-800">
                {isSignUp ? '新規登録' : 'ログイン'}
              </Text>

              {/* メールアドレス入力 */}
              <View className="mb-4">
                <Text className="mb-1 text-sm font-medium text-gray-700">メールアドレス</Text>
                <TextInput
                  className="h-12 w-full rounded-lg border border-gray-300 bg-gray-50 px-4"
                  placeholder="mail@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* パスワード入力 */}
              <View className="mb-6">
                <Text className="mb-1 text-sm font-medium text-gray-700">パスワード</Text>
                <TextInput
                  className="h-12 w-full rounded-lg border border-gray-300 bg-gray-50 px-4"
                  placeholder="パスワードを入力"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              {/* ログイン/登録ボタン */}
              <TouchableOpacity
                className="mb-4 h-12 w-full items-center justify-center rounded-lg bg-primary-600"
                onPress={() => {
                  // ログイン処理
                  navigation.navigate('PropertyList');
                }}
              >
                <Text className="text-base font-bold text-white">
                  {isSignUp ? '登録する' : 'ログインする'}
                </Text>
              </TouchableOpacity>

              {/* 切り替えボタン */}
              <TouchableOpacity
                className="mb-4 h-12 w-full items-center justify-center rounded-lg border border-primary-600"
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text className="text-base font-bold text-primary-600">
                  {isSignUp ? 'ログイン画面へ' : '新規登録する'}
                </Text>
              </TouchableOpacity>

              {/* パスワード忘れリンク */}
              {!isSignUp && (
                <TouchableOpacity className="mt-2 items-center">
                  <Text className="text-sm text-primary-500">
                    パスワードを忘れた？
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// PropTypes の定義
LoginScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

export default LoginScreen;
