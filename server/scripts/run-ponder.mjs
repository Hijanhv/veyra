#!/usr/bin/env node
import { spawn } from 'node:child_process'

function nowStamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const mm = pad(d.getUTCMonth() + 1)
  const dd = pad(d.getUTCDate())
  const hh = pad(d.getUTCHours())
  const mi = pad(d.getUTCMinutes())
  const ss = pad(d.getUTCSeconds())
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`
}

function sanitize(x) {
  return (x || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 48)
}

const mode = process.argv[2] === 'start' ? 'start' : 'dev'
const viewsSchema = process.env.INDEXER_VIEWS_SCHEMA || 'veyra'

let schema
if (mode === 'dev') {
  // Stable dev schema to avoid reindexing every restart
  schema = process.env.INDEXER_DEV_SCHEMA
    || process.env.DATABASE_SCHEMA
    || `veyra_dev_${sanitize(process.env.USER || process.env.USERNAME || 'local')}`
} else {
  // Unique per deploy for zero-downtime with views schema
  const prefix = process.env.INDEXER_SCHEMA_PREFIX || 'veyra'
  schema = `${sanitize(prefix)}_${nowStamp()}`
}

const args = [mode, '--schema', schema]
if (mode === 'start') {
  args.push('--views-schema', viewsSchema)
}
console.log(`[ponder] launching: ponder ${args.join(' ')}`)

const child = spawn('npx', ['--yes', 'ponder', ...args], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`[ponder] exited with signal ${signal}`)
    process.exit(1)
  } else {
    process.exit(code ?? 0)
  }
})
