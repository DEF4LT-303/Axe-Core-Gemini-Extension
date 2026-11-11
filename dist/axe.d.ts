import { type RuleMetadata } from 'axe-core';
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
}
export interface NodeSummary {
    target: string;
    html: string;
    failureSummary?: string;
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
export interface AuditReport {
    target: string;
    timestamp: string;
    wcagTagsAudited: string[];
    status: 'PASS' | 'FAIL';
    summary: {
        violations: number;
        passes: number;
        incomplete: number;
        inapplicable: number;
        byImpact: {
            critical: number;
            serious: number;
            moderate: number;
            minor: number;
        };
    };
    violations: ViolationSummary[];
}
/**
 * Audits a live URL using Playwright and @axe-core/playwright.
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
