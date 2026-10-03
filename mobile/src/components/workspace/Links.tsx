import { useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button, Card, Field, Heading, Muted, Notice } from '@/components/ui'
import { colors, text } from '@/lib/theme'
import { Actions, TextAction } from './bits'
import { useWorkspaceAction, type Ctx, type TeamLink } from './shared'

const open = (url: string) => { if (/^https?:\/\//i.test(url)) void Linking.openURL(url).catch(() => {}) }

export function TeamLinks({ ctx, links, githubUrl, externalUrl }: { ctx: Ctx; links: TeamLink[]; githubUrl?: string; externalUrl?: string }) {
  const action = useWorkspaceAction(ctx)
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState(''), [url, setUrl] = useState('')
  async function submit() {
    if (await action.run({ action: 'link-add', label, url }, 'Link added.')) { setLabel(''); setUrl(''); setAdding(false) }
  }
  const fixed = [githubUrl && { id: 'github', label: 'GitHub repository', url: githubUrl }, externalUrl && { id: 'site', label: 'Project website', url: externalUrl }].filter(Boolean) as { id: string; label: string; url: string }[]
  return <Card>
    <Heading>Team links</Heading>
    <Notice error={action.error} message={action.message}/>
    {fixed.length + links.length ? <View>
      {fixed.map((link, index) => <LinkRow key={link.id} label={link.label} url={link.url} first={index === 0}/>)}
      {links.map((link, index) => <LinkRow key={link.id} label={link.label} url={link.url} first={fixed.length + index === 0}
        onRemove={link.addedBy === ctx.me || ctx.isLead ? () => void action.run({ action: 'link-remove', linkId: link.id }, 'Link removed.') : undefined} disabled={action.busy}/>)}
    </View> : <Muted>Keep your shared drive, CAD files, parts list, or code in one place.</Muted>}
    {adding ? <View style={styles.form}>
      <Field label="Name" value={label} onChangeText={setLabel} maxLength={120} placeholder="Shared drive folder"/>
      <Field label="Web address" value={url} onChangeText={setUrl} maxLength={2000} placeholder="https://" keyboardType="url" autoCapitalize="none" autoCorrect={false}/>
      <Actions>
        <Button label={action.busy ? 'Adding...' : 'Add link'} busy={action.busy} disabled={!label.trim() || !url.trim()} onPress={() => void submit()}/>
        <Button label="Cancel" kind="secondary" onPress={() => setAdding(false)}/>
      </Actions>
    </View> : <Actions><Button label="Add a link" icon="add" kind="secondary" onPress={() => setAdding(true)}/></Actions>}
  </Card>
}

function LinkRow({ label, url, first, onRemove, disabled }: { label: string; url: string; first: boolean; onRemove?: () => void; disabled?: boolean }) {
  return <View style={[styles.row, !first && styles.line]}>
    <Pressable accessibilityRole="link" accessibilityLabel={label} accessibilityHint={url} onPress={() => open(url)} style={({ pressed }) => [styles.open, pressed && { opacity: 0.7 }]}>
      <Text style={styles.label}>{label}</Text>
      <Ionicons name="arrow-up-outline" size={16} color={colors.accent} style={{ transform: [{ rotate: '45deg' }] }}/>
    </Pressable>
    {onRemove ? <TextAction label="Remove" accessibilityLabel={`Remove ${label}`} danger disabled={disabled} onPress={onRemove}/> : null}
  </View>
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  open: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: text.body, fontWeight: '600', color: colors.accent, flexShrink: 1 },
  form: { gap: 12 },
})
