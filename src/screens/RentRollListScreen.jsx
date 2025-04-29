import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

/**
 * レントロール一覧画面
 * - 全部屋のリスト表示（部屋番号、物件名、賃料、空室ステータス）
 * - 検索・フィルター機能
 */
const RentRollListScreen = ({ route, navigation }) => {
  const { propertyId } = route.params;
  const [searchText, setSearchText] = useState('');
  const [filterVacant, setFilterVacant] = useState(false);
  
  // サンプルデータ
  const property = {
    id: propertyId,
    name: 'グリーンヒルズ南青山',
  };
  
  const rooms = [
    {
      id: '1',
      roomNumber: '101',
      propertyName: 'グリーンヒルズ南青山',
      layout: '1LDK',
      area: 45.5,
      rent: 95000,
      isVacant: false,
      tenant: '山田 太郎',
      contractEndDate: '2026-03-31',
    },
    {
      id: '2',
      roomNumber: '102',
      propertyName: 'グリーンヒルズ南青山',
      layout: '1LDK',
      area: 45.5,
      rent: 95000,
      isVacant: false,
      tenant: '佐藤 花子',
      contractEndDate: '2025-09-30',
    },
    {
      id: '3',
      roomNumber: '201',
      propertyName: 'グリーンヒルズ南青山',
      layout: '2LDK',
      area: 58.2,
      rent: 120000,
      isVacant: false,
      tenant: '鈴木 一郎',
      contractEndDate: '2026-01-31',
    },
    {
      id: '4',
      roomNumber: '202',
      propertyName: 'グリーンヒルズ南青山',
      layout: '2LDK',
      area: 58.2,
      rent: 120000,
      isVacant: true,
      tenant: null,
      contractEndDate: null,
    },
    {
      id: '5',
      roomNumber: '301',
      propertyName: 'グリーンヒルズ南青山',
      layout: '3LDK',
      area: 72.8,
      rent: 150000,
      isVacant: false,
      tenant: '田中 健太',
      contractEndDate: '2025-11-30',
    },
  ];

  // 検索とフィルタリングを適用
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.roomNumber.includes(searchText) || 
                          (room.tenant && room.tenant.includes(searchText));
    if (filterVacant) {
      return matchesSearch && room.isVacant;
    }
    return matchesSearch;
  });

  // 金額をフォーマットする関数
  const formatCurrency = (amount) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 個別の部屋カード
  const RoomCard = ({ item }) => (
    <TouchableOpacity
      className="mb-3 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
      onPress={() => navigation.navigate('RoomDetail', { roomId: item.id })}
    >
      <View className="px-4 py-3">
        <View className="mb-2 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="text-lg font-bold text-gray-800">{item.roomNumber}号室</Text>
            <Text className="ml-2 text-sm text-gray-500">{item.layout}</Text>
          </View>
          
          <View className={`rounded-full px-2 py-1 ${item.isVacant ? 'bg-red-100' : 'bg-green-100'}`}>
            <Text className={`text-xs font-medium ${item.isVacant ? 'text-red-600' : 'text-green-600'}`}>
              {item.isVacant ? '空室' : '入居中'}
            </Text>
          </View>
        </View>
        
        <View className="mt-1 flex-row justify-between">
          <View className="flex-1">
            <Text className="mb-1 text-xs text-gray-500">賃料</Text>
            <Text className="text-base font-medium text-gray-800">￥{formatCurrency(item.rent)}</Text>
          </View>
          
          <View className="flex-1">
            <Text className="mb-1 text-xs text-gray-500">専有面積</Text>
            <Text className="text-base font-medium text-gray-800">{item.area}㎡</Text>
          </View>
          
          <View className="flex-2">
            <Text className="mb-1 text-xs text-gray-500">入居者</Text>
            <Text className="text-base font-medium text-gray-800">{item.tenant || '-'}</Text>
          </View>
        </View>
      </View>
      
      {/* ステータスバー */}
      {!item.isVacant && (
        <View className="h-1 w-full bg-gray-200">
          {/* 契約残り期間を視覚化 */}
          <View 
            className="h-full bg-blue-500" 
            style={{ 
              width: '70%' // 本来は契約期間に基づいて計算
            }} 
          />
        </View>
      )}
    </TouchableOpacity>
  );

  // RoomCardのPropTypes
  RoomCard.propTypes = {
    item: PropTypes.shape({
      id: PropTypes.string.isRequired,
      roomNumber: PropTypes.string.isRequired,
      propertyName: PropTypes.string.isRequired,
      layout: PropTypes.string.isRequired,
      area: PropTypes.number.isRequired,
      rent: PropTypes.number.isRequired,
      isVacant: PropTypes.bool.isRequired,
      tenant: PropTypes.string,
      contractEndDate: PropTypes.string,
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
        <Text className="flex-1 text-xl font-bold text-gray-800">レントロール</Text>
        <Text className="mr-2 text-sm text-gray-500">{property.name}</Text>
      </View>

      {/* 検索とフィルター */}
      <View className="border-b border-gray-200 bg-white px-4 py-3">
        <View className="mb-3 flex-row">
          <View className="mr-2 flex-1 flex-row items-center rounded-lg bg-gray-100 px-3">
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              className="ml-2 h-10 flex-1 text-gray-800"
              placeholder="部屋番号・入居者名で検索"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          
          <TouchableOpacity
            className={`items-center justify-center rounded-lg px-3 ${filterVacant ? 'bg-primary-600' : 'bg-gray-200'}`}
            onPress={() => setFilterVacant(!filterVacant)}
          >
            <Text className={`font-medium ${filterVacant ? 'text-white' : 'text-gray-700'}`}>空室のみ</Text>
          </TouchableOpacity>
        </View>
        
        <View className="flex-row items-center">
          <Text className="text-sm text-gray-500">表示：</Text>
          <Text className="ml-1 text-sm font-medium text-gray-800">
            {filteredRooms.length}部屋
          </Text>
          <Text className="ml-3 text-sm text-gray-500">空室：</Text>
          <Text className="ml-1 text-sm font-medium text-gray-800">
            {rooms.filter(room => room.isVacant).length}部屋
          </Text>
          <Text className="ml-3 text-sm text-gray-500">入居率：</Text>
          <Text className="ml-1 text-sm font-medium text-gray-800">
            {Math.round((rooms.length - rooms.filter(room => room.isVacant).length) / rooms.length * 100)}%
          </Text>
        </View>
      </View>

      {/* 部屋リスト */}
      <View className="flex-1 px-4 pt-4">
        <FlatList
          data={filteredRooms}
          renderItem={({ item }) => <RoomCard item={item} />}
          keyExtractor={() => Math.random().toString()}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-8">
              <Text className="text-gray-500">該当する部屋がありません</Text>
            </View>
          }
        />
      </View>

      {/* 部屋追加ボタン */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary-600 shadow-lg"
        onPress={() => {/* 部屋追加画面へ遷移 */}}
      >
        <Ionicons name="add" size={26} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// PropTypes の定義
RentRollListScreen.propTypes = {
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

export default RentRollListScreen;
