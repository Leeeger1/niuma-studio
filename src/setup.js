// 接入员工：网页（和桌面版）里的「接入员工」面板背后的活。
// 一键安装 / 登录 Claude Code、Codex，填网址和 Key 接入 API 员工，测试连接；
// 改动写进 ~/.niuma/config.json，然后让傻妞马上重新点名，不用重启。
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DEFAULTS } from './config.js'
import { COST_ZH, FAMILIES, TIER_ZH, familyOf, isChatModel, modelProfile, suggestModels } from './models.js'
import { isWin, truncate } from './util.js'

export const PRESETS = [
  { id: 'deepseek', name: 'DeepSeek', group: 'DeepSeek 组', baseUrl: 'https://api.deepseek.com', models: { hard: 'deepseek-v4-pro', medium: 'deepseek-v4-flash', easy: 'deepseek-v4-flash' }, keyUrl: 'https://platform.deepseek.com/api_keys', note: '便宜，写代码很能打' },
  { id: 'qwen', name: '通义千问', group: '通义组', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: { hard: 'qwen3-max', medium: 'qwen3-coder-plus', easy: 'qwen-flash' }, keyUrl: 'https://bailian.console.aliyun.com/', note: '阿里云百炼' },
  { id: 'kimi', name: 'Kimi', group: 'Kimi 组', baseUrl: 'https://api.moonshot.cn/v1', models: { hard: 'kimi-k3', medium: 'kimi-k3', easy: 'kimi-k3' }, keyUrl: 'https://platform.moonshot.cn/console/api-keys', note: '月之暗面' },
  { id: 'glm', name: '智谱 GLM', group: '智谱组', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: { hard: 'glm-5.2', medium: 'glm-4.7', easy: 'glm-4.5-air' }, keyUrl: 'https://open.bigmodel.cn/usercenter/apikeys', note: '智谱开放平台' },
  { id: 'siliconflow', name: '硅基流动', group: '硅基组', baseUrl: 'https://api.siliconflow.cn/v1', models: { hard: '', medium: 'Qwen/Qwen3-Coder-480B-A35B-Instruct', easy: '' }, keyUrl: 'https://cloud.siliconflow.cn/account/ak', note: '一个 Key 用很多开源模型' },
  { id: 'openrouter', name: 'OpenRouter', group: 'OpenRouter 组', baseUrl: 'https://openrouter.ai/api/v1', models: { hard: '', medium: 'deepseek/deepseek-v4-pro', easy: '' }, keyUrl: 'https://openrouter.ai/keys', note: '海外聚合平台' },
  { id: 'relay', name: '中转站', group: '中转站组', baseUrl: '', models: { hard: '', medium: '', easy: '' }, custom: true, note: '填中转站给你的地址、Key 和模型名' },
  { id: 'ollama', name: '本地模型', group: '本地组', baseUrl: 'http://localhost:11434/v1', models: { hard: '', medium: 'qwen3-coder', easy: '' }, noKey: true, maxParallel: 1, note: 'Ollama / LM Studio，不用 Key' },
  { id: 'custom', name: '自定义', group: '', baseUrl: '', models: { hard: '', medium: '', easy: '' }, custom: true, note: '任何 OpenAI 兼容接口' },
]

const CLI = {
  claude: { name: 'Claude Code', pkg: '@anthropic-ai/claude-code', login: 'claude', loginHint: '在弹出的窗口里按提示登录；已经登录过的话，输入 /login 可以换账号。登录好关掉窗口，回来点「重新检查」。' },
  codex: { name: 'Codex', pkg: '@openai/codex', login: 'codex login', loginHint: '会打开浏览器让你登录 ChatGPT 账号。登录好关掉窗口，回来点「重新检查」。' },
}

export const userConfigFile = () => path.join(os.homedir(), '.niuma', 'config.json')

