const http = require('http');

const BASE_URL = 'http://localhost:3000';

const ROUTES = [
    { path: '/en', expectedTitle: 'Agarwood Web', expectedCanonical: '/en' },
    { path: '/vi', expectedTitle: 'Trầm Hương Web', expectedCanonical: '/vi' },
    { path: '/en/products', expectedTitle: 'Zen Collection', expectedCanonical: '/en/products' },
    { path: '/vi/products', expectedTitle: 'Danh Mục Sản Phẩm', expectedCanonical: '/vi/products' },
    { path: '/en/products/kyara-bracelet', expectedTitle: 'Kyara Wood Bracelet', expectedCanonical: '/en/products/kyara-bracelet' },
];

async function fetchHtml(path) {
    return new Promise((resolve, reject) => {
        http.get(`${BASE_URL}${path}`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', (e) => {
            console.error(`Error connecting to ${BASE_URL}: Is the dev server running?`);
            reject(e);
        });
    });
}

async function runQA() {

    let passed = 0;
    let failed = 0;

    for (const route of ROUTES) {
        try {

            const html = await fetchHtml(route.path);

            // Check Title
            // Note: Title usually has suffix | Agarwood Web from template
            const titleMatch = html.match(/<title>(.*?)<\/title>/);
            const title = titleMatch ? titleMatch[1] : 'NO TITLE FOUND';

            if (title.includes(route.expectedTitle)) {

                passed++;
            } else {
                console.error(`❌ Title MISMATCH: Expected "${route.expectedTitle}", Found "${title}"`);
                failed++;
            }

            // Check Canonical
            const canonicalMatch = html.match(/<link rel="canonical" href="(.*?)"/);
            const canonical = canonicalMatch ? canonicalMatch[1] : 'NO CANONICAL FOUND';
            // Expected canonical involves full URL often? or generated relative?
            // Our generation code was `/${locale}...` but metadataBase might prepend.
            // Let's just check if it contains the path.

            if (canonical.endsWith(route.expectedCanonical)) {

                passed++;
            } else {
                console.error(`❌ Canonical MISMATCH: Expected suffix "${route.expectedCanonical}", Found "${canonical}"`);
                failed++;
            }

        } catch (e) {
            console.error(`❌ Failed to fetch ${route.path}:`, e.message);
            failed++;
        }
    }



    if (failed > 0) process.exit(1);
}

runQA();
