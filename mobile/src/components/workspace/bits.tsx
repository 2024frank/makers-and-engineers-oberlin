import { useState, type ReactNode } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Body, Field, Muted } from '@/components/ui'
import { colors, text } from '@/lib/theme'

/** Native yes or no question. Calls onConfirm only on the confirm button. */
export function confirmAction(title: string, confirmLabel: string, onConfirm: () => void, message?: string) {
  Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: confirmLabel, style: 'destructive', onPress: onConfirm }])
}

/** Buttons that sit side by side and wrap on a narrow screen. */
export function Actions({ children }: { children: ReactNode }) {
  return <View style={styles.actions}>{children}</View>
}

/** A text button that is easy to hit: label on a 44pt tall target. */
export function TextAction({ label, onPress, disabled, danger, accessibilityLabel }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean; accessibilityLabel?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.textAction, (disabled || pressed) && styles.dim]}>
    <Text style={[styles.textActionLabel, danger && { color: colors.danger }]}>{label}</Text>
  </Pressable>
}

export function Avatar({ name, lead }: { name: string; lead?: boolean }) {
  return <View style={[styles.avatar, lead && styles.avatarLead]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Text style={[styles.avatarText, lead && { color: '#ffffff' }]}>{name.slice(0, 1).toUpperCase()}</Text>
  </View>
}

export function ProgressBar({ done, total }: { done: number; total: number }) {
  return <View style={styles.bar} accessibilityRole="progressbar" accessibilityLabel={`${done} of ${total} milestones done`}><View style={[styles.barFill, { width: `${total ? Math.round(done / total * 100) : 0}%` }]}/></View>
}

/** Choose one person or item from a long list: filter box, then the best few matches. */
export function PickList({ label, options, value, onChange, empty }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (value: string) => void; empty: string }) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const shown = options.filter(option => option.value === value || !needle || option.label.toLowerCase().includes(needle)).slice(0, 6)
  if (!options.length) return <Muted>{empty}</Muted>
  return <View style={{ gap: 6 }}>
    <Field label={label} value={query} onChangeText={setQuery} placeholder="Type a name" autoCapitalize="none" autoCorrect={false}/>
    {shown.length ? shown.map(option => {
      const on = option.value === value
      return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onChange(on ? '' : option.value)} style={[styles.pick, on && styles.pickOn]}>
        <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.accent : colors.muted}/>
        <Text style={styles.pickText}>{option.label}</Text>
      </Pressable>
    }) : <Body style={{ fontSize: text.small }}>No match.</Body>}
  </View>
}

export function Meta({ children, tone }: { children: ReactNode; tone?: 'danger' | 'ok' | 'warn' }) {
  return <Text style={[styles.meta, tone === 'danger' && { color: colors.danger }, tone === 'ok' && { color: colors.ok }, tone === 'warn' && { color: colors.warn }]}>{children}</Text>
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  textAction: { minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' },
  textActionLabel: { fontSize: text.small, fontWeight: '600', color: colors.accent },
  dim: { opacity: 0.5 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eef1ef', alignItems: 'center', justifyContent: 'center' },
  avatarLead: { backgroundColor: colors.accent },
  avatarText: { fontSize: text.small, fontWeight: '700', color: colors.ink },
  bar: { height: 8, borderRadius: 4, backgroundColor: '#e8ece9', overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.ok },
  pick: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  pickOn: { borderColor: colors.accent },
  pickText: { flex: 1, fontSize: text.small, color: colors.ink },
  meta: { fontSize: text.small, lineHeight: 20, color: colors.muted },
})
