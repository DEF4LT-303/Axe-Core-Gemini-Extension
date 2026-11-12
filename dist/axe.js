import axe from 'axe-core';
import { AxeBuilder } from '@axe-core/playwright';
import { createAuditPage, connectCDPPage } from './browser.js';
/**
 * Attaches bounding boxes (rect) to failing elements via a single page.evaluate roundtrip.
 * Enables visual tools and agents to immediately crop screenshots ({ clip: rect }).
 */
async function attachBoundingBoxes(page, ruleResults) {
    const targets = [];
    for (const r of ruleResults) {
        if (!r.nodes)
            continue;
        for (const node of r.nodes) {
            const sel = Array.isArray(node.target) ? node.target[0] : String(node.target);
            if (sel && typeof sel === 'string')
                targets.push(sel);
        }
    }
    if (targets.length === 0)
        return;
    try {
        const rects = await page.evaluate((selectorList) => {
            const map = {};
            for (const sel of selectorList) {
                if (map[sel] !== undefined)
                    continue;
                try {
                    const el = document.querySelector(sel);
                    if (el) {
                        const r = el.getBoundingClientRect();
                        map[sel] = {
                            x: Math.round(r.x),
                            y: Math.round(r.y),
                            width: Math.round(r.width),
                            height: Math.round(r.height)
                        };
                    }
                    else {
                        map[sel] = null;
                    }
                }
                catch {
                    map[sel] = null;
                }
            }
            return map;
        }, targets);
        for (const r of ruleResults) {
            if (!r.nodes)
                continue;
            for (const node of r.nodes) {
                const sel = Array.isArray(node.target) ? node.target[0] : String(node.target);
                if (sel && rects[sel]) {
                    node.rect = rects[sel];
                }
            }
        }
    }
    catch {
        // Non-fatal if page DOM is inaccessible or navigating
    }
}
/**
 * Applies media features (reduced motion, forced colors) and color vision deficiency emulation.
 */
async function applyEmulation(page, options) {
    if (options?.emulateMedia) {
        await page.emulateMedia({
            reducedMotion: options.emulateMedia.reducedMotion,
            forcedColors: options.emulateMedia.forcedColors,
            colorScheme: options.emulateMedia.colorScheme
        });
    }
    if (options?.visionDeficiency && options.visionDeficiency !== 'none') {
        try {
            const session = await page.context().newCDPSession(page);
            await session.send('Emulation.setEmulatedVisionDeficiency', { type: options.visionDeficiency });
        }
        catch (err) {
            console.warn('Vision deficiency emulation not available in this browser context:', err);
        }
    }
}
/**
 * Generates a clean Markdown table summarizing the audit results.
 */
export function generateSummaryTable(status, summary, violations, target, incomplete) {
    const statusDisplay = status === 'PASS' ? 'PASS (Compliant)' : 'FAIL (Violations Found)';
    const { byImpact, violations: totalViolations, passes, incomplete: totalIncomplete } = summary;
    const headerTable = [
        `| Target | Status | Critical | Serious | Moderate | Minor | Total Violations | Incomplete (Review) | Passed Rules |`,
        `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |`,
        `| ${target} | **${statusDisplay}** | ${byImpact.critical} | ${byImpact.serious} | ${byImpact.moderate} | ${byImpact.minor} | ${totalViolations} | ${totalIncomplete} | ${passes} |`
    ].join('\n');
    let fullTable = headerTable;
    if (totalViolations > 0) {
        const rows = violations.map((v) => {
            const targets = v.elements.map((e) => `\`${e.target}\``).slice(0, 3).join(', ') || '-';
            const cleanHelp = v.help.replace(/\|/g, '-');
            return `| \`${v.id}\` | **${v.impact.toUpperCase()}** | ${v.elementCount} | ${targets} | ${cleanHelp} |`;
        });
        const breakdownTable = [
            `### Violations Breakdown`,
            `| Rule ID | Severity | Elements | Target Selectors | Description |`,
            `| :--- | :---: | :---: | :--- | :--- |`,
            ...rows
        ].join('\n');
        fullTable += `\n\n${breakdownTable}`;
    }
    if (incomplete && incomplete.length > 0) {
        const incRows = incomplete.map((v) => {
            const targets = v.elements.map((e) => `\`${e.target}\``).slice(0, 3).join(', ') || '-';
            const cleanHelp = v.help.replace(/\|/g, '-');
            return `| \`${v.id}\` | ${v.elementCount} | ${targets} | ${cleanHelp} |`;
        });
        const incTable = [
            `### Incomplete / Needs Visual Review`,
            `| Rule ID | Elements | Target Selectors | Description |`,
            `| :--- | :---: | :--- | :--- |`,
            ...incRows
        ].join('\n');
        fullTable += `\n\n${incTable}`;
    }
    return fullTable;
}
/**
 * Normalizes and formats axe-core violations/incomplete items for LLM context efficiency.
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
            failureSummary: node.failureSummary ? node.failureSummary.trim() : undefined,
            rect: node.rect ?? undefined
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
 * Audits a live URL or active Chrome DevTools tab using Playwright and @axe-core/playwright.
 */
