/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { js, css } from './manifest.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))

const walk = (dir, ext) => {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full, ext))
    else if (entry.name.endsWith(ext) && !entry.name.endsWith('.test.js')) out.push(full)
  }
  return out
}

test('every src/js and src/css file is in the manifest exactly once', () => {
  const jsFiles = walk(path.join(here, 'js'), '.js').map((f) => path.relative(path.join(here, 'js'), f)).sort()
  const cssFiles = walk(path.join(here, 'css'), '.css').map((f) => path.relative(path.join(here, 'css'), f)).sort()
  assert.deepEqual([...js].sort(), jsFiles)
  assert.deepEqual([...css].sort(), cssFiles)
  assert.equal(new Set(js).size, js.length)
})

test('the autocorrelation helper loads before effectiveSampleSize, which calls it', () => {
  assert.ok(js.indexOf('mcmc/autocorrelation.js') < js.indexOf('mcmc/effective-sample-size.js'))
})
