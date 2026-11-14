'use client'

import {
  Bell,
  Bookmark,
  BookOpen,
  Briefcase,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderKanban,
  History,
  House,
  Image as ImageIcon,
  Inbox,
  Lightbulb,
  Navigation,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'

const PORTAL_ICONS: Record<string, LucideIcon> = {
  home: House,
  inbox: Inbox,
  requests: ClipboardList,
  idea: Lightbulb,
  projects: FolderKanban,
  calendar: CalendarDays,
  people: Users,
  pages: FileText,
  updates: History,
  briefcase: Briefcase,
  book: BookOpen,
  image: ImageIcon,
  settings: Settings,
  navigation: Navigation,
  shield: ShieldCheck,
  history: History,
  search: Search,
  bell: Bell,
  bookmark: Bookmark,
  profile: UserRound,
  phone: Smartphone,
}

export function PortalNavIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = PORTAL_ICONS[name] ?? FileText
  return <Icon size={size} aria-hidden="true" />
}
