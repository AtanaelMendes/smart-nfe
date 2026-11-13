import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const testsDir = resolve(process.cwd(), 'tests/integration');
const testFiles = readdirSync(testsDir).filter(f => f.endsWith('.test.mjs'));

console.log('--- Static Analysis for Tautologies and Bypass Patterns ---');

let totalTautologies = 0;
let totalAssertCount = 0;

for (const file of testFiles) {
  const filePath = join(testsDir, file);
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  let fileAsserts = 0;
  let fileTautologies = 0;

  lines.forEach((line, idx) => {
    // Check assert calls
    if (line.includes('assert.')) {
      fileAsserts++;
      totalAssertCount++;

      // Tautology checks
      if (
        /assert\.(ok|strictEqual|equal|deepStrictEqual)\(\s*true\s*[,)]/.test(line) &&
        !line.includes('==') && !line.includes('===') && !line.includes('>') && !line.includes('<') && !line.includes('is') && !line.includes('valid') && !line.includes('canSave')
      ) {
        // Potential tautology like assert.ok(true)
        console.warn(`[WARN] Possible tautology in ${file}:${idx + 1}: ${line.trim()}`);
        fileTautologies++;
        totalTautologies++;
      }
      if (/assert\.(strictEqual|equal)\(\s*['"]?([a-zA-Z0-9_-]+)['"]?\s*,\s*['"]?\2['"]?\s*[,)]/.test(line)) {
        // e.g. assert.strictEqual('a', 'a')
        console.warn(`[WARN] Identical arguments in ${file}:${idx + 1}: ${line.trim()}`);
        fileTautologies++;
        totalTautologies++;
      }
    }
  });

  console.log(`${file}: ${fileAsserts} assertions, ${fileTautologies} tautology flags.`);
}

console.log(`\nTotal assertions across integration suites: ${totalAssertCount}`);
console.log(`Total detected tautology flags: ${totalTautologies}`);
