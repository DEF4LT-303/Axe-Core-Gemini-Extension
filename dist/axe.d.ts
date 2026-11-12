import { type RuleMetadata } from 'axe-core';
import { type CookieParam } from './browser.js';
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface NodeSummary {
    target: string;
    html: string;
    failureSummary?: string;
    rect?: Rect;
}
export interface ViolationSummary {
    id: string;
    impact: string;
    description: string;
    help: string;
    helpUrl: string;
    tags: string[];
    elementCount: number;
    elements: NodeSummary[];
}
export interface EmulateMediaOptions {
    reducedMotion?: 'reduce' | 'no-preference';
    forcedColors?: 'active' | 'none';
    colorScheme?: 'dark' | 'light';
}
export type VisionDeficiency = 'deuteranopia' | 'protanopia' | 'tritanopia' | 'achromatopsia' | 'blurredVision' | 'none';
export interface AuditOptions {
    tags?: string[];
    rules?: string[];
    disableRules?: string[];
    include?: string[];
    exclude?: string[];
    impact?: Array<'critical' | 'serious' | 'moderate' | 'minor'>;
    viewport?: {
        width: number;
        height: number;
    };
    waitForSelector?: string;
    detailed?: boolean;
    headers?: Record<string, string>;
    cookies?: CookieParam[];
    storageState?: string;
    cdpUrl?: string;
    includeIncomplete?: boolean;
    emulateMedia?: EmulateMediaOptions;
    visionDeficiency?: VisionDeficiency;
}
export interface AuditReport {
    target: string;
    timestamp: string;
    wcagTagsAudited: string[];
    status: 'PASS' | 'FAIL';
    summary: {
        violations: number;
        incomplete: number;
        passes: number;
        inapplicable: number;
        byImpact: {
            critical: number;
            serious: number;
            moderate: number;
            minor: number;
        };
    };
    summaryTable: string;
    violations: ViolationSummary[];
    incomplete?: ViolationSummary[];
}
/**
 * Generates a clean Markdown table summarizing the audit results.
 */
export declare function generateSummaryTable(status: 'PASS' | 'FAIL', summary: AuditReport['summary'], violations: ViolationSummary[], target: string, incomplete?: ViolationSummary[]): string;
/**
 * Audits a live URL or active Chrome DevTools tab using Playwright and @axe-core/playwright.
 */
export declare function auditUrl(url: string, options?: AuditOptions): Promise<AuditReport>;
/**
 * Audits an HTML string by injecting it into a real Playwright page.
 * This guarantees accurate layout, CSS computation, and color contrast.
 */
export declare function auditHtml(html: string, options?: AuditOptions): Promise<AuditReport>;
/**
 * Returns metadata for a specific axe-core rule.
 */
export declare function getRuleInfo(ruleId: string): RuleMetadata | null;
/**
 * Lists available axe-core rules, optionally filtered by tag.
 */
export declare function listRules(tag?: string): RuleMetadata[];
