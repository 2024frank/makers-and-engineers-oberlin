import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Capstone projects', description: 'Apply for a capstone project with Makers and Engineers @Oberlin and Career Exploration and Development (CED).' }

export default function CapstonePage() {
  return <>
    <section className="directory-hero"><div className="shell"><h1>Capstone projects with CED</h1><p>We work with Career Exploration and Development (CED) to connect students with companies on longer projects shaped by student interests.</p></div></section>
    <section className="detail-body"><div className="shell prose">
      <p>Teams tackle real problems, develop designs, and present work they can discuss in applications, internships, and interviews.</p>
      <h2>Apply</h2>
      <p>The application asks for:</p>
      <ul>
        <li>Your area of interest</li>
        <li>What you want to work on</li>
        <li>Your resume (PDF or Word)</li>
        <li>A company you have in mind, if there is one</li>
      </ul>
      <p>Applications are made in the member portal, so you can come back to edit or withdraw yours.</p>
      <p className="button-row"><Link className="button button--primary" href="/member/capstone">Apply in the member portal</Link></p>
      <p>Not a member yet? <Link href="/get-involved">Join the club</Link> first, then apply once your account is approved.</p>
    </div></section>
  </>
}
