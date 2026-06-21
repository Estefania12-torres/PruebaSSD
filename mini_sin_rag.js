const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';
const fs = require('fs');

async function main() {
    // Read the SIN RAG workflow
    const raw = fs.readFileSync('workflow_sin_rag.json', 'utf8');
    const fullWf = JSON.parse(raw);

    // Build a minimal version: only first 5 nodes: Webhook, Detect Engine, Context Agent, Gemini Model (Context), Clear Schema Query
    const nodeNames = ['Webhook', 'Detect Engine', 'Context Agent', 'Gemini Model (Context)', 'Clear Schema Query', 'Respond'];
    const nodes = fullWf.nodes.filter(n => nodeNames.includes(n.name));
    
    // Add a respond to webhook node
    nodes.push({
        id: 'respond-final',
        name: 'Respond',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [0, 300],
        parameters: {
            respondWith: 'json',
            responseBodyMode: 'derivedFromInput',
            options: {}
        }
    });

    // Build connections only for these nodes
    const connections = {};
    for (const nodeName of nodeNames) {
        if (fullWf.connections[nodeName]) {
            // Filter connections to only include nodes in our list + Respond
            const filteredConns = {};
            for (const [type, conns] of Object.entries(fullWf.connections[nodeName])) {
                filteredConns[type] = conns.map(group =>
                    group.filter(c => nodeNames.concat('Respond').includes(c.node))
                );
            }
            connections[nodeName] = filteredConns;
        }
    }
    // Connect Clear Schema Query to Respond
    connections['Clear Schema Query'] = {
        main: [[{ node: 'Respond', type: 'main', index: 0 }]]
    };

    const miniWf = {
        name: 'Mini SIN RAG Test',
        nodes,
        connections,
        settings: {}
    };

    // Fix credential ID and webhook
    const geminiNode = miniWf.nodes.find(n => n.name === 'Gemini Model (Context)');
    if (geminiNode && geminiNode.credentials) {
        geminiNode.credentials.googlePalmApi.id = 'vuAohdfPpHH4mDSw';
    }
    const webhookNode = miniWf.nodes.find(n => n.name === 'Webhook');
    if (webhookNode) {
        delete webhookNode.webhookId;
        webhookNode.parameters.path = 'mini-sin-rag-' + Date.now();
    }

    // Create
    const createRes = await fetch(N8N_URL + '/api/v1/workflows', {
        method: 'POST',
        headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(miniWf)
    });

    if (createRes.ok) {
        const wf = await createRes.json();
        console.log(`Created mini SIN RAG: ${wf.id}`);
        console.log(`Name: ${wf.name}`);

        // Activate
        const actRes = await fetch(N8N_URL + `/api/v1/workflows/${wf.id}/activate`, {
            method: 'POST',
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        if (actRes.ok) {
            console.log('Activated!');
            console.log('Webhook node path:', wf.nodes.find(n => n.name === 'Webhook')?.parameters?.path);
        } else {
            console.error('Activation failed:', await actRes.text());
        }
    } else {
        console.error('Create failed:', await createRes.text());
    }
}

main();
