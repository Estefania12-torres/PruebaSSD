const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';

async function activateWorkflow() {
    // 1. Find the workflow by name
    const listRes = await fetch(`${N8N_URL}/api/v1/workflows`, {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const workflows = await listRes.json();
    
    const target = workflows.data.find(w => w.name === 'NL2SQL Architecture (3 Agents) - SIN RAG');
    if (!target) {
        console.log('Workflow not found. Searching for "SIN RAG"...');
        const fallback = workflows.data.find(w => w.name.includes('SIN RAG'));
        if (!fallback) {
            console.error('Workflow not found. Available workflows:', workflows.data.map(w => w.name));
            return;
        }
        console.log('Found workflow:', fallback.id, fallback.name);
        // Activate the found workflow
        const actRes = await fetch(`${N8N_URL}/api/v1/workflows/${fallback.id}/activate`, {
            method: 'POST',
            headers: { 'X-N8N-API-KEY': API_KEY }
        });
        if (actRes.ok) {
            console.log(`Workflow "${fallback.name}" activated successfully!`);
        } else {
            const err = await actRes.text();
            console.error('Error activating workflow:', err);
        }
        return;
    }

    console.log('Found workflow:', target.id, target.name);

    // 2. Activate it
    const actRes = await fetch(`${N8N_URL}/api/v1/workflows/${target.id}/activate`, {
        method: 'POST',
        headers: { 'X-N8N-API-KEY': API_KEY }
    });

    if (actRes.ok) {
        console.log(`Workflow "${target.name}" activated successfully!`);
    } else {
        const err = await actRes.text();
        console.error('Error activating workflow:', err);
    }
}

activateWorkflow();
