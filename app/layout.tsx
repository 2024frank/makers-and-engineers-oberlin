import type { Metadata } from 'next'
import './globals.css'
import './site.css'

export const metadata: Metadata = {
  title: { default: 'Projects for Makers and Engineers · Oberlin College', template: '%s · Projects for Makers and Engineers' },
  description: 'Projects for Makers and Engineers at Oberlin College — collaborative hardware, robotics, software, CAD workshops, and 3-2 engineering pathways for all majors.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter+Tight:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
