import type { Metadata } from 'next'
import './globals.css'
import './site.css'

export const metadata: Metadata = {
  title: { default: 'Makers and Engineers @Oberlin', template: '%s · Makers and Engineers @Oberlin' },
  description: 'An interdisciplinary club at Oberlin College for engineering, technology, design, and robotics. Explore workshops, student and alumni talks, team projects, community, and engineering pathways. All majors welcome.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter+Tight:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
