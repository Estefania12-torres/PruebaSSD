const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';

async function cleanup() {
    const listRes = await fetch(`${N8N_URL}/api/v1/workflows`, {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const list = await listRes.json();

    // Identify all SIN RAG copies
    const sinRagWorkflows = list.data.filter(w => w.name.includes('SIN RAG') && !w.name.includes('V3'));
    const originalWorkflows = list.data.filter(w => w.name === 'NL2SQL Architecture (3 Agents)' && !w.name.includes('SIN RAG') && !w.name.includes('V3'));

    console.log(`SIN RAG copies: ${sinRagWorkflows.length}`);
    console.log(`Original copies: ${originalWorkflows.length}`);

    // Delete all SIN RAG duplicates (except the first one we find)
    for (let i = 1; i < sinRagWorkflows.length; i++) {
        console.log(`Deleting duplicate SIN RAG: ${sinRagWorkflows[i].id} (${sinRagWorkflows[i].name})`);
        await fetch(`${N8N_URL}/api/v1/workflows/${sinRagWorkflows[i].id}`, {
            method: 'DELETE',
            headers: { 'X-N8N-API-KEY': API_KEY }
        });
    }

    // Delete all original duplicates (except the first one)
    for (let i = 1; i < originalWorkflows.length; i++) {
        console.log(`Deleting duplicate ORIGINAL: ${originalWorkflows[i].id} (${originalWorkflows[i].name})`);
        await fetch(`${N8N_URL}/api/v1/workflows/${originalWorkflows[i].id}`, {
            method: 'DELETE',
            headers: { 'X-N8N-API-KEY': API_KEY }
        });
    }

    // Activate the first SIN RAG workflow
    if (sinRagWorkflows.length > 0) {
        const toActivate = sinRagWorkflows[0];
        console.log(`Activating ${toActivate.name} (${toActivate.id})...`);

        // First update its webhookId to be unique
        const detailRes = await fetch(`${N8N_URL}/api/v1/workflows/${toActivate.id}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });
        const detail = await detailRes.json();

        // Change the webhook node's path to be unique
        const webhookNode = detail.nodes.find(n => n.name === 'Webhook');
        if (webhookNode) {
            webhookNode.parameters.path = 'nl2sql-sin-rag';
            webhookNode.webhookId = 'sin-rag-' + Date.now();
        }

        // Update the workflow
        const updateRes = await fetch(`${N8N_URL}/api/v1/workflows/${toActivate.id}`, {
            method: 'PUT',
            headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: detail.name,
                nodes: detail.nodes,
                connections: detail.connections,
                settings: detail.settings || {}
            })
        });

        if (updateRes.ok) {
            console.log('Workflow updated with new webhook path: nl2sql-sin-rag');
        } else {
            console.error('Update failed:', await updateRes.text());
        }

        // Activate
        const actRes = await fetch(`${N8N_URL}/api/v1/workflows/${toActivate.id}/activate`, {
            method: 'POST',
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        if (actRes.ok) {
            console.log('Workflow activated successfully!');
            console.log(`New webhook URL: http://localhost:5678/webhook/nl2sql-sin-rag`);
        } else {
            console.error('Activation failed:', await actRes.text());
        }
    }
}

cleanup();
