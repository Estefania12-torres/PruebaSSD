const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';

async function main() {
    // Test LangChain: Webhook + Agent (with LLM)
    const testWf = {
        name: 'Test LangChain Webhook',
        nodes: [
            {
                id: 'wc-webhook',
                name: 'Webhook',
                type: 'n8n-nodes-base.webhook',
                typeVersion: 1,
                position: [-500, 300],
                parameters: {
                    httpMethod: 'POST',
                    path: 'test-langchain',
                    responseMode: 'lastNode',
                    options: {}
                }
            },
            {
                id: 'wc-agent',
                name: 'Test Agent',
                type: '@n8n/n8n-nodes-langchain.agent',
                typeVersion: 3.1,
                position: [-300, 300],
                parameters: {
                    promptType: 'define',
                    text: 'Say hello and return JSON with a greeting field',
                    options: {}
                }
            },
            {
                id: 'wc-llm',
                name: 'Gemini Model',
                type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
                typeVersion: 1,
                position: [-300, 500],
                parameters: {
                    modelName: 'models/gemini-2.5-flash-lite',
                    options: {}
                },
                credentials: {
                    googlePalmApi: {
                        id: 'vuAohdfPpHH4mDSw',
                        name: 'Google Gemini(PaLM) Api account'
                    }
                }
            },
            {
                id: 'wc-respond',
                name: 'Respond',
                type: 'n8n-nodes-base.respondToWebhook',
                typeVersion: 1,
                position: [-100, 300],
                parameters: {
                    respondWith: 'json',
                    responseBodyMode: 'derivedFromInput',
                    options: {}
                }
            }
        ],
        connections: {
            'Webhook': { main: [[ { node: 'Test Agent', type: 'main', index: 0 } ]] },
            'Test Agent': { main: [[ { node: 'Respond', type: 'main', index: 0 } ]] },
            'Gemini Model': { ai_languageModel: [[ { node: 'Test Agent', type: 'ai_languageModel', index: 0 } ]] }
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
        console.log(`Created: ${wf.id}`);

        // Activate
        const actRes = await fetch(N8N_URL + `/api/v1/workflows/${wf.id}/activate`, {
            method: 'POST',
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        if (actRes.ok) {
            console.log('Activated! Test URL: http://localhost:5678/webhook/test-langchain');
        } else {
            console.error('Activation failed:', await actRes.text());
        }
    } else {
        console.error('Create failed:', await createRes.text());
    }
}

main();
