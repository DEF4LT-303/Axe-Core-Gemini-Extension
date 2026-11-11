# Axe-Core MCP Server for Gemini CLI

A Model Context Protocol (MCP) server that brings **[axe-core](https://github.com/dequelabs/axe-core)**—the industry standard accessibility testing engine—directly into **Gemini CLI**.

Test web applications, local development servers, and HTML markup for **WCAG 2.0, 2.1, 2.2 (Level A, AA, AAA)**, **Section 508**, and accessibility best practices with real computed styles, color contrast analysis, and actionable remediation steps.

---

## Highlights

- **Axe-Core Engine:** Powered by Deque Systems' official `@axe-core/playwright` and `axe-core`.
- **Smart Browser Fallback:** Automatically utilizes pre-installed **Google Chrome** or **Microsoft Edge**, eliminating massive browser downloads for your team.
- **Accurate Color Contrast & Layout:** Runs in a real headless browser DOM, computing exact foreground/background contrast ratios and layout visibility.
- **Token-Efficient Reports:** Formatted specifically for Gemini CLI, returning concise summaries and clear remediation hints.
- **Zero Local Files for Team Members:** Team members can install it with a single command via Gemini CLI Extensions or `npx`.

---

## How Team Members Add It (No Project Files Needed)

Your team members **do not** need to clone the project repository, install dependencies, or manage local source files. Choose any of the methods below:

### Method 1: Gemini CLI Extension (Recommended)

Gemini CLI has native extension support. Once you push this repository to GitHub or your team's Git server, team members simply run:

```bash
gemini extensions install https://github.com/<your-org-or-username>/Axe-Core-MCP
```

**Why this is the best method:**
- Gemini CLI downloads and manages the extension in its internal directory (`~/.gemini/extensions/axe-core`).
- Pre-bundled with all dependencies—works immediately with standard Node.js.
- Automatically enables the `axe-core` MCP server across all projects.
- Updates can be pulled automatically with `gemini extensions update axe-core`.

---

### Method 2: Global `gemini mcp add` via Git + npx

Team members can add the MCP server to their global user scope directly from the Git URL without installing extensions:

```bash
gemini mcp add --scope user axe-core npx -y git+https://github.com/<your-org-or-username>/Axe-Core-MCP.git
```

This writes to `~/.gemini/settings.json` and runs on demand via `npx`.

---

### Method 3: Via npm (If Published)

If you publish this package to npm (e.g., `axe-core-mcp` or `@your-org/axe-core-mcp`), team members can add it in one command:

```bash
gemini mcp add --scope user axe-core npx -y axe-core-mcp
```

Or add it to a specific project (`.gemini/settings.json`):

```bash
gemini mcp add axe-core npx -y axe-core-mcp
```

---

## Available Tools

Once installed, Gemini CLI automatically discovers the following tools:

### 1. `audit_url`
Audits a live web page or local development server using axe-core in a headless browser.

**Parameters:**
- `url` *(string, required)*: The URL to audit (e.g., `http://localhost:3000`, `https://example.com`, or `file:///...`).
- `tags` *(string[], optional)*: WCAG compliance tags to check (e.g., `["wcag2a", "wcag2aa", "wcag21aa", "best-practice"]`). Default: WCAG 2.1 AA.
- `rules` *(string[], optional)*: Specific axe rule IDs to include.
- `disableRules` *(string[], optional)*: Axe rule IDs to skip.
- `include` *(string[], optional)*: CSS selectors of containers to restrict the audit to.
- `exclude` *(string[], optional)*: CSS selectors to exclude (e.g., `["#cookie-banner"]`).
- `impact` *(string[], optional)*: Filter by severity: `["critical", "serious", "moderate", "minor"]`.
- `viewport` *(object, optional)*: `{ width: number, height: number }` for responsive/mobile testing.
- `waitForSelector` *(string, optional)*: CSS selector to wait for before scanning (ideal for SPAs).
- `detailed` *(boolean, optional)*: Include all failing element nodes (default is token-optimized).

**Example Prompt:**
> *"Run an accessibility audit on http://localhost:5173 for WCAG 2.1 AA and list critical violations."*

---

### 2. `audit_html`
Audits raw HTML markup, component templates, or JSX output in an isolated headless DOM. Accurately tests color contrast, missing labels, invalid ARIA attributes, and element semantics.

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

## Example Interaction in Gemini CLI

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

## Local Development & Contributing

If you want to modify or contribute to this MCP server:

```bash
# Clone the repository
git clone https://github.com/<your-org-or-username>/Axe-Core-MCP.git
cd Axe-Core-MCP

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

## Releasing Incremental Updates

Versions are automatically synchronized across `package.json`, `gemini-extension.json`, and the MCP server binary via npm's lifecycle hooks.

When you want to release an update:

```bash
# 1. Bump the version (patch: 1.0.0 -> 1.0.1, minor: 1.1.0, major: 2.0.0)
# This automatically syncs gemini-extension.json, rebuilds dist/, and stages files:
npm version patch

# 2. Push commits and tags to GitHub:
git push origin main --tags
```

Your team members can then update their installation at any time:
```bash
gemini extensions update axe-core
```

---

## License

MIT
