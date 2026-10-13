import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import http from 'node:http'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from '../src/server.js'

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')

function fakeCoord() {
  const c = new EventEmitter()
  c.posted = []
  c.snapshot = () => ({ mode: 'live', agents: {}, tasks: [], messages: [] })
  c.post = (t) => c.posted.push(t)
  c.stop = () => {}
  return c
}

async function start(t, opts) {
  const coord = fakeCoord()
  const server = createServer(coord, { publicDir, ...opts })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  t.after(() => {
    server.close()
    server.closeAllConnections()
  })
  const port = server.address().port
  const req = (p, { method = 'GET', headers = {}, body } = {}) =>
    new Promise((resolve, reject) => {
      const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: { Host: `localhost:${port}`, ...headers } }, (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => resolve({ status: res.statusCode, body: data, type: res.headers['content-type'], cache: res.headers['cache-control'] }))
      })
      r.on('error', reject)
      r.end(body)
    })
  return { coord, server, port, req }
}

test('serves the page with a document shell and blocks path traversal', async (t) => {
  const { server, req } = await start(t, { host: '127.0.0.1' })
  const page = await req('/')
  assert.equal(page.status, 200)
  assert.match(page.body, /^<!doctype html>/)
  assert.match(page.body, /牛马工作室/)
  assert.equal((await req('/app.js')).status, 200)
  assert.notEqual((await req('/../package.json')).status, 200)
  assert.notEqual((await req('/%2e%2e/package.json')).status, 200)
})

