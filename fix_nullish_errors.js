const fs = require('fs');
const path = require('path');

const filePath = path.join('./client/src/pages/member-request-detail.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Apply fixes to mixed ?? and || operations
content = content.replace(/(\w+\??\.\w+) \?\? (\w+\??\.\w+) \|\| ""/g, '$1 ?? ($2 || "")');
content = content.replace(/{\s*\.\.\.editedRequest \|\| {}/g, '{ ...(editedRequest || {})}');

// Write the file back
fs.writeFileSync(filePath, content);

console.log('Fixed nullish coalescing errors.');
