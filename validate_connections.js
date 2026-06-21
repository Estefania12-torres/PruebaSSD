const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';

async function main() {
    const listRes = await fetch(N8N_URL + '/api/v1/workflows', {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const list = await listRes.json();
    const wf = list.data.find(w => w.name.includes('SIN RAG'));
    if (!wf) { console.error('Not found'); return; }

    console.log(`Workflow: ${wf.name} (${wf.id}) active: ${wf.active}`);

    const detRes = await fetch(N8N_URL + '/api/v1/workflows/' + wf.id, {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const det = await detRes.json();

    console.log(`\nSettings:`, JSON.stringify(det.settings));
    console.log(`\nWebhook node webhookId:`, det.nodes.find(n => n.name === 'Webhook')?.webhookId || 'NONE');
    console.log(`\nWebhook path:`, det.nodes.find(n => n.name === 'Webhook')?.parameters?.path || 'NONE');

    // Check all connections for validity
    console.log(`\n=== Validating Connections ===`);
    const nodeNames = new Set(det.nodes.map(n => n.name));
    for (const [fromNode, outputs] of Object.entries(det.connections)) {
        for (const [connType, connArray] of Object.entries(outputs)) {
            for (const conns of connArray) {
                for (const conn of conns) {
                    if (!nodeNames.has(conn.node)) {
                        console.log(`INVALID: ${fromNode} -> ${conn.node} (${conn.type})`);
                    } else {
                        // console.log(`OK: ${fromNode} -> ${conn.node} (${conn.type})`);
                    }
                }
            }
        }
    }

    // Also check for nodes that appear in connections but not mentioned
    const connectedTo = new Set();
    for (const [fromNode, outputs] of Object.entries(det.connections)) {
        for (const [connType, connArray] of Object.entries(outputs)) {
            for (const conns of connArray) {
                for (const conn of conns) {
                    connectedTo.add(conn.node);
                }
            }
        }
    }

    // Check for nodes that are not connected in any way
    for (const node of det.nodes) {
        if (node.name === 'Webhook') continue;
        const isSource = !!det.connections[node.name];
        const isTarget = connectedTo.has(node.name);
        if (!isSource && !isTarget) {
            console.log(`ISOLATED NODE: ${node.name}`);
        }
    }
}

main();
