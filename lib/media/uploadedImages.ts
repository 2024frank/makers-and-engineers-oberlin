import 'server-only'
import sharp, { type Metadata, type Sharp } from 'sharp'

/*
 * Uploaded images are decoded only if they are JPEG, PNG, WebP or GIF.
 *
 * The type a browser declares for a file comes from its name, and sharp chooses a
 * decoder from the file's contents, so the declared type does not decide which decoder
 * runs. Two guards limit uploads to these four formats:
 *
 * 1. openUploadedImage() reads the format from the file's first bytes, here, before
 *    sharp sees the file, and refuses anything else. Each check is at least as strict
 *    as the libvips check for the same format, so libvips hands an accepted file to the
 *    matching decoder. Then it reads only the header and confirms the format before any
 *    pixels are decoded.
 * 2. When this module loads, every libvips loader except these four is blocked for the
 *    whole process. That includes the Ultra HDR loader, which libvips would otherwise
 *    try on JPEGs before its JPEG loader. Writing images is not affected.
 *
 * The Next.js image optimizer sets its own list of loaders the first time it runs in a
 * process, and its list turns HEIF and TIFF back on (SVG too, from Next.js 16.4). That
 * only happens where the optimizer runs inside the app's process, as in `next dev` and
 * `next start`; on Vercel it runs outside the app's functions. Guard 1 keeps uploads to
 * the four formats either way, and neither list turns the Ultra HDR loader back on.
 */

export const UPLOADED_IMAGE_FORMATS = ['jpeg', 'png', 'webp', 'gif'] as const
export type UploadedImageFormat = (typeof UPLOADED_IMAGE_FORMATS)[number]

// libvips loader classes. A class covers its file, buffer and stream variants.
sharp.block({ operation: ['VipsForeignLoad'] })
sharp.unblock({ operation: ['VipsForeignLoadJpeg', 'VipsForeignLoadPng', 'VipsForeignLoadWebp', 'VipsForeignLoadNsgif'] })

function hasBytes(bytes: Uint8Array, offset: number, expected: string | readonly number[]) {
  const values = typeof expected === 'string' ? [...expected].map(char => char.charCodeAt(0)) : expected
  return bytes.length >= offset + values.length && values.every((value, index) => bytes[offset + index] === value)
}

/** The accepted format the bytes start with, or null. Only the file signature is read. */
export function uploadedImageFormat(bytes: Uint8Array): UploadedImageFormat | null {
  // libvips 8.18 looks for FF D8 (JPEG), the 8-byte PNG signature, RIFF....WEBP and GIF8.
  if (hasBytes(bytes, 0, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (hasBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (hasBytes(bytes, 0, 'RIFF') && hasBytes(bytes, 8, 'WEBP')) return 'webp'
  if (hasBytes(bytes, 0, 'GIF87a') || hasBytes(bytes, 0, 'GIF89a')) return 'gif'
  return null
}

/**
 * Opens uploaded bytes with sharp if they are JPEG, PNG, WebP or GIF, and throws
 * UNSUPPORTED_IMAGE_FORMAT otherwise. Only the header is read; the returned image can be
 * processed further.
 */
export async function openUploadedImage(bytes: Buffer): Promise<{ image: Sharp; metadata: Metadata }> {
  const format = uploadedImageFormat(bytes)
  if (!format) throw new Error('UNSUPPORTED_IMAGE_FORMAT')
  const image = sharp(bytes)
  const metadata = await image.metadata()
  if (metadata.format !== format) throw new Error('UNSUPPORTED_IMAGE_FORMAT')
  return { image, metadata }
}
