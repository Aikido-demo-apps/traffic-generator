import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { MetricsService } from './metrics';
import { MetricsServer } from './server';
import { specialRequests as configuredSpecialRequests, SpecialRequest, SpecialRequestContext } from './special-requests';

interface UserAgent {
    pattern: string;
    category: number;
}

interface IPEntry {
    ip: string;
    region: string;
    useCount: number;
    lastUsed: Date | null;
}

interface SimulatedUser {
    id: number;
    name: string;
    ipAddresses: string[];
}

interface TrafficPoolConfig {
    ipPool: string[];
    users: SimulatedUser[];
}

class TrafficGenerator {
    private readonly TRAFFIC_POOL_CONFIG_PATH = 'config/simulated-users.json';
    private readonly ipPool: IPEntry[] = [];
    private readonly MIN_IPS_PER_USER = 2;
    private readonly MAX_IPS_PER_USER = 3;
    private readonly userPool: SimulatedUser[] = [];
    private readonly BASE_REQUESTS_PER_MINUTE = 100;
    private readonly MAX_MULTIPLIER = 3; // Peak traffic will be 3x the base
    private readonly MIN_MULTIPLIER = 0.2; // Minimum traffic will be 20% of the base
    private readonly OUTBOUND_REQUEST_PROBABILITY = 0.1;
    private requestInterval: NodeJS.Timeout | null = null;
    private metricsService: MetricsService;
    private readonly specialRequests: SpecialRequest[];
    private readonly specialRequestBaseContext: Pick<SpecialRequestContext, 'targetUrls' | 'metrics'>;
    private specialRequestTimer: NodeJS.Timeout | null = null;

    // Outbound endpoints that accept POST /api/request with a { url } payload
    private readonly OUTBOUND_URLS: string[] = [
        "https://www.aikido.dev",
        "https://aikido.help/changelog.xml",
        "https://portal.attack-me.com",
    ];

    private readonly TARGET_URLS = [
        'http://zen-demo-nodejs.internal:3000/',
        'http://zen-demo-nodejs-esm.internal:3000/',
        'http://zen-demo-dotnet.internal:8080/',
        'http://zen-demo-python.internal:8080/',
        'http://zen-demo-java.internal:8080/',
        'http://zen-demo-php.internal:8080/',
        'http://zen-demo-frankenphp.internal:8080/',
        'http://zen-demo-frankenphp-worker.internal:8080/',
        'http://zen-demo-ruby.internal:3000/',
        'http://zen-demo-go.internal:3000/',
        'http://zen-demo-nodejs-danger.internal:3000/',
        'http://zen-demo-dotnet-danger.internal:8080/',
        'http://zen-demo-python-danger.internal:8080/',
        'http://zen-demo-java-danger.internal:8080/',
        'http://zen-demo-php-danger.internal:8080/',
        'http://zen-demo-frankenphp-danger.internal:8080/',
        'http://zen-demo-frankenphp-worker-danger.internal:8080/',
        'http://zen-demo-ruby-danger.internal:3000/',
        'http://zen-demo-go-danger.internal:3000/',
    ];

    private readonly IP_RANGES = {
        NA: ['64.', '98.', '208.', '66.'],
        EU: ['81.', '82.', '85.', '86.', '87.'],
        AS: ['101.', '103.', '106.', '111.', '112.'],
        SA: ['177.', '179.', '181.', '186.', '187.'],
        AF: ['41.', '102.', '105.', '154.', '196.'],
        OC: ['1.', '27.', '58.', '203.']
    };

