const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';
const fs = require('fs');

async function createIncremental(name, extraNodes, extraConns, path) {
    const raw = fs.readFileSync('workflow_sin_rag.json', 'utf8');
    const fullWf = JSON.parse(raw);
    const allNodeMap = {};
    fullWf.nodes.forEach(n => { allNodeMap[n.name] = JSON.parse(JSON.stringify(n)); });

    // Base nodes (known to work): Webhook, Detect Engine, Context Agent, Gemini Model (Context)
    const baseNodes = ['Webhook', 'Detect Engine', 'Context Agent', 'Gemini Model (Context)'];
    const allNodes = [...baseNodes, ...extraNodes];

    // Collect all prompt-referenced nodes too
    const referenced = new Set();
    allNodes.forEach(nn => {
        const node = allNodeMap[nn];
        if (node?.parameters?.text) {
            const text = node.parameters.text;
            const matches = text.match(/\$\(['\"](\w[\w\s]*)['\"]\)/g);
            if (matches) matches.forEach(m => {
                const refName = m.replace(/\$\(['"]/, '').replace(/['"]\)/, '');
                if (refName.trim()) referenced.add(refName.trim());
            });
        }
    });
    referenced.forEach(n => { if (!allNodes.includes(n)) allNodes.push(n); });

    const nodes = allNodes.map(nn => {
        const n = JSON.parse(JSON.stringify(allNodeMap[nn]));
        if (n.credentials?.googlePalmApi) n.credentials.googlePalmApi.id = 'vuAohdfPpHH4mDSw';
        if (n.credentials?.groqApi) n.credentials.groqApi.id = '4ahee4fABoiyYPO4';
        if (n.name === 'Webhook') { delete n.webhookId; n.parameters.path = path; }
        return n;
    });

    // Add Respond node
    nodes.push({
        id: 'resp-' + path,
        name: 'Respond',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [0, 300],
        parameters: { respondWith: 'json', responseBodyMode: 'derivedFromInput', options: {} }
    });

    // Build connections from the original
    const connections = {};
    for (const nodeName of allNodes) {
        if (fullWf.connections[nodeName]) {
            const filtered = {};
            for (const [type, conns] of Object.entries(fullWf.connections[nodeName])) {
                filtered[type] = conns.map(group =>
                    group.filter(c => allNodes.includes(c.node))
                );
            }
            connections[nodeName] = filtered;
        }
    }
    // Add custom connections
    Object.assign(connections, extraConns);

    // Add connection from last node in chain to Respond
    // Find the last node (longest chain)
    const lastInChain = allNodes.filter(n => {
        const conns = connections[n];
        if (!conns || !conns.main || conns.main.length === 0 || conns.main[0].length === 0) return true;
        return !conns.main[0].some(c => allNodes.includes(c.node));
    }).pop() || allNodes[allNodes.length - 1];

    if (!connections[lastInChain]) connections[lastInChain] = {};
    connections[lastInChain].main = [[{ node: 'Respond', type: 'main', index: 0 }]];

    const wfData = { name, nodes, connections, settings: {} };

    const createRes = await fetch(N8N_URL + '/api/v1/workflows', {
        method: 'POST', headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(wfData)
    });

    if (!createRes.ok) { console.log(`[${name}] Create FAIL:`, await createRes.text()); return; }
    const created = await createRes.json();

    const actRes = await fetch(N8N_URL + `/api/v1/workflows/${created.id}/activate`, {
        method: 'POST', headers: { 'X-N8N-API-KEY': API_KEY }
    });
    if (!actRes.ok) { console.log(`[${name}] Activation FAIL:`, await actRes.text()); return; }

    const body = '{"body":{"question":"listar ventas","connection_string":"postgres://postgres:caro@localhost:5432/db_supermercado","tables":["ventas"]}}';
    const testRes = await fetch(`http://localhost:5678/webhook/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body
    });
    const txt = await testRes.text();
    console.log(`[${name}] Nodes ${nodes.length}: ${testRes.status} - ${txt.substring(0, 100)}`);
}

async function main() {
    const pf = 'inc-' + Date.now();

    // Step 1: Add Clear Schema Query and Query DB Schema
    await createIncremental('+Schema+Query', ['Clear Schema Query', 'Query DB Schema'], {}, pf + '-a');

    // Note: If step 1 fails, the issue is with the HTTP Request node configuration
}

main();
