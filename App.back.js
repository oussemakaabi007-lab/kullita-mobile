import LibraryPage from './app/(user)/library';
import SearchPage from './app/(user)/search';
import Trending from './app/(user)/trending';
import ThisWeek from './app/(user)/week';
import HomePage from './app/(user)/index'
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home" 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: '#090b0f' } 
        }}
      >
        <Stack.Screen name="Home" component={HomePage} />
        <Stack.Screen name="Library" component={LibraryPage} />
        <Stack.Screen name="Search" component={SearchPage} />
        <Stack.Screen name="Trending" component={Trending} />
        <Stack.Screen name="ThisWeek" component={ThisWeek} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}