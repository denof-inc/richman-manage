import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

/**
 * 借入詳細画面
 * - 借入額、金利履歴（変更年月＋金利）
 * - 毎月の返済履歴（元金・利息・残債）
 */
const LoanDetailScreen = ({ route, navigation }) => {
  const { loanId } = route.params;
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'interestHistory', 'paymentHistory'
  
  // サンプルデータ
  const loan = {
    id: loanId,
    name: 'みずほ銀行 事業性ローン',
    propertyName: 'グリーンヒルズ南青山',
    initialAmount: 250000000,
    remainingAmount: 235000000,
    currentInterestRate: 1.2,
    startDate: '2020-06-01',
    term: 35,
    paymentType: '元利均等',
    monthlyPayment: 650000,
    nextPaymentDate: '2025-05-10',
  };
  
  // 金利履歴データ
  const interestHistory = [
    { date: '2020-06-01', rate: 1.5 },
    { date: '2022-06-01', rate: 1.3 },
    { date: '2024-01-01', rate: 1.2 },
  ];
  
  // 返済履歴データ
  const paymentHistory = [
    { date: '2025-04-10', principal: 450000, interest: 200000, remaining: 235000000 },
    { date: '2025-03-10', principal: 448000, interest: 202000, remaining: 235450000 },
    { date: '2025-02-10', principal: 446000, interest: 204000, remaining: 235898000 },
    { date: '2025-01-10', principal: 444000, interest: 206000, remaining: 236344000 },
    { date: '2024-12-10', principal: 442000, interest: 208000, remaining: 236788000 },
    { date: '2024-11-10', principal: 440000, interest: 210000, remaining: 237230000 },
  ];

  // 金額をフォーマットする関数
  const formatCurrency = (amount) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  // 日付をフォーマットする関数
  const formatDate = (dateString) => {
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
        <Text className="flex-1 text-xl font-bold text-gray-800">{loan.name}</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          onPress={() => {/* 編集機能 */}}
        >
          <Ionicons name="pencil-outline" size={20} color="#4b5563" />
        </TouchableOpacity>
      </View>

      {/* タブメニュー */}
      <View className="flex-row border-b border-gray-200 bg-white">
        <TouchableOpacity
          className={`flex-1 py-3 ${activeTab === 'summary' ? 'border-b-2 border-primary-600' : ''}`}
          onPress={() => setActiveTab('summary')}
        >
          <Text className={`text-center ${activeTab === 'summary' ? 'font-medium text-primary-600' : 'text-gray-600'}`}>
            概要
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className={`flex-1 py-3 ${activeTab === 'interestHistory' ? 'border-b-2 border-primary-600' : ''}`}
          onPress={() => setActiveTab('interestHistory')}
        >
          <Text className={`text-center ${activeTab === 'interestHistory' ? 'font-medium text-primary-600' : 'text-gray-600'}`}>
            金利履歴
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className={`flex-1 py-3 ${activeTab === 'paymentHistory' ? 'border-b-2 border-primary-600' : ''}`}
          onPress={() => setActiveTab('paymentHistory')}
        >
          <Text className={`text-center ${activeTab === 'paymentHistory' ? 'font-medium text-primary-600' : 'text-gray-600'}`}>
            返済履歴
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {activeTab === 'summary' && (
          <View className="p-4">
            {/* 借入基本情報 */}
            <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
              <Text className="mb-4 text-lg font-bold text-gray-800">借入基本情報</Text>
              
              <View className="space-y-3">
                <View className="flex-row">
                  <Text className="w-28 text-sm text-gray-500">借入物件</Text>
                  <Text className="flex-1 text-sm text-gray-800">{loan.propertyName}</Text>
                </View>
                
                <View className="flex-row">
                  <Text className="w-28 text-sm text-gray-500">借入開始日</Text>
                  <Text className="flex-1 text-sm text-gray-800">{formatDate(loan.startDate)}</Text>
                </View>
                
                <View className="flex-row">
                  <Text className="w-28 text-sm text-gray-500">借入期間</Text>
                  <Text className="flex-1 text-sm text-gray-800">{loan.term}年</Text>
                </View>
                
                <View className="flex-row">
                  <Text className="w-28 text-sm text-gray-500">返済方式</Text>
                  <Text className="flex-1 text-sm text-gray-800">{loan.paymentType}</Text>
                </View>
              </View>
            </View>
            
            {/* 借入金額情報 */}
            <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
              <Text className="mb-4 text-lg font-bold text-gray-800">借入金額情報</Text>
              
              <View className="space-y-3">
                <View className="flex-row">
                  <Text className="w-28 text-sm text-gray-500">当初借入額</Text>
                  <Text className="flex-1 text-sm text-gray-800">￥{formatCurrency(loan.initialAmount)}</Text>
                </View>
                
                <View className="flex-row">
                  <Text className="w-28 text-sm text-gray-500">残債</Text>
                  <Text className="flex-1 text-sm text-gray-800">￥{formatCurrency(loan.remainingAmount)}</Text>
                </View>
                
                <View className="flex-row">
                  <Text className="w-28 text-sm text-gray-500">現在の金利</Text>
                  <Text className="flex-1 text-sm text-gray-800">{loan.currentInterestRate}%</Text>
                </View>
                
                <View className="flex-row">
                  <Text className="w-28 text-sm text-gray-500">月々の返済額</Text>
                  <Text className="flex-1 text-sm text-gray-800">￥{formatCurrency(loan.monthlyPayment)}</Text>
                </View>
                
                <View className="flex-row">
                  <Text className="w-28 text-sm text-gray-500">次回返済日</Text>
                  <Text className="flex-1 text-sm text-gray-800">{formatDate(loan.nextPaymentDate)}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
        
        {activeTab === 'interestHistory' && (
          <View className="p-4">
            <View className="rounded-xl bg-white p-4 shadow-sm">
              <Text className="mb-4 text-lg font-bold text-gray-800">金利変更履歴</Text>
              
              {interestHistory.map((item, index) => (
                <View key={index} className="flex-row justify-between border-b border-gray-100 py-3">
                  <Text className="text-sm text-gray-800">{formatDate(item.date)}</Text>
                  <Text className="text-sm font-medium text-gray-800">{item.rate}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {activeTab === 'paymentHistory' && (
          <View className="p-4">
            <View className="rounded-xl bg-white p-4 shadow-sm">
              <Text className="mb-4 text-lg font-bold text-gray-800">返済履歴</Text>
              
              <View className="mb-2 flex-row border-b border-gray-200 pb-2">
                <Text className="flex-1 text-xs font-medium text-gray-500">日付</Text>
                <Text className="flex-1 text-right text-xs font-medium text-gray-500">元金</Text>
                <Text className="flex-1 text-right text-xs font-medium text-gray-500">利息</Text>
                <Text className="flex-1 text-right text-xs font-medium text-gray-500">残債</Text>
              </View>
              
              {paymentHistory.map((item, index) => (
                <View key={index} className="flex-row border-b border-gray-100 py-3">
                  <Text className="flex-1 text-sm text-gray-800">{formatDate(item.date).substring(0, formatDate(item.date).length - 1)}</Text>
                  <Text className="flex-1 text-right text-sm text-gray-800">￥{formatCurrency(item.principal)}</Text>
                  <Text className="flex-1 text-right text-sm text-gray-800">￥{formatCurrency(item.interest)}</Text>
                  <Text className="flex-1 text-right text-sm text-gray-800">￥{formatCurrency(item.remaining)}</Text>
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
LoanDetailScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    goBack: PropTypes.func.isRequired,
  }).isRequired,
  route: PropTypes.shape({
    params: PropTypes.shape({
      loanId: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};

export default LoanDetailScreen;
