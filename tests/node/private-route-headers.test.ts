import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

type HeaderRule={source:string;headers:Array<{key:string;value:string}>}

test('private and activation surfaces are blocked from search indexing at the edge',async()=>{
  const config=JSON.parse(await readFile(new URL('../../vercel.json',import.meta.url),'utf8')) as {headers?:HeaderRule[]}
  const routes=['/admin/:path*','/member/:path*','/member-activate','/member-verify','/member-reset-password','/staff-activate','/staff-reset-password','/auth/email-action']
  for(const route of routes){
    const rule=(config.headers??[]).find(item=>item.source===route)
    assert.ok(rule,`missing noindex header rule for ${route}`)
    assert.ok(rule.headers.some(header=>header.key.toLowerCase()==='x-robots-tag'&&/noindex/i.test(header.value)&&/nofollow/i.test(header.value)),`missing X-Robots-Tag noindex,nofollow for ${route}`)
  }
})
