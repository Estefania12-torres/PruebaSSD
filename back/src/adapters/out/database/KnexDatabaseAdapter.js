const knex = require('knex');
const DatabasePort = require('../../../core/ports/out/DatabasePort');

class KnexDatabaseAdapter extends DatabasePort {
  constructor() {
    super();
    this.connections = new Map();
  }

  /**
   * Crea o recupera una conexión Knex de forma dinámica
   */
  getConnection(connectionString) {
    if (this.connections.has(connectionString)) {
      return this.connections.get(connectionString);
    }

    // Detectar el tipo de base de datos a partir de la cadena de conexión
    let client = '';
    const connLower = connectionString.toLowerCase();

    if (connLower.startsWith('postgres://') || connLower.startsWith('postgresql://')) {
      client = 'pg';
    } else if (connLower.startsWith('mysql://') || connLower.startsWith('mysql2://')) {
      client = 'mysql2';
    } else if (connLower.startsWith('sqlite://') || connLower.startsWith('sqlite3://') || connLower.includes('.db')) {
      client = 'sqlite3';
    } else if (connLower.startsWith('sqlserver://') || connLower.startsWith('mssql://')) {
      client = 'mssql';
    } else if (connLower.startsWith('oracle://') || connLower.startsWith('oracledb://')) {
      client = 'oracledb';
    } else {
      throw new Error('No se pudo determinar el tipo de base de datos de la cadena de conexión.');
    }

    const config = {
      client,
      connection: client === 'sqlite3' ? { filename: connectionString.replace('sqlite://', '') } : connectionString,
      useNullAsDefault: client === 'sqlite3' ? true : undefined,
      pool: client !== 'sqlite3' ? { min: 1, max: 5 } : undefined
    };

    const connInstance = knex(config);
    this.connections.set(connectionString, connInstance);
    return connInstance;
  }

  async executeQuery(connectionString, sqlQuery) {
    const db = this.getConnection(connectionString);
    const result = await db.raw(sqlQuery);
    
    // Normalizar la salida para diferentes motores de base de datos
    const connLower = connectionString.toLowerCase();
    if (connLower.startsWith('postgres') || connLower.startsWith('pg')) {
      return result.rows || result;
    }
    if (connLower.startsWith('mysql')) {
      return result[0] || result;
    }
    if (result && result.rows) {
      return result.rows;
    }
    if (result && result.recordset) {
      return result.recordset;
    }
    return Array.isArray(result) ? result : [result];
  }

  /**
   * Extrae el esquema de la base de datos de forma adaptativa para CUALQUIER motor
   */
  async extractSchema(connectionString) {
    const db = this.getConnection(connectionString);
    const schema = {};
    const connLower = connectionString.toLowerCase();

    try {
      if (connLower.startsWith('postgres') || connLower.startsWith('pg')) {
        // PostgreSQL
        const res = await db.raw(`
          SELECT table_name, column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public'
        `);
        for (const row of (res.rows || res)) {
          const table = row.table_name;
          const col = row.column_name;
          if (!schema[table]) schema[table] = { columns: [] };
          schema[table].columns.push(col);
        }
      } 
      else if (connLower.startsWith('mysql')) {
        // MySQL / MariaDB
        const res = await db.raw(`
          SELECT table_name, column_name 
          FROM information_schema.columns 
          WHERE table_schema = DATABASE()
        `);
        for (const row of (res[0] || res)) {
          const table = row.table_name || row.TABLE_NAME;
          const col = row.column_name || row.COLUMN_NAME;
          if (!schema[table]) schema[table] = { columns: [] };
          schema[table].columns.push(col);
        }
      } 
      else if (connLower.includes('.db') || connLower.startsWith('sqlite')) {
        // SQLite
        const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        for (const tRow of tables) {
          const tableName = tRow.name;
          const cols = await db.raw(`PRAGMA table_info(\`${tableName}\`)`);
          schema[tableName] = {
            columns: cols.map(c => c.name)
          };
        }
      } 
      else if (connLower.startsWith('sqlserver') || connLower.startsWith('mssql')) {
        // SQL Server (MSSQL)
        const res = await db.raw(`
          SELECT table_name, column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'dbo'
        `);
        for (const row of (res.recordset || res)) {
          const table = row.table_name || row.TABLE_NAME;
          const col = row.column_name || row.COLUMN_NAME;
          if (!schema[table]) schema[table] = { columns: [] };
          schema[table].columns.push(col);
        }
      } 
      else if (connLower.startsWith('oracle')) {
        // Oracle
        const res = await db.raw(`
          SELECT table_name, column_name 
          FROM user_tab_cols
        `);
        for (const row of (res.rows || res)) {
          const table = row.table_name || row.TABLE_NAME;
          const col = row.column_name || row.COLUMN_NAME;
          if (!schema[table]) schema[table] = { columns: [] };
          schema[table].columns.push(col);
        }
      } 
      else {
        // FALLBACK UNIVERSAL (Estándar ANSI SQL Information Schema)
        try {
          const res = await db.raw(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'performance_schema', 'sys', 'mysql')
          `);
          const rows = res.rows || res[0] || res;
          if (Array.isArray(rows)) {
            for (const row of rows) {
              const table = row.table_name || row.TABLE_NAME;
              const col = row.column_name || row.COLUMN_NAME;
              if (table && col) {
                if (!schema[table]) schema[table] = { columns: [] };
                schema[table].columns.push(col);
              }
            }
          }
        } catch (err) {
          console.warn('El fallback de extracción genérica falló:', err.message);
        }
      }
    } catch (error) {
      console.error('Error extrayendo el esquema:', error);
      throw new Error(`Error extrayendo metadatos de la base de datos: ${error.message}`);
    }

    return schema;
  }
}

module.exports = KnexDatabaseAdapter;
