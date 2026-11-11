# Axe-Core MCP Extension for Gemini CLI

A Model Context Protocol (MCP) server that brings **[axe-core](https://github.com/dequelabs/axe-core)**—the industry standard accessibility testing engine—directly into **Gemini CLI**.

Test web applications, local development servers, and HTML snippets for **WCAG 2.0, 2.1, 2.2 (Level A, AA, AAA)**, **Section 508**, and accessibility best practices with real computed styles, color contrast analysis, and actionable remediation steps.

---

## Installation

Add the extension to your Gemini CLI in one command (no repository cloning or project files needed):

```bash
gemini extensions install https://github.com/DEF4LT-303/Axe-Core-Gemini-Extension
```

### Updating

Pull the latest version at any time:

```bash
gemini extensions update axe-core
```

---

## Key Features

- **Axe-Core Engine:** Powered by Deque Systems' official `@axe-core/playwright` and `axe-core`.
- **Smart Browser Fallback:** Automatically utilizes pre-installed **Google Chrome** or **Microsoft Edge**—no 200MB browser downloads required.
- **Accurate Color Contrast & Layout:** Runs in a real headless browser DOM, computing exact foreground/background contrast ratios and element visibility.
- **Token-Efficient Reports:** Tailored for Gemini CLI, returning concise summaries, offending element selectors, and clear remediation hints.

---

## Available Tools

Once installed, Gemini CLI automatically discovers these tools:

### 1. `audit_url`
Audits a live web page or local development server using axe-core in a headless browser.

**Parameters:**
- `url` *(string, required)*: The URL to audit (e.g., `http://localhost:3000`, `https://example.com`, or `file:///...`).
- `tags` *(string[], optional)*: WCAG compliance tags (e.g., `["wcag2a", "wcag2aa", "wcag21aa", "best-practice"]`). Default: WCAG 2.1 AA.
- `rules` *(string[], optional)*: Specific axe rule IDs to run.
- `disableRules` *(string[], optional)*: Axe rule IDs to skip.
- `include` *(string[], optional)*: CSS selectors of containers to restrict the audit to.
- `exclude` *(string[], optional)*: CSS selectors to exclude (e.g., `["#cookie-banner"]`).
- `impact` *(string[], optional)*: Filter by severity: `["critical", "serious", "moderate", "minor"]`.
- `viewport` *(object, optional)*: `{ width: number, height: number }` for responsive/mobile testing.
- `waitForSelector` *(string, optional)*: CSS selector to wait for before scanning (ideal for SPAs).
- `detailed` *(boolean, optional)*: Return all failing nodes (default limits to 5 per rule for token efficiency).

**Example Prompt:**
> *"Run an accessibility audit on http://localhost:5173 for WCAG 2.1 AA and list critical violations."*

---

### 2. `audit_html`
Audits raw HTML markup, component templates, or JSX snippets in an isolated headless DOM. Accurately tests color contrast, missing labels, invalid ARIA attributes, and element semantics.

**Parameters:**
- `html` *(string, required)*: Raw HTML string or component snippet to test.
- `tags`, `rules`, `disableRules`, `impact`, `detailed` *(same as above)*.

**Example Prompt:**
> *"Audit this button for accessibility issues: `<button style='color: #ccc; background: #fff;'>Submit</button>`"*

---

### 3. `get_rule_info`
Retrieves detailed documentation, help URLs, and WCAG criteria for any axe-core rule.

**Parameters:**
- `ruleId` *(string, required)*: The rule identifier (e.g., `color-contrast`, `image-alt`, `button-name`, `aria-roles`).

**Example Prompt:**
> *"Explain the axe-core rule 'color-contrast' and how to fix it."*

---

### 4. `list_rules`
Lists available axe-core rules, optionally filtered by tag or category.

**Parameters:**
- `tag` *(string, optional)*: Filter by tag (e.g., `wcag2aa`, `wcag21aa`, `cat.color`, `best-practice`).

**Example Prompt:**
> *"List all WCAG 2.1 AA rules available in axe-core."*

---

## Example Interaction

```text
User: Run an accessibility audit on http://localhost:3000

Gemini CLI:
Calling tool: mcp_axe-core_audit_url({ url: "http://localhost:3000" })

Result:
Status: FAIL (3 violations found)
- [CRITICAL] image-alt: 2 images are missing alt attributes (targets: .hero img, .nav-logo)
- [SERIOUS] color-contrast: Button text has insufficient contrast ratio of 2.1:1 (expected 4.5:1)
- [MODERATE] label: Form input #search-field is missing an associated <label>

Here is the prioritized remediation plan and the code diffs to fix them...
```

---

## Releasing Incremental Updates

Versions are automatically synchronized across `package.json`, `gemini-extension.json`, and the MCP server binary via npm's lifecycle hooks.

When you want to release an update:

```bash
# 1. Bump version (patch: 1.0.0 -> 1.0.1, minor: 1.1.0, major: 2.0.0)
# Automatically syncs gemini-extension.json, rebuilds dist/, and commits/tags:
npm version patch

# 2. Push commits and tags to GitHub:
git push origin main --tags
```

---

## Local Development & Contributing

```bash
# Clone the repository
git clone https://github.com/DEF4LT-303/Axe-Core-Gemini-Extension.git
cd Axe-Core-Gemini-Extension

# Install dependencies
npm install

# Build the standalone bundle
npm run build

# Run automated tests
npm test

# Test locally with Gemini CLI
gemini extensions link .
```

---

## License

MIT
