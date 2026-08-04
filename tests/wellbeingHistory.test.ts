import { describe,expect,it } from 'vitest';
import { latestRegisteredTemperature,wellbeingDaySummary,wellbeingHistory } from '../src/lib/wellbeingHistory';
const event=(id:string,title:string,data:Record<string,string>={},kind:'symptom'|'temperature'='symptom',profileId='p',occurredAt='2026-07-25T10:00:00')=>({id,profileId,kind,title,detail:'',occurredAt,source:'parent' as const,data});
describe('Historial de síntomas y bienestar',()=>{
 it('clasifica temperatura, síntoma y estado de ánimo',()=>{const records=wellbeingHistory([event('1','Temperatura',{temperature:'37.2',temperatureUnit:'°C'}),event('2','Síntoma',{symptom:'Tos'}),event('3','Estado de ánimo',{mood:'Activo'})],'p');expect(records.map((record)=>record.type).sort()).toEqual(['mood','symptom','temperature'])});
 it('conserva valor, unidad y método sin convertirlos',()=>{const record=wellbeingHistory([event('1','Temperatura',{temperature:'99.1',temperatureUnit:'°F',method:'Axilar'})],'p')[0];expect(record).toMatchObject({temperature:99.1,temperatureUnit:'°F',method:'Axilar'})});
 it('resume solo los registros del día indicado',()=>{const records=wellbeingHistory([event('1','Temperatura',{temperature:'37'}),event('2','Síntoma',{symptom:'Tos'},'symptom','p','2026-07-24T10:00:00')],'p');expect(wellbeingDaySummary(records,new Date('2026-07-25T12:00:00'))).toEqual({records:1,temperatures:1,symptoms:0,moods:0})});
 it('aísla perfiles y encuentra la última temperatura registrada',()=>{const records=wellbeingHistory([event('1','Temperatura',{temperature:'36.8'},'temperature','otro'),event('2','Temperatura',{temperature:'37.1'})],'p');expect(records).toHaveLength(1);expect(latestRegisteredTemperature(records)?.id).toBe('2')});
});
