const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';

async function checkWorkflow() {
    // Get all workflows
    const listRes = await fetch(`${N8N_URL}/api/v1/workflows`, {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const list = await listRes.json();

    // Get the SIN RAG workflow
    const wf = list.data.find(w => w.name.includes('SIN RAG'));
    if (!wf) { console.log('SIN RAG workflow not found'); return; }

    console.log(`Workflow: ${wf.name} (${wf.id})`);
    console.log(`Active: ${wf.active}`);
    console.log(`VersionId: ${wf.versionId}\n`);

    // Get full workflow details
    const detailRes = await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}`, {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const detail = await detailRes.json();

    if (detail.nodes) {
        console.log(`Total nodes: ${detail.nodes.length}`);
        detail.nodes.forEach(node => {
            console.log(`- ${node.name} (${node.type}) pos: [${node.position}]`);
        });
    }

    console.log(`\nSettings: ${JSON.stringify(detail.settings)}`);
    console.log(`StaticData: ${JSON.stringify(detail.staticData)}`);
}

checkWorkflow();
