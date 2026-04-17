import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PlanScreen } from '../screens/PlanScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { COLORS } from '../constants';
import { RootTabParamList } from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: COLORS.background, card: COLORS.surface, border: COLORS.border, primary: COLORS.primary, text: COLORS.text, notification: COLORS.primary },
};

const TAB_ICONS: Record<string, string> = { Home: '🏠', Profile: '👤', Plan: '⚡', Search: '🔍', Settings: '⚙️' };
const TAB_LABELS: Record<string, string> = { Home: 'Home', Profile: 'Profilo', Plan: 'Piano', Search: 'Cerca', Settings: 'Config' };

const TabIcon: React.FC<{ focused: boolean; name: string }> = ({ focused, name }) => (
  <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
    <Text style={[styles.tabEmoji, { opacity: focused ? 1 : 0.5 }]}>{TAB_ICONS[name]}</Text>
  </View>
);

export const AppNavigator: React.FC = () => (
  <NavigationContainer theme={THEME}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={route.name} />,
        tabBarLabel: ({ focused }) => <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{TAB_LABELS[route.name]}</Text>,
        tabBarStyle: styles.tabBar,
        headerStyle: styles.header,
        headerTintColor: COLORS.text,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '🏋️ AI Fitness' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '👤 Il mio Profilo' }} />
      <Tab.Screen name="Plan" component={PlanScreen} options={{ title: '⚡ Piano AI' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: '🔍 Cerca Alimenti' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '⚙️ Impostazioni' }} />
    </Tab.Navigator>
  </NavigationContainer>
);

const styles = StyleSheet.create({
  tabBar: { backgroundColor: COLORS.surface, borderTopColor: COLORS.border, borderTopWidth: 1, height: 68, paddingBottom: 8, paddingTop: 4 },
  tabIcon: { width: 36, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  tabIconActive: { backgroundColor: `${COLORS.primary}22` },
  tabEmoji: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.primary, fontWeight: '700' },
  header: { backgroundColor: COLORS.background },
  headerTitle: { color: COLORS.text, fontWeight: '700', fontSize: 16 },
});
