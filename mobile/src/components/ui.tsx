import { type ReactNode } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { errorMessage } from '@/lib/api'
import { colors, space, text } from '@/lib/theme'

type IconName = keyof typeof Ionicons.glyphMap

/** A scrolling screen body with the 16px gutter. Pass refreshing and onRefresh for pull to refresh. */
export function Screen({ children, refreshing, onRefresh, footer }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void; footer?: ReactNode }) {
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
    <ScrollView style={styles.page} contentContainerStyle={styles.pageBody} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.accent}/> : undefined}>
      {children}
    </ScrollView>
    {footer}
  </KeyboardAvoidingView>
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>
}
export function Title({ children }: { children: ReactNode }) { return <Text style={styles.title} accessibilityRole="header">{children}</Text> }
export function Heading({ children }: { children: ReactNode }) { return <Text style={styles.heading} accessibilityRole="header">{children}</Text> }
export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) { return <Text style={[styles.body, style]}>{children}</Text> }
export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) { return <Text style={[styles.muted, style]}>{children}</Text> }

export function Button({ label, onPress, kind = 'primary', icon, disabled, busy, small }: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; icon?: IconName; disabled?: boolean; busy?: boolean; small?: boolean }) {
  const tint = kind === 'primary' ? '#ffffff' : kind === 'danger' ? colors.danger : colors.ink
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [styles.button, small && styles.buttonSmall, kind === 'primary' ? styles.buttonPrimary : styles.buttonSecondary, (disabled || busy) && styles.dim, pressed && styles.pressed]}>
    {busy ? <ActivityIndicator size="small" color={tint}/> : icon ? <Ionicons name={icon} size={small ? 16 : 18} color={tint}/> : null}
    <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: tint }]}>{label}</Text>
  </Pressable>
}

/** A labelled text input. Text is 16px so iOS never zooms. */
export function Field({ label, hint, style, ...input }: TextInputProps & { label: string; hint?: string }) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor="#98a39e" style={[styles.input, input.multiline && styles.inputMultiline, style]} {...input}/>
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
}

/** Pick one of a few options. Selected option is filled. */
export function Choice<T extends string>({ label, options, value, onChange }: { label?: string; options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return <View style={styles.field}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
      {options.map(option => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: option.value === value }} onPress={() => onChange(option.value)}
        style={[styles.choice, option.value === value && styles.choiceOn]}>
        <Text style={[styles.choiceText, option.value === value && styles.choiceTextOn]}>{option.label}</Text>
      </Pressable>)}
    </ScrollView>
  </View>
}

export function Notice({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null
  return <View accessibilityRole="alert" style={[styles.notice, error ? styles.noticeError : styles.noticeOk]}>
    <Text style={[styles.noticeText, { color: error ? colors.danger : colors.ok }]}>{error || message}</Text>
  </View>
}

/** A tappable row for lists: title, optional detail lines, optional right-side text, chevron. */
export function Row({ title, detail, meta, icon, onPress, last }: { title: string; detail?: string | null; meta?: string | null; icon?: IconName; onPress?: () => void; last?: boolean }) {
  const content = <>
    {icon ? <Ionicons name={icon} size={22} color={colors.accent} style={styles.rowIcon}/> : null}
    <View style={styles.flex}>
      <Text style={styles.rowTitle}>{title}</Text>
      {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
    </View>
    {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
    {onPress ? <Ionicons name="chevron-forward" size={18} color="#a3ada8"/> : null}
  </>
  if (!onPress) return <View style={[styles.row, !last && styles.rowLine]}>{content}</View>
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && styles.pressed]}>{content}</Pressable>
}

export function Loading() {
  return <View style={styles.center}><ActivityIndicator color={colors.accent}/></View>
}
export function ErrorState({ error, onRetry, messages }: { error: unknown; onRetry?: () => void; messages?: Record<string, string> }) {
  return <View style={styles.center}>
    <Text style={[styles.body, styles.centerText]}>{errorMessage(error, messages)}</Text>
    {onRetry ? <Button label="Try again" kind="secondary" onPress={onRetry}/> : null}
  </View>
}
export function Empty({ children }: { children: ReactNode }) {
  return <Text style={styles.empty}>{children}</Text>
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: colors.page },
  pageBody: { padding: space.gutter, gap: space.gap, paddingBottom: 40 },
  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, padding: space.card, gap: 10 },
  title: { fontSize: text.title, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  heading: { fontSize: text.heading, fontWeight: '700', color: colors.ink },
  body: { fontSize: text.body, lineHeight: 23, color: colors.ink },
  muted: { fontSize: text.small, lineHeight: 20, color: colors.muted },
  button: { minHeight: 48, borderRadius: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonSmall: { minHeight: 40, paddingHorizontal: 14, alignSelf: 'flex-start' },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  buttonText: { fontSize: text.body, fontWeight: '600' },
  buttonTextSmall: { fontSize: text.small },
  dim: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
  field: { gap: 6 },
  label: { fontSize: text.small, fontWeight: '600', color: colors.ink },
  hint: { fontSize: text.tiny, color: colors.muted },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  choiceRow: { gap: 8 },
  choice: { minHeight: 40, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, justifyContent: 'center' },
  choiceOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  choiceText: { fontSize: text.small, fontWeight: '600', color: colors.ink },
  choiceTextOn: { color: '#ffffff' },
  notice: { borderRadius: 10, padding: 12 },
  noticeError: { backgroundColor: colors.dangerBg },
  noticeOk: { backgroundColor: colors.okBg },
  noticeText: { fontSize: text.small, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 48 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowIcon: { width: 24 },
  rowTitle: { fontSize: text.body, fontWeight: '600', color: colors.ink },
  rowDetail: { fontSize: text.small, lineHeight: 20, color: colors.muted, marginTop: 2 },
  rowMeta: { fontSize: text.small, color: colors.muted },
  center: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, backgroundColor: colors.page },
  centerText: { textAlign: 'center' },
  empty: { fontSize: text.small, lineHeight: 20, color: colors.muted, paddingVertical: 6 },
})
