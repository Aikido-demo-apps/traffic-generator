import axios from 'axios';

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

class TrafficGenerator {
    private readonly IP_POOL_SIZE = 100;
    private readonly ipPool: IPEntry[] = [];
    private readonly REQUESTS_PER_MINUTE = 10;

    private readonly TARGET_URLS = [
        'https://sovulnerable-white-mountain-7481.fly.dev/public',
        //'http://localhost:3000/public'
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

        this.initializeIPPool();
        this.startTrafficGeneration();
    }

    private initializeIPPool(): void {
        const regions = Object.entries(this.IP_RANGES);
        const ipsPerRegion = Math.ceil(this.IP_POOL_SIZE / regions.length);

        regions.forEach(([regionCode, prefixes]) => {
            for (let i = 0; i < ipsPerRegion && this.ipPool.length < this.IP_POOL_SIZE; i++) {
                const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                const ip = `${prefix}${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

                if (!this.ipPool.some(entry => entry.ip === ip)) {
                    this.ipPool.push({
                        ip,
                        region: regionCode,
                        useCount: 0,
                        lastUsed: null
                    });
                }
            }
        });
    }

    private getRandomIP(): string {
        const index = Math.floor(Math.random() * this.ipPool.length);
        const entry = this.ipPool[index];

        entry.useCount++;
        entry.lastUsed = new Date();

        return entry.ip;
    }

    private generateHeaders(ip: string): Record<string, string> {
        const headers: Record<string, string> = {
            'X-Forwarded-For': ip,
            'X-Real-IP': ip
        };

        if (Math.random() < 0.3) { // 30% chance for bot
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
        }

        return headers;
    }

    private async makeRequest(): Promise<void> {
        try {
            const ip = this.getRandomIP();
            const headers = this.generateHeaders(ip);

            // Make parallel requests to all target URLs
            const requests = this.TARGET_URLS.map(async (url) => {
                try {
                    const response = await axios.get(url, {
                        headers,
                    });
                    return {
                        url,
                        status: response.status,
                        success: true
                    };
                } catch (error) {
                    return {
                        url,
                        // @ts-ignore
                        status: error.response?.status || 0,
                        success: false,
                        // @ts-ignore
                        error: error.message
                    };
                }
            });

            // Wait for all requests to complete
            const results = await Promise.all(requests);

            // Log results for each URL
            results.forEach(result => {
                if (!result.success) {
                    console.error(`Failed request to ${result.url}: ${result.error}`);
                }
            });

        } catch (error) {
            // @ts-ignore
            console.error('Request orchestration failed:', error.message);
        }
    }

    private startTrafficGeneration(): void {
        const interval = (60 * 1000) / this.REQUESTS_PER_MINUTE;

        console.log(`Starting traffic generator - ${this.REQUESTS_PER_MINUTE} requests per minute`);
        console.log(`Target URLs:`, this.TARGET_URLS);

        setInterval(() => {
            this.makeRequest();
        }, interval);
    }

    public getStats(): any {
        return {
            totalIPs: this.ipPool.length,
            targetUrls: this.TARGET_URLS,
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