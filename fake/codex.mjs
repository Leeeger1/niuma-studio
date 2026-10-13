#!/usr/bin/env node
// Rehearsal stand-in for `codex exec` (used by `niuma --fake` and the tests).
import fs from 'node:fs'
import { answer, classify, finalText, readStdin, script, sleep, verify } from './common.mjs'

const argv = process.argv.slice(2)
if (argv.includes('--version')) {
  console.log('codex-cli 0.0.0-rehearsal')
  process.exit(0)
}
// NIUMA_FAKE_LOGIN=out：装好了没登录；=expired：login status 说登录了，一干活却 401。
const login = process.env.NIUMA_FAKE_LOGIN || ''
if (argv[0] === 'login' && argv[1] === 'status') {
  console.error(login === 'out' ? 'Not logged in' : 'Logged in using ChatGPT')
  process.exit(login === 'out' ? 1 : 0)
}

const out = (o) => process.stdout.write(JSON.stringify(o) + '\n')
if (login) {
  const message = 'unexpected status 401 Unauthorized: Missing bearer or basic authentication in header'
  if (argv.includes('--json')) out({ type: 'turn.failed', error: { message } })
  else console.error(`ERROR: ${message}`)
  process.exit(1)
}
const outFile = argv.includes('-o') ? argv[argv.indexOf('-o') + 1] : null
const prompt = await readStdin()
const job = classify(prompt)

if (!argv.includes('--json')) {
  await sleep(1400)
  const text = answer(prompt)
  if (outFile) fs.writeFileSync(outFile, text)
  else console.log(text)
  process.exit(0)
}

out({ type: 'thread.started', thread_id: `fake-${Date.now()}` })
out({ type: 'turn.started' })
await sleep(500)
out({ type: 'item.completed', item: { id: 'r0', type: 'reasoning', text: `**Planning ${job.title}**` } })
let n = 0
const steps = job.mode === 'verify' ? script({ review: true }) : script(job)
for (const step of steps) {
  await sleep(700 + Math.random() * 900)
  const id = `item_${++n}`
  if (step.kind === 'edit' || step.kind === 'write') {
    out({ type: 'item.completed', item: { id, type: 'file_change', status: 'completed', changes: [{ path: step.file, kind: step.kind === 'write' ? 'add' : 'update' }] } })
  } else {
    const command = step.kind === 'cmd' ? step.cmd : step.kind === 'grep' ? `rg ${step.pattern}` : `cat ${step.file}`
    out({ type: 'item.started', item: { id, type: 'command_execution', command: `bash -lc '${command}'`, status: 'in_progress' } })
    out({ type: 'item.completed', item: { id, type: 'command_execution', command: `bash -lc '${command}'`, exit_code: 0, status: 'completed' } })
  }
}
await sleep(500)
const text = job.mode === 'verify' ? verify(job) : finalText(job)
out({ type: 'item.completed', item: { id: 'msg', type: 'agent_message', text } })
out({ type: 'turn.completed', usage: { input_tokens: 1200, output_tokens: 300 } })
if (outFile) fs.writeFileSync(outFile, text)
