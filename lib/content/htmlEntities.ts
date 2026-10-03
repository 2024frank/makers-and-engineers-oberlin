const namedEntities: Readonly<Record<string, string>> = {
  amp: '&',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  lt: '<',
  gt: '>',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
}

// Decode one layer for text rendering only; this does not sanitize HTML.
// Keep nbsp as U+00A0 to preserve its non-breaking space semantics.
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#(?:[0-9]+|[xX][0-9a-fA-F]+)|[a-zA-Z][a-zA-Z0-9]*);/g, (entity: string, value: string) => {
    if (!value.startsWith('#')) {
      return Object.hasOwn(namedEntities, value) ? namedEntities[value] : entity
    }

    const hexadecimal = value[1] === 'x' || value[1] === 'X'
    const codePoint = Number.parseInt(value.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10)
    if (codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return entity
    return String.fromCodePoint(codePoint)
  })
}
