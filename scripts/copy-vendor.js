#!/usr/bin/env node
/**
 * copy-vendor.js — run automatically via `npm postinstall`
 * Copies browser-facing library bundles from node_modules into client/vendor/
 * so they can be served as static files without a bundler.
 */
'use strict'

const fs   = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

function copy (src, dest) {
  const destDir = path.dirname(dest)
  fs.mkdirSync(destDir, { recursive: true })
  fs.copyFileSync(src, dest)
  console.log(`  copied: ${path.relative(ROOT, dest)}`)
}

function copyDir (src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(s, d)
    else { fs.copyFileSync(s, d) }
  }
  console.log(`  copied dir: ${path.relative(ROOT, dest)}`)
}

console.log('Copying vendor assets…')

copy(
  path.join(ROOT, 'node_modules/three/build/three.module.js'),
  path.join(ROOT, 'client/vendor/three.module.js')
)

copyDir(
  path.join(ROOT, 'node_modules/three/examples/jsm'),
  path.join(ROOT, 'client/vendor/three-addons')
)

copy(
  path.join(ROOT, 'node_modules/tone/build/Tone.js'),
  path.join(ROOT, 'client/vendor/Tone.js')
)

console.log('Vendor assets ready.')
