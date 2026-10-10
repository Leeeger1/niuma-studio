// 检查更新：看 GitHub 上最新发布的版本，比现在用的新就让傻妞提醒主人。
// 国内连 GitHub 时好时坏：连不上就安静地算了，过几个小时再看一次。
import fs from 'node:fs'
import path from 'node:path'

export const REPO = 'Leeeger1/niuma-studio'
const WEB = 'https://github.com'
const API = 'https://api.github.com'

// 安装包的文件名跟 desktop/package.json 里的 artifactName 一致。
const PACKAGES = {
  win32: [/-win-x64\.exe$/i, (v) => `niuma-studio-${v}-win-x64.exe`],
  darwin: [/\.dmg$/i, (v) => `niuma-studio-${v}-mac-universal.dmg`],
  linux: [/\.AppImage$/i, (v) => `niuma-studio-${v}-linux-x86_64.AppImage`],
}

export function currentVersion(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version || ''
  } catch {
    return ''
  }
}

function parts(v) {
  const m = String(v || '').trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(-\S+)?$/i)
  // 正式版排在同号的预览版（-beta 之类）后面
  return m ? [+m[1], +(m[2] || 0), +(m[3] || 0), m[4] ? 0 : 1] : null
}

/** latest 比 current 新吗？看不懂的版本号一律当作不新。 */
export function isNewer(latest, current) {
  const a = parts(latest)
  const b = parts(current)
  if (!a || !b) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i]
  return false
}

/** 最新的正式发布：{ tag, version, url, assets }；连不上就是 null。 */
export async function latestRelease({ repo = REPO, api = API, web = WEB, timeoutMs = 8000 } = {}) {
  const headers = { 'User-Agent': 'niuma-studio', Accept: 'application/vnd.github+json' }
  const make = (tag, url, assets = []) => ({ tag, version: tag.replace(/^v/i, ''), url: url || `${web}/${repo}/releases/tag/${tag}`, assets })
  try {
    const r = await fetch(`${api}/repos/${repo}/releases/latest`, { headers, signal: AbortSignal.timeout(timeoutMs) })
    if (r.ok) {
      const o = await r.json()
      if (o?.tag_name) return make(o.tag_name, o.html_url, (o.assets || []).map((a) => ({ name: a.name, url: a.browser_download_url })))
    }
  } catch {}
  // api.github.com 限流（每小时 60 次）或者连不上：看发布页的 latest 跳到哪个标签。
  try {
    const r = await fetch(`${web}/${repo}/releases/latest`, { redirect: 'manual', headers: { 'User-Agent': 'niuma-studio' }, signal: AbortSignal.timeout(timeoutMs) })
    const tag = (r.headers.get('location') || '').match(/\/releases\/tag\/([^/?#]+)/)?.[1]
    if (tag) return make(decodeURIComponent(tag))
  } catch {}
  return null
}

/** 这台电脑该下哪个安装包。 */
export function downloadFor(release, platform = process.platform, { repo = REPO, web = WEB } = {}) {
  const p = PACKAGES[platform]
  if (!p) return ''
  return release.assets.find((a) => p[0].test(a.name))?.url || `${web}/${repo}/releases/download/${release.tag}/${p[1](release.version)}`
}

/** 命令行版怎么更新：克隆下来的就 git pull，用 npm 装的就再装一遍。 */
export function updateCommand(root) {
  if (fs.existsSync(path.join(root, '.git'))) return `cd "${root}" && git pull`
  return `npm install -g github:${REPO}`
}

/**
 * { ok, newer, current, latest, tag, url, download, command }；连不上 GitHub 时 ok 是 false。
 * 有新版本时，桌面版给安装包下载地址（download），命令行版给更新命令（command）。
 */
export async function checkUpdate({ root, desktop = !!process.versions.electron, platform = process.platform, ...net } = {}) {
  const current = currentVersion(root)
  const release = await latestRelease(net)
  if (!release) return { ok: false, newer: false, current }
  const newer = isNewer(release.version, current)
  return {
    ok: true,
    newer,
    current,
    latest: release.version,
    tag: release.tag,
    url: release.url,
    download: newer && desktop ? downloadFor(release, platform, net) : '',
    command: newer && !desktop ? updateCommand(root) : '',
  }
}
