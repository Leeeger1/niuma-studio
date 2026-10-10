/* 角色立绘的小工具（浏览器里跑）：
   - clean：去掉 AI 图常见的纯色（白）背景、裁掉空白边、缩到合适大小，存成透明背景的 WebP
   - avatar：从立绘里截出头像
   - prompt：给每个角色写画立绘用的提示词，发型、发色、配饰、衣服颜色和现在的设计一致 */
;(function () {
  'use strict'

  const C = window.NiumaChibi

  const ROLES = [
    ['shaniu', '傻妞'],
    ['architect', '架构师'],
    ['frontend', '前端工程师'],
    ['reviewer', '代码审查员'],
    ['backend', '后端工程师'],
    ['tester', '测试工程师'],
    ['debugger', '排错专家'],
    ['writer', '文档专员'],
    ['default', '其他人（通才、新招的）'],
  ]
  const STATES = [
    ['idle', '平时'],
    ['happy', '开心'],
    ['error', '出错'],
  ]
  // 内置岗位的配饰和默认项目组颜色（和 chibi.js / config 里的默认编制一致）
  const ROLE_LOOK = {
    shaniu: { id: 'shaniu' },
    architect: { id: 'architect', look: 'helmet', color: '#c4602f' },
    frontend: { id: 'frontend', look: 'beret', color: '#c4602f' },
    reviewer: { id: 'reviewer', look: 'glasses', color: '#c4602f' },
    backend: { id: 'backend', look: 'headphones', color: '#16837a' },
    tester: { id: 'tester', look: 'cap', color: '#16837a' },
    debugger: { id: 'debugger', look: 'bandana', color: '#16837a' },
    writer: { id: 'writer', look: 'bun', color: '#4d6bfe' },
    default: { id: 'generalist', look: 'none', color: '#6b7a99' },
  }
  const VIBE = {
    shaniu: ['开朗可爱的少女总管，抱着平板电脑，元气地微笑', 'cheerful cute girl manager hugging a tablet, energetic smile'],
    architect: ['自信，腋下夹着一卷蓝图', 'confident, holding a rolled blueprint under the arm'],
    frontend: ['活泼，拿着数位笔和平板', 'lively, holding a stylus and a drawing tablet'],
    reviewer: ['冷静认真，拿着写字板', 'calm and serious, holding a clipboard'],
    backend: ['专注，抱着笔记本电脑', 'focused, holding a laptop'],
    tester: ['精神满满，拿着放大镜', 'energetic, holding a magnifying glass'],
    debugger: ['坚定，拿着扳手', 'determined, holding a wrench'],
    writer: ['温柔，拿着笔记本和钢笔', 'gentle, holding a notebook and a pen'],
    default: ['友善，双手自然下垂', 'friendly, relaxed pose'],
  }
  const STYLE_ZH = {
    bob: '齐耳短发（波波头）', long: '长直发', short: '利落短发', side: '斜刘海短发', spiky: '炸毛刺猬头', twintail: '双马尾', ponytail: '高马尾',
  }
  const STYLE_EN = {
    bob: 'bob cut', long: 'long straight hair', short: 'short neat hair', side: 'short hair with side-swept bangs', spiky: 'spiky messy hair', twintail: 'twin tails', ponytail: 'high ponytail',
  }
  const ACC = {
    helmet: ['戴黄色安全帽', 'wearing a yellow construction safety helmet'],
    beret: ['戴红色贝雷帽', 'wearing a red beret'],
    glasses: ['戴细框眼镜', 'wearing thin-framed glasses'],
    headphones: ['戴头戴式耳机', 'wearing over-ear headphones'],
    cap: ['戴棒球帽', 'wearing a baseball cap'],
    bandana: ['额头系红色头带', 'wearing a red bandana headband'],
    bun: ['头顶扎丸子头', 'hair tied in a bun on top'],
    sensors: ['戴粉色发箍，两侧有机器人小天线', 'pink headband with small robot antenna sensors on both sides'],
  }
  const FEMALE = /long|bob|twintail|ponytail/

  // 颜色起名：按色相和明暗粗分
  function colorName(hex) {
    const n = parseInt(String(hex).replace('#', '').slice(0, 6), 16)
    const r = (n >> 16) & 255
    const g = (n >> 8) & 255
    const b = n & 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 510
    const s = max === min ? 0 : (max - min) / (l > 0.5 ? 510 - max - min : max + min)
    if (l < 0.23) return ['黑色', 'black'] // 带点颜色的深发色，画出来就是黑发
    if (s < 0.15) return l > 0.85 ? ['白色', 'white'] : l < 0.2 ? ['黑色', 'black'] : l < 0.45 ? ['深灰色', 'dark gray'] : ['银灰色', 'silver gray']
    const d = max - min
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h = (h * 60 + 360) % 360
    const dark = l < 0.32
    const names = [
      [15, ['红色', 'red']], [40, ['橙色', 'orange']], [62, ['金黄色', 'golden']], [150, ['绿色', 'green']], [190, ['青绿色', 'teal']],
      [250, ['蓝色', 'blue']], [290, ['紫色', 'purple']], [348, ['粉色', 'pink']], [361, ['红色', 'red']],
    ]
    const [zh, en] = names.find(([lim]) => h < lim)[1]
    if (en === 'orange' && l < 0.45) return ['棕色', 'brown']
    if ((en === 'orange' || en === 'golden') && l > 0.6) return ['金色', 'blonde']
    if (en === 'red' && l > 0.7) return ['粉色', 'pink']
    return dark ? [`深${zh}`, `dark ${en}`] : l > 0.75 ? [`浅${zh}`, `light ${en}`] : [zh, en]
  }

  const COMMON_ZH = '日系动漫风格，全身站立立绘，正面朝前，人物居中，干净利落的线稿，赛璐璐上色，色彩明亮，精致的眼睛，高质量插画，纯白色背景，背景不要阴影和地面，不要文字和水印，画面里只有一个人'
  const COMMON_EN = 'anime style, full body standing illustration, front view, centered, clean crisp lineart, cel shading, vibrant colors, beautiful detailed eyes, high quality, pure white background, no ground shadow, no text, no watermark, solo, single character'
  const MOOD = {
    idle: ['', ''],
    happy: ['双手举高欢呼，开心地大笑，眯着眼睛', 'cheering with both arms raised, big open-mouth smile, happy closed eyes'],
    error: ['慌张，冒冷汗，眼泪汪汪，双手抱头，搞笑的震惊表情', 'panicking, sweat drops, teary eyes, hands on head, comedic shock'],
  }

  /** 给角色写提示词：{ zh, en }。role 是上面 ROLES 里的；state 是 idle / happy / error；color 覆盖衣服颜色 */
  function prompt(role, state = 'idle', { color } = {}) {
    const base = ROLE_LOOK[role] || ROLE_LOOK.default
    const L = C.lookFor({ ...base, color: color || base.color })
    const girl = L.sailor || FEMALE.test(L.style)
    const hair = colorName(L.hair)
    const eye = colorName(L.eye)
    const cloth = colorName(L.outfit)
    const acc = ACC[L.acc]
    const vibe = VIBE[role] || VIBE.default
    const mood = MOOD[state] || MOOD.idle
    const zh = [
      girl ? '一位动漫少女' : '一位动漫少年',
      `${hair[0]}${STYLE_ZH[L.style] || '短发'}`,
      `${eye[0]}眼睛`,
      acc ? acc[0] : '',
      L.sailor ? '穿粉色水手服、红色领结、粉色百褶裙' : `穿${cloth[0]}西装外套、白衬衫、${girl ? '领结、深色百褶裙' : '领带、深色西裤'}，胸前别着工牌`,
      mood[0] || vibe[0],
      COMMON_ZH,
    ].filter(Boolean)
    const en = [
      girl ? '1girl' : '1boy, young man',
      `${hair[1]} ${STYLE_EN[L.style] || 'short hair'}`,
      `${eye[1]} eyes`,
      acc ? acc[1] : '',
      L.sailor ? 'pink sailor school uniform with red ribbon, pink pleated skirt' : `${cloth[1]} business blazer, white shirt, ${girl ? 'ribbon bow, dark pleated skirt' : 'necktie, dark trousers'}, name badge`,
      mood[1] || vibe[1],
      COMMON_EN,
    ].filter(Boolean)
    return { zh: zh.join('，'), en: en.join(', ') }
  }

  // ---- 图片处理 --------------------------------------------------------------------------

  function load(src) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('图片打不开'))
      img.src = src
    })
  }

  /**
   * 去背景 + 裁边 + 缩放。背景是从四条边往里「漫水」找出来的同色区域（AI 图一般是纯白底），
   * 被线稿围住的白衬衫不会被抠掉。图本来就是透明背景的话只裁边。
   */
  async function clean(src, { removeBg = true, maxH = 1200, tolerance = 40, quality = 0.92 } = {}) {
    const img = await load(src)
    const k = Math.min(1, maxH / img.naturalHeight, 1600 / img.naturalWidth)
    const w = Math.max(1, Math.round(img.naturalWidth * k))
    const h = Math.max(1, Math.round(img.naturalHeight * k))
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, w, h)
    const im = ctx.getImageData(0, 0, w, h)
    const px = im.data
    const at = (x, y) => (y * w + x) * 4
    // 边上一圈像素：大部分已经透明 → 本来就是透明底
    const border = []
    for (let x = 0; x < w; x += 4) border.push(at(x, 0), at(x, h - 1))
    for (let y = 0; y < h; y += 4) border.push(at(0, y), at(w - 1, y))
    const transparent = border.filter((i) => px[i + 3] < 30).length > border.length * 0.6
    if (removeBg && !transparent) {
      // 背景色：边上像素的中位数
      const med = (c) => border.map((i) => px[i + c]).sort((a, b) => a - b)[border.length >> 1]
      const bg = [med(0), med(1), med(2)]
      const dist = (i) => Math.max(Math.abs(px[i] - bg[0]), Math.abs(px[i + 1] - bg[1]), Math.abs(px[i + 2] - bg[2]))
      const seen = new Uint8Array(w * h)
      const queue = new Int32Array(w * h)
      let head = 0
      let tail = 0
      const push = (x, y) => {
        const p = y * w + x
        if (seen[p] || dist(p * 4) > tolerance) return
        seen[p] = 1
        queue[tail++] = p
      }
      for (let x = 0; x < w; x++) push(x, 0), push(x, h - 1)
      for (let y = 0; y < h; y++) push(0, y), push(w - 1, y)
      while (head < tail) {
        const p = queue[head++]
        const x = p % w
        const y = (p / w) | 0
        if (x > 0) push(x - 1, y)
        if (x < w - 1) push(x + 1, y)
        if (y > 0) push(x, y - 1)
        if (y < h - 1) push(x, y + 1)
      }
      for (let p = 0; p < w * h; p++) if (seen[p]) px[p * 4 + 3] = 0
      // 边缘柔化：挨着背景、颜色又接近背景的像素半透明，去掉白边
      for (let p = 0; p < w * h; p++) {
        if (seen[p]) continue
        const x = p % w
        const y = (p / w) | 0
        const near = (x > 0 && seen[p - 1]) || (x < w - 1 && seen[p + 1]) || (y > 0 && seen[p - w]) || (y < h - 1 && seen[p + w])
        if (near) px[p * 4 + 3] = Math.min(px[p * 4 + 3], Math.round(255 * Math.min(1, dist(p * 4) / (tolerance * 3))))
      }
    }
    // 裁到人物的范围
    let x0 = w
    let y0 = h
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (px[at(x, y) + 3] > 24) {
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          y1 = y
        }
      }
    }
    if (x1 < 0) throw new Error('图里没找到人物（整张都被当成背景了），换一张背景更干净的')
    ctx.putImageData(im, 0, 0)
    const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.015)
    x0 = Math.max(0, x0 - pad)
    y0 = Math.max(0, y0 - pad)
    x1 = Math.min(w - 1, x1 + pad)
    y1 = Math.min(h - 1, y1 + pad)
    const out = document.createElement('canvas')
    out.width = x1 - x0 + 1
    out.height = y1 - y0 + 1
    out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
    let url = out.toDataURL('image/webp', quality)
    if (!url.startsWith('data:image/webp')) url = out.toDataURL('image/png')
    return url
  }

  /** 从立绘里截头像：找到最上面的人物轮廓，按全身 / 半身估计脸的大小 */
  async function avatar(src, bg = '#fff4f9', size = 160) {
    const img = await load(src)
    const w = img.naturalWidth
    const h = img.naturalHeight
    const tall = h / w > 1.6
    const face = (tall ? 0.16 : 0.42) * h
    // 头顶那一带的人物中心
    const probe = document.createElement('canvas')
    const pw = 120
    const ph = Math.round((pw * h) / w)
    probe.width = pw
    probe.height = ph
    const pctx = probe.getContext('2d', { willReadFrequently: true })
    pctx.drawImage(img, 0, 0, pw, ph)
    const d = pctx.getImageData(0, 0, pw, ph).data
    const solid = (x, y) => d[(y * pw + x) * 4 + 3] > 40
    // 头顶：按身体中线找（举过头顶的手、飘起来的发带不算）
    let top = Math.round(measure(img).top * ph)
    // 头顶往下一小段里人物的左右中心，就是脸的中心
    const band = Math.max(2, Math.round((face / h) * ph * 0.7))
    let sum = 0
    let cnt = 0
    for (let y = top; y < Math.min(ph, top + band); y++) for (let x = 0; x < pw; x++) if (solid(x, y)) (sum += x), cnt++
    const cx = cnt ? (sum / cnt / pw) * w : w / 2
    const cy = (top / ph) * h + face * 0.55
    const side = face * 1.35
    const cv = document.createElement('canvas')
    cv.width = size
    cv.height = size
    const ctx = cv.getContext('2d')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(img, cx - side / 2, cy - side / 2, side, side, 0, 0, size, size)
    return cv.toDataURL('image/png')
  }

  /** 图片地址 → data URL（导出皮肤文件时把服务器上的立绘打包进去） */
  async function toDataUrl(src) {
    if (src.startsWith('data:')) return src
    const r = await fetch(src)
    if (!r.ok) throw new Error(`取不到图片（${r.status}）`)
    const blob = await r.blob()
    return new Promise((resolve) => {
      const fr = new FileReader()
      fr.onload = () => resolve(String(fr.result))
      fr.readAsDataURL(blob)
    })
  }

  /**
   * 量一量立绘里的人：宽高比 ar（高/宽）、头顶 top 和脚底 bottom（占图高的比例）、身体中线 cx（占图宽的比例）。
   * 头顶只在身体中线附近找，「开心」那张举过头顶的手不算，这样三种表情按身高对齐，不会忽大忽小。
   */
  function measure(img) {
    const ar = img.naturalHeight / img.naturalWidth
    const whole = { ar, top: 0, bottom: 1, cx: 0.5, half: ar < 1.6 }
    const pw = Math.min(160, img.naturalWidth)
    const ph = Math.max(1, Math.round(pw * ar))
    const cv = document.createElement('canvas')
    cv.width = pw
    cv.height = ph
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, pw, ph)
    let d
    try {
      d = ctx.getImageData(0, 0, pw, ph).data
    } catch {
      return whole // 别的网站的图读不了像素
    }
    const solid = (x, y) => d[(y * pw + x) * 4 + 3] > 60
    let y0 = -1
    let y1 = -1
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        if (solid(x, y)) {
          if (y0 < 0) y0 = y
          y1 = y
          break
        }
      }
    }
    if (y0 < 0) return whole
    const H = y1 - y0 + 1
    // 身体中线：腿那一段的左右中心（手里拿的东西一般在胸口，不影响）
    let sx = 0
    let n = 0
    for (let y = Math.round(y0 + H * 0.55); y <= Math.round(y0 + H * 0.92); y++) for (let x = 0; x < pw; x++) if (solid(x, y)) (sx += x), n++
    const cx = n ? sx / n : pw / 2
    // 头顶：中线左右一小段里最上面的地方
    const band = Math.max(2, H * 0.06)
    let top = y0
    find: for (let y = y0; y <= y1; y++) {
      for (let x = Math.max(0, Math.floor(cx - band)); x <= Math.min(pw - 1, Math.ceil(cx + band)); x++) {
        if (solid(x, y)) {
          top = y
          break find
        }
      }
    }
    return { ar, top: top / ph, bottom: (y1 + 1) / ph, cx: (cx + 0.5) / pw, half: ar < 1.6 }
  }

  const sizes = new Map()
  /** 立绘量好的尺寸（异步量好以后缓存），量好前返回 null */
  function metrics(src, onReady) {
    if (sizes.has(src)) return sizes.get(src)
    sizes.set(src, null)
    load(src)
      .then((img) => {
        sizes.set(src, measure(img))
        onReady?.()
      })
      .catch(() => {})
    return null
  }

  window.NiumaCast = { ROLES, STATES, prompt, clean, avatar, toDataUrl, metrics, colorName }
})()