export async function auditUrl(url, options) {
    const preparedCookies = options?.cookies?.map((c) => {
        if (!c.domain && !c.url) {
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return { ...c, url };
            }
            return { ...c, domain: 'localhost', path: c.path ?? '/' };
        }
        return c;
    });
    let cdpBrowser = null;
    let context;
    let page;
    let isCdp = false;
    if (options?.cdpUrl) {
        const cdpConn = await connectCDPPage(options.cdpUrl, url !== 'current' ? url : undefined);
        cdpBrowser = cdpConn.browser;
        context = cdpConn.context;
        page = cdpConn.page;
        isCdp = true;
    }
    else {
        const fresh = await createAuditPage({
            viewport: options?.viewport,
            headers: options?.headers,
            cookies: preparedCookies,
            storageState: options?.storageState
        });
        context = fresh.context;
        page = fresh.page;
    }
    try {
        // If not CDP or if a specific URL is provided that doesn't match current page, navigate
        if (!isCdp) {
            await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        }
        else if (url && url !== 'current' && !page.url().includes(url)) {
            await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        }
        await applyEmulation(page, options);
        if (options?.waitForSelector) {
            await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
        }
        const builder = new AxeBuilder({ page });
        configureAxeBuilder(builder, options);
        const results = await builder.analyze();
        // Attach bounding boxes to failing and incomplete nodes for visual cropping
        await attachBoundingBoxes(page, results.violations);
        if (options?.includeIncomplete && results.incomplete?.length) {
            await attachBoundingBoxes(page, results.incomplete);
        }
        const formattedViolations = formatViolations(results.violations, options?.impact, options?.detailed);
        const formattedIncomplete = options?.includeIncomplete
            ? formatViolations(results.incomplete, options?.impact, options?.detailed)
            : undefined;
        const byImpact = {
            critical: results.violations.filter((v) => v.impact === 'critical').length,
            serious: results.violations.filter((v) => v.impact === 'serious').length,
            moderate: results.violations.filter((v) => v.impact === 'moderate').length,
            minor: results.violations.filter((v) => v.impact === 'minor').length
        };
        const auditedTags = options?.tags && options.tags.length > 0
            ? options.tags
            : ['wcag2a', 'wcag2aa', 'wcag21aa'];
        const status = formattedViolations.length === 0 ? 'PASS' : 'FAIL';
        const summary = {
            violations: results.violations.length,
            incomplete: results.incomplete.length,
            passes: results.passes.length,
            inapplicable: results.inapplicable.length,
            byImpact
        };
        const displayTarget = isCdp && url === 'current' ? `Active tab (${page.url()})` : url;
        const summaryTable = generateSummaryTable(status, summary, formattedViolations, displayTarget, formattedIncomplete);
        return {
            target: displayTarget,
            timestamp: results.timestamp,
            wcagTagsAudited: auditedTags,
            status,
            summary,
            summaryTable,
            violations: formattedViolations,
            incomplete: formattedIncomplete
        };
    }
    finally {
        if (isCdp) {
            // Disconnect from remote CDP browser without closing user's Chrome/Edge window or tabs
            await cdpBrowser?.close().catch(() => { });
        }
        else {
            await context.close().catch(() => { });
        }
    }
}
/**
 * Audits an HTML string by injecting it into a real Playwright page.
 * This guarantees accurate layout, CSS computation, and color contrast.
 */
export async function auditHtml(html, options) {
    const { context, page } = await createAuditPage({ viewport: options?.viewport });
    try {
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
        await applyEmulation(page, options);
        const builder = new AxeBuilder({ page });
        configureAxeBuilder(builder, options);
        const results = await builder.analyze();
        // Attach bounding boxes for visual verification
        await attachBoundingBoxes(page, results.violations);
        if (options?.includeIncomplete && results.incomplete?.length) {
            await attachBoundingBoxes(page, results.incomplete);
        }
        const formattedViolations = formatViolations(results.violations, options?.impact, options?.detailed);
        const formattedIncomplete = options?.includeIncomplete
            ? formatViolations(results.incomplete, options?.impact, options?.detailed)
            : undefined;
        const byImpact = {
            critical: results.violations.filter((v) => v.impact === 'critical').length,
            serious: results.violations.filter((v) => v.impact === 'serious').length,
            moderate: results.violations.filter((v) => v.impact === 'moderate').length,
            minor: results.violations.filter((v) => v.impact === 'minor').length
        };
        const auditedTags = options?.tags && options.tags.length > 0
            ? options.tags
            : ['wcag2a', 'wcag2aa', 'wcag21aa'];
        const status = formattedViolations.length === 0 ? 'PASS' : 'FAIL';
        const summary = {
            violations: results.violations.length,
            incomplete: results.incomplete.length,
            passes: results.passes.length,
            inapplicable: results.inapplicable.length,
            byImpact
        };
        const summaryTable = generateSummaryTable(status, summary, formattedViolations, 'HTML snippet', formattedIncomplete);
        return {
            target: 'HTML snippet',
            timestamp: results.timestamp,
            wcagTagsAudited: auditedTags,
            status,
            summary,
            summaryTable,
            violations: formattedViolations,
            incomplete: formattedIncomplete
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
