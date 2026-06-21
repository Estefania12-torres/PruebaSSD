const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';

async function debugLastExecution() {
    // 1. Get workflow ID
    const listRes = await fetch(`${N8N_URL}/api/v1/workflows`, {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const workflows = await listRes.json();
    const workflow = workflows.data.find(w => w.name.includes('SIN RAG'));
    if (!workflow) { console.error('Workflow SIN RAG not found'); return; }

    // 2. Get last execution
    const execRes = await fetch(`${N8N_URL}/api/v1/executions?workflowId=${workflow.id}&limit=1`, {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const execs = await execRes.json();
    if (!execs.data || execs.data.length === 0) { console.log('No executions found. Send a request first.'); return; }

    const lastExec = execs.data[0];
    console.log('=== LAST EXECUTION ===');
    console.log('Status:', lastExec.status);
    console.log('Started:', lastExec.startedAt);
    console.log('Stopped:', lastExec.stoppedAt);

    // 3. Get full execution data with node details
    const fullRes = await fetch(`${N8N_URL}/api/v1/executions/${lastExec.id}`, {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const fullExec = await fullRes.json();

    // Check executionData for node errors
    if (fullExec.data?.resultData?.runData) {
        for (const [nodeName, runs] of Object.entries(fullExec.data.resultData.runData)) {
            for (const run of runs) {
                if (run.error) {
                    console.log(`\n❌ ERROR in node: "${nodeName}"`);
                    console.log('Message:', run.error.message);
                    console.log('Description:', run.error.description || '(none)');
                    if (run.error.response) {
                        console.log('Response status:', run.error.response.status);
                        console.log('Response data:', run.error.response.data);
                    }
                }
            }
        }
    } else {
    console.log('\nNo runData found. Full execution:');
    console.log(JSON.stringify(fullExec, null, 2).substring(0, 3000));
    }

    // Also show the execution payloads
    if (fullExec.data?.resultData?.runData) {
        console.log('\n=== NODE OUTPUTS ===');
        for (const [nodeName, runs] of Object.entries(fullExec.data.resultData.runData)) {
            if (runs[0]?.data?.main?.[0]) {
                const output = runs[0].data.main[0][0];
                if (output && output.json) {
                    console.log(`\n--- ${nodeName} output ---`);
                    console.log(JSON.stringify(output.json).substring(0, 500));
                }
            }
        }
    }
}

debugLastExecution();
