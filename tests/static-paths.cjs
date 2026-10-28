const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../src/Hasadim.Web/wwwroot');
const pages = fs.readdirSync(path.join(root, 'html')).filter(name => name.endsWith('.html'));
const scripts = fs.readdirSync(path.join(root, 'js')).filter(name => name.endsWith('.js'));
const resources = new Set(['/footer.html']);
const files = [...pages.map(name => 'html/' + name),
    ...scripts.map(name => 'js/' + name), 'footer.html'];

for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const match of source.matchAll(/["'](\/(?!api\/)[^"'\s]*?\.(?:html|js|css|json|png))(?:[?#][^"']*)?["']/g)) {
        const url = match[1];
        assert(fs.existsSync(path.join(root, url.slice(1))), `${file}: missing resource ${url}`);
        resources.add(url);
    }
}

for (const page of pages) resources.add('/html/' + page);
for (const script of scripts) {
    resources.add('/js/' + script);
    execFileSync(process.execPath, ['--check', path.join(root, 'js', script)]);
}
const loader = fs.readFileSync(path.join(root, 'js/page-loader.js'), 'utf8');
const workflowIndex = loader.indexOf("'/js/listing-workflow.js'");
const appIndex = loader.indexOf("'/js/app.js'");
assert(workflowIndex >= 0 && appIndex >= 0 && workflowIndex < appIndex,
    'Workflow must load before app');
for (const page of pages.filter(name => !['layout.html'].includes(name))) {
    const source = fs.readFileSync(path.join(root, 'html', page), 'utf8');
    assert(source.includes('href="/css/styles.css"'), `${page}: main stylesheet missing`);
}
console.log(`PASS: all referenced local resources exist; ${scripts.length} scripts parse`);

const baseUrl = process.argv[2];
if (baseUrl) {
    (async () => {
        let count = 0;
        for (const resource of resources) {
            const response = await fetch(new URL(resource, baseUrl));
            assert.equal(response.status, 200, `${resource}: HTTP ${response.status}`);
            const mime = response.headers.get('content-type');
            if (resource.endsWith('.html')) assert(mime.includes('text/html'), resource);
            if (resource.endsWith('.js')) assert(/javascript/.test(mime), resource);
            if (resource.endsWith('.css')) assert(mime.includes('text/css'), resource);
            count++;
        }
        for (const [oldUrl, expected] of [
            ['/?view=mine&q=elma', '/html/index.html?view=mine&q=elma'],
            ['/index.html?q=elma', '/html/index.html?q=elma'],
            ['/ilan.html?id=example', '/html/ilan.html?id=example'],
            ['/sifre-yenile.html?email=a%40b.test&token=test', '/html/sifre-yenile.html?email=a%40b.test&token=test']
        ]) {
            const response = await fetch(new URL(oldUrl, baseUrl), { redirect: 'manual' });
            assert.equal(response.status, 302, oldUrl);
            assert.equal(response.headers.get('location'), expected, oldUrl);
            count++;
        }
        console.log(`PASS: ${count} live HTTP checks (pages, assets and query-preserving redirects)`);
    })().catch(error => { console.error(error); process.exitCode = 1; });
}
