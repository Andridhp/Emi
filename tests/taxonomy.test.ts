import { describe, expect, it } from 'vitest';
import { levelMeta, sourceLabel } from '../src/lib/source';

describe('Trazabilidad y orientación', () => {
  it('mantiene las cinco procedencias visibles', () => {
    expect(Object.keys(sourceLabel).sort()).toEqual(['ai', 'calculated', 'document', 'parent', 'professional']);
  });

  it('mantiene los cuatro niveles de orientación', () => {
    expect(Object.keys(levelMeta)).toEqual(['expected', 'observe', 'consult', 'urgent']);
  });
});
