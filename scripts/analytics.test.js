/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Regression tests for the analytics/consent wiring described in CLAUDE.md's
// "Analytics and consent" section (ported from VisualMathLab's copy):
//   - _chrome/analytics.html: the vendored minimal GA4 snippet, plus this
//     site's local patches (tid, localhost guard, DNT/GPC guard, no query
//     string in `dl`, empty searchKeys).
//   - _chrome/consent.html: the consent gate and banner.
//
// Two kinds of check:
//   1. Structural invariants on the file contents -- guards against a
//      re-vendor of analytics.html silently dropping a LOCAL patch, and
//      against privacy.qmd drifting from what the site does.
//   2. The snippet's runtime behavior, executed against a stubbed
//      DOM/localStorage/navigator, so this exercises the shipped code.
//
// The gate itself (a `text/plain` script not executing until consent) needs
// a real browser and is not covered here.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

// The montecarlomethods.com web data stream's measurement ID.
const TID = 'G-9CF95CCP34'
const HOST = 'montecarlomethods.com'

const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8')
const analyticsHtml = read('_chrome/analytics.html')
const consentHtml = read('_chrome/consent.html')
const quartoYml = read('_quarto.yml')
const privacyQmd = read('privacy.qmd')
// Every HTML include this site has of its own, comments stripped so prose
// that quotes a tag or URL doesn't count.
const siteIncludeTags = fs.readdirSync(path.join(repoRoot, '_chrome'))
  .filter((name) => name.endsWith('.html'))
  .map((name) => read(path.join('_chrome', name)))
  .join('\n')
  .replace(/<!--[\s\S]*?-->/g, '')
// The mathviz filter adds the math.js and Plotly CDN tags to every page; its
// URLs are third-party hosts privacy.qmd must name. Lua comments document the
// options with placeholder URLs; only code counts.
const mathvizLua = fs.readdirSync(path.join(repoRoot, '_extensions'), { recursive: true })
  .filter((f) => f.endsWith('mathviz.lua'))
  .map((f) => read(path.join('_extensions', f)))
  .join('\n')
  .replace(/^\s*--.*$/gm, '')

