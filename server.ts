import http from 'http';
import { MetricsService } from './metrics';

export class MetricsServer {
    private server: http.Server;
    private metricsService: MetricsService;
    private port: number;

    constructor(metricsService: MetricsService, port: number = 9090) {
        this.metricsService = metricsService;
        this.port = port;
        this.server = http.createServer(this.handleRequest.bind(this));
    }

    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        if (req.url === '/metrics') {
            const metrics = await this.metricsService.getMetrics();
            res.statusCode = 200;
            res.setHeader('Content-Type', this.metricsService.getContentType());
            res.end(metrics);
        } else {
            res.statusCode = 404;
            res.end('Not Found');
        }
    }

    public start(): void {
        this.server.listen(this.port, () => {
            console.log(`Metrics server listening on port ${this.port}`);
        });
    }

    public stop(): void {
        this.server.close();
    }
}
