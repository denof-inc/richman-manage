import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

/**
 * 物件一覧画面
 * - 所有物件をカード表示
 * - 物件名、月間家賃収入、月間返済額、月間キャッシュフロー表示
 * - 物件追加ボタン
 */
const PropertyListScreen = ({ navigation }) => {
  // サンプルデータ
  const properties = [
    {
      id: '1',
      name: 'グリーンヒルズ南青山',
      monthlyRent: 980000,
      monthlyLoan: 650000,
      monthlyCashflow: 330000,
    },
    {
      id: '2',
      name: 'サンシャインコート麻布',
      monthlyRent: 1250000,
      monthlyLoan: 820000,
      monthlyCashflow: 430000,
    },
    {
      id: '3',
      name: 'パークサイド渋谷',
      monthlyRent: 850000,
      monthlyLoan: 580000,
      monthlyCashflow: 270000,
    },
    {
      id: '4',
      name: 'リバーフロント東京',
      monthlyRent: 1580000,
      monthlyLoan: 1120000,
      monthlyCashflow: 460000,
    },
  ];

  // 金額をフォーマットする関数
  const formatCurrency = (amount) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 個別のプロパティカード
  const PropertyCard = ({ item }) => (
    <TouchableOpacity
      className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
      onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.id })}
    >
      <View className="px-4 py-4">
        <Text className="mb-2 text-lg font-bold text-gray-800">{item.name}</Text>
        
        <View className="mt-2 flex-row justify-between">
          <View className="flex-1">
            <Text className="text-xs text-gray-500">月間家賃収入</Text>
            <Text className="text-base font-medium text-gray-800">
              ¥{formatCurrency(item.monthlyRent)}
            </Text>
          </View>
          
          <View className="flex-1">
            <Text className="text-xs text-gray-500">月間返済額</Text>
            <Text className="text-base font-medium text-gray-800">
              ¥{formatCurrency(item.monthlyLoan)}
            </Text>
          </View>
          
          <View className="flex-1">
            <Text className="text-xs text-gray-500">月間CF</Text>
            <Text className={`text-base font-medium ${item.monthlyCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ¥{formatCurrency(item.monthlyCashflow)}
            </Text>
          </View>
        </View>
      </View>
      
      {/* カード下部のステータスバー */}
      <View className="h-1.5 w-full">
        <View 
          className="h-full bg-green-500" 
          style={{ width: `${Math.min(item.monthlyCashflow / item.monthlyRent * 100, 100)}%` }} 
        />
      </View>
    </TouchableOpacity>
  );

  // PropertyCardのPropTypes定義
  PropertyCard.propTypes = {
    item: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      monthlyRent: PropTypes.number.isRequired,
      monthlyLoan: PropTypes.number.isRequired,
      monthlyCashflow: PropTypes.number.isRequired,
    }).isRequired,
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* ヘッダー */}
      <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-4">
        <Text className="text-xl font-bold text-gray-800">物件一覧</Text>
        
        <View className="flex-row">
          <TouchableOpacity
            className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-gray-100"
            onPress={() => {/* フィルター機能 */}}
          >
            <Ionicons name="filter-outline" size={20} color="#4b5563" />
          </TouchableOpacity>
          
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={20} color="#4b5563" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 物件リスト */}
      <View className="flex-1 px-4 pt-4">
        <FlatList
          data={properties}
          renderItem={({ item }) => <PropertyCard item={item} />}
          keyExtractor={() => Math.random().toString()}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* 追加ボタン */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary-600 shadow-lg"
        onPress={() => {/* 物件追加画面へ遷移 */}}
      >
        <Ionicons name="add" size={26} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// PropTypes の定義
PropertyListScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    goBack: PropTypes.func.isRequired,
  }).isRequired,
};

export default PropertyListScreen;