/** Windows 上刚装好的 Node / npm 全局命令不会出现在已经打开的程序的 PATH 里，补上常见目录。 */
export function ensurePath() {
  if (!isWin) return
  const extra = [path.join(process.env.APPDATA || '', 'npm'), path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs')]
  const parts = (process.env.PATH || '').split(';')
  for (const d of extra) if (d && fs.existsSync(d) && !parts.some((p) => p.toLowerCase() === d.toLowerCase())) parts.push(d)
  process.env.PATH = parts.join(';')
}

function run(cmd, args, { timeoutMs = 15000, onLine, cwd = os.tmpdir(), input } = {}) {
  return new Promise((resolve) => {
    const env = { ...process.env }
    delete env.CLAUDECODE
    delete env.ELECTRON_RUN_AS_NODE
    let child
    try {
      child = isWin ? spawn([cmd, ...args].join(' '), { shell: true, cwd, env, windowsHide: true }) : spawn(cmd, args, { cwd, env })
    } catch (e) {
      return resolve({ ok: false, code: -1, out: e.message })
    }
    let out = ''
    let buf = ''
    const feed = (d) => {
      const s = d.toString()
      out = (out + s).slice(-20000)
      if (!onLine) return
      buf += s
      let i
      while ((i = buf.search(/\r?\n/)) !== -1) {
        const line = buf.slice(0, i).trim()
        buf = buf.slice(i + 1).replace(/^\n/, '')
        if (line) onLine(line)
      }
    }
    child.stdout?.on('data', feed)
    child.stderr?.on('data', feed)
    child.stdin?.on('error', () => {})
    if (input != null) child.stdin?.end(input)
    else child.stdin?.end()
    const timer = setTimeout(() => {
      try {
        child.kill()
      } catch {}
    }, timeoutMs)
    child.on('error', (e) => {
      clearTimeout(timer)
      resolve({ ok: false, code: -1, out: out + e.message, missing: e.code === 'ENOENT' })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (onLine && buf.trim()) onLine(buf.trim())
      // cmd.exe 找不到命令时退出码 9009；sh 是 127。
      resolve({ ok: code === 0, code, out, missing: code === 127 || code === 9009 })
    })
  })
}

/** npm 装好的全局命令所在目录也加进 PATH：有的电脑上它不在已经打开的程序的 PATH 里，装完了却找不到。 */
async function addNpmBin() {
  const r = await run('npm', ['prefix', '-g'])
  const prefix = r.ok ? r.out.trim().split(/\r?\n/).pop().trim() : ''
  if (!prefix) return
  const dir = isWin ? prefix : path.join(prefix, 'bin')
  const parts = (process.env.PATH || '').split(path.delimiter)
  if (!parts.includes(dir)) process.env.PATH = [...parts, dir].join(path.delimiter)
}

const version = (r) => (r.ok ? (r.out.match(/\d+\.\d+\.\d+[\w.-]*/) || [r.out.trim().split('\n')[0]])[0] : '')

function loggedIn(tool) {
  const home = os.homedir()
  if (tool === 'claude') {
    if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return true
    if (fs.existsSync(path.join(home, '.claude', '.credentials.json'))) return true
    // macOS 把登录信息放在钥匙串里，看文件判断不了。
    return process.platform === 'darwin' ? null : false
  }
  if (process.env.OPENAI_API_KEY) return true
  return fs.existsSync(path.join(process.env.CODEX_HOME || path.join(home, '.codex'), 'auth.json'))
}

/** 在一个新的终端窗口里跑命令（登录要人来点，所以放到能看见的窗口里）。 */
export function openTerminal(command, title = '牛马工作室') {
  const detach = (child) => {
    child.on('error', () => {})
    child.unref()
  }
  if (isWin) {
    detach(spawn(`start "${title}" cmd /k ${command}`, { shell: true, detached: true, stdio: 'ignore' }))
    return true
  }
  if (process.platform === 'darwin') {
    const esc = command.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    detach(spawn('osascript', ['-e', `tell application "Terminal" to do script "${esc}"`, '-e', 'tell application "Terminal" to activate'], { detached: true, stdio: 'ignore' }))
    return true
  }
  const shellCmd = `${command}; echo; read -p "按回车关闭窗口…" _`
  for (const [bin, ...args] of [
    ['x-terminal-emulator', '-e', 'bash', '-lc', shellCmd],
    ['gnome-terminal', '--', 'bash', '-lc', shellCmd],
    ['konsole', '-e', 'bash', '-lc', shellCmd],
    ['xfce4-terminal', '-x', 'bash', '-lc', shellCmd],
    ['xterm', '-e', 'bash', '-lc', shellCmd],
  ]) {
    const found = (process.env.PATH || '').split(':').some((d) => d && fs.existsSync(path.join(d, bin)))
    if (!found) continue
    detach(spawn(bin, args, { detached: true, stdio: 'ignore' }))
    return true
  }
  return false
}

function readUserConfig() {
  try {
    return JSON.parse(fs.readFileSync(userConfigFile(), 'utf8'))
  } catch (e) {
    if (e.code === 'ENOENT') return {}
    throw new Error(`读不了 ${userConfigFile()}：${e.message}`)
  }
}

function writeUserConfig(cfg) {
  fs.mkdirSync(path.dirname(userConfigFile()), { recursive: true })
  fs.writeFileSync(userConfigFile(), JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 })
}

