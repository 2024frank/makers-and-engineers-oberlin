import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import Stack from 'expo-router/stack'
import * as SplashScreen from 'expo-splash-screen'
import { AuthProvider, useAuth } from '@/lib/auth'
import { colors } from '@/lib/theme'

void SplashScreen.preventAutoHideAsync()

function Screens() {
  const { state } = useAuth()
  useEffect(() => { if (state.status !== 'loading') void SplashScreen.hideAsync() }, [state.status])
  if (state.status === 'loading') return null
  const ready = state.status === 'ready'
  return <Stack screenOptions={{ headerTintColor: colors.accent, headerTitleStyle: { color: colors.ink }, headerStyle: { backgroundColor: colors.cream }, contentStyle: { backgroundColor: colors.page } }}>
    <Stack.Screen name="index" options={{ headerShown: false }}/>
    <Stack.Protected guard={ready}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }}/>
    </Stack.Protected>
    <Stack.Protected guard={!ready}>
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }}/>
    </Stack.Protected>
  </Stack>
}

export default function RootLayout() {
  return <AuthProvider>
    <StatusBar style="dark"/>
    <Screens/>
  </AuthProvider>
}
