import { Counter, Registry } from 'prom-client';

export class MetricsService {
    private readonly registry: Registry;
    private readonly requestCounters: Map<string, Counter<string>>;
    private readonly responseStatusCounters: Map<string, Counter<string>>;

    constructor(targetUrls: string[]) {
        this.registry = new Registry();
        this.requestCounters = new Map();
        this.responseStatusCounters = new Map();

        // Create counters for each target URL
        targetUrls.forEach(url => {
            const urlKey = this.normalizeUrlForMetrics(url);
            
            // Request counter per URL
            const requestCounter = new Counter({
                name: `traffic_generator_requests_total_${urlKey}`,
                help: `Total number of requests made to ${url}`,
                labelNames: ['target_url'] as const,
                registers: [this.registry]
            });
            this.requestCounters.set(url, requestCounter);

            // Response status counter per URL
            const responseStatusCounter = new Counter({
                name: `traffic_generator_responses_${urlKey}`,
                help: `Response status codes for ${url}`,
                labelNames: ['target_url', 'status', 'success'] as const,
                registers: [this.registry]
            });
            this.responseStatusCounters.set(url, responseStatusCounter);
        });
    }

    private normalizeUrlForMetrics(url: string): string {
        // Remove protocol, replace non-alphanumeric chars with underscore
        return url
            .replace(/^https?:\/\//, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .toLowerCase();
    }

    public incrementRequestCounter(url: string): void {
        const counter = this.requestCounters.get(url);
        if (counter) {
            counter.inc({ target_url: url });
        }
    }

    public incrementResponseStatusCounter(url: string, status: number, success: boolean): void {
        const counter = this.responseStatusCounters.get(url);
        if (counter) {
            counter.inc({ 
                target_url: url, 
                status: status.toString(), 
                success: success.toString() 
            });
        }
    }

    public getMetrics(): Promise<string> {
        return this.registry.metrics();
    }

    public getContentType(): string {
        return this.registry.contentType;
    }
}
