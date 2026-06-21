const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';
const fs = require('fs');

async function createWithFixes(name, modeForCsq, codeReturn, path) {
    const raw = fs.readFileSync('workflow_sin_rag.json', 'utf8');
    const wf = JSON.parse(raw);

    wf.nodes.forEach(n => {
        if (n.credentials?.googlePalmApi) n.credentials.googlePalmApi.id = 'vuAohdfPpHH4mDSw';
        if (n.credentials?.groqApi) n.credentials.groqApi.id = '4ahee4fABoiyYPO4';
        if (n.name === 'Webhook') {
            delete n.webhookId;
            n.parameters.path = path;
        }
        // Set mode on all code nodes
        if (n.type === 'n8n-nodes-base.code') {
            if (!n.parameters.mode) {
                n.parameters.mode = 'runOnceForAllItems';
            }
        }
    });

    // Override Clear Schema Query's mode and code
    const csq = wf.nodes.find(n => n.name === 'Clear Schema Query');
    if (csq) {
        csq.parameters.mode = modeForCsq;
        if (codeReturn) {
            csq.parameters.jsCode = codeReturn;
        }
    }

    // Add Respond
    wf.nodes.push({
        id: 'final-respond', name: 'Respond to Webhook',
        type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1,
        position: [250, 0],
        parameters: { respondWith: 'json', responseBodyMode: 'derivedFromInput', options: {} }
    });
    wf.connections['Backend Execute'] = {
        main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]]
    };

    const createRes = await fetch(N8N_URL + '/api/v1/workflows', {
        method: 'POST', headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(wf)
    });
    if (!createRes.ok) { console.log('Create failed:', await createRes.text()); return; }
    const created = await createRes.json();

    const actRes = await fetch(N8N_URL + `/api/v1/workflows/${created.id}/activate`, {
        method: 'POST', headers: { 'X-N8N-API-KEY': API_KEY }
    });
    if (!actRes.ok) { console.log('Activation failed:', await actRes.text()); return; }
    console.log(`[${name}] Activated (${created.id})`);

    const body = '{"body":{"question":"listar ventas","connection_string":"postgres://postgres:caro@localhost:5432/db_supermercado","tables":["ventas"]}}';
    const testRes = await fetch(`http://localhost:5678/webhook/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body
    });
    const txt = await testRes.text();
    console.log(`[${name}] ${testRes.status}: ${txt.substring(0, 100)}`);
}

async function main() {
    const pfx = 'fix-' + Date.now();

    // Test 1: runOnceForAllItems with simple return
    await createWithFixes(
        'allItems',
        'runOnceForAllItems',
        `const tables = $('Webhook').first().json.body.tables || ['facturas'];
const formatted = Array.isArray(tables) ? tables.map(t => "'" + t.trim() + "'").join(', ') : "'facturas'";
const sql = 'SELECT * FROM information_schema.columns WHERE table_name IN (' + formatted + ') ORDER BY table_name;';
return [{ json: { sql: sql } }];`,
        pfx + '-a'
    );
}

main();
