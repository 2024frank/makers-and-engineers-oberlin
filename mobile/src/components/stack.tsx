import type { ComponentProps } from 'react'
import Stack from 'expo-router/stack'
import { colors } from '@/lib/theme'

/** Header look shared by every tab's stack. */
export const stackOptions: ComponentProps<typeof Stack>['screenOptions'] = {
  headerTintColor: colors.accent,
  headerTitleStyle: { color: colors.ink },
  headerStyle: { backgroundColor: colors.cream },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: { backgroundColor: colors.page },
}
