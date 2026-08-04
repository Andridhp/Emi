import { describe, expect, it } from 'vitest';
import { isAcceptablePassword, isValidEmail, passwordChecks } from '../src/lib/auth';

describe('Acceso seguro', () => {
  it('valida la forma del correo sin aceptar espacios ni dominios incompletos', () => {
    expect(isValidEmail('mama@familia.mx')).toBe(true);
    expect(isValidEmail('mama@familia')).toBe(false);
    expect(isValidEmail('mama familia.mx')).toBe(false);
  });

  it('requiere longitud, letras y números en la contraseña inicial', () => {
    expect(isAcceptablePassword('Emilia2026')).toBe(true);
    expect(isAcceptablePassword('solamente')).toBe(false);
    expect(passwordChecks('12345678').hasLetter).toBe(false);
  });
});
