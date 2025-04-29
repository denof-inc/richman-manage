import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

/**
 * 設定画面
 * - 所有者切替（個人／法人）
 * - ユーザー情報編集
 * - ログアウト機能
 */
const SettingsScreen = ({ navigation }) => {
  const [ownerType, setOwnerType] = useState('corporate'); // 'personal' or 'corporate'
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  
  // サンプルデータ
  const user = {
    name: '山田 太郎',
    email: 'yamada@example.com',
    phone: '090-1234-5678',
    companyName: '株式会社リッチマン不動産',
  };

  // ログアウト確認
  const confirmLogout = () => {
    Alert.alert(
      'ログアウト確認',
      'ログアウトしてもよろしいですか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: 'ログアウト',
          onPress: () => {
            // ログアウト処理
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* ヘッダー */}
      <View className="flex-row items-center border-b border-gray-200 bg-white px-4 py-4">
        <TouchableOpacity
          className="mr-4"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#4b5563" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-gray-800">設定</Text>
      </View>

      <View className="flex-1 px-4 py-4">
        {/* ユーザー情報セクション */}
        <View className="mb-6 overflow-hidden rounded-xl bg-white shadow-sm">
          <View className="border-b border-gray-100 px-4 py-5">
            <View className="flex-row items-center">
              <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                <Text className="text-lg font-bold text-primary-600">
                  {user.name.substring(0, 1)}
                </Text>
              </View>
              
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800">{user.name}</Text>
                <Text className="text-sm text-gray-500">{user.email}</Text>
              </View>
              
              <TouchableOpacity
                className="rounded-full bg-gray-100 p-2"
                onPress={() => {/* ユーザー情報編集 */}}
              >
                <Ionicons name="pencil-outline" size={18} color="#4b5563" />
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            className="flex-row items-center justify-between px-4 py-4"
            onPress={() => {/* プロフィール編集画面へ遷移 */}}
          >
            <View className="flex-row items-center">
              <Ionicons name="person-outline" size={20} color="#4b5563" className="mr-3" />
              <Text className="text-base text-gray-800">プロフィール編集</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* 所有者タイプ切り替え */}
        <View className="mb-6 rounded-xl bg-white shadow-sm">
          <View className="border-b border-gray-100 px-4 py-3">
            <Text className="text-base font-bold text-gray-800">所有者タイプ</Text>
          </View>
          
          <View className="px-4 py-2">
            <View className="flex-row">
              <TouchableOpacity
                className={`mr-2 flex-1 rounded-lg px-4 py-3 ${ownerType === 'personal' ? 'border border-primary-300 bg-primary-100' : 'bg-gray-100'}`}
                onPress={() => setOwnerType('personal')}
              >
                <View className="items-center">
                  <Ionicons 
                    name="person" 
                    size={24} 
                    color={ownerType === 'personal' ? '#4f46e5' : '#6b7280'} 
                  />
                  <Text className={`mt-1 font-medium ${ownerType === 'personal' ? 'text-primary-800' : 'text-gray-700'}`}>
                    個人
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                className={`ml-2 flex-1 rounded-lg px-4 py-3 ${ownerType === 'corporate' ? 'border border-primary-300 bg-primary-100' : 'bg-gray-100'}`}
                onPress={() => setOwnerType('corporate')}
              >
                <View className="items-center">
                  <Ionicons 
                    name="business" 
                    size={24} 
                    color={ownerType === 'corporate' ? '#4f46e5' : '#6b7280'} 
                  />
                  <Text className={`mt-1 font-medium ${ownerType === 'corporate' ? 'text-primary-800' : 'text-gray-700'}`}>
                    法人
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            
            {ownerType === 'corporate' && (
              <View className="mb-1 mt-3">
                <Text className="mb-1 text-sm text-gray-500">法人名</Text>
                <Text className="text-base text-gray-800">{user.companyName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* アプリ設定 */}
        <View className="mb-6 rounded-xl bg-white shadow-sm">
          <View className="border-b border-gray-100 px-4 py-3">
            <Text className="text-base font-bold text-gray-800">アプリ設定</Text>
          </View>
          
          <View className="divide-y divide-gray-100">
            <View className="flex-row items-center justify-between px-4 py-3">
              <View className="flex-row items-center">
                <Ionicons name="notifications-outline" size={20} color="#4b5563" className="mr-3" />
                <Text className="text-base text-gray-800">通知</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                thumbColor={notificationsEnabled ? "#3b82f6" : "#f3f4f6"}
              />
            </View>
            
            <View className="flex-row items-center justify-between px-4 py-3">
              <View className="flex-row items-center">
                <Ionicons name="moon-outline" size={20} color="#4b5563" className="mr-3" />
                <Text className="text-base text-gray-800">ダークモード</Text>
              </View>
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                thumbColor={darkModeEnabled ? "#3b82f6" : "#f3f4f6"}
              />
            </View>
            
            <TouchableOpacity 
              className="flex-row items-center justify-between px-4 py-3"
              onPress={() => {/* 通貨設定画面へ遷移 */}}
            >
              <View className="flex-row items-center">
                <Ionicons name="cash-outline" size={20} color="#4b5563" className="mr-3" />
                <Text className="text-base text-gray-800">通貨設定</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="mr-1 text-sm text-gray-500">¥ JPY</Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* サポートとその他 */}
        <View className="mb-6 rounded-xl bg-white shadow-sm">
          <View className="divide-y divide-gray-100">
            <TouchableOpacity 
              className="flex-row items-center justify-between px-4 py-3"
              onPress={() => {/* ヘルプ・サポート画面へ遷移 */}}
            >
              <View className="flex-row items-center">
                <Ionicons name="help-circle-outline" size={20} color="#4b5563" className="mr-3" />
                <Text className="text-base text-gray-800">ヘルプ＆サポート</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center justify-between px-4 py-3"
              onPress={() => {/* 利用規約画面へ遷移 */}}
            >
              <View className="flex-row items-center">
                <Ionicons name="document-text-outline" size={20} color="#4b5563" className="mr-3" />
                <Text className="text-base text-gray-800">利用規約</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center justify-between px-4 py-3"
              onPress={() => {/* プライバシーポリシー画面へ遷移 */}}
            >
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark-outline" size={20} color="#4b5563" className="mr-3" />
                <Text className="text-base text-gray-800">プライバシーポリシー</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row px-4 py-3"
              onPress={confirmLogout}
            >
              <View className="flex-row items-center">
                <Ionicons name="log-out-outline" size={20} color="#ef4444" className="mr-3" />
                <Text className="text-base text-red-500">ログアウト</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        
        <View className="mb-4 items-center">
          <Text className="text-xs text-gray-400">アプリバージョン 1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

// PropTypes の定義
SettingsScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    goBack: PropTypes.func.isRequired,
    reset: PropTypes.func.isRequired,
  }).isRequired,
};

export default SettingsScreen;
