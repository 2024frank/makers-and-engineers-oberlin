import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Heading } from '@/components/ui'
import { colors, text } from '@/lib/theme'

/** A section heading with an optional link on the right. */
export function SectionHead({ children, linkLabel, onLink }: { children: ReactNode; linkLabel?: string; onLink?: () => void }) {
  return <View style={styles.head}>
    <View style={styles.flex}><Heading>{children}</Heading></View>
    {linkLabel && onLink ? <Pressable accessibilityRole="link" onPress={onLink} hitSlop={6} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <Text style={styles.linkText}>{linkLabel}</Text><Ionicons name="arrow-forward" size={16} color={colors.accent}/>
    </Pressable> : null}
  </View>
}

/** A text link on its own line. */
export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.link, styles.linkAlone, pressed && styles.pressed]}>
    <Text style={styles.linkText}>{label}</Text><Ionicons name="arrow-forward" size={16} color={colors.accent}/>
  </Pressable>
}

/** One segment per milestone, so progress reads as steps rather than a percentage. */
export function MilestoneMeter({ done, total }: { done: number; total: number }) {
  if (!total) return null
  const label = done === total ? `All ${total} milestones done` : `${done} of ${total} milestones done`
  return <View accessible accessibilityLabel={label} style={styles.meterWrap}>
    <View style={styles.meter}>
      {total <= 24 ? Array.from({ length: total }, (_, index) => <View key={index} style={[styles.seg, index < done && styles.segDone]}/>)
        : <>{done > 0 ? <View style={[styles.seg, styles.segDone, { flexGrow: done }]}/> : null}{done < total ? <View style={[styles.seg, { flexGrow: total - done }]}/> : null}</>}
    </View>
    <Text style={styles.meterLabel}>{label}</Text>
  </View>
}

/** A labelled on/off row, at least 48pt tall. */
export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={styles.toggle}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent }} accessibilityLabel={label}/>
  </Pressable>
}

const styles = StyleSheet.create({
  toggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLabel: { flex: 1, fontSize: text.body, color: colors.ink },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkAlone: { alignSelf: 'flex-start' },
  linkText: { fontSize: text.small, fontWeight: '600', color: colors.accent },
  pressed: { opacity: 0.7 },
  meterWrap: { gap: 6 },
  meter: { flexDirection: 'row', gap: 3, height: 8 },
  seg: { flex: 1, borderRadius: 3, backgroundColor: colors.line },
  segDone: { backgroundColor: colors.ok },
  meterLabel: { fontSize: text.tiny, color: colors.muted },
})
