/**
 * Deep Inspection & Bundle Probe
 */

async function main() {
  const url = 'http://localhost:3000/dashboard';
  const res = await fetch(url);
  const text = await res.text();

  console.log('--- ERROR & DIGEST SCAN ---');
  console.log('Contains "digest":', text.includes('digest'));
  console.log('Contains "server error":', text.toLowerCase().includes('server error'));
  console.log('Contains "client-side exception":', text.toLowerCase().includes('client-side exception'));
  console.log('Contains "Internal Server Error":', text.includes('Internal Server Error'));
  console.log('Contains "This page could not be found":', text.includes('This page could not be found'));
  console.log('Contains React Hydration Error Warning in SSR:', text.includes('Hydration failed') || text.includes('did not match'));

  // Search where "404" appears
  let idx = 0;
  while ((idx = text.indexOf('404', idx)) !== -1) {
    console.log('Found 404 at', idx, 'snippet:', text.slice(Math.max(0, idx - 40), Math.min(text.length, idx + 40)));
    idx += 3;
  }

  // Inspect scripts
  const scriptRegex = /src="(\/_next\/static\/[^"]+)"/g;
  const scriptSrcs = [];
  let m;
  while ((m = scriptRegex.exec(text)) !== null) {
    scriptSrcs.push(m[1]);
  }
  console.log('Script bundles referenced in HTML:', scriptSrcs.length);

  let rhBundled = false;
  for (const src of scriptSrcs) {
    const scriptRes = await fetch('http://localhost:3000' + src);
    if (scriptRes.status === 200) {
      const code = await scriptRes.text();
      if (code.includes('rhbrasil') || code.includes('recrutamento')) {
        console.log('WARNING: Legacy RH found in script:', src);
        rhBundled = true;
      }
    }
  }
  if (!rhBundled) {
    console.log('Clean bundle: No legacy RH strings found in referenced client bundles.');
  }

  console.log('--- SCAN COMPLETE ---');
}

main().catch(err => {
  console.error('Fatal error during scan:', err);
  process.exit(1);
});
