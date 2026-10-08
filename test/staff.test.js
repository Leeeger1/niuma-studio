import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { startFakeOpenAI } from '../fake/openai-server.mjs'
import { loadConfig } from '../src/config.js'
import { Coordinator } from '../src/coordinator.js'
import { createSetup, userConfigFile } from '../src/setup.js'
import { Team } from '../src/team.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'niuma-staff-'))
process.env.HOME = tmp()
process.env.USERPROFILE = process.env.HOME
process.env.NIUMA_FAKE_SPEED = '0.01'

const api = (id, model) => ({ id, name: `${id} 组`, type: 'openai-api', baseUrl: 'http://127.0.0.1:9/v1', apiKey: 'k', models: { hard: model, medium: model, easy: model } })

function team(groups, extra = {}) {
  const workdir = tmp()
  const config = { ...loadConfig({ workdir, overrides: { groups, ...extra } }), workdir }
  return new Team(config, { root, workdir, logDir: workdir })
}
const where = (t) => Object.fromEntries(t.employees.map((e) => [e.id, e.group]))

test('staff whose group is off duty are lent to a group that is on duty, and go home when it is back', () => {
  const t = team([api('pro', 'deepseek-v4-pro'), api('flash', 'gpt-5-mini')])
  const on = (ids) => {
    for (const g of t.groups.values()) g.available = ids.includes(g.id)
    t.reassign()
  }
  on(['pro', 'flash'])
  const lent = where(t)
  for (const id of ['architect', 'frontend', 'reviewer', 'backend', 'tester', 'debugger']) assert.ok(['pro', 'flash'].includes(lent[id]), id)
  assert.equal(lent.architect, 'pro', 'hard jobs go to the strong model')
  // 难的岗位只看能力：Opus 比便宜的 DeepSeek Pro 强
  const t2 = team([api('relay-claude', 'claude-opus-4-5'), api('relay-ds', 'deepseek-v4-pro')])
  for (const g of t2.groups.values()) g.available = g.id.startsWith('relay')
  t2.reassign()
  assert.equal(where(t2).architect, 'relay-claude')
  assert.equal(lent.reviewer, 'pro')
  assert.equal(t.employee('architect').home, 'claude')
  assert.equal(lent.pro, 'pro', 'a group keeps its own generalist')
  const r = t.roster().employees.find((e) => e.id === 'architect')
  assert.equal(r.home, 'claude')
  assert.equal(r.available, true)

  // Claude 组回来了：它的人回家，Codex 的人还在外面
  on(['claude', 'pro', 'flash'])
  assert.equal(where(t).architect, 'claude')
  assert.equal(t.roster().employees.find((e) => e.id === 'architect').home, '')
  assert.notEqual(where(t).backend, 'codex')

  // 一个组都没有：大家留在原地
  on([])
  assert.equal(where(t).architect, 'claude')
})

test('borrowStaff: false keeps everyone in their own group', () => {
  const t = team([api('pro', 'deepseek-v4-pro')], { borrowStaff: false })
  for (const g of t.groups.values()) g.available = g.id === 'pro'
  t.reassign()
  assert.equal(where(t).architect, 'claude')
})

test('the 岗位安排 panel moves, rests, adds and resets staff without a restart', async (t) => {
  const fake = await startFakeOpenAI()
  t.after(() => fake.close())
  const workdir = tmp()
  fs.mkdirSync(path.join(process.env.HOME, '.niuma', 'skills'), { recursive: true })
  fs.writeFileSync(path.join(process.env.HOME, '.niuma', 'skills', 'dba.md'), '---\nname: 数据库专家\ndescription: 设计表结构\ngroup: deepseek\n---\n管数据库。\n')
  fs.writeFileSync(userConfigFile(), JSON.stringify({ groups: [{ id: 'deepseek', name: 'DeepSeek 组', type: 'openai-api', baseUrl: fake.url, apiKey: 'k', model: 'deepseek-v4-flash' }] }))
  const load = () => loadConfig({ workdir })
  const coord = new Coordinator(load(), { mode: 'live', root })
  await coord.team.check()
  const setup = createSetup({ coord, reload: () => coord.reconfigure(load()) })
  const rows = async () => Object.fromEntries((await setup.status()).staff.map((r) => [r.id, r]))

  let s = await rows()
  assert.equal(s.architect.group, 'claude')
  assert.equal(s.dba.group, 'deepseek', 'a hired skill file sits in the group it names')
  assert.ok(!('deepseek' in s), 'group generalists are not listed')

  await setup.staff({ id: 'architect', group: 'deepseek' })
  assert.equal(coord.team.employee('architect').home, 'deepseek')
  assert.deepEqual(JSON.parse(fs.readFileSync(userConfigFile(), 'utf8')).employees, [{ id: 'architect', skill: 'architect', group: 'deepseek' }])
  s = await rows()
  assert.equal(s.architect.changed, true)
  assert.equal(s.architect.removable, false)

  // 自己写的岗位也能换组，不会冒出第二个
  await setup.staff({ id: 'dba', group: 'claude' })
  assert.deepEqual(coord.team.employees.filter((e) => e.skill.id === 'dba').map((e) => e.home), ['claude'])

  await setup.staff({ id: 'tester', enabled: false })
  assert.equal(coord.team.employee('tester'), undefined)
  s = await rows()
  assert.equal(s.tester.enabled, false)
  await setup.staff({ id: 'tester', group: 'deepseek', enabled: true })
  assert.equal(coord.team.employee('tester').home, 'deepseek')

  await setup.staff({ add: true, skill: 'frontend', group: 'deepseek' })
  const extra = coord.team.employee('frontend-2')
  assert.equal(extra.name, '前端工程师2')
  assert.equal(extra.home, 'deepseek')
  assert.equal((await rows())['frontend-2'].removable, true)
  await setup.staff({ id: 'frontend-2', remove: true })
  assert.equal(coord.team.employee('frontend-2'), undefined)

  await setup.staff({ id: 'architect', remove: true })
  assert.equal(coord.team.employee('architect').home, 'claude', 'back to the default seat')
  assert.match(coord.messages.at(-1).text, /恢复成默认/)

  await assert.rejects(setup.staff({ id: 'nobody', group: 'deepseek' }), /找不到/)
  await assert.rejects(setup.staff({ add: true, skill: 'frontend', group: 'mars' }), /没有这个项目组/)
})
