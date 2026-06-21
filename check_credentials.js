const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';

async function main() {
    // Get all credentials
    const credRes = await fetch(N8N_URL + '/api/v1/credentials', {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const creds = await credRes.json();
    console.log('Existing credentials:');
    if (creds.data) {
        creds.data.forEach(c => console.log(`  - ${c.name} (${c.type})`));
    } else {
        console.log('  (none)');
    }

    // Get workflow connections
    const detRes = await fetch(N8N_URL + '/api/v1/workflows/7FlTWWlTtcHipn1L', {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const det = await detRes.json();

    // Check which nodes need credentials
    console.log('\nCredential requirements per node:');
    det.nodes.forEach(node => {
        if (node.credentials) {
            const credNames = Object.keys(node.credentials).map(k => `${k}: ${node.credentials[k].id || 'NO_ID'}`);
            console.log(`  ${node.name} (${node.type}): ${credNames.join(', ')}`);
        } else {
            console.log(`  ${node.name} (${node.type}): no credentials required`);
        }
    });
}
main();
