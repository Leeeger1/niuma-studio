// 用 AI 画角色立绘：走 OpenAI 格式的画图接口（POST /images/generations），
// 中转站一般都有（gpt-image-1、dall-e-3、flux、seedream……）。地址和 Key 用已经接入的 API 组的。
import { truncate } from './util.js'

/** 名字看起来是画图模型的 */
export function isImageModel(id) {
  return /gpt-image|dall-?e|(^|[^a-z])image|flux|seedream|seededit|kolors|wanx|wan2|cogview|sdxl|stable-?diffusion|sd3|midjourney|(^|[^a-z])mj[-_]|imagen|ideogram|recraft|hidream|jimeng|playground-v/i.test(id)
}

const why = (status) =>
  status === 401 || status === 403 ? 'Key 不对或者没权限' : status === 404 ? '这个接口不能画图（没有 /images/generations），或者模型名不对' : status === 402 ? '余额不足' : status === 429 ? '请求太频繁或额度用完了' : `接口报错 ${status}`

/** 这个组的接口后面有哪些画图模型 */
export async function listImageModels(group) {
  let res
  try {
    res = await fetch(`${group.base()}/models`, { headers: group.headers(), signal: AbortSignal.timeout(20000) })
  } catch (e) {
    return { ok: false, error: `连不上（${e.cause?.code || e.message}）` }
  }
  if (!res.ok) return { ok: false, error: `读不到模型列表，${why(res.status)}。可以直接填模型名` }
  try {
    const j = await res.json()
    const list = Array.isArray(j) ? j : j.data || j.models || []
    const ids = [...new Set(list.map((m) => String(typeof m === 'string' ? m : m.id || m.name || '')).filter(Boolean))]
    return { ok: true, models: ids.filter(isImageModel), total: ids.length }
  } catch {
    return { ok: false, error: '模型列表看不懂，直接填模型名吧' }
  }
}

/**
 * 画一张图，返回 data URL。竖图优先（立绘是竖的），接口不认这个尺寸就退回方图。
 * @param {import('./workers/openai.js').OpenAIWorker} group
 */
export async function generateImage(group, { model, prompt, size = '1024x1536' }) {
  if (!model) return { ok: false, error: '还没选画图模型' }
  if (!prompt) return { ok: false, error: '没有提示词' }
  const ask = (sz) =>
    fetch(`${group.base()}/images/generations`, {
      method: 'POST',
      headers: group.headers(),
      body: JSON.stringify({ model, prompt, n: 1, size: sz }),
      signal: AbortSignal.timeout(4 * 60 * 1000),
    })
  let res
  let text = ''
  try {
    for (const sz of [size, '1024x1792', '1024x1024']) {
      res = await ask(sz)
      text = await res.text()
      if (res.ok || res.status !== 400 || !/size|dimension|尺寸|分辨率/i.test(text)) break
    }
  } catch (e) {
    return { ok: false, error: e.name === 'TimeoutError' ? '画太久了（超过 4 分钟），换个快一点的模型试试' : `连不上（${e.cause?.code || e.message}）` }
  }
  if (!res.ok) return { ok: false, error: `${why(res.status)}：${truncate(text.replace(/\s+/g, ' '), 160)}` }
  let item
  try {
    item = JSON.parse(text).data?.[0]
  } catch {}
  if (item?.b64_json) return { ok: true, image: `data:image/png;base64,${item.b64_json}` }
  if (item?.url) {
    try {
      const r = await fetch(item.url, { signal: AbortSignal.timeout(60000) })
      const type = (r.headers.get('content-type') || 'image/png').split(';')[0]
      if (!r.ok || !/^image\/(png|jpeg|webp|gif)$/.test(type)) throw new Error(`下载图片失败（${r.status}）`)
      return { ok: true, image: `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}` }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }
  return { ok: false, error: '接口回了消息，可是里面没有图片' }
}
