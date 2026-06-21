const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';

async function findError() {
    // Get the SIN RAG workflow
    const listRes = await fetch(`${N8N_URL}/api/v1/workflows`, {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const list = await listRes.json();
    const wf = list.data.find(w => w.name.includes('SIN RAG') && !w.name.includes('V3'));
    if (!wf) { console.error('SIN RAG not found'); return; }

    console.log(`Workflow: ${wf.name} (${wf.id}) - Active: ${wf.active}`);

    // Get last 5 executions
    const execRes = await fetch(`${N8N_URL}/api/v1/executions?workflowId=${wf.id}&limit=5&order=DESC`, {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const execList = await execRes.json();

    if (!execList.data || execList.data.length === 0) {
        console.log('No executions found');
        return;
    }

    for (const exec of execList.data) {
        console.log(`\n--- Execution ${exec.id} ---`);
        console.log(`Status: ${exec.status}`);
        console.log(`Mode: ${exec.mode}`);
        console.log(`Finished: ${exec.finished}`);

        // Get full execution details
        const detRes = await fetch(`${N8N_URL}/api/v1/executions/${exec.id}`, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });
        const det = await detRes.json();

        if (det.data?.resultData?.error) {
            console.log(`Error: ${JSON.stringify(det.data.resultData.error, null, 2)}`);
        }
        if (det.data?.resultData?.runData) {
            const nodeNames = Object.keys(det.data.resultData.runData);
            console.log(`Nodes with data: ${nodeNames.length > 0 ? nodeNames.join(', ') : 'NONE'}`);
        } else {
            console.log('No runData - workflow failed during initialization');
        }
    }
}

findError();