function extractScript(html) {
  // Matched narrowly: analytics.html's header comment mentions "<script>".
  const match = html.match(/<script type="text\/plain" data-consent="analytics">([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected to find the gated analytics <script> block')
  return match[1]
}

// -----------------------------------------------------------------------
// 1. Structural invariants
// -----------------------------------------------------------------------

test('analytics.html: is gated as an inert script, not a live one', () => {
  assert.match(
    analyticsHtml,
    /<script type="text\/plain" data-consent="analytics">/,
    'the snippet must ship as a text/plain script so no browser executes it until consent.html re-creates it -- this is the entire consent gate'
  )
})

test('analytics.html: tid is this site\'s GA4 measurement ID', () => {
  assert.match(TID, /^G-[A-Z0-9]{10}$/)
  assert.doesNotMatch(TID, /^G-X+$/, 'TID is still the placeholder: set the real measurement ID here and in analytics.html')
  assert.ok(analyticsHtml.includes('tid:"' + TID + '"'))
})

test('analytics.html: searchKeys is empty', () => {
  // Upstream's default (["q","s","search","query","keyword"]) could only match
  // an app's own URL parameter, misreporting its page view as
  // view_search_results -- see analytics.html's header.
  assert.match(analyticsHtml, /searchKeys:\[\]/)
})

test('analytics.html: reported page location has no query string', () => {
  // A query string on this site is an app's state (seed, sample size,
  // parameters), not a page identifier.
  assert.match(analyticsHtml, /dl:i\.origin\+i\.pathname[,}]/)
  assert.doesNotMatch(analyticsHtml, /dl:i\.origin\+i\.pathname\+O/)
})

test('analytics.html: honors localhost, Do Not Track, and Global Privacy Control', () => {
  assert.match(analyticsHtml, /location\.hostname==="localhost"/)
  assert.match(analyticsHtml, /navigator\.doNotTrack==="1"/)
  assert.match(analyticsHtml, /navigator\.globalPrivacyControl===!0/)
})

test('analytics.html and consent.html set no cookies', () => {
  assert.doesNotMatch(analyticsHtml, /document\.cookie/)
  assert.doesNotMatch(consentHtml, /document\.cookie/)
})

test('_quarto.yml: loads analytics.html before consent.html, and links the privacy page', () => {
  // consent.html searches the DOM for the script analytics.html emits.
  const a = quartoYml.indexOf('- _chrome/analytics.html')
  const c = quartoYml.indexOf('- _chrome/consent.html')
  assert.ok(a !== -1 && c !== -1, 'both includes must be listed')
  assert.ok(a < c, 'analytics.html must come before consent.html')
  assert.match(quartoYml, /page-footer:.*\[Privacy\]\(\/privacy\.qmd\)/)
  assert.match(quartoYml, /page-footer:.*\(#analytics-preferences\)/)
  assert.doesNotMatch(quartoYml, /^\s*cookie-consent:/m, 'Quarto\'s cookie-consent banner makes false ads claims')
})

test('_quarto.yml: the mathviz extension emits the referrer policy', () => {
  // Keeps a page's address from reaching the script CDNs (privacy.qmd's
  // "Third-party resources"). It comes from the extension, whose filter
  // puts it ahead of its own CDN tags.
  assert.match(quartoYml, /^mathviz:\n(?: {2}.*\n)*? {2}referrer: same-origin$/m)
  assert.doesNotMatch(siteIncludeTags, /<meta name="referrer"/, 'the meta belongs to the extension')
})

test('the extension\'s fonts.css fetches nothing from a third party', () => {
  const fontsCss = read('_extensions/apurvanakade/mathviz/fonts/fonts.css')
  assert.doesNotMatch(fontsCss.replace(/\/\*[\s\S]*?\*\//g, ''), /https?:\/\//, 'a font must not be fetched from a third party')
})

test('privacy.qmd: names every third-party host a page loads from', () => {
  // The script CDNs come from the mathviz filter (math.js, Plotly); Quarto's
  // own MathJax/polyfill tags are in neither file, so the jsdelivr/cdnjs
  // hosts are asserted directly rather than derived.
  assert.ok(mathvizLua.length > 0, 'the mathviz extension is not installed under _extensions/')
  const hosts = [...mathvizLua.matchAll(/https:\/\/([^/"]+)\//g)].map((m) => m[1])
  assert.ok(hosts.includes('cdn.plot.ly'), 'expected the Plotly CDN host in the extension')
  for (const host of new Set([...hosts, 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'giscus.app', 'avatars.githubusercontent.com'])) {
    assert.ok(privacyQmd.includes('`' + host + '`'), `privacy.qmd does not mention ${host}`)
  }
})

test('privacy.qmd: describes every localStorage entry the site writes', () => {
  // The analytics snippet's own keys (cid_v4, _ga_*) are described in prose
  // as the identifier and its related values.
  const expected = [
    ['mcm-analytics-consent', /answer to the analytics question/],
    ['cid_v4', /random identifier/i],
    ['quarto-color-scheme', /light or dark theme/],
    ['mcm-sidebar-pinned', /pinned the navigation sidebar/],
    ['legend positions', /dragged the legend/],
    ['vm-playback', /speed and mode/],
    ['giscus-session', /giscus session/],
  ]
  for (const [key, re] of expected) {
    assert.match(privacyQmd, re, `privacy.qmd does not describe the ${key} entry`)
  }
  assert.ok(consentHtml.includes('const KEY = "mcm-analytics-consent"'))
  assert.match(quartoYml, /pin-key: mcm-sidebar-pinned/)
})

test('consent.html: banner makes no false ads/personalization claims', () => {
  // The reason this hand-written banner exists instead of Quarto's
  // cookie-consent library. The file's header comment quotes the false
  // claim, so this checks only the visible banner markup.
  const bannerMatch = consentHtml.match(/<div id="mcm-consent"[\s\S]*?\n<\/div>\s*\n\s*\n<script>/)
  assert.ok(bannerMatch, 'expected to find the #mcm-consent banner markup')
  assert.doesNotMatch(bannerMatch[0], /targeted ads|personalized content|advertising cookies/i)
})

test('consent.html: re-creates the gated script rather than mutating .type in place', () => {
  // Assigning to .type on the original <script> would not execute it: a
  // script only runs when it is inserted into the document.
  assert.match(consentHtml, /document\.createElement\("script"\)/)
})

test('consent.html: does nothing in embed mode', () => {
  assert.match(consentHtml, /classList\.contains\("vm-embed"\)\) return;/)
})

// -----------------------------------------------------------------------
// 2. Runtime behavior of the analytics snippet, in a stubbed DOM
// -----------------------------------------------------------------------

function runSnippet(hostname, { search = '', privacySignal = null } = {}) {
  const store = new Map()
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    get length() { return store.size },
    key: (i) => [...store.keys()][i],
  }
  const beacons = []
  const listeners = []
  const location = {
    hostname,
    origin: 'https://' + hostname,
    pathname: '/chapters/estimating-pi/',
    search,
  }
  const document = {
    title: 'Estimating Pi',
    referrer: '',
    location,
    documentElement: { scrollHeight: 2000, clientHeight: 800, scrollTop: 0 },
    body: { scrollHeight: 2000, scrollTop: 0 },
    addEventListener: (t, f) => listeners.push([t, f]),
    removeEventListener: () => {},
  }
  const navigator = {
    language: 'en-US',
    sendBeacon: (u) => { beacons.push(u); return true },
    doNotTrack: privacySignal === 'dnt' ? '1' : undefined,
    globalPrivacyControl: privacySignal === 'gpc' ? true : undefined,
  }
  const screen = { width: 1512, height: 982 }
  const window = { doNotTrack: undefined }

  const fn = new Function(
    'localStorage', 'document', 'navigator', 'screen', 'location', 'window',
    'requestAnimationFrame', 'XMLHttpRequest',
    extractScript(analyticsHtml)
  )
  fn(localStorage, document, navigator, screen, location, window, (cb) => cb(), class {})
  return { beacons, listeners, store }
}

test('analytics snippet: does not run on localhost', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    const { beacons } = runSnippet(host)
    assert.equal(beacons.length, 0, `expected no beacons on ${host}`)
  }
})

test('analytics snippet: does not run when DNT or GPC is set', () => {
  for (const signal of ['dnt', 'gpc']) {
    const { beacons } = runSnippet(HOST, { privacySignal: signal })
    assert.equal(beacons.length, 0, `expected no beacons with ${signal} set`)
  }
})

test('analytics snippet: sends exactly one page_view on a real page, with correct params', () => {
  // `q` is one of upstream's search keys; with searchKeys emptied it is just
  // an app parameter and the event stays a page_view.
  const { beacons, store } = runSnippet(HOST, { search: '?pi_n=1000&q=1' })
  assert.equal(beacons.length, 1)

  const params = new URL(beacons[0]).searchParams
  assert.equal(params.get('tid'), TID)
  assert.equal(params.get('en'), 'page_view')
  assert.equal(params.get('dl'), 'https://' + HOST + '/chapters/estimating-pi/')
  assert.equal(params.get('ep.search_term'), null, 'an app parameter is not a search')
  assert.ok(store.get('cid_v4'), 'expected a client id to be generated and persisted')
})

test('analytics snippet: registers scroll, click, and visibilitychange listeners', () => {
  const { listeners } = runSnippet(HOST)
  const types = listeners.map(([t]) => t).sort()
  assert.deepEqual(types, ['click', 'scroll', 'visibilitychange'])
})
