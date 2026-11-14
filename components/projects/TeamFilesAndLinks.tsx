'use client'

import { useState, type FormEvent } from 'react'
import {
  ArrowUpRight,
  Download,
  FileArchive,
  FileCode2,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  formatFileSize,
  PROJECT_FILE_MAX_BYTES,
  type ProjectSharedFile,
} from '@/lib/projects/teamFilesTypes'
import { relativeTime } from '@/lib/projects/labels'

export type SharedProjectLink = {
  id: string
  label: string
  url: string
  addedBy?: string | null
}

function fileIcon(category: ProjectSharedFile['category']) {
  if (category === 'CAD') return FileCode2
  if (category === 'Image') return ImageIcon
  if (category === 'Archive') return FileArchive
  return FileText
}

export function TeamFilesAndLinks({
  projectId,
  initialFiles,
  links,
  me,
  canManageAll,
  mode = 'member',
  githubUrl,
  externalUrl,
}: {
  projectId: string
  initialFiles: ProjectSharedFile[]
  links: SharedProjectLink[]
  me: string
  canManageAll: boolean
  mode?: 'member' | 'admin'
  githubUrl?: string | null
  externalUrl?: string | null
}) {
  const router = useRouter()
  const [files, setFiles] = useState(initialFiles)
  const [fileTitle, setFileTitle] = useState('')
  const [fileNote, setFileNote] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [uploading, setUploading] = useState(false)

  const [linkOpen, setLinkOpen] = useState(false)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const presetLinks = [
    githubUrl ? { id: '_github', label: 'GitHub repository', url: githubUrl } : null,
    externalUrl ? { id: '_external', label: 'Project link', url: externalUrl } : null,
  ].filter((item): item is { id: string; label: string; url: string } => Boolean(item))

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedFile) {
      setError('Choose a file to upload.')
      return
    }
    if (selectedFile.size > PROJECT_FILE_MAX_BYTES) {
      setError('Files must be 15 MB or smaller.')
      return
    }
    setUploading(true)
    setError('')
    setNotice('')
    try {
      const form = new FormData()
      form.append('file', selectedFile)
      if (fileTitle.trim()) form.append('label', fileTitle.trim())
      if (fileNote.trim()) form.append('note', fileNote.trim())
      const response = await fetch(`/api/member/projects/${projectId}/files`, {
        method: 'POST',
        body: form,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.file) {
        throw new Error(
          data.error === 'PROJECT_FILE_TYPE_UNSUPPORTED'
            ? 'Unsupported file type. Upload PDF, images, CAD (.step, .stl, .obj, .dxf, .3mf, .f3d), ZIP, CSV, Markdown, or Office docs.'
            : data.error === 'PROJECT_FILE_TOO_LARGE'
              ? 'File exceeds the 15 MB upload limit.'
              : 'Could not upload that file.',
        )
      }
      setFiles(prev => [data.file as ProjectSharedFile, ...prev])
      setSelectedFile(null)
      setFileTitle('')
      setFileNote('')
      setFileInputKey(n => n + 1)
      setNotice(`Shared "${(data.file as ProjectSharedFile).label}" with the team.`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function removeFile(file: ProjectSharedFile) {
    if (!window.confirm(`Remove "${file.label}" from shared project files?`)) return
    setError('')
    setNotice('')
    try {
      const response = await fetch(
        `/api/member/projects/${projectId}/files?fileId=${encodeURIComponent(file.id)}`,
        { method: 'DELETE' },
      )
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Could not remove file.')
      setFiles(prev => prev.filter(item => item.id !== file.id))
      setNotice(`Removed "${file.label}".`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove file.')
    }
  }

  async function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!linkLabel.trim() || !linkUrl.trim()) return
    setLinkBusy(true)
    setError('')
    setNotice('')
    try {
      const endpoint = mode === 'admin' ? '/api/admin/project-teams' : `/api/member/projects/${projectId}`
      const method = mode === 'admin' ? 'POST' : 'PUT'
      const body =
        mode === 'admin'
          ? { action: 'link-add', projectId, label: linkLabel.trim(), url: linkUrl.trim() }
          : { action: 'link-add', label: linkLabel.trim(), url: linkUrl.trim() }
      const response = await fetch(endpoint, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Check that the link begins with https://')
      setLinkLabel('')
      setLinkUrl('')
      setLinkOpen(false)
      setNotice('Shared link added.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add link.')
    } finally {
      setLinkBusy(false)
    }
  }

  async function removeLink(link: SharedProjectLink) {
    if (!window.confirm(`Remove "${link.label}"?`)) return
    setError('')
    setNotice('')
    try {
      const endpoint = mode === 'admin' ? '/api/admin/project-teams' : `/api/member/projects/${projectId}`
      const method = mode === 'admin' ? 'POST' : 'PUT'
      const body =
        mode === 'admin'
          ? { action: 'link-remove', projectId, linkId: link.id }
          : { action: 'link-remove', linkId: link.id }
      const response = await fetch(endpoint, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Could not remove link.')
      setNotice(`Removed link "${link.label}".`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove link.')
    }
  }

  return (
    <section className="pt-card" aria-labelledby="ws-files-links">
      <div className="pt-card-head">
        <h2 id="ws-files-links">
          <FolderOpen size={17} /> Shared files & links
        </h2>
        <span className="portal-muted">
          {files.length} file{files.length === 1 ? '' : 's'} · {links.length + presetLinks.length} link
          {links.length + presetLinks.length === 1 ? '' : 's'}
        </span>
      </div>
      <p className="pt-hint">
        Share CAD files, PDFs, schematics, code archives, docs, and project links with everyone on this project.
      </p>

      {error && (
        <p className="portal-form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="portal-save-feedback" role="status">
          {notice}
        </p>
      )}

      <div className="pt-stack" style={{ gap: 18 }}>
        <div>
          <h3 className="studio-subhead">Project files</h3>
          {files.length ? (
            <ul className="pt-file-list">
              {files.map(file => {
                const Icon = fileIcon(file.category)
                const canDelete = canManageAll || file.uploadedBy === me
                return (
                  <li key={file.id} className="pt-file-row">
                    <div className="pt-file-row__main">
                      <span className="pt-file-badge" aria-hidden="true">
                        <Icon size={16} />
                      </span>
                      <div>
                        <strong>{file.label}</strong>
                        <small>
                          {file.category} · {formatFileSize(file.sizeBytes)} · Shared by {file.uploaderName} ·{' '}
                          {relativeTime(file.createdAt)}
                        </small>
                        {file.note && <p className="pt-file-note">{file.note}</p>}
                      </div>
                    </div>
                    <div className="pt-actions">
                      <a
                        className="pt-btn--small"
                        href={`/api/member/projects/${projectId}/files?download=${encodeURIComponent(file.id)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download size={14} /> Download
                      </a>
                      {canDelete && (
                        <button
                          type="button"
                          className="pt-btn--small pt-btn--danger"
                          aria-label={`Remove ${file.label}`}
                          onClick={() => void removeFile(file)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="pt-hint">No shared files yet. Upload a CAD model, PDF, datasheet, or zip below.</p>
          )}

          <form className="pt-form" onSubmit={e => void uploadFile(e)} style={{ marginTop: 12 }}>
            <div className="pt-form-row">
              <label>
                Upload file <small>PDF, CAD, ZIP, Docs, Images (max 15 MB)</small>
                <input
                  key={fileInputKey}
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.step,.stp,.stl,.obj,.3mf,.dxf,.iges,.igs,.f3d,.zip,.csv,.txt,.md,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={e => {
                    const picked = e.target.files?.[0] ?? null
                    setSelectedFile(picked)
                    if (picked && !fileTitle.trim()) {
                      setFileTitle(picked.name)
                    }
                  }}
                />
              </label>
              <label>
                Display title <small>Optional</small>
                <input
                  value={fileTitle}
                  onChange={e => setFileTitle(e.target.value)}
                  maxLength={120}
                  placeholder="Chassis STEP v3 or Wiring PDF"
                />
              </label>
            </div>
            {selectedFile && (
              <label>
                Note for teammates <small>Optional</small>
                <input
                  value={fileNote}
                  onChange={e => setFileNote(e.target.value)}
                  maxLength={300}
                  placeholder="Updated hole spacing for M3 heat-set inserts"
                />
              </label>
            )}
            <div className="pt-actions">
              <button className="button--cardinal" disabled={uploading || !selectedFile}>
                <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload file'}
              </button>
            </div>
          </form>
        </div>

        <hr className="studio-divider" />

        <div>
          <div className="pt-card-head">
            <h3 className="studio-subhead">
              <Link2 size={15} /> Project links
            </h3>
            <button type="button" className="pt-btn--small" onClick={() => setLinkOpen(open => !open)}>
              <Plus size={14} /> {linkOpen ? 'Cancel' : 'Add link'}
            </button>
          </div>

          {presetLinks.length + links.length > 0 ? (
            <ul className="pt-links" style={{ marginTop: 8 }}>
              {presetLinks.map(link => (
                <li key={link.id}>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                    <ArrowUpRight size={14} />
                  </a>
                </li>
              ))}
              {links.map(link => (
                <li key={link.id}>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                    <ArrowUpRight size={14} />
                  </a>
                  {(canManageAll || !link.addedBy || link.addedBy === me) && (
                    <button
                      type="button"
                      className="pt-btn--small pt-btn--danger"
                      onClick={() => void removeLink(link)}
                      aria-label={`Remove ${link.label}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="pt-hint">No links shared yet. Add a Drive folder, Onshape CAD, GitHub repo, or BOM.</p>
          )}

          {linkOpen && (
            <form className="pt-form" onSubmit={e => void addLink(e)} style={{ marginTop: 12 }}>
              <div className="pt-form-row">
                <label>
                  Link label
                  <input
                    value={linkLabel}
                    onChange={e => setLinkLabel(e.target.value)}
                    maxLength={120}
                    required
                    placeholder="Onshape assembly / BOM spreadsheet"
                  />
                </label>
                <label>
                  URL
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    required
                    placeholder="https://..."
                  />
                </label>
              </div>
              <div className="pt-actions">
                <button className="button--cardinal" disabled={linkBusy}>
                  {linkBusy ? 'Saving...' : 'Save link'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
