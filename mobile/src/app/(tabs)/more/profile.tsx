import { useState } from 'react'
import { View } from 'react-native'
import Stack from 'expo-router/stack'
import { Body, Button, Card, ErrorState, Field, Heading, Loading, Muted, Notice, Screen } from '@/components/ui'
import { Toggle } from '@/components/home/parts'
import { api, ApiError, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useApi } from '@/lib/useApi'

type Profile = {
  email: string; displayName: string; classYear: number | null; major: string; disciplines: string[]; skills: string[]; projectInterests: string[]
  availability: string; portfolioUrl: string; githubUrl: string; linkedinUrl: string; directoryVisible: boolean; visibleFields: string[]; shareContact: boolean
}

const privacyFields = [
  ['display_name', 'Name'], ['class_year', 'Class year'], ['major', 'Major'], ['disciplines', 'Engineering disciplines'], ['skills', 'Skills'],
  ['project_interests', 'Project interests'], ['availability', 'Availability'], ['portfolio_url', 'Portfolio'], ['github_url', 'GitHub'], ['linkedin_url', 'LinkedIn'],
] as const

const join = (items: string[]) => items.join(', ')
const split = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean)

// The web form shows the server's message as is. These codes are the ones the profile route can return.
const messages: Record<string, string> = {
  DISPLAY_NAME_REQUIRED: 'Enter your name, at least 2 characters.',
  CLASS_YEAR_INVALID: 'Class year must be between 2020 and 2100.',
  PROFILE_URL_INVALID: 'Portfolio, GitHub and LinkedIn links must start with https:// or http://.',
}
const fallback = 'Profile update failed.'

function ProfileForm({ initial }: { initial: Profile }) {
  const { refresh } = useAuth()
  const [name, setName] = useState(initial.displayName)
  const [classYear, setClassYear] = useState(initial.classYear == null ? '' : String(initial.classYear))
  const [major, setMajor] = useState(initial.major)
  const [disciplines, setDisciplines] = useState(join(initial.disciplines))
  const [skills, setSkills] = useState(join(initial.skills))
  const [interests, setInterests] = useState(join(initial.projectInterests))
  const [availability, setAvailability] = useState(initial.availability)
  const [portfolio, setPortfolio] = useState(initial.portfolioUrl)
  const [github, setGithub] = useState(initial.githubUrl)
  const [linkedin, setLinkedin] = useState(initial.linkedinUrl)
  const [directoryVisible, setDirectoryVisible] = useState(initial.directoryVisible)
  const [visible, setVisible] = useState<string[]>(initial.visibleFields)
  const [shareContact, setShareContact] = useState(initial.shareContact)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [problem, setProblem] = useState('')

  async function save() {
    if (busy) return
    setBusy(true); setMessage(''); setProblem('')
    try {
      await api('/api/member/profile', { method: 'PUT', body: {
        displayName: name, classYear, major, disciplines: split(disciplines), skills: split(skills), projectInterests: split(interests),
        availability, portfolioUrl: portfolio, githubUrl: github, linkedinUrl: linkedin, directoryVisible, shareContact, visibleFields: visible,
      } })
      setMessage('Profile and directory privacy saved.')
      void refresh()
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : ''
      setProblem(messages[code] ?? (['OFFLINE', 'SIGNED_OUT', 'ACTIVE_MEMBER_REQUIRED'].includes(code) ? errorMessage(caught) : fallback))
    } finally { setBusy(false) }
  }

  return <>
    <Card>
      <Heading>Profile</Heading>
      <Muted>Your Oberlin email is fixed to your approved account and is private by default.</Muted>
      <Field label="Oberlin email" value={initial.email} editable={false}/>
      <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name"/>
      <Field label="Class year" value={classYear} onChangeText={setClassYear} keyboardType="number-pad"/>
      <Field label="Major" value={major} onChangeText={setMajor}/>
      <Field label="Engineering disciplines" hint="Comma separated" value={disciplines} onChangeText={setDisciplines} placeholder="Electrical, Mechanical, Robotics"/>
      <Field label="Skills" hint="Comma separated" value={skills} onChangeText={setSkills} placeholder="CAD, Python, PCB design"/>
      <Field label="Project interests" hint="Comma separated" value={interests} onChangeText={setInterests} placeholder="Robotics, sustainability, assistive tech"/>
      <Field label="Availability" value={availability} onChangeText={setAvailability} multiline placeholder="Example: Tuesday evenings and weekends"/>
      <Field label="Portfolio URL" value={portfolio} onChangeText={setPortfolio} keyboardType="url" autoCapitalize="none" autoCorrect={false}/>
      <Field label="GitHub URL" value={github} onChangeText={setGithub} keyboardType="url" autoCapitalize="none" autoCorrect={false}/>
      <Field label="LinkedIn URL" value={linkedin} onChangeText={setLinkedin} keyboardType="url" autoCapitalize="none" autoCorrect={false}/>
    </Card>
    <Card>
      <Heading>Directory privacy</Heading>
      <Toggle label="Show me in the private member directory" value={directoryVisible} onChange={setDirectoryVisible}/>
      <Body>Choose what approved members can see.</Body>
      <View>{privacyFields.map(([key, label]) => <Toggle key={key} label={label} value={visible.includes(key)} onChange={on => setVisible(current => on ? [...current.filter(item => item !== key), key] : current.filter(item => item !== key))}/>)}</View>
      <Toggle label="Allow approved members to see my Oberlin email" value={shareContact} onChange={setShareContact}/>
    </Card>
    <Notice error={problem} message={message}/>
    <Button label="Save profile" busy={busy} onPress={() => void save()}/>
  </>
}

export default function Profile() {
  const { data, error, loading, refreshing, reload } = useApi<{ profile: Profile }>('/api/mobile/profile')
  const header = <Stack.Screen options={{ title: 'My profile' }}/>
  if (loading && !data) return <Screen>{header}<Loading/></Screen>
  if (!data) return <Screen refreshing={refreshing} onRefresh={reload}>{header}<ErrorState error={error} onRetry={reload}/></Screen>
  return <Screen>
    {header}
    <Muted>Keep your engineering interests current and choose what other approved members can see.</Muted>
    <ProfileForm initial={data.profile}/>
  </Screen>
}
