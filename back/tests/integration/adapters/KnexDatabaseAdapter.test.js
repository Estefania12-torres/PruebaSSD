/**
 * @fileoverview Tests de integración — KnexDatabaseAdapter con SQLite en memoria
 * No requiere servidor externo. Usa SQLite como motor de prueba real.
 */

const KnexDatabaseAdapter = require('../../../src/adapters/out/database/KnexDatabaseAdapter');
const path = require('path');

// Usamos un archivo SQLite temporal en ./data/test.db
const TEST_DB = `sqlite://${path.join(__dirname, '../../fixtures/test.db')}`;

describe('KnexDatabaseAdapter — SQLite (integración real)', () => {
  let adapter;

  beforeAll(async () => {
    adapter = new KnexDatabaseAdapter();
    // Crear tablas de prueba
    const db = adapter.getConnection(TEST_DB);
    await db.raw(`CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      stock INTEGER DEFAULT 0
    )`);
    await db.raw(`DELETE FROM productos`);
    await db.raw(`INSERT INTO productos (nombre, precio, stock) VALUES
      ('Laptop', 1200.00, 10),
      ('Monitor', 350.00, 25),
      ('Teclado', 80.00, 100)`);
  });

  afterAll(async () => {
    const db = adapter.getConnection(TEST_DB);
    await db.raw(`DROP TABLE IF EXISTS productos`);
    await db.destroy();
  });

  // ─── executeQuery ────────────────────────────────────────────────────────
  describe('executeQuery()', () => {
    test('ejecuta SELECT y retorna filas como array', async () => {
      const rows = await adapter.executeQuery(TEST_DB, 'SELECT * FROM productos LIMIT 100');
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBe(3);
    });

    test('retorna campos correctos en cada fila', async () => {
      const rows = await adapter.executeQuery(TEST_DB, "SELECT nombre, precio FROM productos WHERE nombre = 'Laptop'");
      expect(rows[0]).toHaveProperty('nombre', 'Laptop');
      expect(rows[0]).toHaveProperty('precio', 1200);
    });

    test('ejecuta COUNT correctamente', async () => {
      const rows = await adapter.executeQuery(TEST_DB, 'SELECT COUNT(*) as total FROM productos LIMIT 100');
      expect(Number(rows[0].total)).toBe(3);
    });

    test('retorna array vacío si la query no devuelve datos', async () => {
      const rows = await adapter.executeQuery(
        TEST_DB,
        "SELECT * FROM productos WHERE nombre = 'NoExiste' LIMIT 100"
      );
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBe(0);
    });

    test('lanza error con SQL inválido', async () => {
      await expect(
        adapter.executeQuery(TEST_DB, 'SELEKT * FROM productos')
      ).rejects.toThrow();
    });
  });

  // ─── extractSchema ───────────────────────────────────────────────────────
  describe('extractSchema()', () => {
    test('extrae el esquema y retorna objeto con tablas y columnas', async () => {
      const schema = await adapter.extractSchema(TEST_DB);
      expect(schema).toHaveProperty('productos');
      expect(schema.productos).toHaveProperty('columns');
      expect(Array.isArray(schema.productos.columns)).toBe(true);
    });

    test('incluye las columnas correctas de la tabla productos', async () => {
      const schema = await adapter.extractSchema(TEST_DB);
      const cols = schema.productos.columns;
      expect(cols).toContain('id');
      expect(cols).toContain('nombre');
      expect(cols).toContain('precio');
      expect(cols).toContain('stock');
    });
  });

  // ─── getConnection — detección de motor ──────────────────────────────────
  describe('getConnection() — detección de motor por prefijo', () => {
    test('detecta sqlite por prefijo sqlite://', () => {
      const conn = adapter.getConnection(TEST_DB);
      expect(conn).toBeDefined();
    });

    test('lanza error para connection string desconocida', () => {
      expect(() => adapter.getConnection('mongodb://localhost/test'))
        .toThrow('No se pudo determinar el tipo de base de datos de la cadena de conexión.');
    });

    test('reutiliza la misma instancia Knex para la misma connection string', () => {
      const c1 = adapter.getConnection(TEST_DB);
      const c2 = adapter.getConnection(TEST_DB);
      expect(c1).toBe(c2);
    });
  });
});
