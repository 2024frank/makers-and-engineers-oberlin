import { useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Body, Button, Field, Muted, Notice, Screen, Title } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { API_URL } from '@/lib/config'
import { colors } from '@/lib/theme'

export default function Login() {
  const { state, signIn, signOut, refresh } = useAuth()
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')

  async function submit() {
    if (busy) return
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    setBusy(true); setError('')
    const problem = await signIn(email, password)
    if (problem) setError(problem)
    setBusy(false)
  }

  return <SafeAreaView style={styles.safe}>
    <Screen>
      <View style={styles.top}>
        <Image source={require('../../../assets/icon-only.png')} style={styles.logo} contentFit="contain" accessibilityLabel="Makers and Engineers @Oberlin"/>
        <Title>Member sign in</Title>
        <Muted>Makers and Engineers @Oberlin</Muted>
      </View>
      {state.status === 'blocked' ? <>
        <Body>{state.reason === 'OFFLINE' ? 'Could not reach the club server. Check your connection and try again.' : 'Your member account must be approved and active before you can use the app.'}</Body>
        <Button label="Try again" onPress={() => void refresh()}/>
        <Button label="Sign out" kind="secondary" onPress={() => void signOut()}/>
      </> : <>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" textContentType="username" returnKeyType="next"/>
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={() => void submit()}/>
        <Notice error={error}/>
        <Button label={busy ? 'Signing in' : 'Sign in'} busy={busy} onPress={() => void submit()}/>
        <Button label="Forgot password or need an account" kind="secondary" onPress={() => void Linking.openURL(`${API_URL}/member/login`)}/>
      </>}
    </Screen>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.page },
  top: { alignItems: 'flex-start', gap: 6, marginTop: 24, marginBottom: 8 },
  logo: { width: 84, height: 84, borderRadius: 18, marginBottom: 10 },
})
