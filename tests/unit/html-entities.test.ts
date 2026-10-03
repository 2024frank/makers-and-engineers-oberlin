// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { decodeHtmlEntities } from '@/lib/content/htmlEntities'

describe('decodeHtmlEntities', () => {
  it.each([
    ['amp', '&'],
    ['quot', '"'],
    ['apos', "'"],
    ['nbsp', '\u00a0'],
    ['lt', '<'],
    ['gt', '>'],
    ['ndash', '–'],
    ['mdash', '—'],
    ['lsquo', '‘'],
    ['rsquo', '’'],
    ['ldquo', '“'],
    ['rdquo', '”'],
    ['hellip', '…'],
  ])('decodes the named entity &%s;', (name, character) => {
    expect(decodeHtmlEntities(`Before &${name}; after`)).toBe(`Before ${character} after`)
  })

  it.each([
    ['&#38;', '&'],
    ['&#00038;', '&'],
    ['&#x26;', '&'],
    ['&#X0026;', '&'],
    ['&#x201C;', '“'],
    ['&#128736;', '🛠'],
    ['&#x1f6e0;', '🛠'],
    ['&#55295;', '\ud7ff'],
    ['&#57344;', '\ue000'],
    ['&#1114111;', '\u{10ffff}'],
    ['&#x10FFFF;', '\u{10ffff}'],
  ])('decodes the numeric entity %s', (entity, character) => {
    expect(decodeHtmlEntities(entity)).toBe(character)
  })

  it.each([
    '&unknown;', '&constructor;', '&toString;', '&AMP;',
    '&amp', '& amp;', '&#;', '&#x;', '&#-1;', '&#+38;', '&# 38;',
    '&#38.0;', '&#38oops;', '&#xZZ;', '&#x26oops;', '&#38',
    '&#1114112;', '&#x110000;', '&#999999999999999999999999;',
    '&#55296;', '&#57343;', '&#xD800;', '&#xDFFF;',
  ])('preserves unknown, malformed, or invalid entity %s', entity => {
    expect(decodeHtmlEntities(entity)).toBe(entity)
  })

  it('preserves existing text and whitespace', () => {
    const text = '  Makers & Engineers\n\tOberlin’s students  '
    expect(decodeHtmlEntities(text)).toBe(text)
    expect(decodeHtmlEntities('')).toBe('')
  })

  it('decodes multiple entities in one pass without recursively decoding escaped text', () => {
    expect(decodeHtmlEntities('Makers &amp; Engineers &mdash; &ldquo;Build&rdquo; &amp;lt; &amp;#38;'))
      .toBe('Makers & Engineers — “Build” &lt; &#38;')
  })

  it('returns markup as plain text without interpreting or stripping it', () => {
    expect(decodeHtmlEntities('&lt;strong&gt;Build &amp; learn&lt;/strong&gt; <em>together</em>'))
      .toBe('<strong>Build & learn</strong> <em>together</em>')
  })
})
