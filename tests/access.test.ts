import { describe, expect, it } from 'vitest';
import { accessCapabilities } from '../src/lib/access';

describe('Permisos por perfil', () => {
  it('mantiene mínimo privilegio para solo lectura', () => {
    expect(accessCapabilities('viewer')).toEqual({ read: true, create: false, manage: false });
  });

  it('permite registrar sin administrar accesos', () => {
    expect(accessCapabilities('editor')).toEqual({ read: true, create: true, manage: false });
  });

  it('un perfil sin asignación no puede leer información', () => {
    expect(accessCapabilities()).toEqual({ read: false, create: false, manage: false });
  });
});
