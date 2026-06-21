const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';

async function main() {
    // Create a minimal test workflow
    const testWf = {
        name: 'Test Simple Webhook',
        nodes: [
            {
                id: 'node-webhook',
                name: 'Webhook',
                type: 'n8n-nodes-base.webhook',
                typeVersion: 1,
                position: [-250, 250],
                parameters: {
                    httpMethod: 'GET',
                    path: 'test-simple',
                    responseMode: 'lastNode',
                    options: {}
                }
            },
            {
                id: 'node-respond',
                name: 'Respond',
                type: 'n8n-nodes-base.respondToWebhook',
                typeVersion: 1,
                position: [0, 250],
                parameters: {
                    respondWith: 'json',
                    responseBodyMode: 'derivedFromInput',
                    options: {}
                }
            }
        ],
        connections: {
            'Webhook': {
                main: [
                    [
                        { node: 'Respond', type: 'main', index: 0 }
                    ]
                ]
            }
        },
        settings: {}
    };

    // Create
    const createRes = await fetch(N8N_URL + '/api/v1/workflows', {
        method: 'POST',
        headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(testWf)
    });

    if (createRes.ok) {
        const wf = await createRes.json();
        console.log(`Created test workflow: ${wf.id}`);

        // Activate
        const actRes = await fetch(N8N_URL + `/api/v1/workflows/${wf.id}/activate`, {
            method: 'POST',
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        if (actRes.ok) {
            console.log('Test workflow activated!');
            console.log('Test URL: http://localhost:5678/webhook/test-simple');
        } else {
            console.error('Activation failed:', await actRes.text());
        }
    } else {
        console.error('Create failed:', await createRes.text());
    }
}

main();
