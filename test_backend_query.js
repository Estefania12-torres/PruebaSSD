const http = require('http');

const payload = JSON.stringify({
    sql: "SELECT * FROM information_schema.columns WHERE table_name IN ('ventas');",
    connection_string: 'postgres://postgres:caro@localhost:5432/db_supermercado'
});

const req = http.request('http://localhost:3000/api/query', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
    }
}, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', body.substring(0, 500));
    });
});

req.write(payload);
req.end();
