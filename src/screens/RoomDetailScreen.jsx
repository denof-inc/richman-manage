import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

/**
 * 部屋詳細画面
 * - 間取り、専有面積、賃料履歴、入退去履歴、備考欄を表示
 * - タブで情報を整理
 */
const RoomDetailScreen = ({ route, navigation }) => {
  const { roomId } = route.params;
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'rentHistory', 'tenantHistory'
  
  // サンプルデータ
  const room = {
    id: roomId,
    roomNumber: '201',
    propertyName: 'グリーンヒルズ南青山',
    layout: '2LDK',
    area: 58.2,
    direction: '南東',
    floor: 2,
    currentRent: 120000,
    isVacant: false,
    tenant: '鈴木 一郎',
    contractStartDate: '2023-02-01',
    contractEndDate: '2026-01-31',
    deposit: 240000,
    keyMoney: 120000,
    notes: '2022年12月に全面リフォーム実施。キッチン設備一新。',
  };
  
  // 賃料履歴データ
  const rentHistory = [
    { startDate: '2023-02-01', endDate: null, amount: 120000, tenant: '鈴木 一郎' },
    { startDate: '2020-03-01', endDate: '2023-01-31', amount: 118000, tenant: '高橋 雅子' },
    { startDate: '2018-04-01', endDate: '2020-02-28', amount: 115000, tenant: '佐々木 健太' },
  ];
  
  // 入退去履歴データ
  const tenantHistory = [
    { 
      tenant: '鈴木 一郎',
      moveInDate: '2023-02-01',
      moveOutDate: null,
      contractPeriod: 36, // 月単位
      initialRent: 120000,
      currentRent: 120000,
      status: '入居中'
    },
    { 
      tenant: '高橋 雅子',
      moveInDate: '2020-03-01',
      moveOutDate: '2023-01-31',
      contractPeriod: 24,
      initialRent: 118000,
      currentRent: 118000, 
      status: '退去済'
    },
    { 
      tenant: '佐々木 健太',
      moveInDate: '2018-04-01',
      moveOutDate: '2020-02-28',
      contractPeriod: 24,
      initialRent: 115000,
      currentRent: 115000,
      status: '退去済'
    },
  ];

  // 金額をフォーマットする関数
  const formatCurrency = (amount) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  // 日付をフォーマットする関数
  const formatDate = (dateString) => {
    if (!dateString) return '現在';
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
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
        <Text className="flex-1 text-xl font-bold text-gray-800">{room.roomNumber}号室</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          onPress={() => {/* 編集機能 */}}
        >
          <Ionicons name="pencil-outline" size={20} color="#4b5563" />
        </TouchableOpacity>
      </View>

      {/* ステータスバナー */}
      <View className={`px-4 py-2 ${room.isVacant ? 'bg-red-50' : 'bg-green-50'}`}>
        <Text className={`text-sm font-medium ${room.isVacant ? 'text-red-600' : 'text-green-600'}`}>
          {room.isVacant ? '空室' : '入居中： ' + room.tenant + '（契約終了：' + formatDate(room.contractEndDate) + '）'}
        </Text>
      </View>

      {/* タブメニュー */}
      <View className="flex-row border-b border-gray-200 bg-white">
        <TouchableOpacity
          className={`flex-1 py-3 ${activeTab === 'info' ? 'border-b-2 border-primary-600' : ''}`}
          onPress={() => setActiveTab('info')}
        >
          <Text className={`text-center ${activeTab === 'info' ? 'font-medium text-primary-600' : 'text-gray-600'}`}>
            基本情報
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className={`flex-1 py-3 ${activeTab === 'rentHistory' ? 'border-b-2 border-primary-600' : ''}`}
          onPress={() => setActiveTab('rentHistory')}
        >
          <Text className={`text-center ${activeTab === 'rentHistory' ? 'font-medium text-primary-600' : 'text-gray-600'}`}>
            賃料履歴
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className={`flex-1 py-3 ${activeTab === 'tenantHistory' ? 'border-b-2 border-primary-600' : ''}`}
          onPress={() => setActiveTab('tenantHistory')}
        >
          <Text className={`text-center ${activeTab === 'tenantHistory' ? 'font-medium text-primary-600' : 'text-gray-600'}`}>
            入退去履歴
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {activeTab === 'info' && (
          <View className="p-4">
            {/* 部屋基本情報 */}
            <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
              <Text className="mb-4 text-lg font-bold text-gray-800">部屋情報</Text>
              
              <View className="space-y-3">
                <View className="flex-row">
                  <Text className="w-24 text-sm text-gray-500">物件名</Text>
                  <Text className="flex-1 text-sm text-gray-800">{room.propertyName}</Text>
                </View>
                
                <View className="flex-row">
                  <Text className="w-24 text-sm text-gray-500">間取り</Text>
                  <Text className="flex-1 text-sm text-gray-800">{room.layout}</Text>
                </View>
                
                <View className="flex-row">
                  <Text className="w-24 text-sm text-gray-500">専有面積</Text>
                  <Text className="flex-1 text-sm text-gray-800">{room.area}㎡</Text>
                </View>
                
                <View className="flex-row">
                  <Text className="w-24 text-sm text-gray-500">階数</Text>
                  <Text className="flex-1 text-sm text-gray-800">{room.floor}階</Text>
                </View>
                
                <View className="flex-row">
                  <Text className="w-24 text-sm text-gray-500">方角</Text>
                  <Text className="flex-1 text-sm text-gray-800">{room.direction}</Text>
                </View>
              </View>
            </View>
            
            {/* 賃料情報 */}
            <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
              <Text className="mb-4 text-lg font-bold text-gray-800">賃料情報</Text>
              
              <View className="space-y-3">
                <View className="flex-row">
                  <Text className="w-24 text-sm text-gray-500">現在の賃料</Text>
                  <Text className="flex-1 text-sm font-medium text-gray-800">￥{formatCurrency(room.currentRent)}</Text>
                </View>
                
                <View className="flex-row">
                  <Text className="w-24 text-sm text-gray-500">敷金</Text>
                  <Text className="flex-1 text-sm text-gray-800">￥{formatCurrency(room.deposit)}</Text>
                </View>
                
                <View className="flex-row">
                  <Text className="w-24 text-sm text-gray-500">礼金</Text>
                  <Text className="flex-1 text-sm text-gray-800">￥{formatCurrency(room.keyMoney)}</Text>
                </View>
              </View>
            </View>
            
            {/* 備考欄 */}
            <View className="rounded-xl bg-white p-4 shadow-sm">
              <Text className="mb-2 text-lg font-bold text-gray-800">備考</Text>
              <Text className="text-sm text-gray-700">{room.notes}</Text>
            </View>
          </View>
        )}
        
        {activeTab === 'rentHistory' && (
          <View className="p-4">
            <View className="rounded-xl bg-white p-4 shadow-sm">
              <Text className="mb-4 text-lg font-bold text-gray-800">賃料履歴</Text>
              
              {rentHistory.map((item, index) => (
                <View key={index} className="border-b border-gray-100 py-3">
                  <View className="mb-1 flex-row justify-between">
                    <Text className="text-sm font-medium text-gray-800">￥{formatCurrency(item.amount)}</Text>
                    <Text className="text-xs text-gray-500">
                      {formatDate(item.startDate)} 〜 {formatDate(item.endDate)}
                    </Text>
                  </View>
                  <Text className="text-sm text-gray-600">入居者：{item.tenant}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {activeTab === 'tenantHistory' && (
          <View className="p-4">
            <View className="rounded-xl bg-white p-4 shadow-sm">
              <Text className="mb-4 text-lg font-bold text-gray-800">入退去履歴</Text>
              
              {tenantHistory.map((item, index) => (
                <View key={index} className="mb-3 rounded-lg border border-gray-100 bg-white p-3">
                  <View className="mb-2 flex-row justify-between">
                    <Text className="text-base font-medium text-gray-800">{item.tenant}</Text>
                    <View className={`rounded-full px-2 py-1 ${item.status === '入居中' ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Text className={`text-xs font-medium ${item.status === '入居中' ? 'text-green-600' : 'text-gray-600'}`}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  
                  <View className="space-y-2">
                    <View className="flex-row">
                      <Text className="w-16 text-xs text-gray-500">入居日</Text>
                      <Text className="text-xs text-gray-800">{formatDate(item.moveInDate)}</Text>
                    </View>
                    
                    <View className="flex-row">
                      <Text className="w-16 text-xs text-gray-500">退去日</Text>
                      <Text className="text-xs text-gray-800">{formatDate(item.moveOutDate)}</Text>
                    </View>
                    
                    <View className="flex-row">
                      <Text className="w-16 text-xs text-gray-500">契約期間</Text>
                      <Text className="text-xs text-gray-800">{item.contractPeriod}ヶ月</Text>
                    </View>
                    
                    <View className="flex-row">
                      <Text className="w-16 text-xs text-gray-500">初期賃料</Text>
                      <Text className="text-xs text-gray-800">￥{formatCurrency(item.initialRent)}</Text>
                    </View>
                    
                    <View className="flex-row">
                      <Text className="w-16 text-xs text-gray-500">最終賃料</Text>
                      <Text className="text-xs text-gray-800">￥{formatCurrency(item.currentRent)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// PropTypes の定義
RoomDetailScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    goBack: PropTypes.func.isRequired,
  }).isRequired,
  route: PropTypes.shape({
    params: PropTypes.shape({
      roomId: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};

export default RoomDetailScreen;
