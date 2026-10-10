// Start the whole studio (傻妞 + her team + the local web page) in one call. Used by the
// command line (bin/niuma.js) and by the desktop app (desktop/main.cjs).
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { rehearsalConfig } from '../fake/rehearsal.mjs'
import { loadConfig } from './config.js'
import { Coordinator } from './coordinator.js'
import { createServer, isLoopback } from './server.js'
import { createSetup, ensurePath } from './setup.js'

function listen(server, port, host, tries = 10) {
  return new Promise((resolve, reject) => {
    const onError = (e) => {
      server.off('listening', onListening)
      if (e.code === 'EADDRINUSE' && tries > 1) resolve(listen(server, port + 1, host, tries - 1))
      else reject(e)
    }
    const onListening = () => {
      server.off('error', onError)
      resolve(port)
    }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, host)
  })
}

/**
 * @param {object} o
 * @param {string} o.root       where bin/, src/, public/ and skills/ live
 * @param {string} o.workdir    the project folder the employees work in
 * @param {string} [o.configFile]
 * @param {object} [o.overrides] config overrides (port, host, autonomy…)
 * @param {boolean} [o.fake]    rehearsal mode with stand-in employees
 * @param {object} [o.updater]  desktop app only: downloads and installs new versions by itself
 */
export async function startStudio({ root, workdir, configFile, overrides = {}, fake = false, updater = null }) {
  if (!fs.existsSync(workdir) || !fs.statSync(workdir).isDirectory()) throw new Error(`目录不存在：${workdir}`)
  ensurePath()
  let config = loadConfig({ workdir, configFile, overrides })
  let closeFake = () => {}
  if (fake) {
    const r = await rehearsalConfig(config, root)
    config = { ...r.config, workdir, sources: config.sources }
    closeFake = r.close
  }
  const coord = new Coordinator(config, { mode: fake ? 'fake' : 'live', root, updater })
  const token = isLoopback(config.host) ? '' : crypto.randomBytes(12).toString('hex')
  // 「接入员工」面板：改完配置后按同样的来源重新读一遍，让傻妞重新点名。
  const setup = createSetup({ coord, fake, reload: () => coord.reconfigure(loadConfig({ workdir, configFile, overrides })) })
  const server = createServer(coord, { publicDir: path.join(root, 'public'), host: config.host, token, setup })
  await coord.init()
  const port = await listen(server, config.port || 7777, config.host)
  const local = `http://127.0.0.1:${port}/${token ? `?token=${token}` : ''}`
  // 自动检查更新：开工几秒后看一眼，之后每 6 小时看一眼。
  const timers = []
  if (config.updateCheck !== false) {
    const check = () => coord.checkForUpdate().catch(() => {})
    timers.push(setTimeout(check, 5000), setInterval(check, 6 * 60 * 60 * 1000))
    for (const t of timers) t.unref?.()
  }
  let closed = false
  const close = () =>
    new Promise((resolve) => {
      if (closed) return resolve()
      closed = true
      for (const t of timers) clearTimeout(t)
      coord.stopAll()
      closeFake()
      server.closeAllConnections?.()
      server.close(() => resolve())
      setTimeout(resolve, 1500).unref?.()
    })
  return { coord, server, config, port, token, local, close }
}
