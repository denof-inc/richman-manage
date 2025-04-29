import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
// グラフは実際には react-native-chart-kit や Victory Native などのライブラリを使用
// ここではダミーのコンポーネントとして表現

/**
 * キャッシュフロー画面
 * - 月次/年次切替可能なグラフ表示
 * - 収入（家賃）、支出（ローン、管理費、税金など）の表示
 */
const CashFlowScreen = ({ navigation }) => {
  const [timeFrame, setTimeFrame] = useState('monthly'); // 'monthly' or 'yearly'
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(4); // 5月（0-indexed）
  
  // サンプルデータ
  const monthlyData = [
    { month: 1, income: 3750000, expenses: 2230000, cashflow: 1520000 },
    { month: 2, income: 3750000, expenses: 2230000, cashflow: 1520000 },
    { month: 3, income: 3750000, expenses: 2230000, cashflow: 1520000 },
    { month: 4, income: 3780000, expenses: 2230000, cashflow: 1550000 },
    { month: 5, income: 3780000, expenses: 2230000, cashflow: 1550000 },
    { month: 6, income: 3780000, expenses: 2250000, cashflow: 1530000 },
    { month: 7, income: 3780000, expenses: 2250000, cashflow: 1530000 },
    { month: 8, income: 3780000, expenses: 2250000, cashflow: 1530000 },
    { month: 9, income: 3780000, expenses: 2250000, cashflow: 1530000 },
    { month: 10, income: 3780000, expenses: 2250000, cashflow: 1530000 },
    { month: 11, income: 3780000, expenses: 2250000, cashflow: 1530000 },
    { month: 12, income: 3780000, expenses: 2250000, cashflow: 1530000 },
  ];
  
  const yearlyData = [
    { year: 2022, income: 42500000, expenses: 25800000, cashflow: 16700000 },
    { year: 2023, income: 44200000, expenses: 26500000, cashflow: 17700000 },
    { year: 2024, income: 45000000, expenses: 26800000, cashflow: 18200000 },
    { year: 2025, income: 45360000, expenses: 27000000, cashflow: 18360000 }, // 予測
  ];
  
  // 現在選択中のデータ
  const selectedMonthData = monthlyData.find(d => d.month === selectedMonth);
  const selectedYearData = yearlyData.find(d => d.year === selectedYear);
  
  // 金額をフォーマットする関数
  const formatCurrency = (amount) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  // 日本語の月名を取得
  const getMonthName = (month) => {
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    return monthNames[month - 1];
  };
  
  // ダミーのグラフコンポーネント
  const BarChart = ({ data, timeFrame }) => {
    const screenWidth = Dimensions.get('window').width - 32; // マージンを考慮
    const maxValue = Math.max(...data.map(d => Math.max(d.income, d.expenses)));
    
    return (
      <View className="mb-6 mt-3 h-64 rounded-lg border border-gray-200 bg-white p-4">
        <Text className="mb-2 text-sm font-medium text-gray-700">
          {timeFrame === 'monthly' ? '月間キャッシュフロー（' + selectedYear + '年）' : '年間キャッシュフロー'}
        </Text>
        
        {/* 実際のプロジェクトではここに実際のグラフライブラリを使用 */}
        <View className="flex-1 flex-row items-end justify-between pt-4">
          {data.map((item, index) => {
            const incomeHeight = (item.income / maxValue) * 150;
            const expensesHeight = (item.expenses / maxValue) * 150;
            const label = timeFrame === 'monthly' ? getMonthName(item.month) : item.year;
            
            const isSelected = timeFrame === 'monthly' 
              ? item.month === selectedMonth
              : item.year === selectedYear;
            
            return (
              <TouchableOpacity 
                key={index}
                className="items-center"
                style={{ width: screenWidth / (data.length + 1) }}
                onPress={() => {
                  if (timeFrame === 'monthly') {
                    setSelectedMonth(item.month);
                  } else {
                    setSelectedYear(item.year);
                  }
                }}
              >
                <View className="flex-row">
                  {/* 収入バー */}
                  <View 
                    className={`mx-0.5 w-3 rounded-t-sm ${isSelected ? 'bg-green-600' : 'bg-green-400'}`} 
                    style={{ height: incomeHeight }}
                  />
                  
                  {/* 支出バー */}
                  <View 
                    className={`mx-0.5 w-3 rounded-t-sm ${isSelected ? 'bg-red-600' : 'bg-red-400'}`} 
                    style={{ height: expensesHeight }}
                  />
                </View>
                
                <Text className={`mt-1 text-xs ${isSelected ? 'font-bold text-gray-800' : 'text-gray-500'}`}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        {/* 凡例 */}
        <View className="mt-4 flex-row justify-center">
          <View className="mr-4 flex-row items-center">
            <View className="mr-1 h-3 w-3 rounded-sm bg-green-500" />
            <Text className="text-xs text-gray-600">収入</Text>
          </View>
          
          <View className="flex-row items-center">
            <View className="mr-1 h-3 w-3 rounded-sm bg-red-500" />
            <Text className="text-xs text-gray-600">支出</Text>
          </View>
        </View>
      </View>
    );
  };

  BarChart.propTypes = {
    data: PropTypes.arrayOf(
      PropTypes.shape({
        month: PropTypes.number,
        year: PropTypes.number,
        income: PropTypes.number.isRequired,
        expenses: PropTypes.number.isRequired,
        cashflow: PropTypes.number.isRequired,
      })
    ).isRequired,
    timeFrame: PropTypes.oneOf(['monthly', 'yearly']).isRequired,
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* ヘッダー */}
      <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-4">
        <Text className="text-xl font-bold text-gray-800">キャッシュフロー</Text>
        
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

      <ScrollView className="flex-1 px-4 pt-4">
        {/* 切り替えタブ */}
        <View className="flex-row rounded-lg bg-gray-200 p-1">
          <TouchableOpacity
            className={`flex-1 rounded-md py-2 ${timeFrame === 'monthly' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setTimeFrame('monthly')}
          >
            <Text className={`text-center text-sm font-medium ${timeFrame === 'monthly' ? 'text-gray-800' : 'text-gray-600'}`}>
              月次
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className={`flex-1 rounded-md py-2 ${timeFrame === 'yearly' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setTimeFrame('yearly')}
          >
            <Text className={`text-center text-sm font-medium ${timeFrame === 'yearly' ? 'text-gray-800' : 'text-gray-600'}`}>
              年次
            </Text>
          </TouchableOpacity>
        </View>

        {/* グラフ表示 */}
        {timeFrame === 'monthly' ? (
          <BarChart data={monthlyData} timeFrame="monthly" />
        ) : (
          <BarChart data={yearlyData} timeFrame="yearly" />
        )}

        {/* 収支詳細 */}
        <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <Text className="mb-4 text-lg font-bold text-gray-800">
            {timeFrame === 'monthly' 
              ? `${selectedYear}年${getMonthName(selectedMonth)}の収支` 
              : `${selectedYear}年の収支`}
          </Text>
          
          <View className="space-y-4">
            {/* 収入セクション */}
            <View>
              <View className="mb-2 flex-row justify-between">
                <Text className="text-base font-medium text-gray-800">収入</Text>
                <Text className="text-base font-bold text-gray-800">
                  ￥{formatCurrency(timeFrame === 'monthly' ? selectedMonthData.income : selectedYearData.income)}
                </Text>
              </View>
              
              {/* 収入内訳 */}
              <View className="rounded-lg bg-gray-50 p-3">
                <View className="mb-2 flex-row justify-between">
                  <Text className="text-sm text-gray-600">家賃収入</Text>
                  <Text className="text-sm text-gray-800">
                    ￥{formatCurrency(timeFrame === 'monthly' ? selectedMonthData.income : selectedYearData.income)}
                  </Text>
                </View>
                
                {/* 必要に応じて他の収入項目を追加 */}
              </View>
            </View>
            
            {/* 支出セクション */}
            <View>
              <View className="mb-2 flex-row justify-between">
                <Text className="text-base font-medium text-gray-800">支出</Text>
                <Text className="text-base font-bold text-gray-800">
                  ￥{formatCurrency(timeFrame === 'monthly' ? selectedMonthData.expenses : selectedYearData.expenses)}
                </Text>
              </View>
              
              {/* 支出内訳 */}
              <View className="rounded-lg bg-gray-50 p-3">
                <View className="mb-2 flex-row justify-between">
                  <Text className="text-sm text-gray-600">ローン返済</Text>
                  <Text className="text-sm text-gray-800">
                    ￥{formatCurrency(timeFrame === 'monthly' 
                      ? Math.round(selectedMonthData.expenses * 0.7) 
                      : Math.round(selectedYearData.expenses * 0.7))}
                  </Text>
                </View>
                
                <View className="mb-2 flex-row justify-between">
                  <Text className="text-sm text-gray-600">管理費</Text>
                  <Text className="text-sm text-gray-800">
                    ￥{formatCurrency(timeFrame === 'monthly' 
                      ? Math.round(selectedMonthData.expenses * 0.15) 
                      : Math.round(selectedYearData.expenses * 0.15))}
                  </Text>
                </View>
                
                <View className="mb-2 flex-row justify-between">
                  <Text className="text-sm text-gray-600">固定資産税</Text>
                  <Text className="text-sm text-gray-800">
                    ￥{formatCurrency(timeFrame === 'monthly' 
                      ? Math.round(selectedMonthData.expenses * 0.08) 
                      : Math.round(selectedYearData.expenses * 0.08))}
                  </Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-sm text-gray-600">その他経費</Text>
                  <Text className="text-sm text-gray-800">
                    ￥{formatCurrency(timeFrame === 'monthly' 
                      ? Math.round(selectedMonthData.expenses * 0.07) 
                      : Math.round(selectedYearData.expenses * 0.07))}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* キャッシュフロー */}
            <View className="flex-row justify-between border-t border-gray-200 pt-2">
              <Text className="text-base font-medium text-gray-800">キャッシュフロー</Text>
              <Text className={`text-base font-bold ${
                (timeFrame === 'monthly' ? selectedMonthData.cashflow : selectedYearData.cashflow) >= 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                ￥{formatCurrency(timeFrame === 'monthly' ? selectedMonthData.cashflow : selectedYearData.cashflow)}
              </Text>
            </View>
          </View>
        </View>
        
        {/* キャッシュフロー分析 */}
        <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <Text className="mb-3 text-lg font-bold text-gray-800">キャッシュフロー分析</Text>
          
          <View className="space-y-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-600">キャッシュオンキャッシュ</Text>
              <Text className="text-base font-medium text-gray-800">
                {timeFrame === 'monthly' 
                  ? Math.round(selectedMonthData.cashflow / 37500000 * 100 * 12) 
                  : Math.round(selectedYearData.cashflow / 37500000 * 100)}%
              </Text>
            </View>
            
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-600">総収入に対する支出率</Text>
              <Text className="text-base font-medium text-gray-800">
                {timeFrame === 'monthly' 
                  ? Math.round(selectedMonthData.expenses / selectedMonthData.income * 100) 
                  : Math.round(selectedYearData.expenses / selectedYearData.income * 100)}%
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// PropTypes の定義
CashFlowScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    goBack: PropTypes.func.isRequired,
  }).isRequired,
};

export default CashFlowScreen;
