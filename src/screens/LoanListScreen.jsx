import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

/**
 * 借入一覧画面
 * - 物件に紐づく借入情報の一覧表示
 * - 借入名、借入物件、残債、金利表示
 * - 新規借入追加ボタン
 */
const LoanListScreen = ({ navigation }) => {
  // 注: 実際の実装では、route.params.propertyIdを使用して物件IDに基づいた借入情報を取得します
  
  // サンプルデータ
  const loans = [
    {
      id: '1',
      name: 'みずほ銀行 事業性ローン',
      propertyName: 'グリーンヒルズ南青山',
      remainingAmount: 235000000,
      interestRate: 1.2,
      startDate: '2020-06-01',
      term: 35,
    },
    {
      id: '2',
      name: '日本政策金融公庫',
      propertyName: 'グリーンヒルズ南青山',
      remainingAmount: 85000000,
      interestRate: 0.9,
      startDate: '2020-06-01',
      term: 20,
    },
  ];

  // 金額をフォーマットする関数
  const formatCurrency = (amount) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 個別の借入カード
  const LoanCard = ({ item }) => (
    <TouchableOpacity
      className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
      onPress={() => navigation.navigate('LoanDetail', { loanId: item.id })}
    >
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-800">{item.name}</Text>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>
      
      <View className="mb-3">
        <Text className="mb-1 text-xs text-gray-500">借入物件</Text>
        <Text className="text-sm text-gray-700">{item.propertyName}</Text>
      </View>
      
      <View className="flex-row">
        <View className="flex-1">
          <Text className="mb-1 text-xs text-gray-500">残債</Text>
          <Text className="text-base font-medium text-gray-800">￥{formatCurrency(item.remainingAmount)}</Text>
        </View>
        
        <View className="flex-1">
          <Text className="mb-1 text-xs text-gray-500">金利</Text>
          <Text className="text-base font-medium text-gray-800">{item.interestRate}%</Text>
        </View>
        
        <View className="flex-1">
          <Text className="mb-1 text-xs text-gray-500">期間</Text>
          <Text className="text-base font-medium text-gray-800">{item.term}年</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // LoanCardのPropTypes定義
  LoanCard.propTypes = {
    item: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      propertyName: PropTypes.string.isRequired,
      remainingAmount: PropTypes.number.isRequired,
      interestRate: PropTypes.number.isRequired,
      startDate: PropTypes.string.isRequired,
      term: PropTypes.number.isRequired,
    }).isRequired,
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
        <Text className="flex-1 text-xl font-bold text-gray-800">借入一覧</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          onPress={() => {/* フィルター機能 */}}
        >
          <Ionicons name="filter-outline" size={20} color="#4b5563" />
        </TouchableOpacity>
      </View>

      {/* 借入リスト */}
      <View className="flex-1 px-4 pt-4">
        <FlatList
          data={loans}
          renderItem={({ item }) => <LoanCard item={item} />}
          keyExtractor={() => Math.random().toString()}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-8">
              <Text className="text-gray-500">借入データがありません</Text>
            </View>
          }
        />
      </View>

      {/* 借入追加ボタン */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary-600 shadow-lg"
        onPress={() => {/* 借入追加画面へ遷移 */}}
      >
        <Ionicons name="add" size={26} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// PropTypes の定義
LoanListScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    goBack: PropTypes.func.isRequired,
  }).isRequired,
};

export default LoanListScreen;
