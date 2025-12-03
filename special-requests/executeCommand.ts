import axios from 'axios';
import { SpecialRequest } from './types';

const COMMAND_PAYLOAD = { userCommand: 'ls' };
const EXECUTE_ENDPOINT = '/api/execute';

export const executeCommandRequest: SpecialRequest = {
    name: 'Execute command payload',
    description: 'POST /api/execute with userCommand=ls',
    async execute({ targetUrl, metrics, headers }) {
        const requestUrl = new URL(EXECUTE_ENDPOINT, targetUrl).toString();

        metrics.incrementRequestCounter(requestUrl);

        try {
            const response = await axios.post(requestUrl, COMMAND_PAYLOAD, {
                timeout: 15000,
                headers,
            });

            metrics.incrementResponseStatusCounter(requestUrl, response.status);
            console.log(`[special-request] Successfully executed command request against ${requestUrl}`);
        } catch (error: unknown) {
            const status = axios.isAxiosError(error) && error.response ? error.response.status : 0;
            metrics.incrementResponseStatusCounter(requestUrl, status);
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[special-request] Command request failed for ${requestUrl}:`, message);
        }
    }
};
