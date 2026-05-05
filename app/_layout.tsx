import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from '../src/App';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar barStyle="light-content" />
    </>
  );
}
