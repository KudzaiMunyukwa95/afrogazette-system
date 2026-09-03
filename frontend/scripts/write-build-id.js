// A backgrounded mobile tab can sit alive for days without ever
// re-requesting index.html — the no-cache header fixed the "reopen the
// site" case, but does nothing for a tab that's never closed at all, only
// switched away from and back to. This writes a fresh id into public/ on
// every build so the already-running app can poll for it and notice a
// newer build exists, instead of relying on a page load that may never
// happen.
const fs = require('fs');
const path = require('path');

const buildId = String(Date.now());
const outPath = path.join(__dirname, '..', 'public', 'build-id.txt');
fs.writeFileSync(outPath, buildId);
console.log(`build-id.txt -> ${buildId}`);
