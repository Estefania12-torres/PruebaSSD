/**
 * @fileoverview Tests unitarios — FormatterService (Domain Service)
 * Cubre: formatResultsToMarkdown y populateTemplate
 */

const FormatterService = require('../../../src/core/domain/services/FormatterService');

describe('FormatterService — formatResultsToMarkdown()', () => {
  // ─── CASOS VACÍOS ─────────────────────────────────────────────────────────
  test('retorna "No data found." con array vacío', () => {
    expect(FormatterService.formatResultsToMarkdown([])).toBe('No data found.');
  });

  test('retorna "No data found." con null', () => {
    expect(FormatterService.formatResultsToMarkdown(null)).toBe('No data found.');
  });

  test('retorna "No data found." con undefined', () => {
    expect(FormatterService.formatResultsToMarkdown(undefined)).toBe('No data found.');
  });

  // ─── CASO BÁSICO ──────────────────────────────────────────────────────────
  test('genera tabla Markdown correcta con una fila', () => {
    const data = [{ nombre: 'Juan', total: 1500 }];
    const result = FormatterService.formatResultsToMarkdown(data);
    expect(result).toContain('| nombre | total |');
    expect(result).toContain('| --- | --- |');
    expect(result).toContain('| Juan | 1500 |');
  });

  test('genera tabla Markdown correcta con múltiples filas', () => {
    const data = [
      { producto: 'Laptop',  precio: 1200 },
      { producto: 'Monitor', precio: 350  },
      { producto: 'Teclado', precio: 80   },
    ];
    const result = FormatterService.formatResultsToMarkdown(data);
    expect(result).toContain('| producto | precio |');
    expect(result).toContain('| Laptop | 1200 |');
    expect(result).toContain('| Monitor | 350 |');
    expect(result).toContain('| Teclado | 80 |');
  });

  // ─── VALORES NULOS ────────────────────────────────────────────────────────
  test('maneja valores null dentro de los datos como string vacío', () => {
    const data = [{ col_a: null, col_b: 'valor' }];
    const result = FormatterService.formatResultsToMarkdown(data);
    expect(result).toContain('|  | valor |');
  });

  test('maneja valores con saltos de línea — los reemplaza con espacio', () => {
    const data = [{ descripcion: 'línea1\nlínea2' }];
    const result = FormatterService.formatResultsToMarkdown(data);
    expect(result).toContain('línea1 línea2');
    expect(result).not.toContain('\n\n');
  });

  // ─── TIPOS DE DATOS ───────────────────────────────────────────────────────
  test('convierte números, booleanos y fechas a string correctamente', () => {
    const data = [{ activo: true, monto: 9999.99, fecha: new Date('2024-01-15') }];
    const result = FormatterService.formatResultsToMarkdown(data);
    expect(result).toContain('true');
    expect(result).toContain('9999.99');
  });
});

// =============================================================================
describe('FormatterService — populateTemplate()', () => {
  const sampleData = [{ ventas: '8208.00' }];

  test('reemplaza {{DATOS}} con la tabla Markdown', () => {
    const template = 'Aquí el reporte:\n{{DATOS}}';
    const result = FormatterService.populateTemplate(template, sampleData);
    expect(result).toContain('Aquí el reporte:');
    expect(result).toContain('| ventas |');
    expect(result).toContain('| 8208.00 |');
  });

  test('agrega la tabla al final si el template no contiene {{DATOS}}', () => {
    const template = 'Resumen del mes.';
    const result = FormatterService.populateTemplate(template, sampleData);
    expect(result).toContain('Resumen del mes.');
    expect(result).toContain('| ventas |');
  });

  test('con template null retorna encabezado genérico + tabla', () => {
    const result = FormatterService.populateTemplate(null, sampleData);
    expect(result).toContain('Resultados de la consulta:');
    expect(result).toContain('| ventas |');
  });

  test('con template string vacío retorna encabezado genérico + tabla', () => {
    const result = FormatterService.populateTemplate('', sampleData);
    expect(result).toContain('Resultados de la consulta:');
  });

  test('con datos vacíos devuelve "No data found."', () => {
    const result = FormatterService.populateTemplate('{{DATOS}}', []);
    expect(result).toContain('No data found.');
  });
});
