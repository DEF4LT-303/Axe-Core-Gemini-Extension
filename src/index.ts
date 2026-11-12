#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { auditUrl, auditHtml, getRuleInfo, listRules } from './axe.js';
import { closeBrowser } from './browser.js';

declare const __SERVER_VERSION__: string;
const version = typeof __SERVER_VERSION__ !== 'undefined' ? __SERVER_VERSION__ : '1.0.0';

const server = new McpServer({
  name: 'axe-a11y',
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
      ),
    headers: z
      .record(z.string())
      .optional()
      .describe(
        "Custom HTTP request headers for authenticated endpoints (e.g. {'Authorization': 'Bearer <token>', 'X-API-Key': '...'})"
      ),
    cookies: z
      .array(
        z.object({
          name: z.string().describe('Cookie name'),
          value: z.string().describe('Cookie value'),
          domain: z.string().optional().describe('Cookie domain'),
          path: z.string().optional().describe('Cookie path'),
          url: z.string().optional().describe('Cookie URL')
        })
      )
      .optional()
      .describe(
        "Cookies to attach for session-based authentication (e.g. [{ name: 'session_id', value: 'xyz123' }])"
      ),
    storageState: z
      .string()
      .optional()
      .describe(
        'Path to a Playwright storageState JSON file (or raw JSON string) containing saved cookies and localStorage'
      ),
    cdpUrl: z
      .string()
      .optional()
      .describe(
        "Chrome DevTools Protocol endpoint (e.g. 'http://localhost:9222') to attach directly to an already-open browser tab without re-navigating"
      ),
    includeIncomplete: z
      .boolean()
      .optional()
      .describe(
        "Include axe-core 'incomplete' results (elements needing visual review, e.g. text over background images/gradients)"
      ),
    emulateMedia: z
      .object({
        reducedMotion: z.enum(['reduce', 'no-preference']).optional().describe('Emulate prefers-reduced-motion'),
        forcedColors: z.enum(['active', 'none']).optional().describe('Emulate forced-colors (High Contrast Mode)'),
        colorScheme: z.enum(['dark', 'light']).optional().describe('Emulate prefers-color-scheme')
      })
      .optional()
      .describe('Emulate CSS media features (reduced motion, forced colors, dark/light theme)'),
    visionDeficiency: z
      .enum(['deuteranopia', 'protanopia', 'tritanopia', 'achromatopsia', 'blurredVision', 'none'])
      .optional()
      .describe("Emulate color vision deficiency (e.g. 'deuteranopia', 'protanopia', 'achromatopsia')")
  },
  async ({
    url,
    tags,
    rules,
    disableRules,
    include,
    exclude,
    impact,
    viewport,
    waitForSelector,
    detailed,
    headers,
    cookies,
    storageState,
    cdpUrl,
    includeIncomplete,
    emulateMedia,
    visionDeficiency
  }) => {
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
        detailed,
        headers,
        cookies,
        storageState,
        cdpUrl,
        includeIncomplete,
        emulateMedia,
        visionDeficiency
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
      .describe('Whether to return all failing element nodes'),
    includeIncomplete: z
      .boolean()
      .optional()
      .describe("Include axe-core 'incomplete' results (elements needing visual review)"),
    emulateMedia: z
      .object({
        reducedMotion: z.enum(['reduce', 'no-preference']).optional().describe('Emulate prefers-reduced-motion'),
        forcedColors: z.enum(['active', 'none']).optional().describe('Emulate forced-colors'),
        colorScheme: z.enum(['dark', 'light']).optional().describe('Emulate prefers-color-scheme')
      })
      .optional()
      .describe('Emulate CSS media features (reduced motion, forced colors, dark/light theme)'),
    visionDeficiency: z
      .enum(['deuteranopia', 'protanopia', 'tritanopia', 'achromatopsia', 'blurredVision', 'none'])
      .optional()
      .describe("Emulate color vision deficiency (e.g. 'deuteranopia', 'protanopia')")
  },
  async ({ html, tags, rules, disableRules, impact, detailed, includeIncomplete, emulateMedia, visionDeficiency }) => {
    try {
      const report = await auditHtml(html, {
        tags,
        rules,
        disableRules,
        impact,
        detailed,
        includeIncomplete,
        emulateMedia,
        visionDeficiency
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
1. Executive Compliance Summary Table: A clean Markdown table with Target, WCAG Status, Critical, Serious, Moderate, Minor, and Total Violations.
2. Violations Breakdown Table: A Markdown table with Rule ID, Severity, Element Count, Target Selector(s), and Short Description.
3. Prioritized Remediation Plan & Code Diffs: Group the violations from most critical to least critical. For each violation, explain the user barrier, offending code, and provide clean, corrected HTML/CSS snippets.

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

// Prompt: accessibility_full_protocol
server.prompt(
  'accessibility_full_protocol',
  'Execute the comprehensive multi-stage accessibility audit protocol combining axe-a11y with browser accessibility tree inspection.',
  {
    targetUrl: z.string().describe('URL to audit across desktop and mobile viewports'),
    authOptions: z.string().optional().describe('Optional session cookies, Bearer tokens, or storageState file')
  },
  async ({ targetUrl, authOptions }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Execute the comprehensive Accessibility Audit Protocol for "${targetUrl}" ${authOptions ? `(Authentication: ${authOptions})` : ''}:

1. Run \`audit_url\` with tags ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"], includeIncomplete: true on:
   - Desktop viewport: { width: 1280, height: 800 }
   - Mobile viewport: { width: 375, height: 812 }
2. If browser DevTools/Playwright MCP is connected:
   - Inspect the Accessibility Tree snapshot for semantic heading hierarchy, landmark regions, and accessible names.
   - Test keyboard navigation (Tab/Shift+Tab, Enter, Escape) for visible focus indicators, logical tab flow, and absence of traps.
3. Test interactive states (modals, drawers, validation errors) and audit their markup with \`audit_html\`.
4. Output:
   - Combined Executive Summary Table (Desktop & Mobile status).
   - Findings mapped to exact WCAG Success Criteria.
   - Concrete, production-ready code diffs to fix all detected violations.`
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
