const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';
const fs = require('fs');

async function createAndTest(name, nodeConfigs, connections, path) {
    const raw = fs.readFileSync('workflow_sin_rag.json', 'utf8');
    const fullWf = JSON.parse(raw);

    const nodeMap = {};
    fullWf.nodes.forEach(n => { nodeMap[n.name] = JSON.parse(JSON.stringify(n)); });

    const nodes = nodeConfigs.map(c => {
        const n = nodeMap[c.name];
        if (c.overrides) Object.assign(n, c.overrides);
        if (n.name === 'Webhook') {
            delete n.webhookId;
            n.parameters.path = path;
        }
        // Fix credentials
        if (n.credentials?.googlePalmApi) n.credentials.googlePalmApi.id = 'vuAohdfPpHH4mDSw';
        if (n.credentials?.groqApi) n.credentials.groqApi.id = '4ahee4fABoiyYPO4';
        return n;
    });

    const respondNode = {
        id: 'resp-' + path,
        name: 'Respond',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [0, 300],
        parameters: { respondWith: 'json', responseBodyMode: 'derivedFromInput', options: {} }
    };
    nodes.push(respondNode);

    const wfData = { name, nodes, connections, settings: {} };

    // Create workflow
    const createRes = await fetch(N8N_URL + '/api/v1/workflows', {
        method: 'POST',
        headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(wfData)
    });

    if (!createRes.ok) { console.log(`[${name}] Create failed:`, await createRes.text()); return; }
    const created = await createRes.json();
    console.log(`[${name}] Created: ${created.id}`);

    // Activate
    const actRes = await fetch(N8N_URL + `/api/v1/workflows/${created.id}/activate`, {
        method: 'POST',
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    if (!actRes.ok) { console.log(`[${name}] Activation failed:`, await actRes.text()); return; }
    console.log(`[${name}] Activated`);

    // Test
    const body = '{"body":{"question":"listar ventas","connection_string":"postgres://postgres:caro@localhost:5432/db_supermercado","tables":["ventas"]}}';
    const testRes = await fetch(`http://localhost:5678/webhook/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body
    });
    const txt = await testRes.text();
    console.log(`[${name}] Response ${testRes.status}: ${txt.substring(0, 150)}`);
}

async function main() {
    const pathSuffix = Date.now();

    // Test 1: Webhook → Detect Engine → Respond
    await createAndTest(
        'Detect Engine Only',
        [{ name: 'Webhook' }, { name: 'Detect Engine' }],
        {
            'Webhook': { main: [[{ node: 'Detect Engine', type: 'main', index: 0 }]] },
            'Detect Engine': { main: [[{ node: 'Respond', type: 'main', index: 0 }]] }
        },
        'test-de-' + pathSuffix
    );

    // Test 2: Webhook → Detect Engine → Context Agent → Respond (with Gemini via ai_languageModel)
    await createAndTest(
        'Detect+Agent+Gemini',
        [{ name: 'Webhook' }, { name: 'Detect Engine' }, { name: 'Context Agent' }, { name: 'Gemini Model (Context)' }],
        {
            'Webhook': { main: [[{ node: 'Detect Engine', type: 'main', index: 0 }]] },
            'Detect Engine': { main: [[{ node: 'Context Agent', type: 'main', index: 0 }]] },
            'Context Agent': { main: [[{ node: 'Respond', type: 'main', index: 0 }]] },
            'Gemini Model (Context)': { ai_languageModel: [[{ node: 'Context Agent', type: 'ai_languageModel', index: 0 }]] }
        },
        'test-dag-' + pathSuffix
    );
}

main();
