'use client'

import { useState, type FormEvent } from 'react'
import { Check, Palette, Save } from 'lucide-react'
import type { MediaAsset } from '@/lib/cms/media'
import { STUDIO_THEME_PRESETS, type StudioCustomization } from '@/lib/cms/studioTheme'
import { MediaPicker } from '@/components/admin/media/MediaPicker'
import { useToast } from '@/components/ui/Toast'

export function SiteCustomizationForm({
  initial,
  mediaAssets,
}: {
  initial: StudioCustomization
  mediaAssets: MediaAsset[]
}) {
  const [value, setValue] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [savedNote, setSavedNote] = useState('')
  const [errorNote, setErrorNote] = useState('')
  const toast = useToast()

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setErrorNote('')
    setSavedNote('')
    try {
      const response = await fetch('/api/admin/customize', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(value),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error ?? 'Could not save customization.')
      }
      if (result.settings) setValue(result.settings)
      setSavedNote('Site customization saved and published.')
      toast('Site customization published.')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Save failed.'
      setErrorNote(msg)
      toast(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="settings-form" onSubmit={event => void save(event)}>
      <section>
        <h2>
          <Palette size={18} /> Studio color theme
        </h2>
        <p className="permission-note">
          Switch the primary club accent color used across the public site and navigation actions.
        </p>
        <div className="studio-theme-grid" role="radiogroup" aria-label="Theme preset">
          {STUDIO_THEME_PRESETS.map(preset => {
            const active = value.themePreset === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`studio-theme-card ${active ? 'is-selected' : ''}`}
                onClick={() => setValue({ ...value, themePreset: preset.id })}
              >
                <span className="studio-theme-swatch" style={{ background: preset.accent }} />
                <span>
                  <strong>{preset.label}</strong>
                  <small>{active ? 'Active' : 'Click to apply'}</small>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h2>Homepage hero & call to action</h2>
        <p className="permission-note">Leave any field blank to keep the default club copy.</p>
        <label>
          Eyebrow pill
          <input
            value={value.heroEyebrow}
            onChange={e => setValue({ ...value, heroEyebrow: e.target.value })}
            maxLength={80}
            placeholder="Oberlin College · Chartered Engineering Club"
          />
        </label>
        <label>
          Hero headline
          <input
            value={value.heroHeadline}
            onChange={e => setValue({ ...value, heroHeadline: e.target.value })}
            maxLength={120}
            placeholder="Projects for Makers and Engineers."
          />
        </label>
        <label>
          Hero introduction
          <textarea
            rows={3}
            value={value.heroBody}
            onChange={e => setValue({ ...value, heroBody: e.target.value })}
            maxLength={420}
            placeholder="An interdisciplinary club for engineering, technology, design, and robotics at Oberlin..."
          />
        </label>
        <div className="form-grid">
          <label>
            Primary button text
            <input
              value={value.heroPrimaryCtaLabel}
              onChange={e => setValue({ ...value, heroPrimaryCtaLabel: e.target.value })}
              maxLength={48}
              placeholder="Join the club"
            />
          </label>
          <label>
            Primary button link
            <input
              value={value.heroPrimaryCtaHref}
              onChange={e => setValue({ ...value, heroPrimaryCtaHref: e.target.value })}
              placeholder="/get-involved"
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Secondary button text
            <input
              value={value.heroSecondaryCtaLabel}
              onChange={e => setValue({ ...value, heroSecondaryCtaLabel: e.target.value })}
              maxLength={48}
              placeholder="Explore projects"
            />
          </label>
          <label>
            Secondary button link
            <input
              value={value.heroSecondaryCtaHref}
              onChange={e => setValue({ ...value, heroSecondaryCtaHref: e.target.value })}
              placeholder="/projects"
            />
          </label>
        </div>
        <fieldset>
          <legend>Custom homepage hero image (optional)</legend>
          <MediaPicker
            assets={mediaAssets.filter(asset => asset.mimeType.startsWith('image/'))}
            value={value.heroMediaId}
            onChange={heroMediaId => setValue({ ...value, heroMediaId })}
          />
        </fieldset>
      </section>

      <section>
        <h2>Top announcement banner</h2>
        <label className="inline-check">
          <input
            type="checkbox"
            checked={value.announcementEnabled}
            onChange={e => setValue({ ...value, announcementEnabled: e.target.checked })}
          />
          Show announcement bar at the top of the public site
        </label>
        <label>
          Banner text
          <input
            value={value.announcementText}
            onChange={e => setValue({ ...value, announcementText: e.target.value })}
            maxLength={240}
            placeholder="Weekly build nights every Thursday at 7 PM in Science Center B25"
          />
        </label>
        <label>
          Banner link <small>Optional path or URL</small>
          <input
            value={value.announcementHref}
            onChange={e => setValue({ ...value, announcementHref: e.target.value })}
            placeholder="/events"
          />
        </label>
      </section>

      <section>
        <h2>Contact & social links</h2>
        <label>
          Club contact email
          <input
            type="email"
            value={value.contactEmail}
            onChange={e => setValue({ ...value, contactEmail: e.target.value })}
            required
          />
        </label>
        <label>
          Footer tagline
          <input
            value={value.footerText}
            onChange={e => setValue({ ...value, footerText: e.target.value })}
            maxLength={240}
          />
        </label>
        <div className="form-grid">
          <label>
            Instagram URL
            <input
              type="url"
              value={value.socialLinks.instagram}
              onChange={e =>
                setValue({ ...value, socialLinks: { ...value.socialLinks, instagram: e.target.value } })
              }
            />
          </label>
          <label>
            GitHub URL
            <input
              type="url"
              value={value.socialLinks.github}
              onChange={e =>
                setValue({ ...value, socialLinks: { ...value.socialLinks, github: e.target.value } })
              }
            />
          </label>
        </div>
        <label>
          LinkedIn URL
          <input
            type="url"
            value={value.socialLinks.linkedin}
            onChange={e =>
              setValue({ ...value, socialLinks: { ...value.socialLinks, linkedin: e.target.value } })
            }
          />
        </label>
      </section>

      {errorNote && (
        <p className="portal-form-error" role="alert">
          {errorNote}
        </p>
      )}
      {savedNote && (
        <p className="portal-save-feedback" role="status">
          <Check size={17} /> {savedNote}
        </p>
      )}

      <div className="system-actions">
        <button className="button--cardinal" disabled={busy} type="submit">
          <Save size={16} /> {busy ? 'Saving...' : 'Save customization'}
        </button>
      </div>
    </form>
  )
}
