import axios from 'axios';
import { SpecialRequest } from './types';

const TEST_LLM_ENDPOINT = '/test_llm';
const MESSAGE = 'Please craft a friendly Flemish haiku about secure traffic bots.';
const PROVIDERS = ['openai', 'anthropic', 'mistral'] as const;

type Provider = typeof PROVIDERS[number];

function pickRandomProvider(): Provider {
    const index = Math.floor(Math.random() * PROVIDERS.length);
    return PROVIDERS[index];
}

export const testLlmRequest: SpecialRequest = {
    name: 'Test LLM endpoint',
    description: 'POST /test_llm with random provider payload',
    async execute({ targetUrl, metrics, headers }) {
        const requestUrl = new URL(TEST_LLM_ENDPOINT, targetUrl).toString();
        const provider = pickRandomProvider();
        const payload = { message: MESSAGE, provider };

        metrics.incrementRequestCounter(requestUrl);

        try {
            const response = await axios.post(requestUrl, payload, {
                timeout: 15000,
                headers,
            });

            metrics.incrementResponseStatusCounter(requestUrl, response.status, true);
            console.log(`[special-request] LLM test succeeded for ${requestUrl} using provider "${provider}".`);
        } catch (error: unknown) {
            const status = axios.isAxiosError(error) && error.response ? error.response.status : 0;
            metrics.incrementResponseStatusCounter(requestUrl, status, false);
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[special-request] LLM test failed for ${requestUrl} using provider "${provider}":`, message);
        }
    }
};
