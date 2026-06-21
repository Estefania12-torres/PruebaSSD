const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';

async function fixWorkflow() {
    // Get SIN RAG workflow
    const listRes = await fetch(`${N8N_URL}/api/v1/workflows`, {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const list = await listRes.json();
    const wf = list.data.find(w => w.name.includes('SIN RAG'));
    if (!wf) { console.error('SIN RAG workflow not found'); return; }

    // Get full workflow detail
    const detailRes = await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}`, {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const detail = await detailRes.json();

    // Update settings
    detail.settings = {
        executionOrder: 'v1',
        binaryMode: 'separate',
        availableInMCP: false
    };
    detail.versionId = wf.versionId;

    // Deactivate first
    await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}/deactivate`, {
        method: 'POST',
        headers: { 'X-N8N-API-KEY': API_KEY }
    });

    // Send only the fields that n8n accepts via PUT
    const updatePayload = {
        name: detail.name,
        nodes: detail.nodes,
        connections: detail.connections,
        settings: {
            executionOrder: 'v1',
            binaryMode: 'separate'
        }
    };

    // Update workflow
    const updateRes = await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}`, {
        method: 'PUT',
        headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
    });

    if (updateRes.ok) {
        console.log('Workflow settings updated successfully!');
        // Reactivate
        await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}/activate`, {
            method: 'POST',
            headers: { 'X-N8N-API-KEY': API_KEY }
        });
        console.log('Workflow reactivated!');
    } else {
        const err = await updateRes.text();
        console.error('Update failed:', err);
    }
}

fixWorkflow();
