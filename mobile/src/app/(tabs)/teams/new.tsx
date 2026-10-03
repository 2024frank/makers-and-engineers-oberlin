import { useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import Stack from 'expo-router/stack'
import { Button, Field, Muted, Notice, Screen, Title } from '@/components/ui'
import { Check, useTeamAction } from '@/components/teams/shared'

export default function NewTeam() {
  const { invite } = useLocalSearchParams<{ invite?: string }>()
  const action = useTeamAction()
  const [name, setName] = useState(''), [description, setDescription] = useState(''), [recruiting, setRecruiting] = useState(true)
  async function submit() {
    const result = await action.run({ action: 'create', name: name.trim(), description: description.trim(), recruiting }, 'Team created.')
    if (result) router.replace({ pathname: '/teams/group/[teamId]', params: { teamId: result.teamId, ...(typeof invite === 'string' && invite ? { invite } : {}) } })
  }
  return <Screen>
    <Stack.Screen options={{ title: 'Create a team' }}/>
    <Title>Create a team</Title>
    <Muted>You can choose a project after your team is together.</Muted>
    <Field label="Team name" value={name} onChangeText={setName} maxLength={80} autoComplete="off" autoCorrect={false} editable={!action.busy}/>
    <Field label="What do you want to work on?" value={description} onChangeText={setDescription} maxLength={1200} multiline editable={!action.busy}/>
    <Check label="Accept requests from other members" value={recruiting} onChange={setRecruiting}/>
    <Notice error={action.error} message={action.message}/>
    <Button label={action.busy ? 'Creating...' : 'Create team'} icon="add" busy={action.busy} disabled={name.trim().length < 3} onPress={submit}/>
    <View><Button label="Cancel" kind="secondary" onPress={() => router.back()}/></View>
  </Screen>
}
