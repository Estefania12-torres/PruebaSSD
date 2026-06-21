const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';

async function main() {
    const listRes = await fetch(N8N_URL + '/api/v1/workflows', {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const list = await listRes.json();

    for (const wf of list.data) {
        const detRes = await fetch(N8N_URL + '/api/v1/workflows/' + wf.id, {
            headers: { 'X-N8N-API-KEY': API_KEY }
        });
        const det = await detRes.json();
        console.log(`Workflow: ${wf.name}`);
        console.log(`  Settings: ${JSON.stringify(det.settings)}`);
        console.log(`  Active: ${wf.active}`);
    }
}

main();
