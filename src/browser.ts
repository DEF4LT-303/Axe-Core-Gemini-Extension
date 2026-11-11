import { chromium, type Browser, type BrowserContext, type Page, type LaunchOptions } from 'playwright';

let cachedBrowser: Browser | null = null;

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
export async function getBrowser(options?: BrowserOptions): Promise<Browser> {
  if (cachedBrowser && cachedBrowser.isConnected()) {
    return cachedBrowser;
  }

  const headless = options?.headless ?? true;
  const launchAttempts: Array<{ name: string; opts: LaunchOptions }> = [];

  if (options?.executablePath) {
    launchAttempts.push({
      name: `Custom path (${options.executablePath})`,
      opts: { headless, executablePath: options.executablePath }
    });
  } else if (options?.channel) {
    launchAttempts.push({
      name: `Specified channel (${options.channel})`,
      opts: { headless, channel: options.channel }
    });
  } else {
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

  const errors: string[] = [];

  for (const attempt of launchAttempts) {
    try {
      cachedBrowser = await chromium.launch(attempt.opts);
      return cachedBrowser;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`[${attempt.name}]: ${msg}`);
    }
  }

  throw new Error(
    `Failed to launch any Chromium browser.\n` +
    `Attempted the following strategies:\n` +
    errors.map((e) => `  - ${e}`).join('\n') +
    `\nRemediation: Install Google Chrome, Microsoft Edge, or run "npx playwright install chromium".`
  );
}

/**
 * Creates a fresh, isolated BrowserContext and Page for an audit.
 */
export async function createAuditPage(viewport?: { width: number; height: number }): Promise<{
  context: BrowserContext;
  page: Page;
}> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: viewport ?? { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AxeCoreMCP/1.0',
    deviceScaleFactor: 1
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);

  return { context, page };
}

/**
 * Closes the cached browser instance if open.
 */
export async function closeBrowser(): Promise<void> {
  if (cachedBrowser) {
    try {
      await cachedBrowser.close();
    } catch {
      // Ignore close errors
    } finally {
      cachedBrowser = null;
    }
  }
}

// Ensure browser is cleaned up when process terminates
process.on('exit', () => {
  if (cachedBrowser) {
    cachedBrowser.close().catch(() => {});
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
