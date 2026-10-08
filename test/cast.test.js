import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startFakeOpenAI } from '../fake/openai-server.mjs'
import { generateImage, isImageModel, listImageModels } from '../src/cast.js'
import { OpenAIWorker } from '../src/workers/openai.js'

process.env.NIUMA_FAKE_SPEED = '0.01'

test('image models are told apart from chat models', () => {
  for (const m of ['gpt-image-1', 'dall-e-3', 'flux-1.1-pro', 'doubao-seedream-4-0', 'cogview-4', 'stable-diffusion-3.5', 'imagen-4', 'qwen-image']) assert.ok(isImageModel(m), m)
  for (const m of ['gpt-5', 'claude-sonnet-4-5', 'deepseek-v4-pro', 'gemini-2.5-pro']) assert.ok(!isImageModel(m), m)
})

test('drawing a portrait through a relay group', async (t) => {
  const api = await startFakeOpenAI(0, { models: ['gpt-5', 'gpt-image-1', 'dall-e-3', 'text-embedding-3-small'] })
  t.after(() => api.close())
  const g = new OpenAIWorker({ id: 'relay', type: 'openai-api', baseUrl: api.url, apiKey: 'k', model: 'gpt-5' }, { workdir: '.', logDir: '.' })
  const list = await listImageModels(g)
  assert.deepEqual(list.models, ['gpt-image-1', 'dall-e-3'])
  const r = await generateImage(g, { model: 'gpt-image-1', prompt: '1girl, anime style' })
  assert.equal(r.ok, true, r.error)
  assert.match(r.image, /^data:image\/png;base64,iVBOR/)
  assert.match((await generateImage(g, { model: '', prompt: 'x' })).error, /画图模型/)
  const down = new OpenAIWorker({ id: 'x', type: 'openai-api', baseUrl: 'http://127.0.0.1:9/v1', apiKey: 'k', model: 'm' }, { workdir: '.', logDir: '.' })
  assert.match((await generateImage(down, { model: 'gpt-image-1', prompt: 'x' })).error, /连不上/)
})
