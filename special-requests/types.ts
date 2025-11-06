import type { MetricsService } from '../metrics';

export interface SpecialRequestContext {
    targetUrls: string[];
    metrics: MetricsService;
    targetUrl: string;
    headers: object,
}

export interface SpecialRequest {
    name: string;
    description: string;
    execute(context: SpecialRequestContext): Promise<void>;
}
