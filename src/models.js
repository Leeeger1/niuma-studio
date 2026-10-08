// What 傻妞 knows about models: how strong, how pricey, what they are good at.
// Matched against a worker's model name (or its CLI type when no model is set).
// Any of tier / cost / strengths can be overridden per worker in the config.

export const TIER_ZH = { strong: '强', balanced: '中', fast: '快' }
export const COST_ZH = { high: '贵', medium: '适中', low: '便宜' }

const PROFILES = [
  { match: /fable|mythos/i, tier: 'strong', cost: 'high', strengths: '最强的推理和长程任务，适合最难的架构和疑难问题' },
  { match: /opus/i, tier: 'strong', cost: 'high', strengths: '深度推理和长程编码，适合架构设计、复杂重构、疑难 bug、关键审查' },
  { match: /sonnet/i, tier: 'strong', cost: 'medium', strengths: '编码能力强、速度和成本均衡，适合大多数开发任务和代码审查' },
  { match: /haiku/i, tier: 'fast', cost: 'low', strengths: '又快又便宜，适合小改动、文档、简单脚本和格式整理' },
  { match: /deepseek.*(pro|reason|r1)/i, tier: 'strong', cost: 'low', strengths: '深度推理、复杂编码和算法，性价比很高' },
  { match: /deepseek/i, tier: 'balanced', cost: 'low', strengths: '又快又便宜的通用编码，中文好，适合常规功能、脚本、文档' },
  { match: /qwen.*max/i, tier: 'strong', cost: 'medium', strengths: '通义旗舰，推理和中文都强，适合复杂任务' },
  { match: /qwen.*coder/i, tier: 'balanced', cost: 'low', strengths: '专注代码生成和补全，适合写功能、写测试' },
  { match: /qwen/i, tier: 'balanced', cost: 'low', strengths: '中文理解好，通用任务和文档' },
  { match: /kimi-?k3/i, tier: 'strong', cost: 'medium', strengths: 'Kimi 旗舰，超长上下文，适合通读大仓库和复杂编码' },
  { match: /kimi|moonshot/i, tier: 'balanced', cost: 'low', strengths: '超长上下文，适合阅读大量代码和文档、整理总结' },
  { match: /glm-?5/i, tier: 'strong', cost: 'low', strengths: '智谱旗舰，编码和工具调用强，中文好' },
  { match: /glm|zhipu/i, tier: 'balanced', cost: 'low', strengths: '中文好，通用编码和工具调用' },
  { match: /gemini.*(flash|lite)/i, tier: 'fast', cost: 'low', strengths: '速度快、上下文长，适合批量的小任务' },
  { match: /gemini/i, tier: 'strong', cost: 'medium', strengths: '超长上下文，适合通读大仓库、跨文件分析' },
  { match: /codex/i, tier: 'strong', cost: 'medium', strengths: '实现目标明确的功能、写测试、跑命令定位报错' },
  { match: /(gpt|o\d).*(mini|nano)/i, tier: 'fast', cost: 'low', strengths: '便宜快速，适合简单改动和文档' },
  { match: /gpt-5|gpt5|\bo3\b|\bo4\b/i, tier: 'strong', cost: 'medium', strengths: '推理和编码都强，适合复杂功能和排错' },
  { match: /(^|[^\w])o1(\b|-)/i, tier: 'strong', cost: 'high', strengths: '老一代推理模型，慢但想得深' },
  { match: /gpt-?4\.1|gpt-?4o|chatgpt|gpt-?4/i, tier: 'balanced', cost: 'medium', strengths: '上一代 GPT，通用编码和对话都稳' },
  { match: /grok.*(mini|fast)/i, tier: 'fast', cost: 'low', strengths: 'Grok 的快速版，适合简单任务' },
  { match: /grok/i, tier: 'strong', cost: 'medium', strengths: 'xAI 的 Grok，推理和编码都不错' },
  { match: /doubao.*(pro|thinking)|seed.*(pro|thinking)/i, tier: 'strong', cost: 'low', strengths: '字节豆包旗舰，中文好、价格低' },
  { match: /doubao|seed-?\d/i, tier: 'balanced', cost: 'low', strengths: '字节豆包，中文好、便宜' },
  { match: /minimax|abab/i, tier: 'balanced', cost: 'low', strengths: 'MiniMax，长上下文，便宜' },
  { match: /ernie|wenxin/i, tier: 'balanced', cost: 'low', strengths: '百度文心，中文好' },
  { match: /hunyuan/i, tier: 'balanced', cost: 'low', strengths: '腾讯混元，中文好' },
  { match: /llama|mistral|mixtral|codestral|devstral/i, tier: 'balanced', cost: 'low', strengths: '开源模型，便宜，适合常规任务' },
  { match: /mini|nano|flash|lite|turbo|small/i, tier: 'fast', cost: 'low', strengths: '便宜快速，适合简单任务' },
]

