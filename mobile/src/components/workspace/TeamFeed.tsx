import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Body, Button, Card, Choice, Field, Heading, Muted, Notice } from '@/components/ui'
import { colors, text } from '@/lib/theme'
import { Actions, confirmAction } from './bits'
import { postKindLabels, relativeTime, useWorkspaceAction, type Ctx, type TeamPost, type TeamPostKind } from './shared'

const kindHints: Record<TeamPostKind, string> = {
  UPDATE: 'What did you work on, and what is next?',
  WIN: 'What worked, and what did it unblock?',
  BLOCKER: 'What is stuck, and what would unblock it?',
  QUESTION: 'What do you need to know from the team?',
}
const kinds = (Object.keys(postKindLabels) as TeamPostKind[]).map(value => ({ value, label: postKindLabels[value] }))
const kindColor = (kind: string) => kind === 'BLOCKER' ? colors.danger : kind === 'WIN' ? colors.ok : kind === 'QUESTION' ? colors.warn : colors.muted

export function TeamFeed({ ctx, posts }: { ctx: Ctx; posts: TeamPost[] }) {
  const action = useWorkspaceAction(ctx)
  const [kind, setKind] = useState<TeamPostKind>('UPDATE')
  const [body, setBody] = useState('')
  async function submit() {
    if (await action.run({ action: 'post', kind, body }, 'Posted. Your teammates were notified.')) { setBody(''); setKind('UPDATE') }
  }
  return <Card>
    <Heading>Team feed</Heading>
    <Muted>Only your team and club officers see this</Muted>
    <Choice label="Post type" options={kinds} value={kind} onChange={setKind}/>
    <Field label="Message" multiline maxLength={4000} value={body} onChangeText={setBody} placeholder={kindHints[kind]}/>
    <Notice error={action.error} message={action.message}/>
    <Actions><Button label={action.busy ? 'Posting...' : 'Post to team'} icon="send-outline" busy={action.busy} disabled={body.trim().length < 2} onPress={() => void submit()}/></Actions>
    {posts.length ? <View style={styles.feed}>{posts.map(post => <View key={post.id} style={styles.post}>
      <View style={styles.head}>
        <Text style={styles.author}>{post.authorUserId === ctx.me ? 'You' : post.authorName}{post.officer ? ' (Officer)' : ''}</Text>
        <Text style={styles.time}>{relativeTime(post.createdAt)}</Text>
      </View>
      <Text style={[styles.kind, { color: kindColor(post.kind) }]}>{postKindLabels[post.kind] ?? post.kind}</Text>
      <Body>{post.body}</Body>
      {post.authorUserId === ctx.me || ctx.isLead ? <Actions><Button label="Delete" icon="trash-outline" kind="danger" disabled={action.busy} onPress={() => confirmAction('Delete this post?', 'Delete', () => void action.run({ action: 'post-delete', postId: post.id }, 'Post deleted.'))}/></Actions> : null}
    </View>)}</View> : <Muted>No posts yet. A short weekly note on what you did and what is next keeps everyone moving.</Muted>}
  </Card>
}

const styles = StyleSheet.create({
  feed: { gap: 12, marginTop: 4 },
  post: { gap: 6, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  author: { fontSize: text.body, fontWeight: '700', color: colors.ink, flexShrink: 1 },
  time: { fontSize: text.small, color: colors.muted },
  kind: { fontSize: text.small, fontWeight: '600' },
})
