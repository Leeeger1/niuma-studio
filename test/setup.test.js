import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { startFakeOpenAI } from '../fake/openai-server.mjs'
import { loadConfig } from '../src/config.js'
import { Coordinator } from '../src/coordinator.js'
import { createSetup, listModels, testApi, userConfigFile } from '../src/setup.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'niuma-setup-'))
process.env.HOME = tmp()
process.env.USERPROFILE = process.env.HOME
process.env.NIUMA_FAKE_SPEED = '0.01'

function refuse(status) {
  const server = http.createServer((req, res) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end('{"error":{"message":"nope"}}')
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}/v1`, close: () => server.close() })))
}

test('testApi says in plain words what is wrong', async (t) => {
  const api = await startFakeOpenAI()
  const denied = await refuse(401)
  t.after(() => (api.close(), denied.close()))
  const ok = await testApi({ baseUrl: api.url, apiKey: 'k', models: { medium: 'deepseek-v4-flash' } })
  assert.equal(ok.ok, true, ok.error)
  assert.equal(ok.model, 'deepseek-v4-flash')
  // 地址末尾多写了 /chat/completions 也认
  assert.equal((await testApi({ baseUrl: `${api.url}/chat/completions`, apiKey: 'k', models: { hard: 'm' } })).ok, true)
  assert.match((await testApi({ baseUrl: denied.url, apiKey: 'k', models: { medium: 'm' } })).error, /Key 不对/)
  assert.match((await testApi({ baseUrl: api.url, models: { medium: 'm' } })).error, /还没填 API Key/)
  assert.equal((await testApi({ baseUrl: api.url, noKey: true, models: { medium: 'm' } })).ok, true)
  assert.match((await testApi({ baseUrl: 'api.example.com', apiKey: 'k', models: { medium: 'm' } })).error, /http/)
  assert.match((await testApi({ baseUrl: api.url, apiKey: 'k' })).error, /模型名/)
})

test('connecting an API group from the panel saves it and seats the new staff without a restart', async (t) => {
  const api = await startFakeOpenAI()
  const denied = await refuse(401)
  t.after(() => (api.close(), denied.close()))
  const workdir = tmp()
  const load = () => loadConfig({ workdir })
  const coord = new Coordinator(load(), { mode: 'live', root })
  await coord.team.check()
  const rosters = []
  coord.on('event', (ev) => ev.type === 'roster' && rosters.push(ev))
  const setup = createSetup({ coord, reload: () => coord.reconfigure(load()) })

  const bad = await setup.saveApi({ preset: 'relay', baseUrl: denied.url, apiKey: 'wrong', models: { medium: 'm' } })
  assert.equal(bad.ok, false)
  assert.equal(fs.existsSync(userConfigFile()), false, 'a failed test must not write the key anywhere')

  const r = await setup.saveApi({ preset: 'relay', baseUrl: api.url, apiKey: 'sk-1', models: { hard: 'deepseek-v4-pro' } })
  assert.equal(r.ok, true, r.error)
  assert.equal(r.id, 'relay')
  assert.equal(r.available, true)
  const saved = JSON.parse(fs.readFileSync(userConfigFile(), 'utf8'))
  assert.deepEqual(saved.groups, [{ id: 'relay', name: '中转站组', type: 'openai-api', baseUrl: api.url, models: { hard: 'deepseek-v4-pro', medium: 'deepseek-v4-pro' }, apiKey: 'sk-1' }])
  if (process.platform !== 'win32') assert.equal(fs.statSync(userConfigFile()).mode & 0o777, 0o600)
  assert.equal(coord.team.groups.get('relay').available, true)
  assert.ok(coord.team.employees.some((e) => e.group === 'relay'), 'an empty group gets a generalist')
  assert.ok(rosters.at(-1).roster.groups.some((g) => g.id === 'relay'), 'the page hears about the new group')
  assert.match(coord.messages.at(-1).text, /新同事到岗啦/)

  // 同一家再接一次不会覆盖前一个
  const again = await setup.saveApi({ preset: 'relay', baseUrl: api.url, apiKey: 'sk-2', models: { medium: 'qwen3-coder' }, name: '备用组' })
  assert.equal(again.id, 'relay-2')

  const st = await setup.status()
  assert.equal(st.groups.find((g) => g.id === 'relay').removable, true)
  assert.equal(st.groups.find((g) => g.id === 'claude').removable, false)
  assert.ok(st.presets.some((p) => p.id === 'deepseek'))

  await setup.remove('relay')
  assert.equal(coord.team.groups.has('relay'), false)
  assert.deepEqual(JSON.parse(fs.readFileSync(userConfigFile(), 'utf8')).groups.map((g) => g.id), ['relay-2'])
  await assert.rejects(setup.remove('claude'), /不是在这里接入的/)

  coord.busy = true
  await assert.rejects(setup.saveApi({ preset: 'relay', baseUrl: api.url, apiKey: 'k', models: { medium: 'm' } }), /还有活/)
  coord.busy = false
})

test('rehearsal mode refuses to connect real staff', async () => {
  const coord = new Coordinator(loadConfig({ workdir: tmp() }), { mode: 'fake', root })
  const setup = createSetup({ coord, fake: true, reload: async () => {} })
  await assert.rejects(setup.saveApi({ preset: 'deepseek', apiKey: 'k' }), /彩排/)
  await assert.rejects(setup.install('claude'), /彩排/)
})

test('a relay with many models: read the list, group by family, pick models by difficulty', async (t) => {
  const relay = await startFakeOpenAI(0, { models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'gpt-5', 'gpt-5-mini', 'text-embedding-3-small', 'dall-e-3', 'mystery-notools'] })
  const denied = await refuse(401)
  t.after(() => (relay.close(), denied.close()))
  const r = await listModels({ baseUrl: relay.url, apiKey: 'k' })
  assert.equal(r.ok, true, r.error)
  assert.equal(r.total, 8)
  assert.equal(r.skipped, 2, 'embedding and image models are skipped')
  assert.deepEqual(r.families.map((f) => f.id), ['claude', 'gpt', 'other'])
  const claude = r.families[0]
  assert.deepEqual(claude.pick, { hard: 'claude-opus-4-5', medium: 'claude-sonnet-4-5', easy: 'claude-haiku-4-5' })
  assert.deepEqual(r.families[1].pick, { hard: 'gpt-5', medium: 'gpt-5', easy: 'gpt-5-mini' })
  assert.match((await listModels({ baseUrl: denied.url, apiKey: 'k' })).error, /Key 不对/)
  assert.match((await listModels({ baseUrl: relay.url })).error, /API Key/)

  // 会不会调用工具
  assert.equal((await testApi({ baseUrl: relay.url, apiKey: 'k', models: { medium: 'gpt-5' } }, { tools: true })).tools, true)
  assert.equal((await testApi({ baseUrl: relay.url, apiKey: 'k', models: { medium: 'mystery-notools' } }, { tools: true })).tools, false)

  // 每家一个组，共用地址和 Key
  const workdir = tmp()
  const load = () => loadConfig({ workdir })
  const coord = new Coordinator(load(), { mode: 'live', root })
  await coord.team.check()
  const setup = createSetup({ coord, reload: () => coord.reconfigure(load()) })
  const saved = await setup.saveApi({
    preset: 'relay',
    baseUrl: relay.url,
    apiKey: 'sk-relay',
    name: '中转站',
    families: [
      { family: 'claude', name: 'Claude', models: claude.pick },
      { family: 'other', name: '其他', models: { medium: 'mystery-notools' } },
    ],
  })
  assert.equal(saved.ok, true, saved.error)
  assert.deepEqual(saved.results.map((x) => [x.name, x.ok, x.tools]), [['中转站 Claude 组', true, true], ['中转站 其他 组', true, false]])
  const [a, b] = saved.results.map((x) => coord.team.groups.get(x.id))
  assert.equal(a.modelFor('hard'), 'claude-opus-4-5')
  assert.equal(a.modelFor('easy'), 'claude-haiku-4-5')
  assert.equal(b.modelFor('hard'), 'mystery-notools')
  const onDisk = JSON.parse(fs.readFileSync(userConfigFile(), 'utf8')).groups.filter((g) => saved.results.some((x) => x.id === g.id))
  assert.ok(onDisk.every((g) => g.baseUrl === relay.url && g.apiKey === 'sk-relay'))
  assert.match(coord.messages.at(-1).text, /中转站 Claude 组[\s\S]*不会调用工具/)
})

test('every group can be edited, sent home and called back from the panel, the default ones too', async (t) => {
  process.env.HOME = tmp()
  process.env.USERPROFILE = process.env.HOME
  const api = await startFakeOpenAI()
  const denied = await refuse(401)
  t.after(() => (api.close(), denied.close()))
  const workdir = tmp()
  const load = () => loadConfig({ workdir })
  const coord = new Coordinator(load(), { mode: 'live', root })
  await coord.team.check()
  const setup = createSetup({ coord, reload: () => coord.reconfigure(load()) })
  const saved = () => JSON.parse(fs.readFileSync(userConfigFile(), 'utf8')).groups
  const view = async (id) => (await setup.status()).groups.find((g) => g.id === id)
  await setup.saveApi({ preset: 'relay', baseUrl: api.url, apiKey: 'sk-1', models: { medium: 'deepseek-v4-flash' } })

  let g = await view('relay')
  assert.equal(g.enabled, true)
  assert.equal(g.key, 'saved')
  assert.ok(!JSON.stringify(await setup.status()).includes('sk-1'), 'the key never goes to the page')

  // 默认的 Claude 组放假：不上班，它的岗位借调到在岗的组
  await setup.group({ id: 'claude', enabled: false })
  assert.deepEqual(saved().find((x) => x.id === 'claude'), { id: 'claude', enabled: false })
  assert.equal(coord.team.groups.has('claude'), false)
  assert.equal(coord.team.employee('architect').home, 'claude')
  assert.equal(coord.team.employee('architect').group, 'relay')
  assert.equal(coord.brain().id, 'relay')
  g = await view('claude')
  assert.equal(g.enabled, false)
  assert.equal(g.note, '放假中')
  assert.match(coord.messages.at(-1).text, /Claude 组\*\*放假了[\s\S]*架构师/)
  // 放假的组也能排岗位，先借调
  await setup.staff({ id: 'backend', group: 'claude' })
  assert.equal(coord.team.employee('backend').group, 'relay')

  // 叫回来：配置里不留只剩 id 的条目
  await setup.group({ id: 'claude', enabled: true })
  assert.equal(saved().some((x) => x.id === 'claude'), false)
  assert.equal(coord.team.groups.has('claude'), true)

  // 换模型不用重新接入：命令行组不填的难度用它自己的默认模型
  await setup.group({ id: 'claude', name: 'Claude 组', models: { hard: 'opus', medium: '', easy: 'haiku' } })
  assert.deepEqual(saved().find((x) => x.id === 'claude'), { id: 'claude', name: 'Claude 组', models: { hard: 'opus', easy: 'haiku' } })
  const claude = coord.team.groups.get('claude')
  assert.deepEqual([claude.modelFor('hard'), claude.modelFor('medium'), claude.modelFor('easy')], ['opus', '', 'haiku'])

  // API 组：Key 不填就用存着的，先测试再保存
  const r = await setup.group({ id: 'relay', name: '主力组', baseUrl: api.url, apiKey: '', models: { hard: 'deepseek-v4-pro', medium: 'deepseek-v4-flash', easy: '' } })
  assert.equal(r.ok, true, r.error)
  const relay = saved().find((x) => x.id === 'relay')
  assert.equal(relay.apiKey, 'sk-1')
  assert.equal(relay.name, '主力组')
  assert.deepEqual(relay.models, { hard: 'deepseek-v4-pro', medium: 'deepseek-v4-flash' })
  assert.equal(coord.team.groups.get('relay').modelFor('easy'), 'deepseek-v4-flash')
  assert.equal((await view('relay')).name, '主力组')

  // 测试没通过就不保存
  const bad = await setup.group({ id: 'relay', name: '主力组', baseUrl: denied.url, apiKey: '', models: { medium: 'x' } })
  assert.equal(bad.ok, false)
  assert.match(bad.error, /Key 不对/)
  assert.equal(saved().find((x) => x.id === 'relay').baseUrl, api.url)

  // 读模型列表：没填的地址和 Key 用组里存着的
  const listed = await setup.listModels({ group: 'relay' })
  assert.equal(listed.ok, true, listed.error)
  assert.ok(listed.families.length > 0)

  // 项目里的配置排在后面，那边写了就说清楚
  fs.writeFileSync(path.join(workdir, 'niuma.config.json'), JSON.stringify({ groups: [{ id: 'codex', enabled: false }] }))
  await setup.recheck()
  assert.equal((await view('codex')).enabled, false)
  const over = await setup.group({ id: 'codex', enabled: true })
  assert.match(over.warning, /niuma\.config\.json/)
  assert.match(coord.messages.at(-1).text, /以那边为准/)

  // 只写在项目配置里的组不往 ~/.niuma/config.json 里写，免得带到别的项目
  fs.writeFileSync(path.join(workdir, 'niuma.config.json'), JSON.stringify({ groups: [{ id: 'local', type: 'openai-api', baseUrl: api.url, noKey: true, model: 'qwen3-coder' }] }))
  await setup.recheck()
  await assert.rejects(setup.group({ id: 'local', enabled: false }), /niuma\.config\.json[\s\S]*去那里改/)
  assert.equal(saved().some((x) => x.id === 'local'), false)

  await assert.rejects(setup.group({ id: 'mars', enabled: false }), /没有这个项目组/)
  await assert.rejects(setup.group({ id: 'claude', name: ' ' }), /组名/)
  coord.busy = true
  await assert.rejects(setup.group({ id: 'claude', enabled: false }), /还有活/)
  coord.busy = false
})
