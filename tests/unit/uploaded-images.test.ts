// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type sharpModule from 'sharp'

type Sharp = typeof sharpModule

// The real sharp, wrapped so each test can see every input the upload code opens with it.
const mocks = vi.hoisted(() => ({
  opened: [] as unknown[],
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  insert: vi.fn(),
  getCurrentMember: vi.fn(),
  requireAdmin: vi.fn(),
}))
vi.mock('sharp', async importOriginal => {
  const real = (await importOriginal<{ default: Sharp }>()).default
  const recording = (...args: Parameters<Sharp>) => { mocks.opened.push(args[0]); return real(...args) }
  return { default: Object.assign(recording, real) }
})
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    rpc: mocks.rpc,
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${path}` } }) }) },
    from: () => ({ insert: (row: Record<string, unknown>) => { mocks.insert(row); return { select: () => ({ single: async () => ({ data: { id: 'media-1', ...row }, error: null }) }) } } }),
  }),
}))
vi.mock('@/lib/auth/memberSession', () => ({ getCurrentMember: mocks.getCurrentMember }))
vi.mock('@/lib/auth/requireRole', () => ({ requireAdmin: mocks.requireAdmin }))

const PROJECT = '00000000-0000-4000-8000-000000000031'
const OTHER_PROJECT = '00000000-0000-4000-8000-000000000032'
const USER = '00000000-0000-4000-8000-000000000033'

type SampleName = 'jpeg' | 'jpegRotated' | 'png' | 'webp' | 'gif' | 'avif' | 'svg' | 'tiff' | 'brokenJpeg'
let sharp: Sharp
let samples: Record<SampleName, Buffer>
let formatsBeforeGuard: Record<string, string>
let uploads: typeof import('@/lib/media/uploadedImages')
let addProjectWorkLog: typeof import('@/lib/projects/workLogs').addProjectWorkLog
let uploadMedia: typeof import('@/lib/cms/media').uploadMedia
let postWorkLog: typeof import('@/app/api/member/projects/[projectId]/worklog/route').POST
let postMedia: typeof import('@/app/api/media/route').POST

/** Sample files, made here rather than checked in. */
async function makeSamples(): Promise<Record<SampleName, Buffer>> {
  const width = 2000, height = 1200
  const pixels = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 3
    pixels[i] = (x * 255 / width) | 0; pixels[i + 1] = (y * 255 / height) | 0; pixels[i + 2] = ((x + y) * 255 / (width + height)) | 0
  }
  const picture = () => sharp(pixels, { raw: { width, height, channels: 3 } })
  const jpeg = await picture().jpeg({ quality: 90 }).toBuffer()
  return {
    jpeg,
    // EXIF orientation 6 means "turn a quarter clockwise to display", so the stored photo comes out portrait.
    jpegRotated: await picture().withMetadata({ orientation: 6 }).jpeg({ quality: 90 }).toBuffer(),
    png: await picture().png().toBuffer(),
    webp: await picture().webp({ quality: 90 }).toBuffer(),
    gif: await picture().resize(600).gif().toBuffer(),
    avif: await picture().resize(600).avif({ quality: 50 }).toBuffer(),
    tiff: await picture().resize(600).tiff().toBuffer(),
    svg: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="600" height="360" fill="#036"/></svg>'),
    brokenJpeg: jpeg.subarray(0, 2000),
  }
}

beforeAll(async () => {
  sharp = (await vi.importActual<{ default: Sharp }>('sharp')).default
  samples = await makeSamples()
  // Read before the upload code is loaded, while sharp still decodes every format it supports.
  formatsBeforeGuard = Object.fromEntries(await Promise.all((['avif', 'svg', 'tiff'] as const).map(async name => [name, (await sharp(samples[name]).metadata()).format])))
  uploads = await import('@/lib/media/uploadedImages')
  ;({ addProjectWorkLog } = await import('@/lib/projects/workLogs'))
  ;({ uploadMedia } = await import('@/lib/cms/media'))
  ;({ POST: postWorkLog } = await import('@/app/api/member/projects/[projectId]/worklog/route'))
  ;({ POST: postMedia } = await import('@/app/api/media/route'))
}, 60_000)

beforeEach(() => {
  vi.resetAllMocks()
  mocks.opened.length = 0
  mocks.rpc.mockImplementation(async (name: string) => name === 'list_my_project_workspaces' ? { data: [{ project_id: PROJECT }], error: null } : { data: { id: 'log-1' }, error: null })
  mocks.upload.mockResolvedValue({ error: null })
  mocks.remove.mockResolvedValue({ error: null })
  mocks.getCurrentMember.mockResolvedValue({ userId: USER })
  mocks.requireAdmin.mockResolvedValue({ userId: USER, role: 'SUPER_ADMIN', scopes: [] })
})

const file = (bytes: Buffer, type: string, name = 'photo.jpg') => new File([new Uint8Array(bytes)], name, { type })
const savedRpcs = () => mocks.rpc.mock.calls.map(([name]) => name)
// The work log pipeline as it was before this change, copied from lib/projects/workLogs.ts on main.
const workLogBefore = (bytes: Buffer) => sharp(bytes).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()

// Allowed formats, sent with their own type. The work log form sends browser-converted JPEGs, but any of these may arrive.
const allowed: Array<[SampleName, string]> = [['jpeg', 'image/jpeg'], ['jpegRotated', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp'], ['gif', 'image/gif']]
// Other formats, each sent as a PNG and with its true type.
const refused: Array<[SampleName, string]> = [['avif', 'image/png'], ['avif', 'image/avif'], ['svg', 'image/png'], ['svg', 'image/svg+xml'], ['tiff', 'image/png'], ['tiff', 'image/tiff']]

describe('the samples', () => {
  it('include a real AVIF, SVG and TIFF file, which sharp decodes when nothing limits it', () => {
    expect(formatsBeforeGuard).toEqual({ avif: 'heif', svg: 'svg', tiff: 'tiff' })
  })
})

describe('uploadedImageFormat', () => {
  it('names JPEG, PNG, WebP and GIF from their first bytes', () => {
    expect(['jpeg', 'jpegRotated', 'png', 'webp', 'gif'].map(name => uploads.uploadedImageFormat(samples[name as SampleName]))).toEqual(['jpeg', 'jpeg', 'png', 'webp', 'gif'])
  })
  it('refuses every other format and near misses', () => {
    const ascii = (text: string) => Buffer.from(text, 'latin1')
    for (const bytes of [samples.avif, samples.svg, samples.tiff, Buffer.from([0xff, 0xd8]), ascii('GIF8 not a gif'), ascii('RIFF\0\0\0\0WAVEfmt '), ascii('\x89PNG\r\n'), Buffer.alloc(0)]) {
      expect(uploads.uploadedImageFormat(bytes)).toBeNull()
    }
  })
})

describe('the process-wide loader list', () => {
  it('turns off the HEIF, SVG and TIFF loaders for every sharp call once the upload code is loaded', async () => {
    for (const name of ['avif', 'svg', 'tiff'] as const) await expect(sharp(samples[name]).metadata()).rejects.toThrow(/unsupported image format/)
  })
  it('keeps JPEG, PNG, WebP and GIF readable', async () => {
    const formats = await Promise.all(allowed.map(async ([name]) => (await sharp(samples[name]).metadata()).format))
    expect(formats).toEqual(['jpeg', 'jpeg', 'png', 'webp', 'gif'])
  })
})

describe('work log photos', () => {
  it.each(allowed)('stores a %s photo exactly as before', async (name, type) => {
    const expected = await workLogBefore(samples[name])
    await addProjectWorkLog(PROJECT, USER, '', [file(samples[name], type)])
    const [path, stored, options] = mocks.upload.mock.calls[0]
    expect(Buffer.compare(stored, expected)).toBe(0)
    expect(path).toMatch(new RegExp(`^${PROJECT}/${USER}/[0-9a-f-]{36}\\.jpg$`))
    expect(options).toEqual({ contentType: 'image/jpeg', upsert: false })
    expect(mocks.rpc).toHaveBeenLastCalledWith('add_project_work_log', { p_project_id: PROJECT, p_body: '', p_photo_paths: [path] })
  })

  it('looks up team membership once, before the photos', async () => {
    await addProjectWorkLog(PROJECT, USER, '', [file(samples.jpeg, 'image/jpeg'), file(samples.png, 'image/png')])
    expect(savedRpcs()).toEqual(['list_my_project_workspaces', 'add_project_work_log'])
    expect(mocks.upload).toHaveBeenCalledTimes(2)
  })

  it('keeps the size and orientation rules: at most 1600px, turned upright, never enlarged', async () => {
    const sizes: string[] = []
    for (const [name, type] of allowed) {
      mocks.upload.mockClear()
      await addProjectWorkLog(PROJECT, USER, '', [file(samples[name], type)])
      const meta = await sharp(mocks.upload.mock.calls[0][1]).metadata()
      sizes.push(`${name} ${meta.format} ${meta.width}x${meta.height}`)
    }
    expect(sizes).toEqual(['jpeg jpeg 1600x960', 'jpegRotated jpeg 960x1600', 'png jpeg 1600x960', 'webp jpeg 1600x960', 'gif jpeg 600x360'])
  })

  it.each(refused)('refuses a %s file sent as %s without opening it', async (name, type) => {
    await expect(addProjectWorkLog(PROJECT, USER, 'Wired the motor driver.', [file(samples[name], type)])).rejects.toThrow('WORK_LOG_PHOTO_INVALID')
    expect(mocks.opened).toEqual([])
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(savedRpcs()).toEqual(['list_my_project_workspaces'])
  })

  it('refuses the whole entry when one of several photos is another format', async () => {
    await expect(addProjectWorkLog(PROJECT, USER, '', [file(samples.jpeg, 'image/jpeg'), file(samples.svg, 'image/jpeg')])).rejects.toThrow('WORK_LOG_PHOTO_INVALID')
    expect(mocks.opened.some(input => Buffer.compare(input as Buffer, samples.svg) === 0)).toBe(false)
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('still reports a damaged JPEG as unreadable', async () => {
    await expect(addProjectWorkLog(PROJECT, USER, '', [file(samples.brokenJpeg, 'image/jpeg')])).rejects.toThrow('WORK_LOG_PHOTO_INVALID')
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('keeps the declared-type and size checks', async () => {
    await expect(addProjectWorkLog(PROJECT, USER, '', [file(samples.jpeg, 'application/octet-stream')])).rejects.toThrow('WORK_LOG_PHOTO_INVALID')
    await expect(addProjectWorkLog(PROJECT, USER, '', [file(Buffer.concat([samples.jpeg, Buffer.alloc(4 * 1024 * 1024)]), 'image/jpeg')])).rejects.toThrow('WORK_LOG_PHOTO_TOO_LARGE')
    expect(mocks.opened).toEqual([])
  })

  it('checks that the member is on the team before opening any photo', async () => {
    mocks.rpc.mockImplementation(async () => ({ data: [{ project_id: OTHER_PROJECT }], error: null }))
    await expect(addProjectWorkLog(PROJECT, USER, '', [file(samples.jpeg, 'image/jpeg')])).rejects.toThrow('PROJECT_MEMBER_REQUIRED')
    expect(mocks.opened).toEqual([])
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(savedRpcs()).toEqual(['list_my_project_workspaces'])
  })

  it('treats a member whose membership is no longer active as off the team', async () => {
    mocks.rpc.mockImplementation(async () => ({ data: null, error: { message: 'ACTIVE_MEMBER_REQUIRED' } }))
    await expect(addProjectWorkLog(PROJECT, USER, '', [file(samples.jpeg, 'image/jpeg')])).rejects.toThrow('PROJECT_MEMBER_REQUIRED')
    expect(mocks.opened).toEqual([])
  })

  it('passes any other lookup failure through', async () => {
    mocks.rpc.mockImplementation(async () => ({ data: null, error: { message: 'canceling statement due to statement timeout' } }))
    await expect(addProjectWorkLog(PROJECT, USER, '', [file(samples.jpeg, 'image/jpeg')])).rejects.toThrow('canceling statement due to statement timeout')
    expect(mocks.opened).toEqual([])
  })

  it('saves a note without photos as before, with no extra lookup', async () => {
    await expect(addProjectWorkLog(PROJECT, USER, 'Wired the motor driver.', [])).resolves.toEqual({ id: 'log-1' })
    expect(mocks.rpc.mock.calls).toEqual([['add_project_work_log', { p_project_id: PROJECT, p_body: 'Wired the motor driver.', p_photo_paths: [] }]])
  })

  it('answers the form with the existing error codes', async () => {
    const send = async (photo: File) => {
      const form = new FormData()
      form.set('body', 'Wired the motor driver.')
      form.append('photos', photo)
      const response = await postWorkLog(new Request(`https://example.test/api/member/projects/${PROJECT}/worklog`, { method: 'POST', body: form }), { params: Promise.resolve({ projectId: PROJECT }) })
      return [response.status, await response.json()]
    }
    expect(await send(file(samples.svg, 'image/png'))).toEqual([400, { error: 'WORK_LOG_PHOTO_INVALID' }])
    expect(await send(file(samples.avif, 'image/avif'))).toEqual([400, { error: 'WORK_LOG_PHOTO_INVALID' }])
    mocks.rpc.mockImplementation(async () => ({ data: [], error: null }))
    expect(await send(file(samples.jpeg, 'image/jpeg'))).toEqual([400, { error: 'PROJECT_MEMBER_REQUIRED' }])
    expect(mocks.opened).toEqual([])
  })
})

