import {describe,expect,it} from 'vitest';
import {feedingDaySummary,feedingHistory} from '../src/lib/feedingHistory';
const event=(id:string,title:string,data:Record<string,string>,occurredAt='2026-07-24T10:00:00Z')=>({id,profileId:'p',kind:'feeding' as const,title,detail:'',occurredAt,source:'parent' as const,data});
describe('Historial de alimentación',()=>{
 it('distingue tipos a partir del registro explícito',()=>{expect(feedingHistory([event('1','Extracción',{amount:'80',unit:'ml'})],'p')[0].type).toBe('extraction')});
 it('suma únicamente cantidades con la misma unidad',()=>{const records=feedingHistory([event('1','Biberón',{amount:'90',unit:'ml'}),event('2','Biberón',{amount:'3',unit:'oz'})],'p');expect(feedingDaySummary(records,new Date('2026-07-24T12:00:00Z')).totals).toEqual([{unit:'ml',value:90},{unit:'oz',value:3}])});
 it('excluye registros de otro perfil',()=>{expect(feedingHistory([{...event('1','Biberón',{}),profileId:'otro'}],'p')).toEqual([])});
});
