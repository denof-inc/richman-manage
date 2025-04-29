import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const TestComponent = () => {
  return (
    <View className="p-4 m-4 bg-blue-500 rounded-lg">
      <Text className="text-white font-bold text-lg">Test Component</Text>
      <TouchableOpacity className="mt-2 bg-white p-2 rounded">
        <Text className="text-blue-500">Press Me</Text>
      </TouchableOpacity>
    </View>
  );
};

export default TestComponent;
