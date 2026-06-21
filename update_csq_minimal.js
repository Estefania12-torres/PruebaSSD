const K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYjE1YWRjYS0zNjc1LTQyMTAtOGVjNS00NGZkNWI5ZjAzNTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDcwNmQ3ZmMtZGZmYS00NjhjLWI5ZDAtNmE2MGRhOTY4MmVlIiwiaWF0IjoxNzgxOTk5NTQ2LCJleHAiOjE3ODQ1MjAwMDB9.GEfLCv0UMiNgV6xuVUPPIPEv3NMk4xEnvKpTz_LdO9U';
async function main() {
    const d = await (await fetch('http://localhost:5678/api/v1/workflows/p6tkjP1Ady1cZ2gm', { headers: { 'X-N8N-API-KEY': K } })).json();
    const csq = d.nodes.find(n => n.name === 'Clear Schema Query');

    // Minimal code: returns proper [{json: ...}] format
    csq.parameters.jsCode = [
        "const tables = $('Webhook').first().json.body.body.tables || ['facturas'];",
        "const formatted = Array.isArray(tables)",
        "  ? tables.map(t => \"'\" + t.trim() + \"'\").join(', ')",
        "  : \"'facturas'\";",
        "const sql = 'SELECT table_schema, table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN (' + formatted + ') ORDER BY table_name;';",
        "return [{json: {sql: sql}}];"
    ].join('\n');

    console.log('New code:');
    console.log(csq.parameters.jsCode);

    await fetch('http://localhost:5678/api/v1/workflows/p6tkjP1Ady1cZ2gm/deactivate', { method: 'POST', headers: { 'X-N8N-API-KEY': K } });

    const updRes = await fetch('http://localhost:5678/api/v1/workflows/p6tkjP1Ady1cZ2gm', {
        method: 'PUT',
        headers: { 'X-N8N-API-KEY': K, 'Content-Type': 'application/json' },
        body: JSON.stringify({name: d.name, nodes: d.nodes, connections: d.connections, settings: d.settings})
    });

    if (updRes.ok) {
        console.log('Updated');
        await fetch('http://localhost:5678/api/v1/workflows/p6tkjP1Ady1cZ2gm/activate', { method: 'POST', headers: { 'X-N8N-API-KEY': K } });
        console.log('Activated');

        // Test
        const http = require('http');
        const payload = JSON.stringify({body:{question:'test',connection_string:'postgres://postgres:caro@localhost:5432/db_supermercado',tables:['ventas']}});
        const testRes = await new Promise((resolve, reject) => {
            const req = http.request('http://localhost:5678/webhook/nl2sql-v5-1782011349909', {method:'POST',headers:{'Content-Type':'application/json'}}, res => {
                let b=''; res.on('data',c=>b+=c); res.on('end',()=>resolve({status:res.statusCode, body: b}));
            });
            req.write(payload); req.end();
        });
        console.log('Test:', testRes.status, testRes.body.substring(0, 200));
    } else {
        console.log('Update failed:', await updRes.text());
    }
}
main();
