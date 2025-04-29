import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface SampleComponentProps {
  title: string;
  onPress?: () => void;
}

export const SampleComponent: React.FC<SampleComponentProps> = ({ title, onPress }) => {
  return (
    <View className="p-4 bg-white rounded-lg shadow-md">
      <Text className="text-lg font-bold text-gray-800">{title}</Text>
      <TouchableOpacity 
        className="mt-2 px-4 py-2 bg-blue-500 rounded-md"
        onPress={onPress}
      >
        <Text className="text-white font-medium">Press Me</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SampleComponent;
