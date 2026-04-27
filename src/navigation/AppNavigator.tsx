import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { useAppSession } from '../context/AppSessionContext';
import { RootStackParamList } from '../types/app';
import { CustomerTabs } from './CustomerTabs';
import { InternalTabs } from './InternalTabs';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { ConversationScreen } from '../screens/shared/ConversationScreen';
import { GroupChatScreen } from '../screens/shared/GroupChatScreen';
import { GroupInfoScreen } from '../screens/shared/GroupInfoScreen';
import { FileVaultScreen } from '../screens/shared/FileVaultScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { currentUser } = useAppSession();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!currentUser ? (
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
      ) : currentUser.mode === 'customer' ? (
        <>
          <Stack.Screen name="CustomerShell" component={CustomerTabs} />
          <Stack.Screen name="GroupChat" component={GroupChatScreen} />
          <Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
          <Stack.Screen name="FileVault" component={FileVaultScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="InternalShell" component={InternalTabs} />
          <Stack.Screen name="Conversation" component={ConversationScreen} />
          <Stack.Screen name="GroupChat" component={GroupChatScreen} />
          <Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
          <Stack.Screen name="FileVault" component={FileVaultScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
