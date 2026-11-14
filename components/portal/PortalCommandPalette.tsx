'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { CornerDownLeft, Search } from 'lucide-react'
import type { PortalNavGroup } from '@/lib/navigation/portal'
import { PortalNavIcon } from './PortalNavIcon'

type CommandEntry = {
  label: string
  href: string
  icon: string
  group: string
  badge?: number
}

export function PortalCommandPalette({
  portal,
  groups,
  badges,
  open,
  onClose,
}: {
  portal: 'admin' | 'member'
  groups: PortalNavGroup[]
  badges?: Record<string, number>
  open: boolean
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const entries = useMemo<CommandEntry[]>(() => {
    const flattened: CommandEntry[] = []
    for (const group of groups) {
      for (const item of group.items) {
        flattened.push({
          label: item.label,
          href: item.href,
          icon: item.icon,
          group: group.label,
          badge: badges?.[item.href],
        })
      }
    }
    return flattened
  }, [groups, badges])

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return entries
    return entries.filter(
      entry =>
        entry.label.toLowerCase().includes(trimmed) ||
        entry.group.toLowerCase().includes(trimmed) ||
        entry.href.toLowerCase().includes(trimmed),
    )
  }, [entries, query])

  const clampedIndex = filtered.length > 0 ? Math.min(activeIndex, filtered.length - 1) : 0

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal()
        else dialog.setAttribute('open', '')
      }
      inputRef.current?.focus()
    } else if (dialog.open || dialog.hasAttribute('open')) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [open])

  function closePalette() {
    setQuery('')
    setActiveIndex(0)
    onClose()
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (filtered.length > 0) setActiveIndex((clampedIndex + 1) % filtered.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (filtered.length > 0) setActiveIndex((clampedIndex - 1 + filtered.length) % filtered.length)
      return
    }
    if (event.key === 'Enter' && filtered[clampedIndex]) {
      event.preventDefault()
      listRef.current?.querySelector<HTMLAnchorElement>('[data-active="true"]')?.click()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="studio-cmd-dialog"
      aria-label={`Quick jump in ${portal === 'admin' ? 'officer' : 'member'} portal`}
      onCancel={event => {
        event.preventDefault()
        closePalette()
      }}
      onClick={event => {
        if (event.target === dialogRef.current) closePalette()
      }}
    >
      <div className="studio-cmd__search">
        <Search size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          aria-label="Jump to portal page"
          placeholder={`Search ${portal === 'admin' ? 'officer tools' : 'member portal'}…`}
          value={query}
          onChange={event => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={handleInputKeyDown}
        />
        <button type="button" className="studio-cmd__close" onClick={closePalette}>
          ESC
        </button>
      </div>

      {filtered.length > 0 ? (
        <div ref={listRef} className="studio-cmd__list" role="listbox" aria-label="Portal destinations">
          {filtered.map((entry, idx) => (
            <Link
              key={entry.href}
              href={entry.href}
              role="option"
              aria-selected={idx === clampedIndex}
              data-active={idx === clampedIndex ? 'true' : undefined}
              className="studio-cmd__item"
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={closePalette}
            >
              <span className="studio-cmd__item-left">
                <PortalNavIcon name={entry.icon} size={16} />
                <strong>{entry.label}</strong>
              </span>
              <span className="studio-cmd__item-meta">
                {entry.badge && entry.badge > 0 ? (
                  <span className="portal-nav-badge" aria-hidden="true">
                    {entry.badge > 99 ? '99+' : entry.badge}
                  </span>
                ) : null}
                <span className="studio-cmd__group">{entry.group}</span>
                <CornerDownLeft size={13} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="studio-cmd__empty">No matching portal pages for “{query}”.</p>
      )}

      <div className="studio-cmd__footer">
        <span>↑↓ to move • Enter to open</span>
        <span>⌘K / Ctrl+K</span>
      </div>
    </dialog>
  )
}
