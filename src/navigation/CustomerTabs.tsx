import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import { palette } from '../theme/tokens';
import { CustomerTabParamList } from '../types/app';
import { CustomerChatScreen } from '../screens/customer/CustomerChatScreen';
import { CustomerFilesScreen } from '../screens/customer/CustomerFilesScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator<CustomerTabParamList>();

export function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.brand,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: palette.surface,
          borderTopColor: '#e6ebf4',
        },
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === 'CustomerChat'
              ? 'chatbubble-ellipses'
              : route.name === 'CustomerFiles'
                ? 'folder-open'
                : 'person-circle';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="CustomerChat" component={CustomerChatScreen} options={{ title: 'Chat nhóm' }} />
      <Tab.Screen name="CustomerFiles" component={CustomerFilesScreen} options={{ title: 'Kho file' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Tài khoản' }} />
    </Tab.Navigator>
  );
}
