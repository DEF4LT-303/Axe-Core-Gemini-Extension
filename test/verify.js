import { listRules, getRuleInfo, auditHtml, auditUrl } from '../dist/axe.js';
import { closeBrowser } from '../dist/browser.js';

async function test() {
  console.log('--- Testing listRules ---');
  const rules = listRules('wcag2aa');
  console.log(`Found ${rules.length} WCAG 2.1 AA rules. Example: ${rules[0]?.ruleId}`);

  console.log('\n--- Testing getRuleInfo ---');
  const colorRule = getRuleInfo('color-contrast');
  console.log('color-contrast rule found:', colorRule?.help);

  console.log('\n--- Testing auditHtml with known violations (missing alt, poor contrast) ---');
  const testSnippet = `
    <main>
      <h1>Accessible Heading</h1>
      <button style="color: #999; background-color: #aaa;">Low Contrast Button</button>
      <img src="test.png">
    </main>
  `;
  const htmlReport = await auditHtml(testSnippet);
  console.log(`Status: ${htmlReport.status}`);
  console.log(`Violations detected: ${htmlReport.summary.violations}`);
  for (const v of htmlReport.violations) {
    console.log(`- [${v.impact.toUpperCase()}] ${v.id}: ${v.help} (${v.elementCount} elements)`);
    for (const el of v.elements) {
      console.log(`    Target: ${el.target}`);
      console.log(`    Fix hint: ${el.failureSummary}`);
    }
  }

  await closeBrowser();

  console.log('\n--- Testing auditUrl with data URL ---');
  const urlReport = await auditUrl('data:text/html,<html lang="en"><head><title>Accessible Page</title></head><body><main><h1>Accessible Title</h1><p>Clean accessible content.</p></main></body></html>');
  console.log(`URL Audit Status: ${urlReport.status}`);
  console.log(`URL Violations detected: ${urlReport.summary.violations}`);

  await closeBrowser();
  console.log('\nVerification completed successfully!');
}

test().catch(async (err) => {
  console.error('Test failed:', err);
  await closeBrowser();
  process.exit(1);
});
