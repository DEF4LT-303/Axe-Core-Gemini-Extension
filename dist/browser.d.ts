import { type Browser, type BrowserContext, type Page } from 'playwright';
export interface BrowserOptions {
    headless?: boolean;
    channel?: 'chrome' | 'msedge';
    executablePath?: string;
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
 */
export declare function createAuditPage(viewport?: {
    width: number;
    height: number;
}): Promise<{
    context: BrowserContext;
    page: Page;
}>;
/**
 * Closes the cached browser instance if open.
 */
export declare function closeBrowser(): Promise<void>;
