import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface SampleComponentProps {
  title: string;
  onPress?: () => void;
}

export const SampleComponent: React.FC<SampleComponentProps> = ({ title, onPress }) => {
  return (
    <View className="rounded-lg bg-white p-4 shadow-md">
      <Text className="text-lg font-bold text-gray-800">{title}</Text>
      <TouchableOpacity 
        className="mt-2 rounded-md bg-blue-500 px-4 py-2"
        onPress={onPress}
      >
        <Text className="font-medium text-white">Press Me</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SampleComponent;
