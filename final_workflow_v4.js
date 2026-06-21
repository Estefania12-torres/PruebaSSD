const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';
const fs = require('fs');

async function main() {
    const raw = fs.readFileSync('workflow_sin_rag.json', 'utf8');
    const wf = JSON.parse(raw);

    // Fix all credential IDs
    wf.nodes.forEach(n => {
        if (n.credentials?.googlePalmApi) n.credentials.googlePalmApi.id = 'vuAohdfPpHH4mDSw';
        if (n.credentials?.groqApi) n.credentials.groqApi.id = '4ahee4fABoiyYPO4';
        if (n.name === 'Webhook') {
            delete n.webhookId;
            n.parameters.path = 'nl2sql-v4-' + Date.now();
        }
    });

    // Fix missing "mode" on Code nodes (required in n8n 2.x)
    // Clear Schema Query returns [{json:...}] but needs runOnceForEachItem to work 
    // Security Parser and Code in JavaScript also need setting
    wf.nodes.forEach(n => {
        if (n.type !== 'n8n-nodes-base.code') return;
        if (!n.parameters.mode) {
            if (['Clear Schema Query', 'Security Parser', 'Code in JavaScript'].includes(n.name)) {
                n.parameters.mode = 'runOnceForEachItem';
            }
        }
    });

    // Fix return format for nodes changed to runOnceForEachItem
    const fixReturnFormat = (nodeName) => {
        const node = wf.nodes.find(n => n.name === nodeName);
        if (node && node.parameters.jsCode) {
            node.parameters.jsCode = node.parameters.jsCode
                .replace('return [{', 'return {')
                .replace('}];', '};');
        }
    };
    fixReturnFormat('Clear Schema Query');
    fixReturnFormat('Security Parser');
    fixReturnFormat('Code in JavaScript');

    // Fix body reference in Clear Schema Query (nested body.body)
    const csq = wf.nodes.find(n => n.name === 'Clear Schema Query');
    if (csq && csq.parameters.jsCode) {
        csq.parameters.jsCode = csq.parameters.jsCode.replace(
            "$('Webhook').first().json.body.tables",
            "$('Webhook').first().json.body.body.tables"
        );
    }

    // Fix HTTP Request expressions: Webhook outputs body.body (nested structure)
    // Current: $node['Webhook'].json.body.XXX → should be $node['Webhook'].json.body.body.XXX
    wf.nodes.forEach(n => {
        if (n.type !== 'n8n-nodes-base.httpRequest') return;
        if (!n.parameters.url) return;

        // Fix URL parameter (backend_url reference)
        n.parameters.url = n.parameters.url.replace(
            /\$node\['Webhook'\]\.json\.body\.backend_url/g,
            "$node['Webhook'].json.body.body.backend_url"
        );

        // Fix body parameters (connection_string references)
        if (n.parameters.bodyParameters?.parameters) {
            n.parameters.bodyParameters.parameters.forEach(param => {
                if (param.value && param.value.includes("$node['Webhook'].json.body.") && !param.value.includes("body.body")) {
                    param.value = param.value.replace(
                        /\$node\['Webhook'\]\.json\.body\./g,
                        "$node['Webhook'].json.body.body."
                    );
                }
            });
        }
    });

    // Add Respond to Webhook node
    wf.nodes.push({
        id: 'final-respond',
        name: 'Respond to Webhook',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [250, 0],
        parameters: {
            respondWith: 'json',
            responseBodyMode: 'derivedFromInput',
            options: {}
        }
    });

    // Connect Backend Execute to Respond
    wf.connections['Backend Execute'] = {
        main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]]
    };

    // Create workflow
    const createRes = await fetch(N8N_URL + '/api/v1/workflows', {
        method: 'POST',
        headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(wf)
    });

    if (createRes.ok) {
        const created = await createRes.json();
        console.log(`Created: ${created.name} (${created.id})`);

        const actRes = await fetch(N8N_URL + `/api/v1/workflows/${created.id}/activate`, {
            method: 'POST',
            headers: { 'X-N8N-API-KEY': API_KEY }
        });

        if (actRes.ok) {
            console.log('Activated successfully!');
            const path = wf.nodes.find(n => n.name === 'Webhook')?.parameters?.path;
            console.log('Webhook URL: http://localhost:5678/webhook/' + path);
        } else {
            console.error('Activation failed:', await actRes.text());
        }
    } else {
        const err = await createRes.text();
        console.error('Create failed:', err);
    }
}

main();
