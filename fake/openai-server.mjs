// Rehearsal stand-in for an OpenAI-compatible API (a relay / DeepSeek / Qwen).
// With tools it drives the built-in agent through a few read-only tool calls, then reports.
import http from 'node:http'
import zlib from 'node:zlib'
import { answer, classify, finalText, sleep, verify } from './common.mjs'

const STEPS = [
  { name: 'list_files', args: { path: '.', depth: 1 } },
  { name: 'search', args: { pattern: 'function' } },
  { name: 'run_command', args: { command: 'git status --short' } },
]

function reply(body) {
  const messages = body.messages || []
  const user = messages.find((m) => m.role === 'user')?.content || ''
  if (!body.tools) return { content: answer(user) }
  const job = classify(user)
  const done = messages.filter((m) => m.role === 'tool').length
  if (done < STEPS.length) {
    const s = STEPS[done]
    return {
      content: done === 0 ? `先看看项目结构，再处理「${job.title}」。` : null,
      tool_calls: [{ id: `call_${done}`, type: 'function', function: { name: s.name, arguments: JSON.stringify(s.args) } }],
    }
  }
  return { content: job.mode === 'verify' ? verify(job) : finalText(job) }
}

// ---- 假画图：白底上画一个小人（颜色跟着提示词变），用来测「一键生成立绘」和去白底 ----
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function png(w, h, pixel) {
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(pixel(x, y), y * (w * 3 + 1) + 1 + x * 3)
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(td))
    return Buffer.concat([len, td, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr.set([8, 2, 0, 0, 0], 8)
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
export function fakePortrait(prompt = '') {
  let h = 7
  for (const ch of prompt) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const color = [60 + (h % 160), 60 + ((h >> 8) % 160), 60 + ((h >> 16) % 160)]
  const W = 160
  const H = 320
  return png(W, H, (x, y) => {
    const head = (x - 80) ** 2 + (y - 60) ** 2 < 34 ** 2
    const body = x > 44 && x < 116 && y > 96 && y < 230
    const legs = ((x > 52 && x < 74) || (x > 86 && x < 108)) && y >= 230 && y < 300
    const edge = (x - 80) ** 2 + (y - 60) ** 2 < 37 ** 2 || (x > 41 && x < 119 && y > 93 && y < 233)
    if (head) return [255, 220, 196]
    if (body || legs) return color
    if (edge) return [40, 30, 50]
    return [255, 255, 255]
  }).toString('base64')
}

/** models：GET /models 列出的模型（假装是中转站）；名字里带 notools 的模型不会调用工具。 */
export function startFakeOpenAI(port = 0, { models = ['deepseek-v4-flash', 'deepseek-v4-pro', 'qwen3-coder'] } = {}) {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url.endsWith('/models')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ data: models.map((id) => ({ id, object: 'model' })) }))
    }
    let raw = ''
    for await (const c of req) raw += c
    let body = {}
    try {
      body = JSON.parse(raw)
    } catch {}
    if (req.url.endsWith('/images/generations')) {
      await sleep(600)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ created: Date.now(), data: [{ b64_json: fakePortrait(body.prompt) }] }))
    }
    if (/notools/.test(body.model || '')) delete body.tools
    await sleep(body.tools ? 900 + Math.random() * 900 : 1400)
    const message = { role: 'assistant', ...reply(body) }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        id: 'fake',
        model: body.model,
        choices: [{ index: 0, message, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }],
        usage: { prompt_tokens: 800, completion_tokens: 120 },
      }),
    )
  })
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}/v1`, close: () => (server.close(), server.closeAllConnections?.()) })))
}
