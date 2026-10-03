import type { ColorValue } from 'react-native'
import { Tabs } from 'expo-router/tabs'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { colors } from '@/lib/theme'

type IconName = keyof typeof Ionicons.glyphMap
const icon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color} size={size}/>

// Each tab is a folder with its own stack, so detail screens push inside the tab.
export default function TabsLayout() {
  const { unread } = useAuth()
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.cream, borderTopColor: colors.line } }}>
    <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('home-outline'), tabBarBadge: unread ? unread : undefined }}/>
    <Tabs.Screen name="projects" options={{ title: 'Projects', tabBarIcon: icon('construct-outline') }}/>
    <Tabs.Screen name="teams" options={{ title: 'Teams', tabBarIcon: icon('people-outline') }}/>
    <Tabs.Screen name="directory" options={{ title: 'Directory', tabBarIcon: icon('search-outline') }}/>
    <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('ellipsis-horizontal') }}/>
  </Tabs>
}
