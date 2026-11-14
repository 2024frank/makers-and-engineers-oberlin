// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { projectTeamActionSchema } from '@/lib/projects/teamAdminInput'
import {
  classifyProjectFileCategory,
  formatFileSize,
  PROJECT_FILE_MAX_BYTES,
  sanitizeProjectFileName,
  validateProjectFileCandidate,
} from '@/lib/projects/teamFilesTypes'

const mocks = vi.hoisted(() => ({
  getCurrentAdmin: vi.fn(),
  getCurrentMember: vi.fn(),
  getProjectWorkspace: vi.fn(),
  listProjectSharedFiles: vi.fn(),
  uploadProjectSharedFile: vi.fn(),
  createProjectFileDownloadUrl: vi.fn(),
  deleteProjectSharedFile: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ getCurrentAdmin: mocks.getCurrentAdmin }))
vi.mock('@/lib/auth/memberSession', () => ({ getCurrentMember: mocks.getCurrentMember }))
vi.mock('@/lib/projects/workspace', () => ({ getProjectWorkspace: mocks.getProjectWorkspace }))
vi.mock('@/lib/projects/teamFiles', () => ({
  listProjectSharedFiles: mocks.listProjectSharedFiles,
  uploadProjectSharedFile: mocks.uploadProjectSharedFile,
  createProjectFileDownloadUrl: mocks.createProjectFileDownloadUrl,
  deleteProjectSharedFile: mocks.deleteProjectSharedFile,
}))

import { DELETE, GET, POST } from '@/app/api/member/projects/[projectId]/files/route'

const PROJECT_ID = '11111111-1111-4111-8111-111111111111'
const FILE_ID = '22222222-2222-4222-8222-222222222222'
const USER_ID = '33333333-3333-4333-8333-333333333333'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getCurrentAdmin.mockResolvedValue(null)
  mocks.getCurrentMember.mockResolvedValue(null)
})

afterEach(() => vi.restoreAllMocks())

describe('project file helpers and validation', () => {
  it('classifies CAD, Document, Image, and Archive engineering files accurately', () => {
    expect(classifyProjectFileCategory('Chassis_v2.step', 'application/octet-stream')).toBe('CAD')
    expect(classifyProjectFileCategory('Bracket.STL', 'model/stl')).toBe('CAD')
    expect(classifyProjectFileCategory('Schematic.pdf', 'application/pdf')).toBe('Document')
    expect(classifyProjectFileCategory('Bench.webp', 'image/webp')).toBe('Image')
    expect(classifyProjectFileCategory('Firmware.zip', 'application/zip')).toBe('Archive')
  })

  it('sanitizes filenames and formats sizes cleanly', () => {
    expect(sanitizeProjectFileName('../../Robot CAD (v3).step')).toBe('Robot-CAD-v3-.step')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2 KB')
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB')
  })

  it('enforces allowed extensions and 15 MB size cap', () => {
    expect(() => validateProjectFileCandidate({ name: 'arm.step', size: 1024 })).not.toThrow()
    expect(() => validateProjectFileCandidate({ name: 'bom.pdf', size: PROJECT_FILE_MAX_BYTES })).not.toThrow()
    expect(() => validateProjectFileCandidate({ name: 'huge.zip', size: PROJECT_FILE_MAX_BYTES + 1 })).toThrow(
      'PROJECT_FILE_TOO_LARGE',
    )
    expect(() => validateProjectFileCandidate({ name: 'malware.exe', size: 100 })).toThrow(
      'PROJECT_FILE_TYPE_UNSUPPORTED',
    )
  })
})

describe('/api/member/projects/[projectId]/files route authorization', () => {
  it('denies non-members and Editors without project access', async () => {
    mocks.getCurrentAdmin.mockResolvedValue({ userId: USER_ID, role: 'EDITOR', active: true, displayName: 'Ed' })
    mocks.getCurrentMember.mockResolvedValue(null)
    const res = await GET(new Request(`https://example.test/api/member/projects/${PROJECT_ID}/files`), {
      params: Promise.resolve({ projectId: PROJECT_ID }),
    })
    expect(res.status).toBe(403)
  })

  it('allows active Admin and project team members to list, upload, download, and delete files', async () => {
    mocks.getCurrentMember.mockResolvedValue({ userId: USER_ID, displayName: 'Ada Member' })
    mocks.getProjectWorkspace.mockResolvedValue({ myRole: 'MEMBER' })
    mocks.listProjectSharedFiles.mockResolvedValue([
      {
        id: FILE_ID,
        fileName: 'frame.step',
        label: 'Chassis CAD',
        category: 'CAD',
        mimeType: 'application/octet-stream',
        sizeBytes: 4096,
        uploadedBy: USER_ID,
        uploaderName: 'Ada Member',
        note: 'Rev 2',
        createdAt: '2026-11-14T00:00:00.000Z',
      },
    ])

    const listRes = await GET(new Request(`https://example.test/api/member/projects/${PROJECT_ID}/files`), {
      params: Promise.resolve({ projectId: PROJECT_ID }),
    })
    expect(listRes.status).toBe(200)
    expect((await listRes.json()).files).toHaveLength(1)

    mocks.createProjectFileDownloadUrl.mockResolvedValue('https://storage.example/signed')
    const dlRes = await GET(
      new Request(`https://example.test/api/member/projects/${PROJECT_ID}/files?download=${FILE_ID}`),
      { params: Promise.resolve({ projectId: PROJECT_ID }) },
    )
    expect(dlRes.status).toBe(307)
    expect(dlRes.headers.get('location')).toBe('https://storage.example/signed')

    const form = new FormData()
    form.append('file', new File(['step-data'], 'frame.step', { type: 'application/octet-stream' }))
    form.append('label', 'Frame CAD')
    mocks.uploadProjectSharedFile.mockResolvedValue({ id: FILE_ID, label: 'Frame CAD' })
    const uploadRes = await POST(
      new Request(`https://example.test/api/member/projects/${PROJECT_ID}/files`, { method: 'POST', body: form }),
      { params: Promise.resolve({ projectId: PROJECT_ID }) },
    )
    expect(uploadRes.status).toBe(201)

    mocks.deleteProjectSharedFile.mockResolvedValue(undefined)
    const delRes = await DELETE(
      new Request(`https://example.test/api/member/projects/${PROJECT_ID}/files?fileId=${FILE_ID}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ projectId: PROJECT_ID }) },
    )
    expect(delRes.status).toBe(200)
  })
})

describe('admin project link actions validation', () => {
  it('validates link-add and link-remove payloads and rejects non-HTTP URLs', () => {
    const added = projectTeamActionSchema.parse({
      action: 'link-add',
      projectId: PROJECT_ID,
      label: 'Onshape CAD',
      url: 'https://cad.onshape.com/documents/123',
    })
    expect(added.action).toBe('link-add')

    const removed = projectTeamActionSchema.parse({
      action: 'link-remove',
      projectId: PROJECT_ID,
      linkId: FILE_ID,
    })
    expect(removed.action).toBe('link-remove')

    expect(() =>
      projectTeamActionSchema.parse({
        action: 'link-add',
        projectId: PROJECT_ID,
        label: 'Bad',
        url: 'javascript:alert(1)',
      }),
    ).toThrow()
  })
})
