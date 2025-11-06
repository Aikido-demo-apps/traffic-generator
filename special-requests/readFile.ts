import axios from 'axios';
import { SpecialRequest } from './types';

const READ_ENDPOINT = '/api/read';
const SECRET_FILE_PATH = '../secrets/key.txt';

export const readFileRequest: SpecialRequest = {
    name: 'Read secrets file',
    description: 'GET /api/read?path=../secrets/key.txt',
    async execute({ targetUrl, metrics, headers }) {
        const requestUrl = new URL(READ_ENDPOINT, targetUrl);
        requestUrl.searchParams.set('path', SECRET_FILE_PATH);

        metrics.incrementRequestCounter(requestUrl.toString());

        try {
            const response = await axios.get(requestUrl.toString(), {
                timeout: 15000,
                headers,
            });

            metrics.incrementResponseStatusCounter(requestUrl.toString(), response.status, true);
            console.log(`[special-request] Successfully read secrets file from ${requestUrl.toString()}`);
        } catch (error: unknown) {
            const status = axios.isAxiosError(error) && error.response ? error.response.status : 0;
            metrics.incrementResponseStatusCounter(requestUrl.toString(), status, false);
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[special-request] Read file request failed for ${requestUrl.toString()}:`, message);
        }
    }
};
