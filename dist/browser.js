import { chromium } from 'playwright';
let cachedBrowser = null;
/**
 * Launches a Chromium-based browser with Smart Fallback:
 * 1. Default bundled/downloaded Chromium
 * 2. Installed Google Chrome (channel: 'chrome')
 * 3. Installed Microsoft Edge (channel: 'msedge')
 */
export async function getBrowser(options) {
    if (cachedBrowser && cachedBrowser.isConnected()) {
        return cachedBrowser;
    }
    const headless = options?.headless ?? true;
    const launchAttempts = [];
    if (options?.executablePath) {
        launchAttempts.push({
            name: `Custom path (${options.executablePath})`,
            opts: { headless, executablePath: options.executablePath }
        });
    }
    else if (options?.channel) {
        launchAttempts.push({
            name: `Specified channel (${options.channel})`,
            opts: { headless, channel: options.channel }
        });
    }
    else {
        // 1. Try default Playwright Chromium
        launchAttempts.push({
            name: 'Playwright Chromium',
            opts: { headless }
        });
        // 2. Try Google Chrome
        launchAttempts.push({
            name: 'Google Chrome (system channel)',
            opts: { headless, channel: 'chrome' }
        });
        // 3. Try Microsoft Edge (pre-installed on Windows, common on Mac/Linux)
        launchAttempts.push({
            name: 'Microsoft Edge (system channel)',
            opts: { headless, channel: 'msedge' }
        });
    }
    const errors = [];
    for (const attempt of launchAttempts) {
        try {
            cachedBrowser = await chromium.launch(attempt.opts);
            return cachedBrowser;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`[${attempt.name}]: ${msg}`);
        }
    }
    throw new Error(`Failed to launch any Chromium browser.\n` +
        `Attempted the following strategies:\n` +
        errors.map((e) => `  - ${e}`).join('\n') +
        `\nRemediation: Install Google Chrome, Microsoft Edge, or run "npx playwright install chromium".`);
}
/**
 * Creates a fresh, isolated BrowserContext and Page for an audit.
 * Supports authentication via extraHTTPHeaders, cookies, and storageState.
 */
export async function createAuditPage(options) {
    const browser = await getBrowser();
    const contextOptions = {
        viewport: options?.viewport ?? { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AxeCoreMCP/1.0',
        deviceScaleFactor: 1
    };
    if (options?.headers && Object.keys(options.headers).length > 0) {
        contextOptions.extraHTTPHeaders = options.headers;
    }
    if (options?.storageState) {
        const trimmed = options.storageState.trim();
        if (trimmed.startsWith('{')) {
            try {
                contextOptions.storageState = JSON.parse(trimmed);
            }
            catch {
                contextOptions.storageState = options.storageState;
            }
        }
        else {
            contextOptions.storageState = options.storageState;
        }
    }
    const context = await browser.newContext(contextOptions);
    if (options?.cookies && options.cookies.length > 0) {
        await context.addCookies(options.cookies);
    }
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    return { context, page };
}
/**
 * Connects to an existing Chromium/Chrome/Edge instance via Chrome DevTools Protocol (CDP).
 * Enables auditing live open tabs, active modals, and authenticated sessions without re-navigating.
 */
export async function connectCDPPage(cdpUrl, targetUrl) {
    const browser = await chromium.connectOverCDP(cdpUrl);
    const contexts = browser.contexts();
    const context = contexts[0] ?? (await browser.newContext());
    const pages = context.pages();
    let targetPage = null;
    if (targetUrl && targetUrl !== 'current') {
        targetPage = pages.find((p) => p.url().includes(targetUrl)) ?? null;
    }
    // If not found by specific URL, use the latest/active tab
    if (!targetPage && pages.length > 0) {
        targetPage = pages[pages.length - 1];
    }
    if (!targetPage) {
        targetPage = await context.newPage();
    }
    return { browser, context, page: targetPage };
}
/**
 * Closes the cached browser instance if open.
 */
export async function closeBrowser() {
    if (cachedBrowser) {
        try {
            await cachedBrowser.close();
        }
        catch {
            // Ignore close errors
        }
        finally {
            cachedBrowser = null;
        }
    }
}
// Ensure browser is cleaned up when process terminates
process.on('exit', () => {
    if (cachedBrowser) {
        cachedBrowser.close().catch(() => { });
    }
});
process.on('SIGINT', async () => {
    await closeBrowser();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await closeBrowser();
    process.exit(0);
});
