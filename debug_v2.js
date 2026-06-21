const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
const N8N_URL = 'http://localhost:5678';

async function main() {
    // List all executions
    const execRes = await fetch(N8N_URL + '/api/v1/executions?limit=10&order=DESC', {
        headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const execList = await execRes.json();
    console.log('Total executions:', execList.data?.length || 0);

    if (execList.data && execList.data.length > 0) {
        for (const exec of execList.data) {
            console.log(`\n--- Execution ${exec.id} (workflow: ${exec.workflowId}) ---`);
            console.log(`Status: ${exec.status}, Mode: ${exec.mode}, Finished: ${exec.finished}`);

            // Get full details
            const detRes = await fetch(N8N_URL + '/api/v1/executions/' + exec.id, {
                headers: { 'X-N8N-API-KEY': API_KEY }
            });
            const det = await detRes.json();

            if (det.data?.resultData?.error) {
                console.log('Error:', JSON.stringify(det.data.resultData.error, null, 2));
            }
            if (det.data?.resultData?.runData) {
                console.log('Nodes executed:', Object.keys(det.data.resultData.runData));
                for (const [nodeName, runs] of Object.entries(det.data.resultData.runData)) {
                    const lastRun = runs[runs.length - 1];
                    if (lastRun.error) {
                        console.log(`  ${nodeName} ERROR:`, lastRun.error.message || JSON.stringify(lastRun.error));
                    }
                }
            } else {
                console.log('No runData available');
            }
        }
    }
}
main();
