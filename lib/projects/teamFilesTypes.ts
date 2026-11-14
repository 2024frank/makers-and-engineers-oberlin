import { z } from 'zod'

export const PROJECT_FILE_MAX_BYTES = 15 * 1024 * 1024
export const PROJECT_FILE_BUCKET = 'project-files'

export const ALLOWED_PROJECT_FILE_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.step',
  '.stp',
  '.stl',
  '.obj',
  '.3mf',
  '.dxf',
  '.iges',
  '.igs',
  '.f3d',
  '.zip',
  '.csv',
  '.txt',
  '.md',
  '.json',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
])

export type ProjectSharedFile = {
  id: string
  fileName: string
  label: string
  category: 'CAD' | 'Document' | 'Image' | 'Archive' | 'Other'
  mimeType: string
  sizeBytes: number
  uploadedBy: string | null
  uploaderName: string
  note: string
  createdAt: string
}

export const projectFileMetaSchema = z.object({
  id: z.string().uuid(),
  objectPath: z.string().min(1),
  fileName: z.string().min(1).max(200),
  label: z.string().trim().max(120),
  mimeType: z.string().max(160),
  sizeBytes: z.number().int().nonnegative(),
  uploadedBy: z.string().uuid().nullable(),
  uploaderName: z.string().max(120),
  note: z.string().trim().max(400).default(''),
  createdAt: z.string().datetime(),
})

export type ProjectFileMetaRecord = z.infer<typeof projectFileMetaSchema>

export function fileExtension(name: string): string {
  const clean = name.trim().toLowerCase()
  const idx = clean.lastIndexOf('.')
  return idx >= 0 ? clean.slice(idx) : ''
}

export function sanitizeProjectFileName(name: string): string {
  const base = name.replace(/[/\\]/g, '').trim()
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
  return (cleaned || 'project-file').slice(0, 120)
}

export function classifyProjectFileCategory(fileName: string, mimeType: string): ProjectSharedFile['category'] {
  const ext = fileExtension(fileName)
  if (['.step', '.stp', '.stl', '.obj', '.3mf', '.dxf', '.iges', '.igs', '.f3d'].includes(ext)) return 'CAD'
  if (mimeType.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) return 'Image'
  if (ext === '.zip' || mimeType.includes('zip')) return 'Archive'
  if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.txt', '.md', '.json'].includes(ext)) {
    return 'Document'
  }
  return 'Other'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function validateProjectFileCandidate(file: { name: string; size: number; type?: string }) {
  if (!file.name || file.size <= 0) throw new Error('PROJECT_FILE_REQUIRED')
  if (file.size > PROJECT_FILE_MAX_BYTES) throw new Error('PROJECT_FILE_TOO_LARGE')
  const ext = fileExtension(file.name)
  if (!ALLOWED_PROJECT_FILE_EXTENSIONS.has(ext)) throw new Error('PROJECT_FILE_TYPE_UNSUPPORTED')
}
