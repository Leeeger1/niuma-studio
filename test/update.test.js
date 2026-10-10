import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { loadConfig } from '../src/config.js'
import { Coordinator, parseCommand } from '../src/coordinator.js'
import { checkUpdate, downloadFor, isNewer, latestRelease, updateCommand } from '../src/update.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'niuma-update-'))
process.env.HOME = tmp()
process.env.USERPROFILE = process.env.HOME

const ASSETS = ['linux-x86_64.AppImage', 'mac-universal.dmg', 'win-x64.exe'].map((s) => ({
  name: `niuma-studio-0.9.0-${s}`,
  browser_download_url: `https://dl.example/niuma-studio-0.9.0-${s}`,
}))

/** A stand-in for api.github.com and github.com. api: 'ok' | 'limited'; web: 'ok' | 'down'. */
function fakeGitHub({ api = 'ok', web = 'ok', tag = 'v0.9.0' } = {}) {
  const server = http.createServer((req, res) => {
    if (req.url === '/repos/Leeeger1/niuma-studio/releases/latest' && api === 'ok') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ tag_name: tag, html_url: `https://github.com/Leeeger1/niuma-studio/releases/tag/${tag}`, assets: ASSETS }))
    }
    if (req.url === '/Leeeger1/niuma-studio/releases/latest' && web === 'ok') {
      res.writeHead(302, { Location: `https://github.com/Leeeger1/niuma-studio/releases/tag/${tag}` })
      return res.end()
    }
    res.writeHead(api === 'limited' ? 403 : 500)
    res.end('{"message":"API rate limit exceeded"}')
  })
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => {
      const url = `http://127.0.0.1:${server.address().port}`
      resolve({ api: url, web: url, close: () => server.close() })
    }),
  )
}

function project(version, { git = false } = {}) {
  const dir = tmp()
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version }))
  if (git) fs.mkdirSync(path.join(dir, '.git'))
  return dir
}

test('version comparison', () => {
  assert.ok(isNewer('v0.7.0', '0.6.0'))
  assert.ok(isNewer('0.10.0', '0.9.9'), 'numbers, not strings')
  assert.ok(isNewer('1.0.0', '1.0.0-beta.2'), 'a release beats its preview')
  assert.ok(!isNewer('0.6.0', '0.6.0'))
  assert.ok(!isNewer('v0.5.1', '0.6.0'))
  assert.ok(!isNewer('nightly', '0.6.0'))
  assert.ok(!isNewer('0.7.0', ''))
})

test('latest release from the API, from the release page when the API is rate-limited, null when offline', async (t) => {
  const ok = await fakeGitHub()
  const limited = await fakeGitHub({ api: 'limited' })
  const down = await fakeGitHub({ api: 'limited', web: 'down' })
  t.after(() => [ok, limited, down].forEach((s) => s.close()))

  const a = await latestRelease(ok)
  assert.equal(a.version, '0.9.0')
  assert.equal(downloadFor(a, 'win32'), 'https://dl.example/niuma-studio-0.9.0-win-x64.exe')
  assert.equal(downloadFor(a, 'darwin'), 'https://dl.example/niuma-studio-0.9.0-mac-universal.dmg')
  assert.equal(downloadFor(a, 'freebsd'), '')

  const b = await latestRelease(limited)
  assert.equal(b.tag, 'v0.9.0')
  assert.deepEqual(b.assets, [])
  // Only the tag is known: the link is built from the installer's file name.
  assert.equal(downloadFor(b, 'linux', limited), `${limited.web}/Leeeger1/niuma-studio/releases/download/v0.9.0/niuma-studio-0.9.0-linux-x86_64.AppImage`)

  assert.equal(await latestRelease(down), null)
})

test('checkUpdate gives the desktop app an installer and the command line a command', async (t) => {
  const gh = await fakeGitHub()
  const off = await fakeGitHub({ api: 'limited', web: 'down' })
  t.after(() => (gh.close(), off.close()))

  const desk = await checkUpdate({ root: project('0.6.0'), desktop: true, platform: 'win32', ...gh })
  assert.equal(desk.newer, true)
  assert.equal(desk.download, 'https://dl.example/niuma-studio-0.9.0-win-x64.exe')
  assert.equal(desk.command, '')

  const npm = await checkUpdate({ root: project('0.6.0'), desktop: false, ...gh })
  assert.equal(npm.command, 'npm install -g github:Leeeger1/niuma-studio')
  assert.equal(npm.download, '')
  const clone = project('0.6.0', { git: true })
  assert.equal(updateCommand(clone), `cd "${clone}" && git pull`)

  const same = await checkUpdate({ root: project('0.9.0'), ...gh })
  assert.deepEqual([same.ok, same.newer, same.command], [true, false, ''])
  assert.deepEqual(await checkUpdate({ root: project('0.6.0'), ...off }), { ok: false, newer: false, current: '0.6.0' })
})

test('傻妞 announces a new version once, and /更新 always answers', async () => {
  let reply = { ok: true, newer: true, current: '0.6.0', latest: '0.9.0', tag: 'v0.9.0', url: 'https://github.com/x/releases/tag/v0.9.0', download: '', command: 'npm install -g github:Leeeger1/niuma-studio' }
  const c = new Coordinator(loadConfig({ workdir: tmp() }), { mode: 'fake', root, checkUpdate: async () => reply })
  const events = []
  c.on('event', (e) => events.push(e))
  const said = () => c.messages.filter((m) => m.role === 'shaniu').map((m) => m.text)

  await c.checkForUpdate()
  await c.checkForUpdate()
  assert.equal(said().length, 1, 'the next automatic check stays quiet')
  assert.match(said()[0], /v0\.9\.0.+npm install -g github:Leeeger1\/niuma-studio/)
  assert.equal(events.filter((e) => e.type === 'update').length, 1)
  assert.equal(c.snapshot().update.latest, '0.9.0', 'a page opened later still shows the button')

  assert.deepEqual(parseCommand('/更新'), { type: 'update' })
  await c.handle('/更新')
  assert.match(said().at(-1), /v0\.9\.0/)

  reply = { ...reply, download: 'https://dl.example/x.exe', command: '', latest: '1.0.0' }
  await c.checkForUpdate()
  assert.match(said().at(-1), /v1\.0\.0.+「新版本」按钮下载安装包/)

  reply = { ok: true, newer: false, current: '1.0.0', latest: '1.0.0' }
  await c.handle('/更新')
  assert.match(said().at(-1), /已经是最新版 v1\.0\.0/)
  reply = { ok: false, newer: false, current: '1.0.0' }
  await c.handle('/更新')
  assert.match(said().at(-1), /连不上 GitHub/)
  const before = said().length
  await c.checkForUpdate()
  assert.equal(said().length, before, 'automatic checks never complain about the network')
})