function normalizeBase(url) {
  let u = String(url || '').trim().replace(/\/+$/, '')
  u = u.replace(/\/chat\/completions$/, '')
  try {
    if (new URL(u).pathname === '/') u += '/v1'
  } catch {}
  return u
}

function httpWhy(status) {
  return status === 401 || status === 403
    ? 'Key 不对或者没权限'
    : status === 404
      ? '地址或模型名不对（地址要写到 /v1 这一级）'
      : status === 402
        ? '账户余额不足'
        : status === 429
          ? '请求太频繁或额度用完了'
          : `接口报错 ${status}`
}

function checkInput({ baseUrl, apiKey, noKey }) {
  const base = normalizeBase(baseUrl)
  if (!base) return { error: '还没填接口地址' }
  if (!/^https?:\/\//.test(base)) return { error: '接口地址要以 http:// 或 https:// 开头' }
  if (!apiKey && !noKey) return { error: '还没填 API Key' }
  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  return { base, headers }
}

/**
 * 发一句最短的话试试接口通不通、Key 对不对、模型名对不对。
 * tools: true 再试一次工具调用：API 员工靠它读写文件，不会调用工具的模型只能帮傻妞动脑子。
 */
export async function testApi({ baseUrl, apiKey, noKey, models = {} }, { timeoutMs = 30000, tools = false } = {}) {
  const model = models.medium || models.hard || models.easy
  const c = checkInput({ baseUrl, apiKey, noKey })
  if (c.error) return { ok: false, error: c.error }
  if (!model) return { ok: false, error: '还没填模型名' }
  const ask = (body) =>
    fetch(`${c.base}/chat/completions`, { method: 'POST', headers: c.headers, body: JSON.stringify({ model, ...body }), signal: AbortSignal.timeout(timeoutMs) })
  let res
  try {
    res = await ask({ messages: [{ role: 'user', content: '只回复两个字：在岗' }], max_tokens: 16 })
  } catch (e) {
    return { ok: false, error: `连不上 ${c.base}（${e.cause?.code || e.message}）。检查地址和网络` }
  }
  const text = await res.text().catch(() => '')
  if (!res.ok) return { ok: false, error: `${httpWhy(res.status)}：${truncate(text.replace(/\s+/g, ' '), 160)}` }
  let reply = ''
  try {
    reply = JSON.parse(text).choices?.[0]?.message?.content || ''
  } catch {}
  const out = { ok: true, reply: truncate(String(reply).trim() || '（收到了回复）', 60), model }
  if (tools) {
    try {
      const r = await ask({
        messages: [{ role: 'user', content: '请调用 ping 工具，参数 text 填「在岗」。' }],
        tools: [{ type: 'function', function: { name: 'ping', description: '报到', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } }],
        max_tokens: 64,
      })
      const j = r.ok ? await r.json() : null
      out.tools = !!j?.choices?.[0]?.message?.tool_calls?.length
    } catch {
      out.tools = false
    }
  }
  return out
}

/** 读接口后面有哪些模型（GET /models），按家族分好、按难度挑好，给「接入员工」面板选。 */
export async function listModels({ baseUrl, apiKey, noKey }, { timeoutMs = 20000 } = {}) {
  const c = checkInput({ baseUrl, apiKey, noKey })
  if (c.error) return { ok: false, error: c.error }
  let res
  try {
    res = await fetch(`${c.base}/models`, { headers: c.headers, signal: AbortSignal.timeout(timeoutMs) })
  } catch (e) {
    return { ok: false, error: `连不上 ${c.base}（${e.cause?.code || e.message}）。检查地址和网络` }
  }
  const text = await res.text().catch(() => '')
  if (!res.ok) return { ok: false, error: `读不到模型列表，${httpWhy(res.status)}。也可以直接填模型名` }
  let ids = []
  try {
    const j = JSON.parse(text)
    const list = Array.isArray(j) ? j : j.data || j.models || []
    ids = [...new Set(list.map((m) => String(typeof m === 'string' ? m : m.id || m.name || '')).filter(Boolean))]
  } catch {
    return { ok: false, error: '模型列表看不懂，直接填模型名吧' }
  }
  const chat = ids.filter(isChatModel)
  const byFamily = new Map()
  for (const id of chat) {
    const f = familyOf(id)
    if (!byFamily.has(f.id)) byFamily.set(f.id, { id: f.id, name: f.name, models: [] })
    const p = modelProfile({ model: id, type: 'openai-api' })
    byFamily.get(f.id).models.push({ id, tier: TIER_ZH[p.tier], cost: COST_ZH[p.cost] })
  }
  const order = [...FAMILIES.map(([id]) => id), 'other']
  const families = [...byFamily.values()]
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    .map((f) => ({ ...f, models: f.models.sort((a, b) => a.id.localeCompare(b.id)), pick: suggestModels(f.models.map((m) => m.id)) }))
  return { ok: true, total: ids.length, skipped: ids.length - chat.length, families }
}

/**
 * @param {object} o
 * @param {import('./coordinator.js').Coordinator} o.coord
 * @param {() => Promise<void>} o.reload  按最新配置重新点名
 * @param {boolean} [o.fake]
 */
export function createSetup({ coord, reload, fake = false }) {
  const installing = new Set()
  const emit = (ev) => coord.emitEvent({ type: 'setup', ...ev })
  const guard = () => {
    if (fake) throw new Error('彩排模式下接的都是替身，关掉彩排模式再来接入真员工')
  }

  async function status() {
    ensurePath()
    const [node, npm, claude, codex] = await Promise.all([
      run('node', ['--version']),
      run('npm', ['--version']),
      run('claude', ['--version'], { timeoutMs: 20000 }),
      run('codex', ['--version'], { timeoutMs: 20000 }),
    ])
    const cfg = readUserConfigSafe()
    const mine = new Set((cfg.groups || []).map((g) => g.id))
    const groups = [...coord.team.groups.values()].map((g) => ({
      id: g.id,
      name: g.name,
      type: g.type,
      available: g.available,
      note: g.note,
      version: g.version,
      model: g.modelFor('medium'),
      baseUrl: g.type === 'openai-api' ? g.cfg.baseUrl || '' : '',
      removable: g.type === 'openai-api' && mine.has(g.id),
    }))
    const cli = (tool, r) => ({ tool, name: CLI[tool].name, installed: r.ok, version: version(r), loggedIn: r.ok ? loggedIn(tool) : false, installing: installing.has(tool), hint: CLI[tool].loginHint })
    return {
      platform: process.platform,
      fake,
      busy: coord.busy,
      node: { ok: node.ok, version: version(node) },
      npm: { ok: npm.ok, version: version(npm) },
      cli: [cli('claude', claude), cli('codex', codex)],
      groups,
      presets: PRESETS,
      staff: staffView(),
      skills: [...coord.team.skills.values()].filter((sk) => sk.id !== 'generalist').map((sk) => ({ id: sk.id, name: sk.name, description: sk.description })),
      configFile: userConfigFile(),
    }
  }

  /** 岗位安排：每个员工排在哪个组（group）、现在实际坐在哪（now，借调时不一样）。各组自动配的通才不列。 */
  function staffView() {
    const team = coord.team
    const defaults = new Set(DEFAULTS.employees.map((e) => e.id))
    const mine = new Set((readUserConfigSafe().employees || []).map((e) => e?.id))
    const row = (e, extra) => ({ id: e.id, defaultStaff: defaults.has(e.id), changed: mine.has(e.id), removable: !defaults.has(e.id) && mine.has(e.id), ...extra })
    const rows = team.employees
      .filter((e) => !(e.skill.id === 'generalist' && team.groups.has(e.id)))
      .map((e) => row(e, { name: e.name, skill: e.skill.id, skillName: e.skill.name, group: e.home, now: e.group, enabled: true }))
    for (const e of team.offDuty) {
      const sk = team.skills.get(e.skill || e.id)
      rows.push(row(e, { name: e.name || sk?.name || e.id, skill: e.skill || e.id, skillName: sk?.name || e.id, group: e.group || '', now: '', enabled: false }))
    }
    return rows
  }

  /**
   * 调整一个员工：换组（group）、放假（enabled: false）、叫回来（enabled: true）、
   * 恢复默认 / 删掉自己加的（remove）、或者按某个岗位再加一个人（add + skill + group）。
   * 改动写进 ~/.niuma/config.json 的 employees，默认安排不动。
   */
  async function staff({ id, skill, group, enabled, remove, add } = {}) {
    guard()
    if (coord.busy) throw new Error('傻妞手上还有活，等这一轮做完再调整')
    const team = coord.team
    const cfg = readUserConfig()
    let list = Array.isArray(cfg.employees) ? cfg.employees.filter((e) => e && e.id) : []
    const groupName = (gid) => team.groups.get(gid)?.name || gid
    let msg
    if (add) {
      const sk = team.skills.get(skill)
      if (!sk) throw new Error('没有这个岗位')
      if (!team.groups.has(group)) throw new Error('没有这个项目组')
      const taken = new Set([...team.employees.map((e) => e.id), ...team.offDuty.map((e) => e.id), ...list.map((e) => e.id), ...team.groups.keys()])
      let nid = skill
      let n = 1
      while (taken.has(nid)) nid = `${skill}-${++n}`
      const name = n > 1 ? `${sk.name}${n}` : sk.name
      list.push({ id: nid, skill, group, name })
      msg = `新同事到岗：**${name}**，坐在${groupName(group)}。`
    } else {
      const cur = staffView().find((r) => r.id === id)
      if (!cur) throw new Error('找不到这个员工')
      if (remove) {
        list = list.filter((e) => e.id !== id)
        msg = cur.defaultStaff ? `${cur.name}恢复成默认安排了。` : `${cur.name}离职了。`
      } else {
        if (group && !team.groups.has(group)) throw new Error('没有这个项目组')
        let entry = list.find((e) => e.id === id)
        if (!entry) list.push((entry = { id }))
        entry.skill = cur.skill
        entry.group = group || entry.group || cur.group
        if (cur.name !== team.skills.get(cur.skill)?.name) entry.name = cur.name
        if (enabled === false) entry.enabled = false
        else delete entry.enabled
        msg = enabled === false ? `${cur.name}放假了，要用再叫回来。` : `${cur.name}去${groupName(entry.group)}上班了。`
      }
    }
    writeUserConfig({ ...cfg, employees: list })
    await reload()
    coord.addMessage('shaniu', `好的～ ${msg}`)
    return { ok: true }
  }

  function readUserConfigSafe() {
    try {
      return readUserConfig()
    } catch {
      return {}
    }
  }

  async function install(tool) {
    guard()
    if (!CLI[tool]) throw new Error('不认识的工具')
    if (installing.has(tool)) return { ok: true, already: true }
    installing.add(tool)
    const pkg = CLI[tool].pkg
    emit({ tool, line: `npm install -g ${pkg}` })
    ;(async () => {
      const r = await run('npm', ['install', '-g', pkg], { timeoutMs: 10 * 60 * 1000, onLine: (line) => !/^npm notice/.test(line) && emit({ tool, line: truncate(line, 200) }) })
      installing.delete(tool)
      ensurePath()
      if (r.ok) await addNpmBin()
      let error = ''
      if (!r.ok) {
        error = r.missing ? '电脑上没有 npm，先装 Node.js' : /EACCES|permission denied/i.test(r.out) ? '权限不够。点「在终端里安装」，按提示输入电脑密码' : `安装失败（退出码 ${r.code}）`
      }
      // 先重新点名再报完成：面板收到完成消息就会刷新，这时要能看到新员工。
      if (r.ok) await reload().catch(() => {})
      emit({ tool, done: true, ok: r.ok, error })
      if (r.ok) coord.addMessage('shaniu', `${CLI[tool].name} 装好啦～ 在「接入员工」里点「登录」，登录好就能开工。`)
    })()
    return { ok: true }
  }

  function installInTerminal(tool) {
    if (!CLI[tool]) throw new Error('不认识的工具')
    const cmd = `${isWin ? '' : 'sudo '}npm install -g ${CLI[tool].pkg}`
    if (!openTerminal(cmd, `安装 ${CLI[tool].name}`)) throw new Error(`没找到终端程序，请自己打开终端运行：${cmd}`)
    return { ok: true }
  }

  function login(tool) {
    if (tool === 'node') {
      if (!isWin) throw new Error('请打开 https://nodejs.org 下载安装 Node.js（选 LTS 版本）')
      if (!openTerminal('winget install -e --id OpenJS.NodeJS.LTS', '安装 Node.js')) throw new Error('打不开终端')
      return { ok: true, hint: '装好以后把牛马工作室完全退出再打开。' }
    }
    if (!CLI[tool]) throw new Error('不认识的工具')
    if (!openTerminal(CLI[tool].login, `登录 ${CLI[tool].name}`)) throw new Error(`没找到终端程序，请自己打开终端运行：${CLI[tool].login}`)
    return { ok: true, hint: CLI[tool].loginHint }
  }

  async function testCli(tool) {
    ensurePath()
    const r =
      tool === 'claude'
        ? await run('claude', ['-p', '--output-format', 'json', '--model', 'haiku'], { timeoutMs: 120000, input: '只回复两个字：在岗' })
        : await run('codex', ['exec', '--skip-git-repo-check', '-s', 'read-only', '-'], { timeoutMs: 180000, input: '只回复两个字：在岗' })
    if (r.ok) {
      let reply = ''
      try {
        reply = JSON.parse(r.out).result || ''
      } catch {
        reply = r.out.trim().split('\n').filter(Boolean).pop() || ''
      }
      return { ok: true, reply: truncate(reply, 60) }
    }
    if (r.missing) return { ok: false, error: '还没安装' }
    const needLogin = /login|log in|auth|credential|api key|unauthorized|401/i.test(r.out)
    return { ok: false, error: needLogin ? '还没登录，点「登录」' : truncate(r.out.trim().split('\n').slice(-3).join(' '), 200) || `退出码 ${r.code}` }
  }

  /**
   * 接入 API 组：先测试（连得上、模型对、会不会调用工具），通过了才写进 ~/.niuma/config.json。
   * input.families 有值时是中转站的多家模型：每家一个组（傻妞能按各家特长派活），共用地址和 Key。
   */
  async function saveApi(input) {
    guard()
    if (coord.busy) throw new Error('傻妞手上还有活，等这一轮做完再接入新员工')
    const preset = PRESETS.find((p) => p.id === input.preset) || PRESETS.find((p) => p.id === 'custom')
    const cleanModels = (m) => {
      const models = Object.fromEntries(['hard', 'medium', 'easy'].map((k) => [k, String(m?.[k] || '').trim()]).filter(([, v]) => v))
      // 没填中档就拿难活或杂活的模型顶上：派活时找不到模型名会直接失败。
      if (!models.medium && (models.hard || models.easy)) models.medium = models.hard || models.easy
      return models
    }
    const conn = {
      baseUrl: normalizeBase(input.baseUrl || preset.baseUrl),
      apiKey: String(input.apiKey || '').trim(),
      noKey: !!(input.noKey ?? preset.noKey),
    }
    const multi = Array.isArray(input.families) && input.families.length > 0
    const plans = multi
      ? input.families.map((f) => ({ family: String(f.family || 'other'), familyName: String(f.name || familyOf(f.models?.medium || '').name), models: cleanModels(f.models) }))
      : [{ models: cleanModels(input.models) }]
    const tests = await Promise.all(plans.map((p) => testApi({ ...conn, models: p.models }, { tools: true })))
    if (!multi && !tests[0].ok) return tests[0]
    if (tests.every((t) => !t.ok)) return { ok: false, error: tests.map((t, i) => `${plans[i].familyName}：${t.error}`).join('；') }

    const cfg = readUserConfig()
    const groups = Array.isArray(cfg.groups) ? cfg.groups : []
    const taken = new Set([...groups.map((g) => g.id), ...coord.team.groups.keys()])
    const prefix = preset.id === 'custom' ? 'api' : preset.id
    const unique = (want) => {
      let id = want
      for (let n = 2; taken.has(id); n++) id = `${want}-${n}`
      taken.add(id)
      return id
    }
    const baseName = (String(input.name || '').trim() || preset.group || '接口组').replace(/\s*组$/, '')
    const results = []
    plans.forEach((p, i) => {
      const t = tests[i]
      const name = multi ? `${baseName} ${p.familyName} 组` : String(input.name || '').trim() || preset.group || `${prefix} 组`
      if (!t.ok) return results.push({ name, ok: false, error: t.error })
      const id = !multi && input.id ? String(input.id).trim() : unique(multi ? `${prefix}-${p.family}` : prefix)
      const entry = { id, name, type: 'openai-api', ...(conn.noKey ? { noKey: true } : { apiKey: conn.apiKey }), baseUrl: conn.baseUrl, models: p.models }
      if (preset.maxParallel) entry.maxParallel = preset.maxParallel
      const at = groups.findIndex((g) => g.id === id)
      if (at === -1) groups.push(entry)
      else groups[at] = { ...groups[at], ...entry }
      results.push({ id, name, ok: true, model: t.model, reply: t.reply, tools: t.tools })
    })
    writeUserConfig({ ...cfg, groups })
    await reload()

    const lines = []
    for (const r of results) {
      if (!r.ok) {
        lines.push(`- ${r.name}：没接上，${r.error}`)
        continue
      }
      const g = coord.team.groups.get(r.id)
      r.available = !!g?.available
      const staff = coord.team.employees.filter((e) => e.group === r.id).map((e) => e.name)
      const warn = r.tools === false ? '（⚠️ 这个模型好像不会调用工具，只能帮傻妞动脑子，改不了文件）' : ''
      lines.push(g?.available ? `- **${r.name}**（${staff.join('、') || '通才'}），模型 ${g.modelFor('hard')} / ${g.modelFor('medium')} / ${g.modelFor('easy')}${warn}` : `- ${r.name}：接上了，可是检查没通过：${g?.note || '不在岗'}`)
    }
    coord.addMessage('shaniu', `新同事到岗啦！\n${lines.join('\n')}`)
    const first = results.find((r) => r.ok)
    return { ok: true, id: first?.id, reply: first?.reply, available: results.some((r) => r.available), tools: first?.tools, results }
  }

  async function remove(id) {
    guard()
    if (coord.busy) throw new Error('傻妞手上还有活，等这一轮做完再调整')
    const cfg = readUserConfig()
    const groups = (cfg.groups || []).filter((g) => g.id !== id)
    if (groups.length === (cfg.groups || []).length) throw new Error('这个组不是在这里接入的，去对应的配置文件里改')
    writeUserConfig({ ...cfg, groups })
    await reload()
    coord.addMessage('shaniu', `好的，${id} 组的同事先回家休息了。`)
    return { ok: true }
  }

  async function recheck() {
    guard()
    if (coord.busy) throw new Error('傻妞手上还有活，等这一轮做完再检查')
    ensurePath()
    await reload()
    return { ok: true }
  }

  return { status, install, installInTerminal, login, testCli, testApi, listModels, saveApi, remove, recheck, staff }
}
