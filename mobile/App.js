import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import VideoUploaderScreen from './src/screens/VideoUploaderScreen';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="VideoUploader"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen 
          name="VideoUploader" 
          component={VideoUploaderScreen}
          options={{
            title: 'Video Uploader AI',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
