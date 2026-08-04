import {describe,expect,it} from 'vitest';
import {durationLabel,sleepDaySummary,sleepHistory,usableWakeIntervalCount} from '../src/lib/sleepHistory';
const sleep=(id:string,start:string,minutes:number,profileId='p')=>({id,profileId,kind:'sleep' as const,title:'Sueño',detail:'',occurredAt:start,source:'parent' as const,value:minutes,unit:'min'});
describe('Historial de sueño',()=>{
 it('calcula el final usando inicio y duración registrados',()=>{expect(sleepHistory([sleep('1','2026-07-25T10:00:00',45)],'p')[0].endedAt).toBe(new Date('2026-07-25T10:45:00').toISOString())});
 it('resume únicamente periodos completos del día y perfil',()=>{const records=sleepHistory([sleep('1','2026-07-25T10:00:00',45),sleep('2','2026-07-25T13:00:00',30),sleep('3','2026-07-25T15:00:00',20,'otro')],'p');expect(sleepDaySummary(records,new Date('2026-07-25T12:00:00'))).toEqual({periods:2,totalMinutes:75,longestMinutes:45})});
 it('cuenta solo intervalos de vigilia utilizables',()=>{expect(usableWakeIntervalCount([sleep('1','2026-07-25T08:00:00',30),sleep('2','2026-07-25T10:00:00',30),sleep('3','2026-07-25T20:00:00',30)],'p')).toBe(1)});
 it('formatea minutos sin inventar precisión',()=>{expect(durationLabel(125)).toBe('2 h 5 min');expect(durationLabel(60)).toBe('1 h')});
});
