/* 「做皮肤」编辑器：右边抽屉，改一个颜色，后面的办公室马上跟着变。
   一键配色（选一个主色配出一整套）、随机来一套、换窗外风景和飘落效果、放自己的图片；
   保存到 ~/.niuma/skins（网页演示里存在浏览器），也能导出成文件发给别人、导入别人的皮肤。 */
;(function () {
  'use strict'

  const F = window.NiumaSkinFormat
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

  const UI = [
    ['bg', '页面背景'],
    ['panel', '面板'],
    ['panel2', '浅色块'],
    ['ink', '文字'],
    ['muted', '次要文字'],
    ['accent', '强调色'],
    ['onAccent', '强调色上的字'],
    ['line', '分隔线'],
    ['edge', '面板边框'],
  ]
  const ROOM_MAIN = [
    ['wall.0', '墙（上）'],
    ['wall.1', '墙（下）'],
    ['wainscot', '墙裙'],
    ['trim', '墙裙线'],
    ['floor.0', '地板（远）'],
    ['floor.1', '地板（近）'],
    ['sky.0', '天空（上）'],
    ['sky.1', '天空（中）'],
    ['sky.2', '天空（下）'],
    ['boss', '傻妞的桌子'],
  ]
  const ROOM_MORE = [
    ['floorLine', '地板缝'],
    ['desk', '工位桌子'],
    ['deskTop', '桌面'],
    ['deskEdge', '桌子描边'],
    ['monitor', '显示器'],
    ['monitorEdge', '显示器边框'],
    ['table', '会议桌'],
    ['tableEdge', '会议桌描边'],
    ['rug', '地毯'],
    ['frame', '窗框'],
    ['frameEdge', '窗框描边'],
    ['bossEdge', '傻妞桌子描边'],
    ['plant.0', '植物（亮）'],
    ['plant.1', '植物（暗）'],
    ['pot', '花盆'],
    ['ink', '钟和字'],
  ]
  const WINDOWS = [['sakura', '樱花'], ['city', '城市夜景'], ['cyber', '赛博城市'], ['garden', '花园'], ['sea', '大海'], ['sky', '只有天空'], ['park', '科技园区'], ['mountains', '仙山'], ['space', '太空'], ['image', '用我的图片']]
  const DECORS = [['none', '没有'], ['park', '园区横幅、打卡机'], ['xianxia', '卷轴、灯笼、红柱'], ['space', '舱壁仪表、警示条']]
  const PARTICLES = [['petals', '花瓣'], ['snow', '雪花'], ['stars', '星光'], ['bubbles', '泡泡'], ['none', '不要']]
  const PATTERNS = [['none', '没有'], ['paws', '猫爪'], ['dots', '圆点'], ['stripes', '竖条'], ['grid', '霓虹格子']]
  const FLAGS = [['catEars', '大家戴猫耳'], ['cat', '办公室养猫'], ['lamps', '工位台灯'], ['neon', '霓虹灯'], ['shock', '出错挨电棍⚡']]
  const BASE_NAMES = { sakura: '樱花', night: '夜班', neon: '赛博霓虹', neko: '猫耳咖啡', park: '996 园区', xianxia: '修仙宗门', space: '太空站', pixel: '像素复古' }
  const MAX_IMAGE = 4 * 1024 * 1024

  const CAST_GEN = 'niuma.castGen' // 上次画立绘用的接口和模型
  let host = null
  let genStop = false // 一键画全部：点「停」就不画后面的了
  let dlg = null
  let draft = null
  let editing = null // 正在改的自制皮肤 id；null = 新皮肤
  let dirty = false
  let timer = 0

  // ---- 颜色小工具 ----------------------------------------------------------------------

  const ctx = document.createElement('canvas').getContext('2d')
  /** 任何 CSS 颜色 → #rrggbb（给 <input type=color> 用，透明度丢掉） */
  function toHex(c) {
    if (!c) return '#000000'
    ctx.fillStyle = '#000000'
    ctx.fillStyle = String(c)
    const v = ctx.fillStyle
    if (/^#[0-9a-f]{6}$/i.test(v)) return v
    const m = v.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/)
    return m ? '#' + m.slice(1, 4).map((x) => (+x).toString(16).padStart(2, '0')).join('') : '#000000'
  }

  const getPath = (obj, key) => {
    const [k, i] = key.split('.')
    return i == null ? obj[k] : obj[k]?.[+i]
  }
  const setPath = (obj, key, v) => {
    const [k, i] = key.split('.')
    if (i == null) obj[k] = v
    else {
      obj[k] = [...(obj[k] || [])]
      obj[k][+i] = v
    }
  }

  // ---- 草稿 ----------------------------------------------------------------------------

  /** 一份完整的草稿：没写的颜色从 base 那套内置皮肤补上，这样每个色块都有值 */
  function fullDraft(skin) {
    const base = skin.base || 'sakura'
    const room = host.baseRoom(base) || {}
    const darkDefault = base === 'pixel' ? !!window.matchMedia?.('(prefers-color-scheme: dark)').matches : !!room.dark
    return {
      id: skin.id,
      name: skin.name || '',
      base,
      dark: typeof skin.dark === 'boolean' ? skin.dark : darkDefault,
      author: skin.author || '',
      font: skin.font || '',
      colors: { ...host.baseColors(base), ...(skin.colors || {}) },
      room: {
        window: 'sakura',
        particles: 'none',
        wallPattern: 'none',
        decor: 'none',
        shock: false,
        catEars: false,
        cat: false,
        lamps: false,
        neon: false,
        ...pickRoom(room),
        ...(skin.room || {}),
      },
      images: { ...(skin.images || {}) },
      cast: JSON.parse(JSON.stringify(skin.cast || {})),
    }
  }

  function pickRoom(r) {
    const out = {}
    for (const k of Object.keys(F.ROOM_COLORS)) if (r[k] != null) out[k] = Array.isArray(r[k]) ? [...r[k]] : r[k]
    for (const k of Object.keys(F.ROOM_CHOICES)) if (r[k] != null) out[k] = r[k]
    for (const k of F.ROOM_FLAGS) if (r[k] != null) out[k] = !!r[k]
    return out
  }

  function skinFromDraft() {
    const raw = {
      id: editing || F.toId(draft.name) || 'my-skin',
      name: draft.name.trim() || '我的皮肤',
      base: draft.base,
      dark: draft.dark,
      author: draft.author,
      font: draft.font,
      colors: { ...draft.colors },
      room: draft.base === 'pixel' ? {} : { ...draft.room },
      images: { ...draft.images },
      cast: draft.base === 'pixel' ? {} : JSON.parse(JSON.stringify(draft.cast || {})),
    }
    // 空的颜色（读不到的）不要写进去
    for (const [k, v] of Object.entries(raw.colors)) if (!v) delete raw.colors[k]
    if (raw.room.window === 'image' && !raw.images.window) raw.room.window = 'sky'
    return raw
  }

  function preview() {
    clearTimeout(timer)
    timer = setTimeout(() => {
      try {
        const s = F.normalize(skinFromDraft())
        host.preview({ ...s, id: editing || '__preview' })
      } catch (e) {
        note(e.message, 'bad')
      }
    }, 90)
  }

  // ---- 界面 ----------------------------------------------------------------------------

  function ensure() {
    if (dlg) return
    dlg = document.createElement('dialog')
    dlg.className = 'skin-editor'
    dlg.setAttribute('aria-label', '做皮肤')
    document.body.appendChild(dlg)
    dlg.addEventListener('input', onInput)
    dlg.addEventListener('change', onChange)
    dlg.addEventListener('click', onClick)
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault()
      close()
    })
  }

  function swatch(key, label, value) {
    return `<label class="sw"><input type="color" data-k="${key}" value="${toHex(value)}"><span>${label}</span></label>`
  }

  const select = (key, list, value) => `<select data-k="${key}">${list.map(([v, n]) => `<option value="${v}"${v === value ? ' selected' : ''}>${n}</option>`).join('')}</select>`

  function imageRow(key, label, hint) {
    const has = !!draft.images[key]
    return `<div class="img-row"><span class="img-label">${label}</span>
      ${has ? `<span class="thumb" style="background-image:url('${draft.images[key]}')"></span>` : `<span class="muted">${hint}</span>`}
      <label class="btn">选图片<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" data-img="${key}" hidden></label>
      ${has ? `<button type="button" data-act="clear-img" data-img="${key}">去掉</button>` : ''}</div>`
  }

  function render() {
    const info = host.info()
    const pixel = draft.base === 'pixel'
    const accent = toHex(draft.colors.accent)
    dlg.innerHTML = `
      <div class="se-head"><h2>${editing ? '改皮肤' : '做皮肤'}</h2><button type="button" class="ghost" data-act="close">关闭</button></div>
      <div class="se-body">
        <section>
          <label class="field"><span>名字</span><input data-k="name" value="${esc(draft.name)}" placeholder="比如 海边度假" maxlength="24"></label>
          <label class="field"><span>从哪套改起</span>${select('base', Object.entries(BASE_NAMES), draft.base)}</label>
          <label class="check"><input type="checkbox" data-k="dark" ${draft.dark ? 'checked' : ''}> 深色皮肤</label>
        </section>
        <section class="quick">
          <h3>一键配色 <small>选一个喜欢的颜色，其余的自动配好</small></h3>
          <div class="row"><input type="color" id="se-main" value="${accent}" aria-label="主色">
            <button type="button" class="primary" data-act="palette">用这个颜色配一整套</button>
            <button type="button" data-act="random">🎲 随机一套</button></div>
        </section>
        <section>
          <h3>界面颜色</h3>
          <div class="grid">${UI.map(([k, n]) => swatch(`colors.${k}`, n, draft.colors[k])).join('')}</div>
        </section>
        ${
          pixel
            ? '<section><p class="muted">像素复古的办公室画面是固定的像素画，这里只改界面颜色。想改办公室，「从哪套改起」换成二次元的几套。</p></section>'
            : `<section>
          <h3>办公室</h3>
          <div class="opts">
            <label class="field"><span>窗外</span>${select('room.window', WINDOWS, draft.room.window)}</label>
            <label class="field"><span>飘落</span>${select('room.particles', PARTICLES, draft.room.particles)}</label>
            <label class="field"><span>墙上花纹</span>${select('room.wallPattern', PATTERNS, draft.room.wallPattern)}</label>
            <label class="field"><span>墙上摆设</span>${select('room.decor', DECORS, draft.room.decor)}</label>
          </div>
          <div class="flags">${FLAGS.map(([k, n]) => `<label class="check"><input type="checkbox" data-k="room.${k}" ${draft.room[k] ? 'checked' : ''}> ${n}</label>`).join('')}</div>
          <div class="grid">${ROOM_MAIN.map(([k, n]) => swatch(`room.${k}`, n, getPath(draft.room, k))).join('')}</div>
          <details><summary>更多颜色（桌子、显示器、窗框、植物…）</summary>
            <div class="grid">${ROOM_MORE.map(([k, n]) => swatch(`room.${k}`, n, getPath(draft.room, k))).join('')}</div>
          </details>
        </section>
        <section>
          <h3>图片 <small>png / jpg / gif / webp，不超过 4MB</small></h3>
          ${imageRow('wall', '墙纸', '没有，用上面的墙色')}
          ${imageRow('window', '窗外', '没有，用上面选的风景')}
        </section>
        ${castSection(info)}`
        }
        <section>
          <details><summary>作者和字体</summary>
            <label class="field"><span>作者</span><input data-k="author" value="${esc(draft.author)}" maxlength="40" placeholder="分享时显示"></label>
            <label class="field"><span>标题字体</span><input data-k="font" value="${esc(draft.font)}" maxlength="40" placeholder="电脑上装了的字体名，可以不填"></label>
          </details>
        </section>
      </div>
      <div class="se-foot">
        <p class="note" data-note aria-live="polite"></p>
        <div class="row">
          <button type="button" class="primary" data-act="save">${editing ? '保存修改' : '保存'}</button>
          ${editing ? '<button type="button" data-act="save-new">另存为新皮肤</button>' : ''}
          <button type="button" data-act="export">导出文件</button>
          <label class="btn">导入文件<input type="file" accept=".json,application/json" data-act="import" hidden></label>
          ${editing ? '<button type="button" class="danger" data-act="delete">删除</button>' : ''}
        </div>
        <p class="where">${
          info.server
            ? `保存到 <code>${esc(info.dir || '~/.niuma/skins')}</code> <button type="button" class="link" data-act="folder">打开文件夹</button> · 也可以直接改里面的文件，回到窗口就生效`
            : '网页演示里皮肤存在这个浏览器里；「导出文件」可以存到电脑上或发给别人。'
        } · <a href="https://github.com/Leeeger1/niuma-studio/blob/main/docs/skin-guide.md" target="_blank" rel="noopener">皮肤说明</a></p>
        ${info.errors?.length ? `<details class="errors"><summary>有 ${info.errors.length} 个皮肤文件读的时候出了问题</summary><ul>${info.errors.map((e) => `<li><code>${esc(e.file)}</code>：${esc(e.message)}</li>`).join('')}</ul></details>` : ''}
      </div>`
  }

  // ---- 角色立绘 ---------------------------------------------------------------------------

  function castSection(info) {
    const NC = window.NiumaCast
    if (!NC) return ''
    const gen = loadGen()
    const groups = host.apiGroups?.() || []
    const thumb = (role, st, label) => {
      const url = draft.cast?.[role]?.[st]
      return `<div class="cast-slot${url ? ' has' : ''}">
        <label class="cast-pic" title="${label}：点一下换图片">${url ? `<img src="${esc(url)}" alt="">` : `<span>${label}</span>`}<input type="file" accept="image/png,image/jpeg,image/webp" data-cast="${role}.${st}" hidden></label>
        ${url ? `<button type="button" class="cast-x" data-act="cast-clear" data-cast="${role}.${st}" aria-label="去掉${label}">×</button>` : ''}
      </div>`
    }
    const rows = NC.ROLES.map(
      ([role, name]) => `<div class="cast-row"><div class="cast-name"><b>${name}</b>
        <span class="cast-acts"><button type="button" class="link" data-act="cast-copy" data-role="${role}">复制提示词</button>${info.server && groups.length ? ` · <button type="button" class="link" data-act="cast-gen" data-role="${role}">AI 画</button>` : ''}</span></div>
        <div class="cast-slots">${NC.STATES.map(([st, label]) => thumb(role, st, label)).join('')}</div></div>`,
    ).join('')
    const ai = info.server
      ? groups.length
        ? `<div class="cast-ai">
            <label class="field"><span>用哪个接口画</span><select id="cast-group">${groups.map((g) => `<option value="${esc(g.id)}"${g.id === gen.group ? ' selected' : ''}>${esc(g.name)}${g.available ? '' : '（未到岗）'}</option>`).join('')}</select></label>
            <label class="field"><span>画图模型</span><input id="cast-model" list="cast-models" value="${esc(gen.model || '')}" placeholder="比如 gpt-image-1、dall-e-3、flux、seedream"><datalist id="cast-models">${(gen.models || []).map((m) => `<option value="${esc(m)}">`).join('')}</datalist></label>
            <div class="row"><button type="button" data-act="cast-models">读取画图模型</button><button type="button" class="primary" data-act="cast-gen-all">一键画全部</button><button type="button" data-act="cast-stop" hidden>停</button></div>
            <label class="check"><input type="checkbox" id="cast-moods" ${gen.moods ? 'checked' : ''}> 连「开心」「出错」两张表情一起画（时间和花费是 3 倍）</label>
          </div>`
        : '<p class="muted">想让 AI 直接画：先在「接入员工」里接一个带画图模型的接口（比如中转站），回来就能一键画全部。</p>'
      : '<p class="muted">网页演示里不能用 AI 画；可以复制提示词去即梦、豆包、通义万相、Midjourney 画好再传上来。</p>'
    return `<section class="cast">
      <h3>角色立绘 <small>换成真正的动漫插画</small></h3>
      <p class="muted">每个角色放一张<b>全身立绘</b>（白底或透明底都行），坐在工位上露上半身，开会走路露全身；「开心」「出错」可以不放。不会画就点「复制提示词」，拿去 AI 绘图工具里画，画好点格子传上来。</p>
      <label class="check"><input type="checkbox" id="cast-bg" checked> 传图时自动去掉白底、裁掉空白边</label>
      <div class="cast-grid">${rows}</div>
      ${ai}
    </section>`
  }

  function loadGen() {
    try {
      return JSON.parse(localStorage.getItem(CAST_GEN) || '{}')
    } catch {
      return {}
    }
  }
  function saveGen(patch) {
    try {
      localStorage.setItem(CAST_GEN, JSON.stringify({ ...loadGen(), ...patch }))
    } catch {}
  }

  function setCast(role, st, url) {
    draft.cast ||= {}
    draft.cast[role] ||= {}
    if (url) draft.cast[role][st] = url
    else delete draft.cast[role][st]
    if (!Object.keys(draft.cast[role]).length) delete draft.cast[role]
    dirty = true
  }

  async function castUpload(key, file) {
    const [role, st] = key.split('.')
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return note('立绘只支持 png、jpg、webp', 'bad')
    if (file.size > 20 * 1024 * 1024) return note('图片太大了（超过 20MB）', 'bad')
    note('正在处理图片…', 'busy')
    try {
      const raw = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result))
        r.onerror = () => reject(new Error('读不了这张图'))
        r.readAsDataURL(file)
      })
      const removeBg = dlg.querySelector('#cast-bg')?.checked !== false
      setCast(role, st, await window.NiumaCast.clean(raw, { removeBg }))
      render()
      preview()
      note(`${roleName(role)}的立绘换好了。`, 'ok')
    } catch (e) {
      note(e.message, 'bad')
    }
  }

  const roleName = (role) => (window.NiumaCast.ROLES.find(([r]) => r === role) || [role, role])[1]

  /** 让 AI 画一张：返回去好白底的图 */
  async function castDraw(role, st) {
    const group = dlg.querySelector('#cast-group')?.value
    const model = dlg.querySelector('#cast-model')?.value.trim()
    if (!model) throw new Error('先填画图模型（不知道就点「读取画图模型」）')
    saveGen({ group, model, moods: !!dlg.querySelector('#cast-moods')?.checked })
    const p = window.NiumaCast.prompt(role, st, { color: castColor(role) })
    const r = await host.request('POST', '/api/cast/generate', { group, model, prompt: p.en })
    if (!r.ok) throw new Error(r.error || '没画出来')
    return window.NiumaCast.clean(r.image, { removeBg: true })
  }

  // 衣服颜色跟这个岗位现在所在的项目组走
  function castColor(role) {
    const emp = host.employees?.().find((e) => e.skill === role || e.id === role)
    return emp?.color
  }

  async function castGenerate(roles) {
    const moods = !!dlg.querySelector('#cast-moods')?.checked
    const jobs = roles.flatMap((role) => (moods && roles.length > 1 ? ['idle', 'happy', 'error'] : ['idle']).map((st) => [role, st]))
    genStop = false
    const stop = dlg.querySelector('[data-act="cast-stop"]')
    if (stop) stop.hidden = jobs.length < 2
    let done = 0
    const failed = []
    for (const [role, st] of jobs) {
      if (genStop) break
      note(`正在画 ${done + 1}/${jobs.length}：${roleName(role)}（${window.NiumaCast.STATES.find(([x]) => x === st)[1]}）…一张大概要半分钟`, 'busy')
      try {
        setCast(role, st, await castDraw(role, st))
        done++
        render()
        preview()
      } catch (e) {
        failed.push(`${roleName(role)}：${e.message}`)
        if (jobs.length === 1 || /Key|余额|不能画图|模型/.test(e.message)) break
      }
    }
    if (stop) stop.hidden = true
    if (failed.length) note(`画好 ${done} 张，没画成：${failed.join('；')}`, 'bad')
    else note(genStop ? `停了，已经画好 ${done} 张。` : `画好了 ${done} 张！看着满意就点「保存」。`, 'ok')
  }

  function note(text, kind = '') {
    const el = dlg?.querySelector('[data-note]')
    if (el) {
      el.textContent = text
      el.className = `note ${kind}`
    }
  }

  // ---- 事件 ----------------------------------------------------------------------------

  function onInput(e) {
    const k = e.target.dataset.k
    if (!k || e.target.type === 'checkbox' || e.target.tagName === 'SELECT') return
    if (k === 'name' || k === 'author' || k === 'font') draft[k] = e.target.value
    else {
      const [scope, ...rest] = k.split('.')
      setPath(draft[scope], rest.join('.'), e.target.value)
      if (k === 'colors.accent' && !draft.dark) draft.colors.drop = hexToDrop(e.target.value)
    }
    dirty = true
    if (k !== 'name' && k !== 'author') preview()
  }

  const hexToDrop = (hex) => {
    const n = parseInt(toHex(hex).slice(1), 16)
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, 0.16)`
  }

  async function onChange(e) {
    const t = e.target
    const k = t.dataset.k
    if (t.dataset.img && t.files?.[0]) return loadImage(t.dataset.img, t.files[0])
    if (t.dataset.cast && t.files?.[0]) return castUpload(t.dataset.cast, t.files[0])
    if (t.dataset.act === 'import' && t.files?.[0]) return importFile(t.files[0])
    if (!k) return
    dirty = true
    if (k === 'base') {
      // 换底子：颜色和摆设都换成那一套的，名字和图片留着
      const keep = { name: draft.name, author: draft.author, font: draft.font, images: draft.images, cast: draft.cast }
      draft = { ...fullDraft({ base: t.value }), ...keep }
      render()
      return preview()
    }
    if (k === 'dark') draft.dark = t.checked
    else if (t.type === 'checkbox') draft.room[k.split('.')[1]] = t.checked
    else if (t.tagName === 'SELECT') {
      draft.room[k.split('.')[1]] = t.value
      if (k === 'room.window' && t.value === 'image' && !draft.images.window) note('再在下面「图片 → 窗外」选一张图片', 'muted')
    }
    preview()
  }

  function loadImage(key, file) {
    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) return note('只支持 png、jpg、gif、webp 图片', 'bad')
    if (file.size > MAX_IMAGE) return note('图片太大了，换一张 4MB 以内的', 'bad')
    const r = new FileReader()
    r.onload = () => {
      draft.images[key] = String(r.result)
      if (key === 'window') draft.room.window = 'image'
      dirty = true
      render()
      preview()
    }
    r.readAsDataURL(file)
  }

  function importFile(file) {
    const r = new FileReader()
    r.onload = () => {
      try {
        const skin = F.normalize(F.parse(String(r.result)), { id: file.name.replace(/\.json$/i, '') })
        editing = null
        draft = fullDraft(skin)
        dirty = true
        render()
        preview()
        note(skin.warnings.length ? `导入了「${skin.name}」，有几项用不了：${skin.warnings.join('；')}` : `导入了「${skin.name}」，看着满意就点「保存」。`, skin.warnings.length ? 'bad' : 'ok')
      } catch (err) {
        note(err.message, 'bad')
      }
    }
    r.readAsText(file)
  }

  async function onClick(e) {
    const b = e.target.closest('button[data-act]')
    if (!b) return
    const act = b.dataset.act
    if (act === 'close') return close()
    if (act === 'palette' || act === 'random') {
      const main = act === 'random' ? F.hsl(Math.random() * 360, 65 + Math.random() * 20, 55) : dlg.querySelector('#se-main').value
      const p = F.paletteFrom(main, draft.dark)
      draft.colors = { ...draft.colors, ...p.colors }
      if (draft.base !== 'pixel') draft.room = { ...draft.room, ...p.room }
      dirty = true
      render()
      preview()
      return note(act === 'random' ? '随机配了一套，不喜欢就再点一次🎲' : '配好了，还可以单独调每个颜色。', 'ok')
    }
    if (act === 'cast-clear') {
      const [role, st] = b.dataset.cast.split('.')
      setCast(role, st, '')
      render()
      return preview()
    }
    if (act === 'cast-copy') {
      const p = window.NiumaCast.prompt(b.dataset.role, 'idle', { color: castColor(b.dataset.role) })
      const text = `${p.zh}\n\n（英文版，给 Midjourney 之类用）${p.en}`
      try {
        await navigator.clipboard.writeText(text)
        return note(`复制好了「${roleName(b.dataset.role)}」的提示词，粘贴到 AI 绘图工具里就行。开心、出错的表情在提示词里把动作换成「双手举高欢呼」「慌张冒冷汗、双手抱头」。`, 'ok')
      } catch {
        return prompt('复制下面的提示词：', text)
      }
    }
    if (act === 'cast-models') {
      const group = dlg.querySelector('#cast-group')?.value
      note('正在读画图模型…', 'busy')
      const r = await host.request('POST', '/api/cast/models', { group })
      if (!r.ok) return note(r.error, 'bad')
      saveGen({ group, models: r.models })
      const model = dlg.querySelector('#cast-model')?.value
      render()
      if (model) dlg.querySelector('#cast-model').value = model
      return note(r.models.length ? `找到 ${r.models.length} 个画图模型：${r.models.slice(0, 8).join('、')}${r.models.length > 8 ? '…' : ''}，在「画图模型」里选一个。` : `这个接口的 ${r.total} 个模型里没认出画图模型，知道名字的话直接填。`, r.models.length ? 'ok' : 'bad')
    }
    if (act === 'cast-gen') return castGenerate([b.dataset.role])
    if (act === 'cast-gen-all') return castGenerate(window.NiumaCast.ROLES.map(([r]) => r))
    if (act === 'cast-stop') {
      genStop = true
      return note('画完这一张就停。', 'busy')
    }
    if (act === 'clear-img') {
      delete draft.images[b.dataset.img]
      if (b.dataset.img === 'window' && draft.room.window === 'image') draft.room.window = 'sky'
      dirty = true
      render()
      return preview()
    }
    if (act === 'save' || act === 'save-new') {
      const replace = act === 'save' && !!editing
      const raw = skinFromDraft()
      // 名字和别的皮肤重了就加个编号，免得皮肤栏里两个一样的
      const names = new Set(host.list().filter((s) => !(replace && s.id === editing)).map((s) => s.name))
      if (names.has(raw.name)) {
        let n = 2
        while (names.has(`${raw.name} ${n}`)) n++
        raw.name = `${raw.name} ${n}`
      }
      if (!replace) raw.id = F.toId(raw.name) || 'my-skin'
      note('正在保存…', 'busy')
      try {
        const r = await host.save(raw, { replace })
        if (!r.ok) return note(r.error || '没存上', 'bad')
        editing = r.skin.id
        draft = fullDraft(r.skin)
        dirty = false
        render()
        return note(`存好了！皮肤栏里点「${r.skin.name}」就能换上。存在：${r.where || ''}`, 'ok')
      } catch (err) {
        return note(err.message, 'bad')
      }
    }
    if (act === 'export') {
      const raw = skinFromDraft()
      // 服务器上的立绘打包进文件里，发给别人也能用
      try {
        for (const states of Object.values(raw.cast || {})) for (const [st, u] of Object.entries(states)) states[st] = await window.NiumaCast.toDataUrl(u)
      } catch (e) {
        return note(`打包立绘失败：${e.message}`, 'bad')
      }
      const skin = F.normalize(raw)
      const blob = new Blob([F.toFile(skin)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${skin.name}.json`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => (URL.revokeObjectURL(a.href), a.remove()), 1000)
      return note('导出好了。别人在「做皮肤」里点「导入文件」，或者放进 ~/.niuma/skins 文件夹就能用。', 'ok')
    }
    if (act === 'delete') {
      if (!confirm(`删掉皮肤「${draft.name}」？删了找不回来。`)) return
      const r = await host.remove(editing)
      if (!r.ok) return note(r.error || '没删掉', 'bad')
      dirty = false
      editing = null
      return close(true)
    }
    if (act === 'folder') {
      const r = await host.openFolder()
      if (!r?.ok) note(r?.error || '打不开文件夹', 'bad')
    }
  }

  // ---- 打开 / 关闭 ---------------------------------------------------------------------

  function open() {
    host = window.NiumaSkin
    if (!host) return
    ensure()
    const cur = host.current()
    editing = cur.builtin ? null : cur.id
    draft = fullDraft(cur.builtin ? { base: cur.base } : cur)
    if (cur.builtin) draft.name = ''
    dirty = false
    render()
    if (!dlg.open) dlg.show()
    document.documentElement.classList.add('editing-skin')
    dlg.querySelector(cur.builtin ? '[data-k="name"]' : '.se-head .ghost')?.focus()
  }

  function close(force) {
    if (!dlg?.open) return
    if (!force && dirty && !confirm('改的还没保存，不要了吗？')) return
    clearTimeout(timer)
    dlg.close()
    document.documentElement.classList.remove('editing-skin')
    dirty = false
    host.restore()
  }

  /** 皮肤列表刷新了（比如文件夹里多了一个）：编辑器开着就更新底部的提示 */
  function refresh() {
    if (dlg?.open && !dirty) render()
  }

  window.NiumaSkinEditor = { open, close, refresh, isOpen: () => !!dlg?.open }
})()
