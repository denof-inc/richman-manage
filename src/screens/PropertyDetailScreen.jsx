import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

/**
 * 物件詳細画面
 * - 物件情報表示（構造、築年、法人名/所有者名、備考）
 * - 借入一覧とレントロールへのリンク
 */
const PropertyDetailScreen = ({ route, navigation }) => {
  const { propertyId } = route.params;
  
  // サンプルデータ
  const property = {
    id: propertyId,
    name: 'グリーンヒルズ南青山',
    structure: 'RC造・地上5階',
    builtYear: 2015,
    ownerType: '法人',
    ownerName: '株式会社リッチマン不動産',
    address: '東京都港区南青山X-XX-XX',
    purchaseDate: '2020年6月',
    purchasePrice: 450000000,
    totalUnits: 10,
    vacantUnits: 1,
    notes: '2023年4月に外壁塗装工事完了。2024年度に給水設備更新予定。',
    monthlyRent: 980000,
    monthlyLoan: 650000,
    monthlyCashflow: 330000,
  };

  // 金額をフォーマットする関数
  const formatCurrency = (amount) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
        <Text className="flex-1 text-xl font-bold text-gray-800">{property.name}</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          onPress={() => {/* 編集機能 */}}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#4b5563" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* 基本情報 */}
        <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm">
          <Text className="mb-4 text-lg font-bold text-gray-800">基本情報</Text>
          
          <View className="space-y-3">
            <View className="flex-row">
              <Text className="w-24 text-sm text-gray-500">構造</Text>
              <Text className="flex-1 text-sm text-gray-800">{property.structure}</Text>
            </View>
            
            <View className="flex-row">
              <Text className="w-24 text-sm text-gray-500">築年</Text>
              <Text className="flex-1 text-sm text-gray-800">{property.builtYear}年（築{new Date().getFullYear() - property.builtYear}年）</Text>
            </View>
            
            <View className="flex-row">
              <Text className="w-24 text-sm text-gray-500">所有</Text>
              <Text className="flex-1 text-sm text-gray-800">{property.ownerType}：{property.ownerName}</Text>
            </View>
            
            <View className="flex-row">
              <Text className="w-24 text-sm text-gray-500">住所</Text>
              <Text className="flex-1 text-sm text-gray-800">{property.address}</Text>
            </View>
            
            <View className="flex-row">
              <Text className="w-24 text-sm text-gray-500">購入日</Text>
              <Text className="flex-1 text-sm text-gray-800">{property.purchaseDate}</Text>
            </View>
            
            <View className="flex-row">
              <Text className="w-24 text-sm text-gray-500">購入価格</Text>
              <Text className="flex-1 text-sm text-gray-800">￥{formatCurrency(property.purchasePrice)}</Text>
            </View>
          </View>
        </View>

        {/* 収支概要 */}
        <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm">
          <Text className="mb-4 text-lg font-bold text-gray-800">収支概要（月額）</Text>
          
          <View className="flex-row justify-between">
            <View className="flex-1 items-center">
              <Text className="mb-1 text-sm text-gray-500">家賃収入</Text>
              <Text className="text-base font-semibold text-gray-800">￥{formatCurrency(property.monthlyRent)}</Text>
            </View>
            
            <View className="flex-1 items-center">
              <Text className="mb-1 text-sm text-gray-500">返済額</Text>
              <Text className="text-base font-semibold text-gray-800">￥{formatCurrency(property.monthlyLoan)}</Text>
            </View>
            
            <View className="flex-1 items-center">
              <Text className="mb-1 text-sm text-gray-500">CF</Text>
              <Text className={`text-base font-semibold ${property.monthlyCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ￥{formatCurrency(property.monthlyCashflow)}
              </Text>
            </View>
          </View>
        </View>

        {/* 備考欄 */}
        <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm">
          <Text className="mb-2 text-lg font-bold text-gray-800">備考</Text>
          <Text className="text-sm text-gray-700">{property.notes}</Text>
        </View>

        {/* サブページリンク */}
        <View className="mx-4 mt-4 rounded-xl bg-white shadow-sm">
          <TouchableOpacity 
            className="flex-row items-center justify-between border-b border-gray-100 p-4"
            onPress={() => navigation.navigate('LoanList', { propertyId })}
          >
            <View className="flex-row items-center">
              <Ionicons name="cash-outline" size={20} color="#4b5563" className="mr-3" />
              <Text className="text-base text-gray-800">借入一覧</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="flex-row items-center justify-between p-4"
            onPress={() => navigation.navigate('RentRollList', { propertyId })}
          >
            <View className="flex-row items-center">
              <Ionicons name="list-outline" size={20} color="#4b5563" className="mr-3" />
              <Text className="text-base text-gray-800">レントロール</Text>
              <View className="ml-2 rounded-full bg-gray-200 px-2">
                <Text className="text-xs text-gray-700">{property.totalUnits - property.vacantUnits}/{property.totalUnits}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
};

// PropTypes の定義
PropertyDetailScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    goBack: PropTypes.func.isRequired,
  }).isRequired,
  route: PropTypes.shape({
    params: PropTypes.shape({
      propertyId: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};

export default PropertyDetailScreen;
