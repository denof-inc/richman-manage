import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

const TestComponent = () => {
  return (
    <StyledView className="p-4 m-4 bg-blue-500 rounded-lg">
      <StyledText className="text-white font-bold text-lg">Test Component</StyledText>
      <StyledTouchableOpacity className="mt-2 bg-white p-2 rounded">
        <StyledText className="text-blue-500">Press Me</StyledText>
      </StyledTouchableOpacity>
    </StyledView>
  );
};

export default TestComponent;
