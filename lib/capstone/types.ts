export type CapstoneStatus = 'PENDING' | 'REVIEWED' | 'WITHDRAWN'

export type CapstoneApplication = {
  userId: string
  displayName: string
  email: string
  areaOfInterest: string
  interests: string
  company: string
  resumePath: string
  resumeName: string
  status: CapstoneStatus
  submittedAt: string
  reviewedAt: string | null
}

export const CAPSTONE_LIMITS = { area: [2, 200], interests: [20, 3000], company: 200, resumeBytes: 4 * 1024 * 1024 } as const

export const RESUME_TYPES: Record<string, 'pdf' | 'docx'> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

/** Some browsers report no type for .docx files, so fall back to the file name. */
export function resumeType(file: { type: string; name: string }) {
  const ext = RESUME_TYPES[file.type] ?? (file.type ? undefined : (['pdf', 'docx'] as const).find(e => file.name.toLowerCase().endsWith(`.${e}`)))
  if (!ext) return null
  return { ext, mime: Object.keys(RESUME_TYPES).find(mime => RESUME_TYPES[mime] === ext)! }
}

export const capstoneStatusLabels: Record<CapstoneStatus, string> = { PENDING: 'Submitted', REVIEWED: 'Reviewed', WITHDRAWN: 'Withdrawn' }