const TYPE_DEFAULTS = {
  'claude-cli': { tier: 'strong', cost: 'medium', strengths: 'Claude Code：理解模糊需求、架构设计、跨文件改动和重构、前端界面、代码审查' },
  'codex-cli': { tier: 'strong', cost: 'medium', strengths: 'Codex：快速实现明确的功能、写脚本和测试、跑命令定位报错、算法' },
  'openai-api': { tier: 'balanced', cost: 'low', strengths: '通用编码' },
}

export function modelProfile(worker) {
  const found = worker.model ? PROFILES.find((p) => p.match.test(worker.model)) : null
  const base = found || TYPE_DEFAULTS[worker.type] || TYPE_DEFAULTS['openai-api']
  return {
    tier: worker.tier || base.tier,
    cost: worker.cost || base.cost,
    strengths: worker.strengths || base.strengths,
  }
}

// ---- 中转站：一个地址后面有很多模型 ----------------------------------------------

/** 模型家族：中转站读到的模型按家族分组，每家可以单独成一个项目组 */
export const FAMILIES = [
  ['claude', 'Claude', /claude|opus|sonnet|haiku|fable/i],
  ['gpt', 'GPT', /gpt|chatgpt|codex|(^|[^\w])o[1345](\b|-)/i],
  ['deepseek', 'DeepSeek', /deepseek/i],
  ['gemini', 'Gemini', /gemini|gemma/i],
  ['qwen', '通义千问', /qwen|qwq/i],
  ['kimi', 'Kimi', /kimi|moonshot/i],
  ['glm', '智谱 GLM', /glm|zhipu/i],
  ['grok', 'Grok', /grok/i],
  ['doubao', '豆包', /doubao|seed-?\d/i],
  ['minimax', 'MiniMax', /minimax|abab/i],
  ['llama', 'Llama', /llama/i],
  ['mistral', 'Mistral', /mistral|mixtral|codestral|devstral/i],
  ['ernie', '文心', /ernie|wenxin/i],
  ['hunyuan', '混元', /hunyuan/i],
]

export function familyOf(model) {
  const f = FAMILIES.find(([, , re]) => re.test(model))
  return f ? { id: f[0], name: f[1] } : { id: 'other', name: '其他' }
}

/** 画图、语音、向量这些不能聊天写代码的模型，接入时跳过 */
export function isChatModel(model) {
  return !/embed|tts|whisper|dall-?e|image|imagen|moderation|rerank|audio|realtime|transcri|speech|sora|midjourney|\bmj[-_]|flux|stable-?diffusion|sdxl|suno|kling|video|veo|ocr/i.test(model)
}

// 同一档里挑版本新的：名字里的数字一段段比（4-5 比 4.1 新），日期那种大数字不算
function versionKey(model) {
  return (String(model).match(/\d+/g) || []).map(Number).filter((n) => n < 1000)
}
/** a 比 b 新就返回正数；一样新的话名字短的优先（少带 preview、日期之类的尾巴） */
function newer(a, b) {
  const x = versionKey(a)
  const y = versionKey(b)
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0)
  return b.length - a.length
}

/** 从一串模型里按难度挑：难活挑最强的（不看价钱），杂活挑最便宜最快的，中档两头兼顾 */
export function suggestModels(models) {
  const list = [...new Set(models.filter(Boolean))].map((m) => {
    const p = modelProfile({ model: m, type: 'openai-api' })
    return { m, p, tier: TIER_RANK[p.tier] || 2, cost: COST_RANK[p.cost] || 2 }
  })
  const best = (cmp) => [...list].sort(cmp)[0]?.m || ''
  return {
    hard: best((a, b) => b.tier - a.tier || b.cost - a.cost || newer(b.m, a.m)),
    medium: best((a, b) => fitScore(b.p, 'medium') - fitScore(a.p, 'medium') || newer(b.m, a.m)),
    easy: best((a, b) => fitScore(b.p, 'easy') - fitScore(a.p, 'easy') || a.tier - b.tier || newer(b.m, a.m)),
  }
}

const TIER_RANK = { fast: 1, balanced: 2, strong: 3 }
const COST_RANK = { low: 1, medium: 2, high: 3 }

/** 只看能力不看价钱：同一档里贵的一般更强（Opus 比 Sonnet 强）。借调难的岗位、挑难活模型用。 */
export function power(profile) {
  return (TIER_RANK[profile.tier] || 2) * 10 + (COST_RANK[profile.cost] || 2)
}

/** How well a worker fits a task of the given difficulty (higher is better). */
export function fitScore(profile, difficulty) {
  const tier = TIER_RANK[profile.tier] || 2
  const cost = COST_RANK[profile.cost] || 2
  if (difficulty === 'hard') return tier * 10 - cost
  if (difficulty === 'easy') return (4 - cost) * 10 + (tier === 1 ? 3 : 0)
  return (tier >= 2 ? 20 : 8) + (4 - cost) * 3 + tier
}
