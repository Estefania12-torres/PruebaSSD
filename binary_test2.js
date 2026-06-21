const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';
const fs = require('fs');

async function addNodes(name, extraNames, path) {
    const raw = fs.readFileSync('workflow_sin_rag.json', 'utf8');
    const fullWf = JSON.parse(raw);
    const allNodeMap = {};
    fullWf.nodes.forEach(n => { allNodeMap[n.name] = JSON.parse(JSON.stringify(n)); });

    // Base: Webhook, Detect Engine, Context Agent, Gemini Model (Context)
    const baseNames = ['Webhook', 'Detect Engine', 'Context Agent', 'Gemini Model (Context)'];
    const nodeNames = [...baseNames, ...extraNames];

    // Also add any nodes referenced in prompts
    const collectRefs = (txt) => {
        const refs = [];
        const re = /\$\(['\"](\w[\w\s]*)['\"]\)/g;
        let m;
        while ((m = re.exec(txt)) !== null) refs.push(m[1].trim());
        return refs;
    };

    let changed = true;
    while (changed) {
        changed = false;
        for (const nn of [...nodeNames]) {
            const node = allNodeMap[nn];
            if (node?.parameters?.text) {
                const refs = collectRefs(node.parameters.text);
                for (const ref of refs) {
                    if (!nodeNames.includes(ref) && allNodeMap[ref]) {
                        nodeNames.push(ref);
                        changed = true;
                    }
                }
            }
        }
    }

    // Build nodes
    const nodes = nodeNames.map(nn => {
        const n = JSON.parse(JSON.stringify(allNodeMap[nn]));
        if (n.credentials?.googlePalmApi) n.credentials.googlePalmApi.id = 'vuAohdfPpHH4mDSw';
        if (n.credentials?.groqApi) n.credentials.groqApi.id = '4ahee4fABoiyYPO4';
        if (n.name === 'Webhook') { delete n.webhookId; n.parameters.path = path; }
        return n;
    });

    // Add Respond
    nodes.push({
        id: 'resp-' + path, name: 'Respond', type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1, position: [0, 300],
        parameters: { respondWith: 'json', responseBodyMode: 'derivedFromInput', options: {} }
    });

    // Build connections
    const connections = {};
    for (const nodeName of nodeNames) {
        if (fullWf.connections[nodeName]) {
            const filtered = {};
            for (const [type, conns] of Object.entries(fullWf.connections[nodeName])) {
                filtered[type] = conns.map(group =>
                    group.filter(c => nodeNames.includes(c.node))
                );
            }
            if (Object.keys(filtered).length > 0) connections[nodeName] = filtered;
        }
    }

    // Find last node in chain and connect to Respond
    const allNodeNamesWithConn = new Set([...nodeNames, 'Respond']);
    const hasOutputTo = {};
    Object.entries(connections).forEach(([from, conns]) => {
        Object.values(conns).forEach(groups => {
            groups.forEach(group => {
                group.forEach(c => { hasOutputTo[from] = c.node; });
            });
        });
    });

    const lastNodes = nodeNames.filter(n => !Object.values(hasOutputTo).includes(n) || !hasOutputTo[n]);
    lastNodes.forEach(ln => {
        if (!connections[ln]) connections[ln] = {};
        connections[ln].main = [[{ node: 'Respond', type: 'main', index: 0 }]];
    });

    const wfData = { name, nodes, connections, settings: {} };

    const createRes = await fetch(N8N_URL + '/api/v1/workflows', {
        method: 'POST', headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(wfData)
    });

    if (!createRes.ok) { console.log(`[${name}] Create FAIL:`, await createRes.text()); return false; }
    const created = await createRes.json();

    const actRes = await fetch(N8N_URL + `/api/v1/workflows/${created.id}/activate`, {
        method: 'POST', headers: { 'X-N8N-API-KEY': API_KEY }
    });
    if (!actRes.ok) { console.log(`[${name}] Activation FAIL:`, await actRes.text()); return false; }

    const body = '{"body":{"question":"listar ventas","connection_string":"postgres://postgres:caro@localhost:5432/db_supermercado","tables":["ventas"]}}';
    const testRes = await fetch(`http://localhost:5678/webhook/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body
    });
    const txt = await testRes.text();
    console.log(`[${name}] ${testRes.status} (nodes: ${nodes.length})`);
    return testRes.ok;
}

async function main() {
    const pfx = 'bt-' + Date.now();

    // Test: add Security Parser + Backend Execute (the full chain)
    await addNodes('+Full', [
        'Clear Schema Query', 'Query DB Schema', 'Compliance Analyst (PII)',
        'Clear PII JSON', 'Backend Anonymizer',
        'Agente Razonador y Generador SQL', 'Groq Chat Model (Qwen)',
        'Parser Agente 2', 'Code in JavaScript',
        'Agente de Seguridad y Validación', 'Groq Chat Model (Defog)',
        'Security Parser', 'Backend Execute'
    ], pfx + '-h');
}
main();
