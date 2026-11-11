#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { auditUrl, auditHtml, getRuleInfo, listRules } from './axe.js';
import { closeBrowser } from './browser.js';

declare const __SERVER_VERSION__: string;
const version = typeof __SERVER_VERSION__ !== 'undefined' ? __SERVER_VERSION__ : '1.0.0';

const server = new McpServer({
  name: 'axe-core',
  version
});

// Tool: audit_url
server.tool(
  'audit_url',
  'Audit a web page URL for accessibility issues using the axe-core engine in a headless browser. Supports WCAG 2.0, 2.1, 2.2 (Level A, AA, AAA), Section 508, and accessibility best practices.',
  {
    url: z.string().describe("The URL to audit (e.g. 'http://localhost:3000', 'https://example.com')"),
    tags: z
      .array(z.string())
      .optional()
      .describe(
        "WCAG compliance tags to check, e.g. ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']. Defaults to ['wcag2a', 'wcag2aa', 'wcag21aa']."
      ),
    rules: z
      .array(z.string())
      .optional()
      .describe("Specific axe-core rule IDs to include/run (e.g. ['color-contrast', 'image-alt'])"),
    disableRules: z
      .array(z.string())
      .optional()
      .describe("Axe-core rule IDs to skip or ignore"),
    include: z
      .array(z.string())
      .optional()
      .describe("CSS selectors of elements or containers to restrict the scan to"),
    exclude: z
      .array(z.string())
      .optional()
      .describe("CSS selectors of elements to exclude from the scan (e.g. ['#cookie-notice'])"),
    impact: z
      .array(z.enum(['critical', 'serious', 'moderate', 'minor']))
      .optional()
      .describe("Filter violations by impact severity levels"),
    viewport: z
      .object({
        width: z.number().describe('Viewport width in pixels'),
        height: z.number().describe('Viewport height in pixels')
      })
      .optional()
      .describe('Custom viewport for mobile or tablet responsive auditing'),
    waitForSelector: z
      .string()
      .optional()
      .describe('CSS selector to wait for before running the audit (useful for SPAs)'),
    detailed: z
      .boolean()
      .optional()
      .describe(
        'Whether to return all failing element nodes (default false limits to first 5 nodes per rule for token efficiency)'
      )
  },
  async ({ url, tags, rules, disableRules, include, exclude, impact, viewport, waitForSelector, detailed }) => {
    try {
      const report = await auditUrl(url, {
        tags,
        rules,
        disableRules,
        include,
        exclude,
        impact,
        viewport,
        waitForSelector,
        detailed
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(report, null, 2)
          }
        ]
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to audit URL "${url}": ${message}`
          }
        ]
      };
    }
  }
);

// Tool: audit_html
server.tool(
  'audit_html',
  'Audit raw HTML strings or UI component markup for accessibility violations using axe-core. Renders in a real headless DOM for accurate computed styles and color contrast checks.',
  {
    html: z.string().describe('HTML string, template, or component markup to audit'),
    tags: z
      .array(z.string())
      .optional()
      .describe("WCAG compliance tags to check (e.g. ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'])"),
    rules: z
      .array(z.string())
      .optional()
      .describe("Specific axe-core rule IDs to include/run"),
    disableRules: z
      .array(z.string())
      .optional()
      .describe("Axe-core rule IDs to skip"),
    impact: z
      .array(z.enum(['critical', 'serious', 'moderate', 'minor']))
      .optional()
      .describe("Filter violations by impact severity levels"),
    detailed: z
      .boolean()
      .optional()
      .describe('Whether to return all failing element nodes')
  },
  async ({ html, tags, rules, disableRules, impact, detailed }) => {
    try {
      const report = await auditHtml(html, {
        tags,
        rules,
        disableRules,
        impact,
        detailed
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(report, null, 2)
          }
        ]
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to audit HTML snippet: ${message}`
          }
        ]
      };
    }
  }
);

// Tool: get_rule_info
server.tool(
  'get_rule_info',
  'Retrieve detailed documentation, WCAG criteria, description, and help URL for a specific axe-core rule ID.',
  {
    ruleId: z
      .string()
      .describe("The axe-core rule ID (e.g. 'color-contrast', 'image-alt', 'button-name', 'aria-valid-attr')")
  },
  async ({ ruleId }) => {
    const info = getRuleInfo(ruleId);
    if (!info) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Rule "${ruleId}" was not found in axe-core. Use list_rules to see all available rule IDs.`
          }
        ]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(info, null, 2)
        }
      ]
    };
  }
);

// Tool: list_rules
server.tool(
  'list_rules',
  'List all available accessibility rules in axe-core, optionally filtered by standard WCAG tag or category.',
  {
    tag: z
      .string()
      .optional()
      .describe(
        "Optional tag filter: 'wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice', 'cat.color', 'cat.forms', etc."
      )
  },
  async ({ tag }) => {
    const rules = listRules(tag);
    const summary = rules.map((r) => ({
      ruleId: r.ruleId,
      description: r.description,
      tags: r.tags
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              totalRules: rules.length,
              filterTag: tag ?? 'all',
              rules: summary
            },
            null,
            2
          )
        }
      ]
    };
  }
);

// Prompt: accessibility_audit_summary
server.prompt(
  'accessibility_audit_summary',
  'Analyze an accessibility audit report and generate an executive summary with prioritized remediation recommendations.',
  {
    target: z.string().describe('URL or component description that was audited'),
    reportJson: z.string().describe('The JSON report generated by audit_url or audit_html')
  },
  async ({ target, reportJson }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please review the following axe-core accessibility audit report for "${target}".

Provide:
1. Executive Compliance Summary (WCAG Level AA status, total violations by severity: Critical, Serious, Moderate, Minor).
2. Prioritized Remediation Plan: Group the violations from most critical to least critical. For each violation, explain the barrier to users with disabilities, the exact offending element(s), and the code fix.
3. Code Diffs/Snippets: Provide clean, corrected HTML/CSS snippets for the top issues.

Audit Data:
\`\`\`json
${reportJson}
\`\`\``
          }
        }
      ]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error running axe-core MCP server:', err);
  closeBrowser().finally(() => process.exit(1));
});
