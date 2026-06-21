const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';

async function checkConflict() {
    // List all workflows
    const listRes = await fetch(`${N8N_URL}/api/v1/workflows`, {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const list = await listRes.json();

    for (const wf of list.data) {
        const dRes = await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });
        const d = await dRes.json();
        const webhookNode = d.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
        if (webhookNode) {
            console.log(`${wf.name} (${wf.id}) - ${wf.active ? 'ACTIVE' : 'INACTIVE'} - path: ${webhookNode.parameters.path} - webhookId: ${webhookNode.webhookId}`);
        }
    }
}

checkConflict();