describe('media library uploads', () => {
  it.each(allowed)('records the same width and height as before for a %s file', async (name, type) => {
    // Before this change uploadMedia stored the width and height from sharp(bytes).metadata().
    const before = await sharp(samples[name]).metadata()
    const item = await uploadMedia(file(samples[name], type, 'picture.bin'), USER)
    expect({ width: item.width, height: item.height }).toEqual({ width: before.width, height: before.height })
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ mime_type: type, width: before.width, height: before.height, size_bytes: samples[name].length }))
    const [, storedBytes, options] = mocks.upload.mock.calls[0]
    expect(Buffer.compare(storedBytes, samples[name])).toBe(0)
    expect(options).toEqual({ contentType: type, upsert: false })
  })

  it.each(refused.filter(([, type]) => type === 'image/png'))('refuses %s bytes sent as %s with INVALID_IMAGE, without opening them', async name => {
    await expect(uploadMedia(file(samples[name], 'image/png', 'picture.png'), USER)).rejects.toThrow('INVALID_IMAGE')
    expect(mocks.opened).toEqual([])
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it.each(refused.filter(([, type]) => type !== 'image/png'))('refuses a %s file sent as %s with UNSUPPORTED_TYPE, as before', async (name, type) => {
    await expect(uploadMedia(file(samples[name], type, 'picture'), USER)).rejects.toThrow('UNSUPPORTED_TYPE')
    expect(mocks.opened).toEqual([])
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('stores a PDF as before, without opening it', async () => {
    const pdf = Buffer.from('%PDF-1.4\n%%EOF\n')
    const item = await uploadMedia(file(pdf, 'application/pdf', 'flyer.pdf'), USER)
    expect({ width: item.width, height: item.height, mimeType: item.mimeType }).toEqual({ width: null, height: null, mimeType: 'application/pdf' })
    expect(mocks.opened).toEqual([])
  })

  it('answers the media library with the existing error codes', async () => {
    const send = async (upload: File) => {
      const form = new FormData()
      form.set('file', upload)
      const response = await postMedia(new Request('https://example.test/api/media', { method: 'POST', body: form }))
      return [response.status, await response.json()]
    }
    expect(await send(file(samples.svg, 'image/png', 'logo.png'))).toEqual([400, { error: 'INVALID_IMAGE' }])
    expect(await send(file(samples.tiff, 'image/tiff', 'scan.tiff'))).toEqual([400, { error: 'UNSUPPORTED_TYPE' }])
    expect(mocks.opened).toEqual([])
  })
})

// Runs last: it changes the loader list for the rest of this test file's process.
describe('after the Next.js image optimizer turns HEIF, SVG and TIFF back on in the same process', () => {
  beforeAll(async () => {
    // The list Next.js 16.4's image optimizer sets the first time it runs (16.3 sets the same list without SVG).
    sharp.block({ operation: ['VipsForeignLoad'] })
    sharp.unblock({ operation: ['VipsForeignLoadHeif', 'VipsForeignLoadJpeg', 'VipsForeignLoadNsgif', 'VipsForeignLoadPng', 'VipsForeignLoadSvg', 'VipsForeignLoadTiff', 'VipsForeignLoadWebp'] })
    expect((await sharp(samples.avif).metadata()).format).toBe('heif')
  })

  it.each(refused)('still refuses a %s file sent as %s on both paths without opening it', async (name, type) => {
    await expect(addProjectWorkLog(PROJECT, USER, '', [file(samples[name], type)])).rejects.toThrow('WORK_LOG_PHOTO_INVALID')
    await expect(uploadMedia(file(samples[name], type, 'picture'), USER)).rejects.toThrow(type === 'image/png' ? 'INVALID_IMAGE' : 'UNSUPPORTED_TYPE')
    expect(mocks.opened).toEqual([])
    expect(mocks.upload).not.toHaveBeenCalled()
  })
})
