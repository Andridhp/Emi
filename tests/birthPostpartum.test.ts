import {describe,expect,it} from 'vitest';
import {birthRecordCompleteness,continuitySummary,postpartumRecordCompleteness} from '../src/lib/birthPostpartum';
describe('Nacimiento y posparto',()=>{
 it('cuenta solo datos esenciales realmente registrados',()=>{expect(birthRecordCompleteness({profileId:'p',bornAt:'2026-01-01',updatedAt:'x'})).toMatchObject({completed:1,total:5})});
 it('no exige completar bienestar emocional para guardar seguimiento',()=>{expect(postpartumRecordCompleteness({profileId:'p',recoveryNotes:'Nota',updatedAt:'x'}).completed).toBe(1)});
 it('mantiene separada la fuente profesional',()=>{expect(continuitySummary({profileId:'p',bornAt:'x',confirmedBy:'Hospital',updatedAt:'x'},undefined).sources).toEqual(['Hospital'])});
});