    private readonly USER_AGENTS: UserAgent[] = [
        // AI Data Scrapers (category 1)
        { pattern: 'AI2Bot', category: 1 },
        { pattern: 'Applebot-Extended', category: 1 },
        { pattern: 'Bytespider', category: 1 },
        { pattern: 'CCBot', category: 1 },
        { pattern: 'ClaudeBot', category: 1 },
        { pattern: 'cohere-training-data-crawler', category: 1 },
        { pattern: 'Diffbot', category: 1 },
        { pattern: 'Google-Extended', category: 1 },
        { pattern: 'GPTBot', category: 1 },
        { pattern: 'Kangaroo Bot', category: 1 },
        { pattern: 'meta-externalagent', category: 1 },
        { pattern: 'anthropic-ai', category: 1 },

        // Archivers (category 2)
        { pattern: 'archive.org_bot', category: 2 },
        { pattern: 'Arquivo-web-crawler', category: 2 },
        { pattern: 'heritrix', category: 2 },
        { pattern: 'ia_archiver', category: 2 },
        { pattern: 'NiceCrawler', category: 2 },

        // SEO Crawlers (category 3)
        { pattern: 'AhrefsBot', category: 3 },
        { pattern: 'AhrefsSiteAudit', category: 3 },
        { pattern: 'Barkrowler', category: 3 },
        { pattern: 'BLEXBot', category: 3 },
        { pattern: 'BrightEdge Crawler', category: 3 },
        { pattern: 'Cocolyzebot', category: 3 },
        { pattern: 'DataForSeoBot', category: 3 },
        { pattern: 'DomainStatsBot', category: 3 },
        { pattern: 'dotbot', category: 3 },
        { pattern: 'hypestat', category: 3 },
        { pattern: 'linkdexbot', category: 3 },
        { pattern: 'MJ12bot', category: 3 },
        { pattern: 'online-webceo-bot', category: 3 },
        { pattern: 'Screaming Frog SEO Spider', category: 3 },
        { pattern: 'SemrushBot', category: 3 },
        { pattern: 'SenutoBot', category: 3 },
        { pattern: 'SeobilityBot', category: 3 },
        { pattern: 'SEOkicks', category: 3 },
        { pattern: 'SEOlizer', category: 3 },
        { pattern: 'serpstatbot', category: 3 },
        { pattern: 'SiteCheckerBotCrawler', category: 3 },
        { pattern: 'SenutoBot', category: 3 },
        { pattern: 'ZoomBot', category: 3 },
        { pattern: 'Seodiver', category: 3 },
        { pattern: 'SEOlyzer', category: 3 },
        { pattern: 'Backlinkcrawler', category: 3 },
        { pattern: 'rogerbot', category: 3 },

        // Search Engines (category 4)
        { pattern: '360Spider', category: 4 },
        { pattern: 'AlexandriaOrgBot', category: 4 },
        { pattern: 'Baiduspider', category: 4 },
        { pattern: 'bingbot', category: 4 },
        { pattern: 'coccocbot-web', category: 4 },
        { pattern: 'Daum', category: 4 },
        { pattern: 'DuckDuckBot', category: 4 },
        { pattern: 'DuckDuckGo-Favicons-Bot', category: 4 },
        { pattern: 'Feedfetcher-Google', category: 4 },
        { pattern: 'Google Favicon', category: 4 },
        { pattern: 'Googlebot', category: 4 },
        { pattern: 'GoogleOther', category: 4 },
        { pattern: 'HaoSouSpider', category: 4 },
        { pattern: 'MojeekBot', category: 4 },
        { pattern: 'msnbot', category: 4 },
        { pattern: 'PetalBot', category: 4 },
        { pattern: 'Qwantbot', category: 4 },
        { pattern: 'Qwantify', category: 4 },
        { pattern: 'SemanticScholarBot', category: 4 },
        { pattern: 'SeznamBot', category: 4 },
        { pattern: 'Sogou web spider', category: 4 },
        { pattern: 'teoma', category: 4 },
        { pattern: 'TinEye', category: 4 },
        { pattern: 'yacybot', category: 4 },
        { pattern: 'Yahoo! Slurp', category: 4 },
        { pattern: 'Yandex', category: 4 },
        { pattern: 'Yeti', category: 4 },
        { pattern: 'YisouSpider', category: 4 },
        { pattern: 'ZumBot', category: 4 },
        { pattern: 'AntBot', category: 4 },

        // AI Search Crawlers (category 5)
        { pattern: 'Amazonbot', category: 5 },
        { pattern: 'Applebot', category: 5 },
        { pattern: 'OAI-SearchBot', category: 5 },
        { pattern: 'PerplexityBot', category: 5 },
        { pattern: 'YouBot', category: 5 },

        // AI Assistants (category 6)
        { pattern: 'ChatGPT-User', category: 6 },
        { pattern: 'DuckAssistBot', category: 6 },
        { pattern: 'Meta-ExternalFetcher', category: 6 },
        { pattern: 'Claude-Web', category: 6 },
        { pattern: 'cohere-ai', category: 6 },
        { pattern: 'GitHubCopilotChat', category: 6 },

        // Vulnerability scanners (category 7)
        { pattern: 'sqlmap', category: 7 },
        { pattern: 'WPScan', category: 7 },
        { pattern: 'feroxbuster', category: 7 },
        { pattern: 'masscan', category: 7 },
        { pattern: 'Fuzz Faster U Fool', category: 7 },
        { pattern: 'gobuster', category: 7 },
        { pattern: '(hydra)', category: 7 },
        { pattern: 'absinthe', category: 7 },
        { pattern: 'arachni', category: 7 },
        { pattern: 'bsqlbf', category: 7 },
        { pattern: 'cisco-torch', category: 7 },
        { pattern: 'crimscanner', category: 7 },
        { pattern: 'DirBuster', category: 7 },
        { pattern: 'Grendel-Scan', category: 7 },
        { pattern: 'Mysqloit', category: 7 },
        { pattern: 'Nmap NSE', category: 7 },
        { pattern: 'Nmap Scripting Engine', category: 7 },
        { pattern: 'Nessus', category: 7 },
        { pattern: 'Netsparker', category: 7 },
        { pattern: 'Nikto', category: 7 },
        { pattern: 'Paros', category: 7 },
        { pattern: 'uil2pn', category: 7 },
        { pattern: 'SQL Power Injector', category: 7 },
        { pattern: 'webshag', category: 7 },
        { pattern: 'Teh Forest Lobster', category: 7 },
        { pattern: 'DotDotPwn', category: 7 },
        { pattern: 'Havij', category: 7 },
        { pattern: 'OpenVAS', category: 7 },
        { pattern: 'ZmEu', category: 7 },
        { pattern: 'DominoHunter', category: 7 },
        { pattern: 'FHScan Core', category: 7 },
        { pattern: 'w3af', category: 7 },
        { pattern: 'cgichk', category: 7 },
        { pattern: 'webvulnscan', category: 7 },
        { pattern: 'sqlninja', category: 7 },
        { pattern: 'Argus-Scanner', category: 7 },
        { pattern: 'ShadowSpray.Kerb', category: 7 },
        { pattern: 'OWASP Amass', category: 7 },
        { pattern: 'Nuclei', category: 7 },

        // Headless browsers (category 8)
        { pattern: 'HeadlessChrome', category: 8 },
        { pattern: 'HeadlessEdg', category: 8 },

        // Social Media (category 9)
        { pattern: 'facebookexternalhit', category: 9 },
        { pattern: 'facebookcatalog', category: 9 },
        { pattern: 'meta-externalagent', category: 9 },
        { pattern: 'meta-externalfetcher', category: 9 },
        { pattern: 'Twitterbot', category: 9 },
        { pattern: 'Pinterestbot', category: 9 },
        { pattern: 'pinterest.com.bot', category: 9 },
        { pattern: 'LinkedInBot', category: 9 },
        { pattern: 'XING-contenttabreceiver', category: 9 },
        { pattern: 'redditbot', category: 9 }
    ];

