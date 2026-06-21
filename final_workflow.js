const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';
const fs = require('fs');

async function main() {
    const raw = fs.readFileSync('workflow_sin_rag.json', 'utf8');
    const wf = JSON.parse(raw);

    // Fix all credential IDs
    wf.nodes.forEach(n => {
        if (n.credentials?.googlePalmApi) n.credentials.googlePalmApi.id = 'vuAohdfPpHH4mDSw';
        if (n.credentials?.groqApi) n.credentials.groqApi.id = '4ahee4fABoiyYPO4';
        if (n.name === 'Webhook') {
            delete n.webhookId;
            n.parameters.path = 'nl2sql-v3-' + Date.now();
        }
    });

    // Fix missing "mode" on Code nodes (required in n8n 2.x)
    const codeNodesToFix = {
        'Clear Schema Query': 'runOnceForAllItems',
        'Security Parser': 'runOnceForAllItems',
        'Code in JavaScript': 'runOnceForAllItems'
    };

    wf.nodes.forEach(n => {
        if (n.type === 'n8n-nodes-base.code' && codeNodesToFix[n.name]) {
            n.parameters.mode = codeNodesToFix[n.name];
        }
    });

    // Add Respond to Webhook node (since original doesn't have one)
    wf.nodes.push({
        id: 'final-respond',
        name: 'Respond to Webhook',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [250, 0],
        parameters: {
            respondWith: 'json',
            responseBodyMode: 'derivedFromInput',
            options: {}
        }
    });

    // Connect Backend Execute to Respond
    wf.connections['Backend Execute'] = {
        main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]]
    };

    // Create workflow
    const createRes = await fetch(N8N_URL + '/api/v1/workflows', {
        method: 'POST',
        headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(wf)
    });

    if (createRes.ok) {
        const created = await createRes.json();
        console.log(`Created: ${created.name} (${created.id})`);

        const actRes = await fetch(N8N_URL + `/api/v1/workflows/${created.id}/activate`, {
            method: 'POST',
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        if (actRes.ok) {
            console.log('Activated successfully!');
            const path = wf.nodes.find(n => n.name === 'Webhook')?.parameters?.path;
            console.log('Webhook URL: http://localhost:5678/webhook/' + path);
        } else {
            console.error('Activation failed:', await actRes.text());
        }
    } else {
        const err = await createRes.text();
        console.error('Create failed:', err);
    }
}

main();
