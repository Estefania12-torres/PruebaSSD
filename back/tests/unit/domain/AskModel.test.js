/**
 * @fileoverview Tests unitarios — AskModel (Domain)
 * Cubre: validaciones de campos requeridos y edge cases
 */

const AskModel = require('../../../src/core/domain/AskModel');

describe('AskModel — Validaciones de Dominio', () => {
  // ─── CASOS VÁLIDOS ────────────────────────────────────────────────────────
  describe('Instanciación válida', () => {
    test('debe crear instancia con connection_string y question válidos', () => {
      const model = new AskModel({
        connection_string: 'postgresql://user:pass@localhost:5432/db',
        question: '¿Cuántos clientes hay registrados?'
      });
      expect(model.connection_string).toBe('postgresql://user:pass@localhost:5432/db');
      expect(model.question).toBe('¿Cuántos clientes hay registrados?');
    });

    test('validate() no debe lanzar error con datos válidos', () => {
      const model = new AskModel({
        connection_string: 'mysql://user:pass@localhost:3306/mydb',
        question: 'Dame el total de ventas del mes'
      });
      expect(() => model.validate()).not.toThrow();
    });
  });

  // ─── ERRORES: connection_string ───────────────────────────────────────────
  describe('Validación de connection_string', () => {
    test.each([
      ['undefined', undefined],
      ['null', null],
      ['string vacío', ''],
      ['string con solo espacios', '   '],
      ['número', 123],
    ])('debe lanzar error cuando connection_string es %s', (_, value) => {
      const model = new AskModel({ connection_string: value, question: 'pregunta válida' });
      expect(() => model.validate()).toThrow('connection_string is required and must be a non-empty string');
    });
  });

  // ─── ERRORES: question ────────────────────────────────────────────────────
  describe('Validación de question', () => {
    test.each([
      ['undefined', undefined],
      ['null', null],
      ['string vacío', ''],
      ['string con solo espacios', '   '],
      ['número', 42],
    ])('debe lanzar error cuando question es %s', (_, value) => {
      const model = new AskModel({
        connection_string: 'postgresql://user:pass@localhost/db',
        question: value
      });
      expect(() => model.validate()).toThrow('question is required and must be a non-empty string');
    });
  });
});
