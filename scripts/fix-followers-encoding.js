/**
 * Rebuild followers.js from Tweepcred-Manager source with tem- ids and ASCII punctuation.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcPath = path.join(root, '..', 'Tweepcred-Manager', 'src', 'modules', 'followers.js');
const outPath = path.join(root, 'src', 'modules', 'followers.js');

let f = fs.readFileSync(srcPath, 'utf8');
if (f.charCodeAt(0) === 0xfeff) f = f.slice(1);
f = f.replace(/\r\n/g, '\n');
f = f.replace(/tpm-/g, 'tem-');
f = f.replace(/\[TPM Followers\]/g, '[TEM Followers]');
f = f.replace(/\[TPM\]/g, '[TEM]');
f = f.replace(/tpm-following-sorted/g, 'tem-following-sorted');
// Unicode punctuation -> ASCII
f = f.replace(/[\u2014\u2013\u2012\u2212]/g, '-');
f = f.replace(/[\u2018\u2019]/g, "'");
f = f.replace(/[\u201C\u201D]/g, '"');
f = f.replace(/\u2026/g, '...');
f = f.replace(/\u00B7/g, '|');
f = f.replace(/\u2192/g, '->');
f = f.replace(/\u2014/g, '-');

fs.writeFileSync(outPath, f, { encoding: 'utf8' });
const head = fs.readFileSync(outPath);
console.log('wrote', outPath, 'bytes', head.length, 'bom', head[0] === 0xef && head[1] === 0xbb);
console.log('mojibake', f.includes('â€'));
