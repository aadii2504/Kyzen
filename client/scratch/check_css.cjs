const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.css')) results.push(file);
        }
    });
    return results;
}

const cssFiles = walk('./src');

cssFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const open = (content.match(/\{/g) || []).length;
    const close = (content.match(/\}/g) || []).length;
    if (open !== close) {
        console.log(`Mismatch in ${file}: { ${open}, } ${close}`);
    }
});
