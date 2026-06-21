const fs = require('fs');

async function createWorkflow() {
  const filePath = 'NL2SQL Architecture (3 Agents) (2).json';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
  const url = 'http://localhost:5678/api/v1/workflows';

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const fullWorkflow = JSON.parse(data);
    
    // Only send the essential parts + required settings
    const workflow = {
        name: fullWorkflow.name,
        nodes: fullWorkflow.nodes,
        connections: fullWorkflow.connections,
        settings: {} 
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflow)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Workflow created successfully!');
      console.log(JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.error(`Failed to create workflow: ${response.status} ${response.statusText}`);
      console.error('Response:', errorText);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createWorkflow();
