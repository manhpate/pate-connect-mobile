import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import { useAppSession } from '../context/AppSessionContext';
import { InternalTabParamList } from '../types/app';
import { palette } from '../theme/tokens';
import { InternalInboxScreen } from '../screens/internal/InternalInboxScreen';
import { InternalGroupsScreen } from '../screens/internal/InternalGroupsScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator<InternalTabParamList>();

export function InternalTabs() {
  const { currentUser } = useAppSession();
  if (!currentUser) {
    return null;
  }

  const initialRouteName: keyof InternalTabParamList = currentUser.hasChatGroup
    ? 'Groups'
    : currentUser.canUseInbox
      ? 'Inbox'
      : 'Profile';

  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
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
            route.name === 'Inbox'
              ? 'chatbox-ellipses'
              : route.name === 'Groups'
                ? 'people'
                : route.name === 'Alerts'
                  ? 'notifications'
                  : 'person-circle';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {currentUser.hasChatGroup ? (
        <Tab.Screen name="Groups" component={InternalGroupsScreen} options={{ title: 'Nhóm chat' }} />
      ) : null}
      {currentUser.canUseInbox ? (
        <Tab.Screen name="Inbox" component={InternalInboxScreen} options={{ title: 'Hội thoại' }} />
      ) : null}
      {currentUser.canUseNotifications ? (
        <Tab.Screen name="Alerts" component={NotificationsScreen} options={{ title: 'Thông báo' }} />
      ) : null}
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Tài khoản' }} />
    </Tab.Navigator>
  );
}
