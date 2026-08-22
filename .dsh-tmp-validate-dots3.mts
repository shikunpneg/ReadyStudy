// Offline validation: resolve the dots3-note-prev profile exactly as DSH would.
import { resolveProfiles } from '../dsh-local/deepseek-harness/packages/llm/llm-pi-ai/src/config.ts'

const profiles = resolveProfiles({
  'dots3-note-prev': {
    displayName: 'dots3-note-prev',
    apiKeyEnv: 'DOTS3_NOTE_PREV_API_KEY',
    api: 'openai-completions',
    baseURL: 'https://note3-prev-api.askdiandian.com/v1',
    compat: { thinkingFormat: 'deepseek' },
    models: [
      {
        id: 'dots3-note-prev',
        name: 'dots3-note-prev',
        reasoningEfforts: { off: null, high: 'high' },
      },
    ],
  },
})

const p = profiles.get('dots3-note-prev')
if (p === undefined) throw new Error('profile missing after resolve')
console.log('RESOLVED OK')
console.log(JSON.stringify(p.models.map(m => ({ id: m.id, reasoning: m.reasoning, thinkingLevelMap: m.thinkingLevelMap, compat: m.compat, baseUrl: m.baseUrl })), null, 2))
