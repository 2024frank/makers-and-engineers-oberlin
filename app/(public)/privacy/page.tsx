import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy', description: 'What the Makers and Engineers @Oberlin website and MOE Members app collect, and how to have it removed.' }

const CONTACT = 'makers.engineers@oberlin.edu'

export default function PrivacyPage() {
  return <>
    <section className="directory-hero"><div className="shell"><h1>Privacy</h1><p>This covers the club website and the MOE Members phone app. Last updated October 3, 2026.</p></div></section>
    <section className="detail-body"><div className="shell prose">
      <h2>What we collect</h2>
      <p>If you have a member account, we store your name, your email address, and whatever you add to your profile. We also store what you do in the member portal: project ideas, applications, invitations, saved projects, and the notes and photos you post to a team workspace.</p>
      <p>The public website can be read without an account.</p>
      <h2>How it is used</h2>
      <p>Your information is used to run the club: signing you in, showing members to each other in the directory, running project teams, and sending club email. We do not sell it, we do not show ads, and we do not use tracking or analytics tools in the app or on the site.</p>
      <h2>Camera and photos</h2>
      <p>The app asks for your camera or photo library only when you choose to add a photo to a team workspace. Only the photos you pick are uploaded.</p>
      <h2>Where it is kept</h2>
      <p>Account data and uploads are stored with Supabase. The site is hosted on Vercel, and club email is sent through Resend. On your phone, the app keeps your sign-in session in the device keychain.</p>
      <h2>Deleting your account</h2>
      <p>Email <a href={'mailto:' + CONTACT}>{CONTACT}</a> from the address on your account and a club officer will delete your account and the data tied to it. Use the same address for any question about this page.</p>
    </div></section>
  </>
}
