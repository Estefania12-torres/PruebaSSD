/**
 * @fileoverview Tests e2e de la API HTTP — Endpoints Express
 * Cubre: POST /api/v1/ask, POST /api/execute, POST /api/query
 * Usa supertest para simular peticiones HTTP reales sin levantar el servidor.
 */

const request = require('supertest');
const app = require('../../src/infrastructure/server');

describe('API HTTP — /api/v1/ask', () => {
  test('devuelve 400 si falta connection_string', async () => {
    const res = await request(app)
      .post('/api/v1/ask')
      .send({ question: '¿Cuántos clientes hay?' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('cod_error');
  });

  test('devuelve 400 si falta question', async () => {
    const res = await request(app)
      .post('/api/v1/ask')
      .send({ connection_string: 'postgresql://user:pass@localhost/db' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('cod_error');
  });

  test('devuelve 400 si el body está completamente vacío', async () => {
    const res = await request(app)
      .post('/api/v1/ask')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('status', 'cod_error');
  });

  test('el Content-Type de respuesta es application/json', async () => {
    const res = await request(app)
      .post('/api/v1/ask')
      .send({ question: 'test', connection_string: 'postgresql://x:y@host/db' });
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

// =============================================================================
describe('API HTTP — /api/execute', () => {
  test('devuelve 400 si falta connection_string', async () => {
    const res = await request(app)
      .post('/api/execute')
      .send({ sql: 'SELECT 1', llm_template: '{{DATOS}}' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('cod_error');
  });

  test('devuelve 400 si falta sql', async () => {
    const res = await request(app)
      .post('/api/execute')
      .send({
        connection_string: 'postgresql://user:pass@localhost/db',
        llm_template: '{{DATOS}}'
      });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('cod_error');
  });
});

// =============================================================================
describe('API HTTP — /api/query', () => {
  test('devuelve 400 si falta connection_string', async () => {
    const res = await request(app)
      .post('/api/query')
      .send({ sql: 'SELECT 1' });

    expect(res.status).toBe(400);
  });

  test('devuelve 400 si falta sql', async () => {
    const res = await request(app)
      .post('/api/query')
      .send({ connection_string: 'postgresql://user:pass@localhost/db' });

    expect(res.status).toBe(400);
  });
});

// =============================================================================
describe('API HTTP — /health', () => {
  test('GET /health devuelve status UP', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });
});

// =============================================================================
describe('API HTTP — Rutas inexistentes', () => {
  test('GET /api/noexiste devuelve 404', async () => {
    const res = await request(app).get('/api/noexiste');
    expect(res.status).toBe(404);
  });
});