test('the built-in portraits and window pictures are all there and served as cached WebP', async (t) => {
  const { req } = await start(t, { host: '127.0.0.1' })
  const src = await import('node:fs').then((fs) => fs.readFileSync(path.join(publicDir, 'anime.js'), 'utf8'))
  const list = (name) => JSON.parse(src.match(new RegExp(`const ${name} = (\\[[^\\]]+\\])`))[1].replace(/'/g, '"'))
  const roles = list('CAST_ROLES')
  const sets = list('CAST_SETS')
  assert.equal(roles.length, 9)
  assert.deepEqual(sets, ['sakura', 'park', 'xianxia', 'space', 'neon', 'neko', 'q'])
  // 每个主题的立绘套都在 CAST_SETS 里
  const themeCast = JSON.parse(src.match(/const THEME_CAST = (\{[^}]+\})/)[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"'))
  assert.deepEqual(Object.keys(themeCast), ['park', 'xianxia', 'space', 'neon', 'neko'])
  for (const set of Object.values(themeCast)) assert.ok(sets.includes(set), set)
  for (const set of sets) {
    for (const role of roles) {
      for (const st of ['idle', 'happy', 'error']) {
        const r = await req(`/cast/${set}/${role}-${st}.webp`)
        assert.equal(r.status, 200, `${set}/${role}-${st}`)
        assert.equal(r.type, 'image/webp')
      }
    }
  }
  assert.match((await req('/cast/park/shaniu-idle.webp')).cache, /max-age/)
  // 每个内置皮肤配插画人物时的窗外
  const skins = [...src.slice(src.indexOf('const SKINS'), src.indexOf('const STATUS')).matchAll(/^    (\w+): \{/gm)].map((m) => m[1])
  assert.deepEqual(skins, ['sakura', 'night', 'neon', 'neko', 'park', 'xianxia', 'space'])
  for (const id of skins) {
    const r = await req(`/scenes/${id}-window.webp`)
    assert.equal(r.status, 200, id)
    assert.equal(r.type, 'image/webp')
    assert.match(r.cache, /max-age/)
  }
})

test('loopback mode rejects foreign Host headers and cross-site posts', async (t) => {
  const { coord, server, port, req } = await start(t, { host: '127.0.0.1' })
  assert.equal((await req('/api/state', { headers: { Host: 'evil.example:80' } })).status, 403)
  const json = { 'Content-Type': 'application/json' }
  const body = JSON.stringify({ text: '你好' })
  assert.equal((await req('/api/message', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body })).status, 403)
  assert.equal((await req('/api/message', { method: 'POST', headers: { ...json, Origin: 'https://evil.example' }, body })).status, 403)
  const ok = await req('/api/message', { method: 'POST', headers: { ...json, Origin: `http://localhost:${port}` }, body })
  assert.equal(ok.status, 200)
  assert.deepEqual(coord.posted, ['你好'])
})

test('LAN mode requires the token', async (t) => {
  const { server, req } = await start(t, { host: '0.0.0.0', token: 'secret' })
  assert.equal((await req('/api/state')).status, 401)
  assert.equal((await req('/api/state?token=secret')).status, 200)
  assert.equal((await req('/api/state', { headers: { 'X-Niuma-Token': 'secret' } })).status, 200)
  assert.equal((await req('/')).status, 200)
})

test('the 接入员工 routes call the setup actions and report failures as ok:false', async (t) => {
  const calls = []
  const setup = {
    status: async () => ({ groups: [], presets: [] }),
    saveApi: async (b) => (calls.push(['api', b.preset]), { ok: true, id: b.preset }),
    install: async (tool) => {
      throw new Error(`装不了 ${tool}`)
    },
    testApi: async (a) => (calls.push(['test', a.baseUrl]), { ok: true }),
    testCli: async (tool) => (calls.push(['cli', tool]), { ok: true }),
  }
  const { port, req } = await start(t, { host: '127.0.0.1', setup })
  const post = (p, body, headers = {}) => req(p, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: `http://localhost:${port}`, ...headers }, body: JSON.stringify(body) })
  assert.deepEqual(JSON.parse((await req('/api/setup')).body), { groups: [], presets: [] })
  assert.deepEqual(JSON.parse((await post('/api/setup/api', { preset: 'deepseek' })).body), { ok: true, id: 'deepseek' })
  assert.deepEqual(JSON.parse((await post('/api/setup/install', { tool: 'codex' })).body), { ok: false, error: '装不了 codex' })
  await post('/api/setup/test', { api: { baseUrl: 'http://x/v1' } })
  await post('/api/setup/test', { tool: 'claude' })
  assert.deepEqual(calls, [['api', 'deepseek'], ['test', 'http://x/v1'], ['cli', 'claude']])
  assert.equal((await post('/api/setup/nope', {})).status, 404)
  assert.equal((await post('/api/setup/api', { preset: 'x' }, { Origin: 'https://evil.example' })).status, 403)
})

test('skin routes: anyone with the page can list, saving goes through the skin store', async (t) => {
  const calls = []
  const skins = {
    listSkins: () => ({ dir: '/x', skins: [{ id: 'a', name: 'A' }], errors: [] }),
    saveSkin: (skin, o) => (calls.push(['save', skin.name, o.replace]), { id: 'a', name: skin.name }),
    deleteSkin: (id) => {
      throw new Error(`找不到 ${id}`)
    },
    openSkinsFolder: () => (calls.push(['open']), { ok: true }),
  }
  const { port, req } = await start(t, { host: '127.0.0.1', skins })
  const post = (p, body) => req(p, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: `http://localhost:${port}` }, body: JSON.stringify(body) })
  assert.deepEqual(JSON.parse((await req('/api/skins')).body).skins, [{ id: 'a', name: 'A' }])
  assert.deepEqual(JSON.parse((await post('/api/skins/save', { skin: { name: '海边' }, replace: true })).body), { ok: true, skin: { id: 'a', name: '海边' } })
  assert.deepEqual(JSON.parse((await post('/api/skins/delete', { id: 'b' })).body), { ok: false, error: '找不到 b' })
  await post('/api/skins/open-folder', {})
  assert.deepEqual(calls, [['save', '海边', true], ['open']])
  // 带图片的皮肤比普通请求大
  const big = await post('/api/skins/save', { skin: { name: 'x'.repeat(10), pad: 'a'.repeat(1_000_000) } })
  assert.equal(JSON.parse(big.body).ok, true)
})

test('restart-to-update only for this computer, and asks first while 傻妞 is busy', async (t) => {
  const { coord, req } = await start(t, { host: '127.0.0.1' })
  let installs = 0
  coord.installUpdate = () => {
    if (!coord.ready) throw new Error('新版本还没下载好')
    installs++
  }
  const post = (body) => req('/api/update/install', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => JSON.parse(r.body))
  assert.match((await post({})).error, /还没下载好/)
  coord.ready = true
  coord.busy = true
  assert.equal((await post({})).busy, true)
  assert.equal(installs, 0)
  assert.equal((await post({ force: true })).ok, true)
  coord.busy = false
  assert.equal((await post({})).ok, true)
  assert.equal(installs, 2)
})
