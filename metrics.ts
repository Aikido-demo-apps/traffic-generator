import { Counter, Registry } from 'prom-client';

export class MetricsService {
    private readonly registry: Registry;
    private readonly requestCounter: Counter<string>;
    private readonly responseStatusCounter: Counter<string>;
    private readonly targetUrls: string[];

    constructor(targetUrls: string[]) {
        this.registry = new Registry();
        this.targetUrls = targetUrls;

        // Create a single request counter with URL as a label
        this.requestCounter = new Counter({
            name: 'traffic_generator_requests_total',
            help: 'Total number of requests made to target URLs',
            labelNames: ['target_url', 'url_key'] as const,
            registers: [this.registry]
        });

        // Create a single response status counter with URL as a label
        this.responseStatusCounter = new Counter({
            name: 'traffic_generator_responses',
            help: 'Response status codes for target URLs',
            labelNames: ['target_url', 'url_key', 'status', 'success'] as const,
            registers: [this.registry]
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
        this.requestCounter.inc({
            target_url: url,
            url_key: this.normalizeUrlForMetrics(url)
        });
    }

    public incrementResponseStatusCounter(url: string, status: number, success: boolean): void {
        this.responseStatusCounter.inc({
            target_url: url,
            url_key: this.normalizeUrlForMetrics(url),
            status: status.toString(),
            success: success.toString()
        });
    }

    public getMetrics(): Promise<string> {
        return this.registry.metrics();
    }

    public getContentType(): string {
        return this.registry.contentType;
    }
}
