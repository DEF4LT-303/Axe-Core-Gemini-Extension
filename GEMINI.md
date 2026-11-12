# Axe A11y Extension Instructions

You are equipped with the **Axe A11y** accessibility testing suite powered by the industry-standard `axe-core` engine.

## Core Capabilities
- `audit_url`: Full-page accessibility audit on live URLs, local dev servers (`http://localhost:3000`), or via direct Chrome/Edge CDP connection (`cdpUrl: 'http://localhost:9222'`, `url: 'current'`).
- `audit_html`: In-memory accessibility audit of raw HTML markup, JSX, or component templates (~50ms execution).
- `get_rule_info`: Retrieves official axe-core rule definitions, WCAG success criteria, and remediation advice.
- `list_rules`: Lists all axe-core rules by tag (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`, `best-practice`, `cat.color`, etc.).

---

## Accessibility Audit Protocol

Whenever the user asks to audit a page, component, or user flow for accessibility:

### 1. Engine Audit via `axe-a11y`
- Call `audit_url` on the target URL with `tags: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]` and `includeIncomplete: true`.
- Run audits across both:
  - **Desktop viewport:** `{ width: 1280, height: 800 }`
  - **Mobile viewport:** `{ width: 375, height: 812 }` (to detect responsive layout reflow, touch targets, and mobile contrast bugs).
- If the user provides session cookies, Bearer tokens, or a `storageState` file, forward them to `cookies`, `headers`, or `storageState`.
- If the user is running an open Chrome/Edge session with remote debugging (or asks to audit an active tab), connect directly via `cdpUrl: "http://localhost:9222"` with `url: "current"`.

### 2. Multi-MCP Orchestration (Playwright / Chrome DevTools / Firefox DevTools)
If browser automation MCP tools are available in the session:
1. **Accessibility Tree Inspection:**
   - Capture the Accessibility Tree snapshot (`browser_snapshot` or equivalent).
   - Verify semantic heading hierarchy (single `<h1>`, no skipped levels).
   - Check landmark structure (`<main>`, `<nav>`, `<header>`, `<footer>`, `<aside>`).
   - Ensure all interactive elements (icon buttons, links, inputs) have meaningful accessible names (`aria-label`, `<label>`, or inner text).
2. **Keyboard Navigation & Trap Verification:**
   - Simulate sequential keyboard navigation (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`).
   - Confirm all interactive elements have visible, high-contrast focus rings (WCAG 2.4.7).
   - Verify focus order matches the logical reading order (WCAG 2.4.3).
   - Ensure no keyboard traps exist (WCAG 2.1.2).
3. **Interactive & Dynamic States:**
   - Open dialogs/modals, dropdown menus, mobile navigation drawers, and form error states.
   - For open modal dialogs, verify focus is trapped inside the dialog and dismissed with `Escape`.
   - Run `audit_html` on the rendered HTML of these interactive states to catch conditional markup violations.

### 3. Visual Crop Verification via Bounding Boxes
Every violation and incomplete check returned by `axe-a11y` includes element bounding boxes (`rect: { x, y, width, height }`). When visual review is helpful, use Playwright or DevTools screenshot tools with `{ clip: element.rect }` to inspect the exact failing element.

---

## Output Standards

Always present audit findings in this structured format:

1. **Executive Summary Table:**
   Display a Markdown table with Target, WCAG Status (PASS/FAIL), Critical, Serious, Moderate, Minor, Incomplete (Review), Total Violations, and Passed Rules.
2. **Violations Breakdown Table:**
   Table with Rule ID, Severity, Elements Count, Target Selector(s), and Short Description.
3. **Incomplete (Needs Review) Table:**
   Highlight any items where axe-core flagged ambiguous contrast (e.g. text over images or gradients).
4. **Prioritized Remediation & Code Diffs:**
   Group fixes from Critical to Minor. For each issue:
   - Explain the user barrier (screen reader, keyboard-only, low vision).
   - Show the offending code.
   - Provide the clean, corrected code snippet ready for production.
