import { Counter, Histogram, Registry, Summary } from 'prom-client';

function normalizeUrlForMetrics(url: string): string {
    // Favor a short, stable service key: strip protocol, port, domains, and the zen-demo prefix
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.split('.')[0];
        return hostname
            .replace(/^zen-demo-/, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '')
            .toLowerCase();
    } catch {
        return url
            .replace(/^https?:\/\//, '')
            .split('/')[0]
            .split(':')[0]
            .replace(/^zen-demo-/, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '')
            .toLowerCase();
    }
}

class MetricsService {
    private readonly registry: Registry;
    private readonly requestCounter: Counter<string>;
    private readonly responseStatusCounter: Counter<string>;
    private readonly requestDurationSummary: Summary<string>;
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
            labelNames: ['target_url', 'url_key', 'status'] as const,
            registers: [this.registry]
        });

        this.requestDurationSummary = new Summary({
            name: 'traffic_generator_request_duration_quantiles_milliseconds',
            help: 'Request duration quantiles per target URL in milliseconds',
            labelNames: ['target_url', 'url_key'] as const,
            percentiles: [0.5, 0.9, 0.95, 0.99],
            maxAgeSeconds: 300,
            ageBuckets: 5,
            registers: [this.registry]
        });
    }

    public incrementRequestCounter(url: string): void {
        this.requestCounter.inc({
            target_url: url,
            url_key: normalizeUrlForMetrics(url)
        });
    }

    public incrementResponseStatusCounter(url: string, status: number): void {
        this.responseStatusCounter.inc({
            target_url: url,
            url_key: normalizeUrlForMetrics(url),
            status: status.toString(),
        });
    }

    public observeRequestDuration(url: string, durationMs: number): void {
        this.requestDurationSummary.observe({
            target_url: url,
            url_key: normalizeUrlForMetrics(url)
        }, durationMs);
    }

    public getMetrics(): Promise<string> {
        return this.registry.metrics();
    }

    public getContentType(): string {
        return this.registry.contentType;
    }
}

export { MetricsService, normalizeUrlForMetrics };
