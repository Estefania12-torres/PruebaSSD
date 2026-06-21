/**
 * @fileoverview Tests unitarios — Use Cases (con mocks)
 * Cubre: AskUseCase, ExecuteSqlUseCase, RunRawQueryUseCase
 */

const AskUseCase       = require('../../../src/core/useCases/AskUseCase');
const ExecuteSqlUseCase = require('../../../src/core/useCases/ExecuteSqlUseCase');
const RunRawQueryUseCase = require('../../../src/core/useCases/RunRawQueryUseCase');

// ─── MOCKS REUTILIZABLES ──────────────────────────────────────────────────────
const makeOrchestratorMock = (returnValue = { answer: 'ok', raw_data: [] }) => ({
  triggerWorkflow: jest.fn().mockResolvedValue(returnValue)
});

const makeRagMock = (contextValue = 'tabla: ventas | columna: total') => ({
  searchRelevantSchema: jest.fn().mockResolvedValue(contextValue),
  buildIndex: jest.fn().mockResolvedValue(undefined)
});

const makeDatabaseMock = (rows = [{ total: 100 }]) => ({
  executeQuery: jest.fn().mockResolvedValue(rows),
  extractSchema: jest.fn().mockResolvedValue({ ventas: { columns: ['id', 'total'] } })
});

// =============================================================================
describe('AskUseCase', () => {
  const validInput = {
    connection_string: 'postgresql://user:pass@localhost/db',
    question: '¿Cuál fue el total de ventas?'
  };

  test('ejecuta el workflow cuando la entrada es válida', async () => {
    const orchestratorMock = makeOrchestratorMock({ answer: 'Ventas: 1000', raw_data: [] });
    const ragMock = makeRagMock();
    const dbMock = makeDatabaseMock();

    const useCase = new AskUseCase(orchestratorMock, ragMock, dbMock);
    const result = await useCase.execute(validInput);

    expect(orchestratorMock.triggerWorkflow).toHaveBeenCalledTimes(1);
    expect(orchestratorMock.triggerWorkflow).toHaveBeenCalledWith(
      validInput.connection_string,
      validInput.question,
      expect.any(String)
    );
    expect(result).toEqual({ answer: 'Ventas: 1000', raw_data: [] });
  });

  test('construye el índice RAG si no existe contexto previo', async () => {
    const ragMock = {
      searchRelevantSchema: jest.fn()
        .mockResolvedValueOnce(null)   // primera llamada → no hay índice
        .mockResolvedValueOnce('tabla: ventas'), // segunda llamada → ya construido
      buildIndex: jest.fn().mockResolvedValue(undefined)
    };
    const dbMock = makeDatabaseMock();
    const orchestratorMock = makeOrchestratorMock();

    const useCase = new AskUseCase(orchestratorMock, ragMock, dbMock);
    await useCase.execute(validInput);

    expect(ragMock.buildIndex).toHaveBeenCalledTimes(1);
    expect(dbMock.extractSchema).toHaveBeenCalledWith(validInput.connection_string);
  });

  test('lanza error si connection_string está vacío', async () => {
    const useCase = new AskUseCase(makeOrchestratorMock(), makeRagMock(), makeDatabaseMock());
    await expect(
      useCase.execute({ connection_string: '', question: 'pregunta' })
    ).rejects.toThrow('connection_string is required and must be a non-empty string');
  });

  test('lanza error si question está vacío', async () => {
    const useCase = new AskUseCase(makeOrchestratorMock(), makeRagMock(), makeDatabaseMock());
    await expect(
      useCase.execute({ connection_string: 'postgresql://user:pass@localhost/db', question: '  ' })
    ).rejects.toThrow('question is required and must be a non-empty string');
  });
});

// =============================================================================
describe('ExecuteSqlUseCase', () => {
  const validInput = {
    connection_string: 'postgresql://user:pass@localhost/db',
    sql: "SELECT SUM(total) AS ventas_totales FROM ventas LIMIT 100",
    llm_template: 'Resultado: {{DATOS}}'
  };

  test('ejecuta la query y retorna answer + raw_data', async () => {
    const dbMock = makeDatabaseMock([{ ventas_totales: '8208.00' }]);
    const useCase = new ExecuteSqlUseCase(dbMock);
    const result = await useCase.execute(validInput);

    expect(dbMock.executeQuery).toHaveBeenCalledWith(
      validInput.connection_string,
      validInput.sql
    );
    expect(result.raw_data).toEqual([{ ventas_totales: '8208.00' }]);
    expect(result.answer).toContain('8208.00');
    expect(result.answer).toContain('Resultado:');
  });

  test('popula el template correctamente cuando incluye {{DATOS}}', async () => {
    const dbMock = makeDatabaseMock([{ col: 'valor' }]);
    const useCase = new ExecuteSqlUseCase(dbMock);
    const result = await useCase.execute({ ...validInput, llm_template: 'Datos: {{DATOS}}' });
    expect(result.answer).toMatch(/Datos:.*col.*valor/s);
  });

  test('lanza error si connection_string está ausente', async () => {
    const useCase = new ExecuteSqlUseCase(makeDatabaseMock());
    await expect(
      useCase.execute({ connection_string: '', sql: 'SELECT 1', llm_template: '' })
    ).rejects.toThrow('connection_string is required');
  });

  test('lanza error si sql está ausente', async () => {
    const useCase = new ExecuteSqlUseCase(makeDatabaseMock());
    await expect(
      useCase.execute({ connection_string: 'postgresql://user:pass@localhost/db', sql: '', llm_template: '' })
    ).rejects.toThrow('sql query is required');
  });
});

// =============================================================================
describe('RunRawQueryUseCase', () => {
  const RunRawQueryUseCase = require('../../../src/core/useCases/RunRawQueryUseCase');

  test('retorna los resultados crudos de la base de datos', async () => {
    const rows = [{ count: '15340' }];
    const dbMock = makeDatabaseMock(rows);
    const useCase = new RunRawQueryUseCase(dbMock);
    const result = await useCase.execute({
      connection_string: 'postgresql://user:pass@localhost/db',
      sql: 'SELECT COUNT(*) FROM logs LIMIT 100'
    });
    expect(result).toEqual(rows);
    expect(dbMock.executeQuery).toHaveBeenCalledTimes(1);
  });

  test('limpia marcas markdown ```sql del query antes de ejecutar', async () => {
    const dbMock = makeDatabaseMock([]);
    const useCase = new RunRawQueryUseCase(dbMock);
    await useCase.execute({
      connection_string: 'postgresql://user:pass@localhost/db',
      sql: '```sql\nSELECT * FROM users LIMIT 100\n```'
    });
    const calledSql = dbMock.executeQuery.mock.calls[0][1];
    expect(calledSql).not.toContain('```');
    expect(calledSql).toContain('SELECT');
  });
});
