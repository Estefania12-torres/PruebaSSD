const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';
const fs = require('fs');

async function main() {
    // Read the workflow JSON
    const raw = fs.readFileSync('workflow_sin_rag.json', 'utf8');
    const wf = JSON.parse(raw);

    // 1. Remove hardcoded webhookId so n8n generates a fresh one
    const webhookNode = wf.nodes.find(n => n.name === 'Webhook');
    if (webhookNode) {
        delete webhookNode.webhookId;
        webhookNode.parameters.path = 'nl2sql-sin-rag-v2';
    }

    // 2. Fix credential IDs to match what's actually in n8n
    // googlePalmApi real ID: vuAohdfPpHH4mDSw
    // groqApi real ID: 4ahee4fABoiyYPO4
    wf.nodes.forEach(node => {
        if (node.credentials) {
            if (node.credentials.googlePalmApi) {
                node.credentials.googlePalmApi.id = 'vuAohdfPpHH4mDSw';
            }
            if (node.credentials.groqApi) {
                node.credentials.groqApi.id = '4ahee4fABoiyYPO4';
            }
        }
    });

    // 3. Set empty settings object (validated by this n8n version)
    wf.settings = {};

    // Import the workflow
    const impRes = await fetch(N8N_URL + '/api/v1/workflows', {
        method: 'POST',
        headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(wf)
    });

    if (impRes.ok) {
        const created = await impRes.json();
        console.log(`Workflow created: ${created.name} (${created.id})`);

        // Activate it
        const actRes = await fetch(N8N_URL + `/api/v1/workflows/${created.id}/activate`, {
            method: 'POST',
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        if (actRes.ok) {
            console.log('Workflow activated successfully!');
            console.log(`Webhook URL: http://localhost:5678/webhook/nl2sql-sin-rag-v2`);
        } else {
            const err = await actRes.text();
            console.error('Activation failed:', err);
        }
    } else {
        const err = await impRes.text();
        console.error('Import failed:', err);
    }
}

main();
