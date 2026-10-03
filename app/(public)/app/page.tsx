import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Get the app', description: 'Download the MEO Members app for Android. The iPhone version is in App Store review.' }

const APK_URL = 'https://github.com/2024frank/makers-and-engineers-oberlin/releases/latest/download/moe-members.apk'

export default function AppPage() {
  return <>
    <section className="directory-hero"><div className="shell"><h1>Get the MEO Members app</h1><p>The member portal on your phone: projects, your team workspace, the member directory and notifications. Sign in with your club member account.</p></div></section>
    <section className="detail-body"><div className="shell prose">
      <h2>Android</h2>
      <p className="button-row"><a className="button button--primary" href={APK_URL}>Download for Android</a></p>
      <ol>
        <li>Open this page on your Android phone and tap the download button.</li>
        <li>Open the downloaded file. If Android asks, allow your browser to install apps.</li>
        <li>Open MEO Members and sign in.</li>
      </ol>
      <p>The app comes from this page, not the Google Play Store, so Android will warn you that it is from an unknown source.</p>
      <h2>iPhone</h2>
      <p>The iPhone app has been submitted to the App Store and is waiting for review. Until it is approved, use the <Link href="/member/login">member portal</Link> in your browser.</p>
      <h2>Not a member yet?</h2>
      <p>You need an approved member account to sign in. <Link href="/get-involved">Join the club</Link> first. See <Link href="/privacy">Privacy</Link> for what the app collects.</p>
    </div></section>
  </>
}