    constructor() {
        // Validate URLs
        if (this.TARGET_URLS.length === 0) {
            throw new Error('At least one target URL must be provided');
        }

        // Initialize metrics service with target URLs
        this.metricsService = new MetricsService(this.TARGET_URLS);

        this.specialRequestBaseContext = {
            targetUrls: this.TARGET_URLS,
            metrics: this.metricsService
        };
        this.specialRequests = [...configuredSpecialRequests];

        // Start metrics server
        const metricsServer = new MetricsServer(this.metricsService);
        metricsServer.start();

        this.loadTrafficPoolFromFile();
        this.startTrafficGeneration();
        this.startSpecialRequestScheduler();
    }

    private loadTrafficPoolFromFile(): void {
        const configPath = path.resolve(process.cwd(), this.TRAFFIC_POOL_CONFIG_PATH);
        const raw = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw) as TrafficPoolConfig;

        this.validateTrafficPoolConfig(parsed);

        this.ipPool.push(...parsed.ipPool.map((ip) => ({
            ip,
            region: this.getRegionForIP(ip),
            useCount: 0,
            lastUsed: null
        })));

        this.userPool.push(...parsed.users);
    }

    private validateTrafficPoolConfig(config: TrafficPoolConfig): void {
        if (!Array.isArray(config.ipPool) || config.ipPool.length === 0) {
            throw new Error(`Invalid traffic pool config: "ipPool" must contain at least one IP (${this.TRAFFIC_POOL_CONFIG_PATH}).`);
        }

        if (!Array.isArray(config.users) || config.users.length === 0) {
            throw new Error(`Invalid traffic pool config: "users" must contain at least one user (${this.TRAFFIC_POOL_CONFIG_PATH}).`);
        }

        const ipSet = new Set(config.ipPool);
        if (ipSet.size !== config.ipPool.length) {
            throw new Error(`Invalid traffic pool config: duplicate IPs found in "ipPool" (${this.TRAFFIC_POOL_CONFIG_PATH}).`);
        }

        const userIdSet = new Set<number>();
        for (const user of config.users) {
            if (typeof user.id !== 'number' || !Number.isInteger(user.id)) {
                throw new Error(`Invalid traffic pool config: user id must be an integer (${this.TRAFFIC_POOL_CONFIG_PATH}).`);
            }

            if (userIdSet.has(user.id)) {
                throw new Error(`Invalid traffic pool config: duplicate user id "${user.id}" (${this.TRAFFIC_POOL_CONFIG_PATH}).`);
            }
            userIdSet.add(user.id);

            if (typeof user.name !== 'string' || user.name.trim().length === 0) {
                throw new Error(`Invalid traffic pool config: user "${user.id}" must have a non-empty name (${this.TRAFFIC_POOL_CONFIG_PATH}).`);
            }

            if (!Array.isArray(user.ipAddresses) || user.ipAddresses.length < this.MIN_IPS_PER_USER || user.ipAddresses.length > this.MAX_IPS_PER_USER) {
                throw new Error(`Invalid traffic pool config: user "${user.id}" must have ${this.MIN_IPS_PER_USER}-${this.MAX_IPS_PER_USER} IP addresses (${this.TRAFFIC_POOL_CONFIG_PATH}).`);
            }

            const userIPSet = new Set(user.ipAddresses);
            if (userIPSet.size !== user.ipAddresses.length) {
                throw new Error(`Invalid traffic pool config: user "${user.id}" has duplicate IP addresses (${this.TRAFFIC_POOL_CONFIG_PATH}).`);
            }

            for (const ip of user.ipAddresses) {
                if (!ipSet.has(ip)) {
                    throw new Error(`Invalid traffic pool config: user "${user.id}" references unknown IP "${ip}" (${this.TRAFFIC_POOL_CONFIG_PATH}).`);
                }
            }
        }
    }

    private getRegionForIP(ip: string): string {
        const firstOctet = `${ip.split('.')[0]}.`;

        for (const [regionCode, prefixes] of Object.entries(this.IP_RANGES)) {
            if (prefixes.includes(firstOctet)) {
                return regionCode;
            }
        }

        return 'UN';
    }

    private getSimulatedUser(): SimulatedUser {
        const index = Math.floor(Math.random() * this.userPool.length);
        return this.userPool[index];
    }

    private markIPUsed(ip: string): void {
        const entry = this.ipPool.find((ipEntry) => ipEntry.ip === ip);
        if (!entry) {
            return;
        }

        entry.useCount++;
        entry.lastUsed = new Date();
    }

    private getRandomIP(): string {
        const index = Math.floor(Math.random() * this.ipPool.length);
        const entry = this.ipPool[index];
        this.markIPUsed(entry.ip);
        return entry.ip;
    }

    private getUserIP(user: SimulatedUser): string {
        const index = Math.floor(Math.random() * user.ipAddresses.length);
        const ip = user.ipAddresses[index];
        this.markIPUsed(ip);
        return ip;
    }

    private getRandomOutboundUrl(): string | null {
        if (this.OUTBOUND_URLS.length === 0) {
            return null;
        }

        const index = Math.floor(Math.random() * this.OUTBOUND_URLS.length);
        return this.OUTBOUND_URLS[index];
    }

    private generateHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'X-Forwarded-Proto': 'https',
        };

        if (Math.random() < 0.3) { // 30% chance for bot
            const ip = this.getRandomIP();
            headers['X-Forwarded-For'] = ip;
            headers['X-Real-IP'] = ip;

            const category = Math.floor(Math.random() * 9) + 1;
            const userAgents = this.USER_AGENTS.filter(ua => ua.category === category);
            const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

            headers['User-Agent'] = `Mozilla/5.0 (compatible; ${userAgent.pattern}/${Math.floor(Math.random() * 10)}.0)`;
            headers['X-Bot-Category'] = `Category ${category}`;
        } else {
            const browsers = [
                'Chrome/91.0.4472.124',
                'Firefox/89.0',
                'Safari/537.36',
                'Edge/91.0.864.59'
            ];
            const browser = browsers[Math.floor(Math.random() * browsers.length)];
            headers['User-Agent'] = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ${browser}`;

            const user = this.getSimulatedUser();
            const ip = this.getUserIP(user);
            headers['X-Forwarded-For'] = ip;
            headers['X-Real-IP'] = ip;

            headers['X-User-ID'] = '' + user.id;
            headers['X-User-Name'] = user.name;
        }

        return headers;
    }

    private shouldSendOutboundRequest(): boolean {
        return this.OUTBOUND_URLS.length > 0 && Math.random() < this.OUTBOUND_REQUEST_PROBABILITY;
    }

    private async dispatchOutboundRequests(outboundUrl: string): Promise<void> {
        await Promise.all(this.TARGET_URLS.map(async (targetUrl) => {
            const url = targetUrl + 'api/request';
            try {
                await axios.post(url, { url: outboundUrl }, {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`Failed outbound request to ${outboundUrl} for target ${url}:`, message);
            }
        }));
    }

    private async makeRequest(): Promise<void> {
        try {
            const headers = this.generateHeaders();

            // Make parallel requests to all target URLs
            const requests: Promise<void>[] = this.TARGET_URLS.map(async (url) => {
                // Increment request counter before making the request
                this.metricsService.incrementRequestCounter(url);

                const startTime = Date.now();
                try {
                    const response = await axios.get(url, {
                        headers,
                    });

                    // Record duration
                    const durationMs = Date.now() - startTime;
                    this.metricsService.observeRequestDuration(url, durationMs);

                    // Record status
                    this.metricsService.incrementResponseStatusCounter(url,  response.status);
                } catch (error) {
                    const durationMs = Date.now() - startTime;
                    this.metricsService.observeRequestDuration(url, durationMs);

                    const status = (error as any).response?.status || 0;
                    const isExpectedForbidden = status === 403;

                    if (!isExpectedForbidden) {
                        console.error(`Failed request to ${url} ${error}`);
                    }

                    this.metricsService.incrementResponseStatusCounter(url, status);
                }
            });

            if (this.shouldSendOutboundRequest()) {
                const outboundUrl = this.getRandomOutboundUrl();
                if (outboundUrl) {
                    requests.push(this.dispatchOutboundRequests(outboundUrl));
                }
            }

            // Wait for all requests to complete
            await Promise.all(requests);

        } catch (error) {
            // @ts-ignore
            console.error('Request orchestration failed:', error.message);
        }
    }

    private getCurrentRequestsPerMinute(): number {
        // Get current hour in 24-hour format (0-23) in local timezone
        const currentHour = new Date().getHours();

        // Define traffic pattern: peak during business hours (9am-5pm)
        // with gradual ramp up and down
        let multiplier: number;

        if (currentHour >= 9 && currentHour < 17) {
            // Business hours: 9am-5pm - peak traffic
            multiplier = this.MAX_MULTIPLIER;
        } else if (currentHour >= 6 && currentHour < 9) {
            // Morning ramp up: 6am-9am
            multiplier = this.MIN_MULTIPLIER + (currentHour - 6) * ((this.MAX_MULTIPLIER - this.MIN_MULTIPLIER) / 3);
        } else if (currentHour >= 17 && currentHour < 22) {
            // Evening ramp down: 5pm-10pm
            multiplier = this.MAX_MULTIPLIER - (currentHour - 17) * ((this.MAX_MULTIPLIER - this.MIN_MULTIPLIER) / 5);
        } else {
            // Night hours: 10pm-6am - minimum traffic
            multiplier = this.MIN_MULTIPLIER;
        }

        return Math.round(this.BASE_REQUESTS_PER_MINUTE * multiplier);
    }

    private startTrafficGeneration(): void {
        console.log(`Starting traffic generator - Base rate: ${this.BASE_REQUESTS_PER_MINUTE} requests per minute`);
        console.log(`Traffic will vary between ${Math.round(this.BASE_REQUESTS_PER_MINUTE * this.MIN_MULTIPLIER)} and ${Math.round(this.BASE_REQUESTS_PER_MINUTE * this.MAX_MULTIPLIER)} requests per minute based on time of day`);
        console.log(`Target URLs:`, this.TARGET_URLS);

        // Check traffic rate every minute and adjust
        setInterval(() => {
            const requestsPerMinute = this.getCurrentRequestsPerMinute();
            const interval = (60 * 1000) / requestsPerMinute;

            console.log(`Current traffic rate: ${requestsPerMinute} requests per minute (${new Date().toLocaleTimeString()})`);

            // Clear existing interval if any
            if (this.requestInterval) {
                clearInterval(this.requestInterval);
            }

            // Set new interval based on current time
            this.requestInterval = setInterval(() => {
                this.makeRequest();
            }, interval);
        }, 60000); // Check every minute

        // Initial setup
        const initialRequestsPerMinute = this.getCurrentRequestsPerMinute();
        const initialInterval = (60 * 1000) / initialRequestsPerMinute;

        console.log(`Initial traffic rate: ${initialRequestsPerMinute} requests per minute`);

        this.requestInterval = setInterval(() => {
            this.makeRequest();
        }, initialInterval);
    }

    private startSpecialRequestScheduler(): void {
        if (this.specialRequests.length === 0) {
            console.log('No special requests configured; skipping extended scheduler.');
            return;
        }

        const scheduleNext = () => {
            const delay = this.getRandomSpecialRequestInterval();
            const minutes = (delay / 60000).toFixed(1);
            console.log(`[special-request] Next execution in approximately ${minutes} minutes.`);

            this.specialRequestTimer = setTimeout(async () => {
                try {
                    await this.runRandomSpecialRequest();
                } catch (error: unknown) {
                    console.error('[special-request] Execution encountered errors:', error instanceof Error ? error.message : error);
                } finally {
                    scheduleNext();
                }
            }, delay);
        };

        scheduleNext();
    }

    private getRandomSpecialRequestInterval(): number {
        const min = 15 * 60 * 1000;
        const max = 30 * 60 * 1000;
        return Math.floor(min + Math.random() * (max - min));
    }

    private async runRandomSpecialRequest(): Promise<void> {
        if (this.specialRequests.length === 0) {
            return;
        }

        const request = this.specialRequests[Math.floor(Math.random() * this.specialRequests.length)];
        const headers = this.generateHeaders();
        console.log(`[special-request] Executing "${request.name}" for ${this.TARGET_URLS.length} target(s).`);

        const failures: string[] = [];

        await Promise.all(this.TARGET_URLS.map(async (targetUrl) => {
            try {
                await request.execute({
                    ...this.specialRequestBaseContext,
                    targetUrl,
                    headers,
                });
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                failures.push(`${targetUrl}: ${message}`);
            }
        }));

        if (failures.length > 0) {
            console.error(`[special-request] "${request.name}" completed with ${failures.length} failure(s).`);
            throw new Error(failures.join('; '));
        }

        console.log(`[special-request] "${request.name}" completed successfully for all targets.`);
    }

    public getStats(): any {
        return {
            totalIPs: this.ipPool.length,
            totalUsers: this.userPool.length,
            targetUrls: this.TARGET_URLS,
            currentTrafficRate: this.getCurrentRequestsPerMinute(),
            timeOfDay: new Date().toLocaleTimeString(),
            byRegion: Object.fromEntries(
                Object.keys(this.IP_RANGES).map(region => [
                    region,
                    this.ipPool.filter(entry => entry.region === region).length
                ])
            ),
            mostUsed: [...this.ipPool]
                .sort((a, b) => b.useCount - a.useCount)
                .slice(0, 5)
                .map(({ ip, useCount, lastUsed }) => ({ ip, useCount, lastUsed }))
        };
    }
}

// Usage example with configuration
const generator = new TrafficGenerator();

// Optional: Log stats every minute
setInterval(() => {
    console.log('\nTraffic Generator Stats:', generator.getStats());
}, 60000);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down traffic generator...');
    console.log('Final stats:', generator.getStats());
    process.exit();
});
