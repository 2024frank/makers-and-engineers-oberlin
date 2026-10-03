import { Redirect } from 'expo-router'
import { useAuth } from '@/lib/auth'

export default function Index() {
  const { state } = useAuth()
  return <Redirect href={state.status === 'ready' ? '/home' : '/login'}/>
}
