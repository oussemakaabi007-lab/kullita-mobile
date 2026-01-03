import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import * as NavigationBar from 'expo-navigation-bar';
import { withLayoutContext } from 'expo-router';
import { setStatusBarHidden } from 'expo-status-bar';
import { LayoutDashboard, Music2, UserCircle } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TopTabs = withLayoutContext(createMaterialTopTabNavigator().Navigator);

export default function ArtistLayout() {
  const insets = useSafeAreaInsets();
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('inset-swipe');
      setStatusBarHidden(true, 'fade');

      const subscription = NavigationBar.addVisibilityListener(({ visibility }) => {
        if (visibility === 'visible') {
          setStatusBarHidden(false, 'fade');
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          hideTimerRef.current = setTimeout(() => {
            NavigationBar.setVisibilityAsync('hidden');
            setStatusBarHidden(true, 'fade');
          }, 5000);
        }
      });

      return () => {
        subscription.remove();
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      };
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#05070A' }}>
      <TopTabs
        screenOptions={{
          swipeEnabled: false,
          tabBarActiveTintColor: '#2E79FF',
          tabBarInactiveTintColor: '#555',
          tabBarIndicatorStyle: {
            backgroundColor: '#2E79FF',
            height: 3,
            borderRadius: 10,
          },
          tabBarStyle: {
            backgroundColor: '#05070A',
            elevation: 0,
            shadowOpacity: 0,
            paddingTop: insets.top,
            height: 65 + insets.top,
          },
          tabBarItemStyle: {
            height: 65,
          },
          tabBarContentContainerStyle: {
            alignItems: 'center',
            justifyContent: 'center',
          },
          tabBarShowLabel: false,
          tabBarShowIcon: true,
        }}
      >
        <TopTabs.Screen
          name="dashboard"
          options={{
            tabBarIcon: ({ color }: { color: string }) => <LayoutDashboard size={26} color={color} />,
          }}
        />
        <TopTabs.Screen
          name="mysongs"
          options={{
            tabBarIcon: ({ color }: { color: string }) => <Music2 size={26} color={color} />,
          }}
        />
        <TopTabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ color }: { color: string }) => <UserCircle size={26} color={color} />,
          }}
        />
      </TopTabs>
    </View>
  );
}