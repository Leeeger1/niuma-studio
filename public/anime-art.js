/* 动漫画风的角色：正常头身比、分层的大眼睛（虹膜渐变、两处高光、睫毛）、一缕一缕的头发和天使环高光、
   西装外套 + 衬衫领带（女生领结）。和 Q 版（chibi.js）用同一套坐标、同一套表情和动作的类名，
   所以场景、表情切换、打字和欢呼动画都不用改。
   设计坐标：原点在腰部正中，向上为负；脸的中心约在 (0,-262)，下巴 -197，头顶头发 -346。 */
;(function () {
  'use strict'

  const C = window.NiumaChibi
  if (!C) return
  const shade = C.shade
  const INK = '#2a1f2e'
  let uid = 0

  const FEMALE = /long|bob|twintail|ponytail/
  const FEET = 172

  // ---- 头发 ----------------------------------------------------------------------------------
  // 刘海 = 头顶的发盖 + 一缕缕叠在上面的发束。每缕是一片弯弯的柳叶：[发根 x, 发梢 y, 宽, 发梢往哪边偏]
  const CAP = 'M-58,-266 C-64,-324 -32,-348 0,-348 C32,-348 64,-324 58,-266 C50,-292 28,-306 0,-306 C-28,-306 -50,-292 -58,-266Z'
  // 发束：fill 是闭合的一片，描边只描两条侧边（发根那头不描，免得横着一道线像帽檐）
  const strandSides = ([x, tip, w = 18, lean = 0]) => {
    const top = -322
    const mid = (top + tip) / 2
    return `M${x - w / 2},${top} C${x - w / 2 - 2},${mid} ${x + lean - 4},${tip - 10} ${x + lean},${tip} C${x + lean + 1},${tip - 12} ${x + w / 2 + 2},${mid} ${x + w / 2},${top}`
  }
  const strand = (t) => `${strandSides(t)}Z`
  const CROWN = 'M-58,-266 C-64,-324 -32,-348 0,-348 C32,-348 64,-324 58,-266'

  const HAIR = {
    long: {
      back: 'M-58,-262 C-66,-320 -34,-348 0,-348 C34,-348 66,-320 58,-262 C64,-200 74,-120 70,-46 Q40,-30 22,-44 L-22,-44 Q-40,-30 -70,-46 C-74,-120 -64,-200 -58,-262Z',
      strands: [[46, -268, 20, -2], [28, -270, 22, -4], [8, -266, 22, -3], [-12, -268, 22, -2], [-32, -270, 22, 2], [-48, -266, 18, 4]],
      side: 'M-57,-268 C-68,-232 -66,-186 -58,-140 Q-54,-176 -48,-206 C-44,-232 -46,-252 -50,-270Z',
    },
    bob: {
      back: 'M-58,-262 C-66,-320 -34,-348 0,-348 C34,-348 66,-320 58,-262 C64,-234 66,-206 58,-190 Q48,-180 40,-196 L-40,-196 Q-48,-180 -58,-190 C-66,-206 -64,-234 -58,-262Z',
      strands: [[46, -264, 20, -3], [27, -272, 22, -5], [7, -268, 22, -5], [-14, -272, 22, -4], [-33, -268, 22, -2], [-49, -264, 18, 3]],
      side: 'M-57,-268 C-66,-238 -64,-212 -56,-192 Q-52,-214 -47,-232 C-44,-248 -46,-258 -50,-270Z',
    },
    short: {
      back: 'M-58,-262 C-64,-322 -32,-346 0,-346 C32,-346 64,-322 58,-262 C60,-246 58,-232 52,-224 L-52,-224 C-58,-232 -60,-246 -58,-262Z',
      strands: [[46, -278, 20, 6], [27, -284, 22, 8], [6, -280, 22, 9], [-15, -286, 22, 8], [-35, -280, 20, 7], [-50, -276, 16, 4]],
      side: 'M-57,-268 C-62,-252 -60,-238 -55,-228 Q-52,-242 -48,-252 C-47,-260 -48,-266 -50,-270Z',
    },
    side: {
      back: 'M-58,-262 C-64,-322 -32,-346 0,-346 C32,-346 64,-322 58,-262 C62,-240 60,-222 54,-212 L-54,-212 C-60,-222 -62,-240 -58,-262Z',
      strands: [[44, -266, 22, -10], [24, -262, 24, -14], [2, -268, 24, -14], [-20, -278, 22, -12], [-40, -284, 20, -8]],
      side: 'M-57,-268 C-64,-246 -62,-226 -56,-212 Q-52,-232 -48,-246 C-46,-256 -47,-264 -50,-270Z',
    },
    spiky: {
      back: 'M-58,-262 L-76,-292 L-60,-302 C-66,-330 -50,-352 -30,-354 L-24,-378 L-4,-356 L14,-380 L28,-354 L54,-368 L54,-338 C66,-328 70,-310 64,-296 L80,-284 L58,-262 C60,-244 58,-230 52,-222 L-52,-222 C-58,-230 -60,-244 -58,-262Z',
      strands: [[46, -276, 20, 8], [26, -288, 22, 10], [6, -272, 20, 6], [-14, -290, 22, 8], [-34, -276, 20, 6], [-50, -282, 16, 2]],
      side: 'M-57,-268 C-62,-250 -60,-236 -54,-226 Q-52,-240 -48,-250 C-47,-260 -48,-266 -50,-270Z',
    },
    twintail: {
      back: 'M-58,-262 C-66,-320 -34,-348 0,-348 C34,-348 66,-320 58,-262 C62,-246 60,-230 52,-222 Q30,-236 0,-236 Q-30,-236 -52,-222 C-60,-230 -62,-246 -58,-262Z',
      strands: [[46, -264, 20, -3], [28, -270, 22, -4], [9, -264, 22, -2], [-10, -270, 22, 0], [-29, -264, 22, 3], [-47, -268, 18, 4]],
      side: 'M-57,-268 C-66,-236 -64,-206 -56,-182 Q-52,-206 -47,-228 C-44,-246 -46,-258 -50,-270Z',
      tails: 'M-54,-306 C-96,-318 -112,-262 -104,-196 C-98,-140 -110,-90 -96,-40 Q-86,-80 -80,-120 C-74,-170 -70,-236 -62,-282Z',
    },
    ponytail: {
      back: 'M-58,-262 C-64,-322 -32,-346 0,-346 C32,-346 64,-322 58,-262 C62,-246 60,-230 52,-222 Q30,-236 0,-236 Q-30,-236 -52,-222 C-60,-230 -62,-246 -58,-262Z',
      strands: [[45, -262, 20, -6], [26, -270, 22, -8], [5, -266, 22, -8], [-16, -272, 22, -6], [-36, -268, 20, -4], [-50, -262, 14, 0]],
      side: 'M-57,-268 C-66,-238 -62,-210 -54,-190 Q-50,-212 -46,-232 C-44,-248 -46,-260 -50,-270Z',
      tail: 'M40,-336 C92,-346 106,-282 98,-216 C92,-164 100,-118 84,-74 Q72,-116 66,-158 C58,-214 54,-282 40,-336Z',
    },
  }

  const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${-Number(x)},${y}`)

  function hairBack(L, ids) {
    const H = HAIR[L.style] || HAIR.bob
    const line = shade(L.hair, -0.55)
    let s = ''
    const lock = (d) => `<path d="${d}" fill="url(#${ids.hair})" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/>`
    if (H.tails) s += lock(H.tails) + lock(mirror(H.tails))
    if (H.tail) s += lock(H.tail)
    s += `<path d="${H.back}" fill="${shade(L.hair, -0.22)}" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/>`
    return s
  }

  function hairFront(L, ids) {
    const H = HAIR[L.style] || HAIR.bob
    const line = shade(L.hair, -0.55)
    const hi = shade(L.hair, 0.6)
    let s = `<path d="${H.side}" fill="url(#${ids.hair})" stroke="${line}" stroke-width="2.2" stroke-linejoin="round"/><path d="${mirror(H.side)}" fill="url(#${ids.hair})" stroke="${line}" stroke-width="2.2" stroke-linejoin="round"/>`
    s += `<path d="${CAP}" fill="url(#${ids.hair})"/>`
    // 发束从两边往中间叠，中间的压在最上面
    const order = [...H.strands].sort((a, b) => Math.abs(b[0]) - Math.abs(a[0]))
    // 发束只在头顶轮廓里面画，最外面两缕的发根才不会戳出头型
    s += `<clipPath id="${ids.eye}c"><path d="M-58,-266 C-64,-324 -32,-348 0,-348 C32,-348 64,-324 58,-266 L66,-180 L-66,-180Z"/></clipPath>`
    s += `<g clip-path="url(#${ids.eye}c)">${order.map((t) => `<path d="${strand(t)}" fill="url(#${ids.hair})"/><path d="${strandSides(t)}" fill="none" stroke="${line}" stroke-width="1.7" stroke-linejoin="round"/>`).join('')}</g>`
    s += `<path d="${CROWN}" fill="none" stroke="${line}" stroke-width="2.4"/>`
    // 每缕中间一道暗线，更有立体感
    s += `<g stroke="${shade(L.hair, -0.35)}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".6">${H.strands.map(([x, tip, , lean = 0]) => `<path d="M${x},-306 Q${x + lean * 0.3},${(tip - 306) / 2} ${x + lean * 0.7},${tip + 8}"/>`).join('')}</g>`
    // 天使环：头顶一圈断开的亮色高光
    s += `<g stroke="${hi}" stroke-width="2.8" fill="none" stroke-linecap="round" opacity=".6"><path d="M-40,-318 q7,-5 14,-4"/><path d="M-18,-326 q9,-3 17,-2"/><path d="M8,-326 q9,-1 16,3"/><path d="M32,-318 q6,2 10,6"/></g>`
    if (H.tails) {
      const tie = L.ribbon || '#ff6fa8'
      s += `<g fill="${tie}" stroke="${shade(tie, -0.4)}" stroke-width="1.6"><path d="M-62,-304 l-10,-8 l2,14Z M-62,-304 l-12,6 l12,6Z"/><path d="M62,-304 l10,-8 l-2,14Z M62,-304 l12,6 l-12,6Z"/></g>`
    }
    if (H.tail) s += `<circle cx="44" cy="-334" r="5" fill="${L.ribbon || '#ff6fa8'}" stroke="${shade(L.ribbon || '#ff6fa8', -0.4)}" stroke-width="1.4"/>`
    return s
  }

  // ---- 脸 ------------------------------------------------------------------------------------

  const FACE = 'M-50,-286 C-52,-252 -46,-228 -30,-212 C-18,-202 -8,-197 0,-196 C8,-197 18,-202 30,-212 C46,-228 52,-252 50,-286 C50,-314 28,-330 0,-330 C-28,-330 -50,-314 -50,-286Z'

  function face(L, ids) {
    const line = shade(L.skin, -0.38)
    let s = `<path d="M-50,-262 C-58,-266 -60,-248 -50,-242Z" fill="${L.skin}" stroke="${line}" stroke-width="1.6"/><path d="M50,-262 C58,-266 60,-248 50,-242Z" fill="${L.skin}" stroke="${line}" stroke-width="1.6"/>`
    s += `<path d="${FACE}" fill="url(#${ids.skin})" stroke="${line}" stroke-width="2"/>`
    // 刘海在额头上投的影子
    s += `<path d="M-50,-292 C-30,-278 30,-278 50,-292 L50,-282 C30,-268 -30,-268 -50,-282Z" fill="${shade(L.skin, -0.14)}" opacity=".55"/>`
    // 腮红
    s += `<ellipse cx="-31" cy="-229" rx="10" ry="4.6" fill="url(#${ids.blush})"/><ellipse cx="31" cy="-229" rx="10" ry="4.6" fill="url(#${ids.blush})"/>`
    s += `<g class="blush-lines" stroke="#ff6a8e" stroke-width="1.2" opacity=".6"><path d="M-37,-228 l3,-4 M-32,-228 l3,-4 M-27,-228 l3,-4"/><path d="M27,-228 l3,-4 M32,-228 l3,-4 M37,-228 l3,-4"/></g>`
    // 鼻子：一笔
    s += `<path d="M1.5,-238 q-1.6,3.2 -0.2,4" stroke="${shade(L.skin, -0.32)}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`
    // 出错挨电以后的黑灰（平时不显示）
    s += `<g class="soot" fill="#3a3436" opacity=".55"><ellipse cx="-26" cy="-238" rx="9" ry="5"/><ellipse cx="20" cy="-224" rx="7" ry="4"/><ellipse cx="6" cy="-300" rx="12" ry="4"/></g>`
    return s
  }

  /** 一只眼睛（外眼角朝 +x 方向画，左眼用镜像）。 */
  function eye(L, ids, side) {
    const lash = shade(L.hair, -0.7)
    const clip = `${ids.eye}${side < 0 ? 'l' : 'r'}`
    const white = 'M-14,2 Q-13,-9 0,-11 Q12,-11 15,-2 Q11,9 0,10 Q-10,10 -14,2Z'
    const k = FEMALE.test(L.style) || L.sailor ? 1.2 : 1.08
    return `<g transform="translate(${side * 23},-253) scale(${side * k},${k})">
      <clipPath id="${clip}"><path d="${white}"/></clipPath>
      <path d="${white}" fill="#fff" stroke="${shade(L.skin, -0.3)}" stroke-width=".8"/>
      <g clip-path="url(#${clip})">
        <ellipse cx="1" cy="0" rx="9.4" ry="11.6" fill="url(#${ids.iris})" stroke="${shade(L.eye, -0.6)}" stroke-width="1"/>
        <ellipse class="pupil" cx="1.2" cy="1" rx="4.4" ry="6" fill="${shade(L.eye, -0.72)}"/>
        <path d="M-6,6 Q1,11 8,5" stroke="${shade(L.eye, 0.65)}" stroke-width="1.6" fill="none" opacity=".85"/>
        <path d="M-14,-4 Q0,-12 16,-4 L16,-11 L-14,-11Z" fill="${shade(L.eye, -0.5)}" opacity=".35"/>
      </g>
      <ellipse cx="-3.2" cy="-5" rx="3.4" ry="4" fill="#fff"/>
      <circle cx="5.2" cy="4.6" r="1.6" fill="#fff" opacity=".95"/>
      <path d="M-15.5,1 Q-13,-11 1,-13.5 Q13,-13.5 17.5,-5 L22,-7.5 Q19,-1.5 15.5,0.2 Q11,-9.5 1,-10 Q-10,-9.5 -13.2,2Z" fill="${lash}"/>
      <path d="M15,-8 l6.5,-5 M16.5,-4.5 l6.5,-1.5" stroke="${lash}" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M6,9.5 Q12,8.6 15,3" stroke="${lash}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".8"/>
      <path d="M-10,-15.5 Q3,-19.5 15,-12.5" stroke="${shade(L.skin, -0.32)}" stroke-width="1" fill="none" opacity=".7"/>
    </g>`
  }

  function eyes(L, ids) {
    const brow = shade(L.hair, -0.45)
    const lash = shade(L.hair, -0.7)
    return `
    <g class="eyes-open">${eye(L, ids, -1)}${eye(L, ids, 1)}</g>
    <g class="eyes-happy" stroke="${lash}" stroke-width="3.2" fill="none" stroke-linecap="round"><path d="M-36,-251 Q-23,-264 -10,-251"/><path d="M10,-251 Q23,-264 36,-251"/></g>
    <g class="eyes-cross" stroke="${lash}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M-35,-262 L-14,-254 L-35,-246"/><path d="M35,-262 L14,-254 L35,-246"/></g>
    <g class="eyes-sleep" stroke="${lash}" stroke-width="2.8" fill="none" stroke-linecap="round"><path d="M-36,-254 Q-23,-246 -10,-254"/><path d="M10,-254 Q23,-246 36,-254"/></g>
`
  }

  // 眉毛画在头发上面、半透明：动漫里常见的「透过刘海看得到眉毛」
  function brows(L) {
    return `<g class="brows" stroke="${shade(L.hair, -0.45)}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".55"><path class="brow-l" d="M-36,-279 Q-24,-284 -11,-280"/><path class="brow-r" d="M11,-280 Q24,-284 36,-279"/></g>`
  }

  function mouth() {
    return `
    <path class="mouth-smile" d="M-6,-219 Q0,-215 6,-219" stroke="#a0465a" stroke-width="2.1" fill="none" stroke-linecap="round"/>
    <g class="mouth-open"><path d="M-8,-221 Q0,-207 8,-221Z" fill="#b8475c" stroke="#8e2f46" stroke-width="1.4" stroke-linejoin="round"/><path d="M-4,-213.5 Q0,-210 4,-213.5Z" fill="#ff8fa6"/></g>
    <ellipse class="mouth-o" cx="0" cy="-217" rx="3.2" ry="3.8" fill="#b8475c"/>
    <path class="mouth-wave" d="M-8,-218 q2,-3 4,0 t4,0 t4,0 t4,0" stroke="#8e3a52" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
  }

  // ---- 配饰：复用 Q 版的画法，缩放到这里的头上；眼镜单独画细框的 -------------------------

  function accessory(L) {
    if (L.acc === 'glasses') {
      return `<g fill="rgba(255,255,255,.14)" stroke="#3a3346" stroke-width="2"><rect x="-39" y="-266" width="30" height="22" rx="6"/><rect x="9" y="-266" width="30" height="22" rx="6"/><path d="M-9,-258 Q0,-262 9,-258" fill="none"/></g><path d="M-34,-262 l8,-2" stroke="#fff" stroke-width="1.6" opacity=".7"/>`
    }
    const chibi = C.accessorySvg?.(L) || ''
    return chibi ? `<g transform="translate(0,-262) scale(0.6) translate(0,200)">${chibi}</g>` : ''
  }

  function catEars(L) {
    const ears = C.catEarsSvg?.(L) || ''
    return ears ? `<g transform="translate(0,-262) scale(0.6) translate(0,200)">${ears}</g>` : ''
  }

  function bun(L) {
    if (L.acc !== 'bun') return ''
    const line = shade(L.hair, -0.55)
    return `<circle cx="0" cy="-352" r="20" fill="${L.hair}" stroke="${line}" stroke-width="2.2"/><path d="M-14,-338 Q0,-332 14,-338" stroke="${L.ribbon || '#ff6fa8'}" stroke-width="4" fill="none" stroke-linecap="round"/>`
  }

  // ---- 身体 ----------------------------------------------------------------------------------

  function defs(L, ids) {
    return `<defs>
      <linearGradient id="${ids.iris}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(L.eye, -0.55)}"/><stop offset=".45" stop-color="${L.eye}"/><stop offset="1" stop-color="${shade(L.eye, 0.6)}"/></linearGradient>
      <linearGradient id="${ids.hair}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(L.hair, 0.12)}"/><stop offset=".55" stop-color="${L.hair}"/><stop offset="1" stop-color="${shade(L.hair, -0.18)}"/></linearGradient>
      <radialGradient id="${ids.skin}" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="${shade(L.skin, 0.3)}"/><stop offset=".8" stop-color="${L.skin}"/><stop offset="1" stop-color="${shade(L.skin, -0.06)}"/></radialGradient>
      <radialGradient id="${ids.blush}"><stop offset="0" stop-color="#ff7f9e" stop-opacity=".55"/><stop offset="1" stop-color="#ff7f9e" stop-opacity="0"/></radialGradient>
      <linearGradient id="${ids.cloth}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(L.outfit, 0.08)}"/><stop offset=".6" stop-color="${L.outfit}"/><stop offset="1" stop-color="${shade(L.outfit, -0.22)}"/></linearGradient>
    </defs>`
  }

  function torso(L, ids) {
    const line = shade(L.outfit, -0.5)
    const skinLine = shade(L.skin, -0.38)
    // 脖子和下巴的影子
    let s = `<path d="M-13,-214 L-13,-176 L13,-176 L13,-214Z" fill="${L.skin}" stroke="${skinLine}" stroke-width="1.6"/><path d="M-13,-206 Q0,-194 13,-206 L13,-196 Q0,-186 -13,-196Z" fill="${shade(L.skin, -0.18)}" opacity=".6"/>`
    if (L.sailor) {
      s += `<path d="M-15,-184 L-58,-176 C-72,-171 -78,-158 -78,-138 L-74,4 L74,4 L78,-138 C78,-158 72,-171 58,-176 L15,-184Z" fill="url(#${ids.cloth})" stroke="${line}" stroke-width="2.2"/>`
      s += `<path d="M-15,-184 L-62,-174 L-56,-138 L0,-122 L56,-138 L62,-174 L15,-184 L0,-150Z" fill="${L.collar}" stroke="${shade(L.outfit, -0.35)}" stroke-width="1.8" stroke-linejoin="round"/>`
      s += `<path d="M-54,-146 L0,-130 L54,-146" stroke="${L.outfit}" stroke-width="3" fill="none"/>`
      s += `<path d="M0,-140 l-16,-9 l2,18Z M0,-140 l16,-9 l-2,18Z" fill="${L.ribbon}" stroke="${shade(L.ribbon, -0.35)}" stroke-width="1.2"/><path d="M-4,-138 l-6,26 l6,-6 l6,6 l-6,-26Z" fill="${L.ribbon}"/><circle cx="0" cy="-140" r="4" fill="${shade(L.ribbon, -0.2)}"/>`
      return s
    }
    const girl = FEMALE.test(L.style)
    // 外套
    s += `<path d="M-15,-184 L-54,-178 C-68,-174 -74,-162 -74,-144 L-62,4 L62,4 L74,-144 C74,-162 68,-174 54,-178 L15,-184Z" fill="url(#${ids.cloth})" stroke="${line}" stroke-width="2.2" stroke-linejoin="round"/>`
    // 衬衫 V 领
    s += `<path d="M-15,-184 L0,-136 L15,-184Z" fill="#fbfbff" stroke="${shade(L.outfit, -0.3)}" stroke-width="1.4"/>`
    s += `<path d="M-15,-184 L-5,-170 L-12,-162 Z M15,-184 L5,-170 L12,-162Z" fill="#ffffff" stroke="#c9c6d6" stroke-width="1.2" stroke-linejoin="round"/>`
    // 翻领
    s += `<path d="M-15,-184 L-30,-150 L-18,-142 L0,-112 L-6,-148Z" fill="${shade(L.outfit, -0.12)}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>`
    s += `<path d="M15,-184 L30,-150 L18,-142 L0,-112 L6,-148Z" fill="${shade(L.outfit, -0.2)}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>`
    if (girl) {
      s += `<path d="M0,-170 l-12,-7 l1,13Z M0,-170 l12,-7 l-1,13Z" fill="${L.ribbon}" stroke="${shade(L.ribbon, -0.35)}" stroke-width="1.1"/><circle cx="0" cy="-170" r="3" fill="${shade(L.ribbon, -0.2)}"/>`
    } else {
      s += `<path d="M-4,-176 L4,-176 L6,-150 L0,-130 L-6,-150Z" fill="${L.ribbon}" stroke="${shade(L.ribbon, -0.35)}" stroke-width="1.1" stroke-linejoin="round"/><path d="M-4,-176 L4,-176 L3,-170 L-3,-170Z" fill="${shade(L.ribbon, -0.2)}"/>`
    }
    // 衣褶和纽扣
    s += `<g stroke="${line}" stroke-width="1.2" fill="none" opacity=".45"><path d="M-62,-120 Q-58,-90 -60,-60"/><path d="M62,-120 Q58,-90 60,-60"/></g>`
    s += `<circle cx="0" cy="-96" r="2.4" fill="${shade(L.outfit, -0.45)}"/><circle cx="0" cy="-74" r="2.4" fill="${shade(L.outfit, -0.45)}"/>`
    // 胸牌（工牌），颜色跟项目组走
    s += `<rect x="30" y="-140" width="16" height="11" rx="2" fill="#fff" stroke="${line}" stroke-width="1"/><rect x="32" y="-138" width="12" height="2.4" fill="${L.outfit}"/>`
    return s
  }

  const sleeve = (L, d, ids) =>
    `<path d="${d}" stroke="${shade(L.outfit, -0.5)}" stroke-width="21" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${shade(L.outfit, -0.08)}" stroke-width="17" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  const hand = (L, x, y, cls = '') =>
    `<g class="${cls}"><ellipse cx="${x}" cy="${y}" rx="9.5" ry="8.5" fill="${L.skin}" stroke="${shade(L.skin, -0.38)}" stroke-width="1.6"/><path d="M${x - 9},${y - 5} h18" stroke="#fbfbff" stroke-width="3" opacity=".9"/></g>`

  /** 头的前半部分；后面的头发（长发会垂到肩膀后面）要单独画在身体后面 */
  function headFront(L, ids) {
    let s = bun(L)
    if (L.catEars) s += catEars(L)
    return s + face(L, ids) + eyes(L, ids) + mouth() + hairFront(L, ids) + brows(L) + accessory(L)
  }

  const newIds = () => {
    const n = ++uid
    return { iris: `ai${n}`, skin: `as${n}`, hair: `ah${n}`, blush: `ab${n}`, cloth: `ac${n}`, eye: `ae${n}` }
  }

  function seated(L) {
    const ids = newIds()
    const main = `<g class="art-anime">${defs(L, ids)}
      <g class="head">${hairBack(L, ids)}</g>
      <g class="arms-rest"><g class="arm-rest-l">${sleeve(L, 'M-64,-166 C-82,-130 -86,-94 -74,-66 C-66,-50 -56,-40 -46,-32', ids)}</g><g class="arm-rest-r">${sleeve(L, 'M64,-166 C82,-130 86,-94 74,-66 C66,-50 56,-40 46,-32', ids)}</g></g>
      <g class="body">${torso(L, ids)}</g>
      <g class="head">${headFront(L, ids)}</g>
      <g class="arm-think">${sleeve(L, 'M66,-166 C94,-118 72,-150 30,-198', ids)}${hand(L, 26, -204)}</g>
      <g class="arms-cheer">${sleeve(L, 'M-66,-166 C-94,-200 -102,-250 -98,-292', ids)}${hand(L, -98, -300)}${sleeve(L, 'M66,-166 C94,-200 102,-250 98,-292', ids)}${hand(L, 98, -300)}</g>
    </g>`
    const hands = `<g class="hands art-anime">${hand(L, -44, -26, 'hand-l')}${hand(L, 44, -26, 'hand-r')}</g>`
    return { main, hands }
  }

  function standing(L) {
    const ids = newIds()
    const girl = L.sailor || FEMALE.test(L.style)
    const pants = '#343a58'
    const skirt = girl
      ? `<path d="M-74,0 L-90,62 Q0,78 90,62 L74,0Z" fill="${L.sailor ? shade(L.outfit, -0.1) : '#3a3f5e'}" stroke="${shade(L.sailor ? L.outfit : '#3a3f5e', -0.45)}" stroke-width="2"/><g stroke="${shade(L.sailor ? L.outfit : '#3a3f5e', -0.4)}" stroke-width="1.2" opacity=".6"><path d="M-40,8 L-48,64"/><path d="M0,8 L0,68"/><path d="M40,8 L48,64"/></g>`
      : ''
    const leg = (x, cls) =>
      girl
        ? `<g class="${cls}"><path d="M${x - 11},40 L${x - 9},160 L${x + 9},160 L${x + 11},40Z" fill="${shade(L.skin, -0.04)}" stroke="${shade(L.skin, -0.38)}" stroke-width="1.6"/><path d="M${x - 10},126 L${x + 10},126 L${x + 9},160 L${x - 9},160Z" fill="#f4f4fa" stroke="#b9b6c8" stroke-width="1.2"/><path d="M${x - 12},158 h28 q4,0 4,8 h-36 Z" fill="#2e2a3a"/></g>`
        : `<g class="${cls}"><path d="M${x - 15},0 L${x - 12},162 L${x + 12},162 L${x + 15},0Z" fill="${pants}" stroke="${shade(pants, -0.4)}" stroke-width="1.8"/><path d="M${x - 14},160 h30 q5,0 5,9 h-39 Z" fill="#221e2c"/></g>`
    const legs = `<g class="legs">${leg(-22, 'leg-l')}${leg(22, 'leg-r')}</g>`
    const tail = L.catEars ? `<path class="cat-tail" d="M50,30 C110,20 128,-40 102,-80" stroke="${L.hair}" stroke-width="9" fill="none" stroke-linecap="round"/>` : ''
    return `<g class="art-anime">${defs(L, ids)}${tail}<g class="head">${hairBack(L, ids)}</g>${legs}${skirt}
      <g class="arm-swing-l">${sleeve(L, 'M-68,-166 C-82,-120 -86,-70 -84,-20', ids)}${hand(L, -84, -12)}</g>
      <g class="arm-swing-r">${sleeve(L, 'M68,-166 C82,-120 86,-70 84,-20', ids)}${hand(L, 84, -12)}</g>
      <g class="body">${torso(L, ids)}</g>
      <g class="head">${headFront(L, ids)}</g>
      <g class="paper"><rect x="74" y="-58" width="34" height="44" rx="3" fill="#fff" stroke="#b9b3c6" stroke-width="1.6"/><path d="M80,-48 h22 M80,-40 h22 M80,-32 h14" stroke="#c9c3d6" stroke-width="2.4"/></g>
      ${C.baton(84, -12, 0.9)}
    </g>`
  }

  function portrait(L, bg = '#fff4f9') {
    const ids = newIds()
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-86 -356 172 172"><style>${C.EXPRESSION_DEFAULTS}.soot{display:none}</style><rect x="-86" y="-356" width="172" height="172" fill="${bg}"/>${defs(L, ids)}${hairBack(L, ids)}<g>${torso(L, ids)}</g>${headFront(L, ids)}</svg>`
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
  }

  C.registerArt('anime', { seated, standing, portrait, feet: FEET })
})()
