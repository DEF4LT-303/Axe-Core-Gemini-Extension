import axe from 'axe-core';
import { AxeBuilder } from '@axe-core/playwright';
import { createAuditPage } from './browser.js';
/**
 * Normalizes and formats axe-core violations for LLM context efficiency.
 */
function formatViolations(violations, impactFilter, detailed = false) {
    let filtered = violations;
    if (impactFilter && impactFilter.length > 0) {
        const allowed = new Set(impactFilter.map((i) => i.toLowerCase()));
        filtered = filtered.filter((v) => v.impact && allowed.has(v.impact.toLowerCase()));
    }
    return filtered.map((v) => {
        const maxNodes = detailed ? v.nodes.length : 5;
        const elements = v.nodes.slice(0, maxNodes).map((node) => ({
            target: Array.isArray(node.target) ? node.target.join(' ') : String(node.target),
            html: node.html ? node.html.trim() : '',
            failureSummary: node.failureSummary ? node.failureSummary.trim() : undefined
        }));
        return {
            id: v.id,
            impact: v.impact ?? 'unknown',
            description: v.description,
            help: v.help,
            helpUrl: v.helpUrl,
            tags: v.tags ?? [],
            elementCount: v.nodes.length,
            elements
        };
    });
}
/**
 * Configure AxeBuilder with common options
 */
function configureAxeBuilder(builder, options) {
    const tags = options?.tags && options.tags.length > 0
        ? options.tags
        : ['wcag2a', 'wcag2aa', 'wcag21aa'];
    builder.withTags(tags);
    if (options?.rules && options.rules.length > 0) {
        builder.withRules(options.rules);
    }
    if (options?.disableRules && options.disableRules.length > 0) {
        builder.disableRules(options.disableRules);
    }
    if (options?.include && options.include.length > 0) {
        for (const sel of options.include) {
            builder.include(sel);
        }
    }
    if (options?.exclude && options.exclude.length > 0) {
        for (const sel of options.exclude) {
            builder.exclude(sel);
        }
    }
    return builder;
}
/**
 * Audits a live URL using Playwright and @axe-core/playwright.
 */
export async function auditUrl(url, options) {
    const { context, page } = await createAuditPage(options?.viewport);
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        if (options?.waitForSelector) {
            await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
        }
        const builder = new AxeBuilder({ page });
        configureAxeBuilder(builder, options);
        const results = await builder.analyze();
        const formattedViolations = formatViolations(results.violations, options?.impact, options?.detailed);
        const byImpact = {
            critical: results.violations.filter((v) => v.impact === 'critical').length,
            serious: results.violations.filter((v) => v.impact === 'serious').length,
            moderate: results.violations.filter((v) => v.impact === 'moderate').length,
            minor: results.violations.filter((v) => v.impact === 'minor').length
        };
        const auditedTags = options?.tags && options.tags.length > 0
            ? options.tags
            : ['wcag2a', 'wcag2aa', 'wcag21aa'];
        return {
            target: url,
            timestamp: results.timestamp,
            wcagTagsAudited: auditedTags,
            status: formattedViolations.length === 0 ? 'PASS' : 'FAIL',
            summary: {
                violations: results.violations.length,
                passes: results.passes.length,
                incomplete: results.incomplete.length,
                inapplicable: results.inapplicable.length,
                byImpact
            },
            violations: formattedViolations
        };
    }
    finally {
        await context.close().catch(() => { });
    }
}
/**
 * Audits an HTML string by injecting it into a real Playwright page.
 * This guarantees accurate layout, CSS computation, and color contrast.
 */
export async function auditHtml(html, options) {
    const { context, page } = await createAuditPage(options?.viewport);
    try {
        // If not a full HTML document, wrap in minimal HTML shell with doctype and UTF-8
        let completeHtml = html.trim();
        if (!completeHtml.toLowerCase().includes('<html')) {
            completeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Test</title>
</head>
<body>
  ${completeHtml}
</body>
</html>`;
        }
        await page.setContent(completeHtml, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const builder = new AxeBuilder({ page });
        configureAxeBuilder(builder, options);
        const results = await builder.analyze();
        const formattedViolations = formatViolations(results.violations, options?.impact, options?.detailed);
        const byImpact = {
            critical: results.violations.filter((v) => v.impact === 'critical').length,
            serious: results.violations.filter((v) => v.impact === 'serious').length,
            moderate: results.violations.filter((v) => v.impact === 'moderate').length,
            minor: results.violations.filter((v) => v.impact === 'minor').length
        };
        const auditedTags = options?.tags && options.tags.length > 0
            ? options.tags
            : ['wcag2a', 'wcag2aa', 'wcag21aa'];
        return {
            target: 'HTML snippet',
            timestamp: results.timestamp,
            wcagTagsAudited: auditedTags,
            status: formattedViolations.length === 0 ? 'PASS' : 'FAIL',
            summary: {
                violations: results.violations.length,
                passes: results.passes.length,
                incomplete: results.incomplete.length,
                inapplicable: results.inapplicable.length,
                byImpact
            },
            violations: formattedViolations
        };
    }
    finally {
        await context.close().catch(() => { });
    }
}
/**
 * Returns metadata for a specific axe-core rule.
 */
export function getRuleInfo(ruleId) {
    const rules = axe.getRules();
    const rule = rules.find((r) => r.ruleId.toLowerCase() === ruleId.toLowerCase());
    return rule ?? null;
}
/**
 * Lists available axe-core rules, optionally filtered by tag.
 */
export function listRules(tag) {
    if (tag) {
        return axe.getRules([tag]);
    }
    return axe.getRules();
}
