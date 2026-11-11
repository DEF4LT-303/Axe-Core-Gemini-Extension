import axe, { type RuleMetadata } from 'axe-core';
import { AxeBuilder } from '@axe-core/playwright';
import { createAuditPage, type CookieParam } from './browser.js';

export interface AuditOptions {
  tags?: string[];
  rules?: string[];
  disableRules?: string[];
  include?: string[];
  exclude?: string[];
  impact?: Array<'critical' | 'serious' | 'moderate' | 'minor'>;
  viewport?: { width: number; height: number };
  waitForSelector?: string;
  detailed?: boolean;
  headers?: Record<string, string>;
  cookies?: CookieParam[];
  storageState?: string;
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
  summaryTable: string;
  violations: ViolationSummary[];
}

/**
 * Generates a clean Markdown table summarizing the audit results.
 */
export function generateSummaryTable(
  status: 'PASS' | 'FAIL',
  summary: AuditReport['summary'],
  violations: ViolationSummary[],
  target: string
): string {
  const statusDisplay = status === 'PASS' ? 'PASS (Compliant)' : 'FAIL (Violations Found)';
  const { byImpact, violations: totalViolations, passes } = summary;

  const headerTable = [
    `| Target | Status | Critical | Serious | Moderate | Minor | Total Violations | Passed Rules |`,
    `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |`,
    `| ${target} | **${statusDisplay}** | ${byImpact.critical} | ${byImpact.serious} | ${byImpact.moderate} | ${byImpact.minor} | ${totalViolations} | ${passes} |`
  ].join('\n');

  if (totalViolations === 0) {
    return headerTable;
  }

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

  return `${headerTable}\n\n${breakdownTable}`;
}

/**
 * Normalizes and formats axe-core violations for LLM context efficiency.
 */
function formatViolations(
  violations: any[],
  impactFilter?: Array<'critical' | 'serious' | 'moderate' | 'minor'>,
  detailed: boolean = false
): ViolationSummary[] {
  let filtered = violations;
  if (impactFilter && impactFilter.length > 0) {
    const allowed = new Set(impactFilter.map((i) => i.toLowerCase()));
    filtered = filtered.filter((v) => v.impact && allowed.has(v.impact.toLowerCase()));
  }

  return filtered.map((v) => {
    const maxNodes = detailed ? v.nodes.length : 5;
    const elements: NodeSummary[] = v.nodes.slice(0, maxNodes).map((node: any) => ({
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
function configureAxeBuilder(builder: AxeBuilder, options?: AuditOptions): AxeBuilder {
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
export async function auditUrl(url: string, options?: AuditOptions): Promise<AuditReport> {
  const preparedCookies = options?.cookies?.map((c) => {
    // If neither domain nor url is provided, default to target URL so Playwright doesn't reject it
    if (!c.domain && !c.url) {
      return { ...c, url };
    }
    return c;
  });

  const { context, page } = await createAuditPage({
    viewport: options?.viewport,
    headers: options?.headers,
    cookies: preparedCookies,
    storageState: options?.storageState
  });

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

    const status: 'PASS' | 'FAIL' = formattedViolations.length === 0 ? 'PASS' : 'FAIL';
    const summary = {
      violations: results.violations.length,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length,
      byImpact
    };

    const summaryTable = generateSummaryTable(status, summary, formattedViolations, url);

    return {
      target: url,
      timestamp: results.timestamp,
      wcagTagsAudited: auditedTags,
      status,
      summary,
      summaryTable,
      violations: formattedViolations
    };
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * Audits an HTML string by injecting it into a real Playwright page.
 * This guarantees accurate layout, CSS computation, and color contrast.
 */
export async function auditHtml(html: string, options?: AuditOptions): Promise<AuditReport> {
  const { context, page } = await createAuditPage({ viewport: options?.viewport });

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

    const status: 'PASS' | 'FAIL' = formattedViolations.length === 0 ? 'PASS' : 'FAIL';
    const summary = {
      violations: results.violations.length,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length,
      byImpact
    };

    const summaryTable = generateSummaryTable(status, summary, formattedViolations, 'HTML snippet');

    return {
      target: 'HTML snippet',
      timestamp: results.timestamp,
      wcagTagsAudited: auditedTags,
      status,
      summary,
      summaryTable,
      violations: formattedViolations
    };
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * Returns metadata for a specific axe-core rule.
 */
export function getRuleInfo(ruleId: string): RuleMetadata | null {
  const rules = axe.getRules();
  const rule = rules.find((r) => r.ruleId.toLowerCase() === ruleId.toLowerCase());
  return rule ?? null;
}

/**
 * Lists available axe-core rules, optionally filtered by tag.
 */
export function listRules(tag?: string): RuleMetadata[] {
  if (tag) {
    return axe.getRules([tag]);
  }
  return axe.getRules();
}
