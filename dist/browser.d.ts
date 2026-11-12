import { type Browser, type BrowserContext, type Page } from 'playwright';
export interface BrowserOptions {
    headless?: boolean;
    channel?: 'chrome' | 'msedge';
    executablePath?: string;
}
export interface CookieParam {
    name: string;
    value: string;
    url?: string;
    domain?: string;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}
export interface AuditPageOptions {
    viewport?: {
        width: number;
        height: number;
    };
    headers?: Record<string, string>;
    cookies?: CookieParam[];
    storageState?: string;
}
/**
 * Launches a Chromium-based browser with Smart Fallback:
 * 1. Default bundled/downloaded Chromium
 * 2. Installed Google Chrome (channel: 'chrome')
 * 3. Installed Microsoft Edge (channel: 'msedge')
 */
export declare function getBrowser(options?: BrowserOptions): Promise<Browser>;
/**
 * Creates a fresh, isolated BrowserContext and Page for an audit.
 * Supports authentication via extraHTTPHeaders, cookies, and storageState.
 */
export declare function createAuditPage(options?: AuditPageOptions): Promise<{
    context: BrowserContext;
    page: Page;
}>;
/**
 * Connects to an existing Chromium/Chrome/Edge instance via Chrome DevTools Protocol (CDP).
 * Enables auditing live open tabs, active modals, and authenticated sessions without re-navigating.
 */
export declare function connectCDPPage(cdpUrl: string, targetUrl?: string): Promise<{
    browser: Browser;
    context: BrowserContext;
    page: Page;
}>;
/**
 * Closes the cached browser instance if open.
 */
export declare function closeBrowser(): Promise<void>;
