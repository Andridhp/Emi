import { completedSleeps } from '@/lib/sleepEngine';
import { FamilyEvent } from '@/types/domain';

export type SleepRecord={id:string;title:string;detail:string;occurredAt:string;endedAt:string;durationMinutes:number;location?:string;quality?:string;source:FamilyEvent['source']};
const dayKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const text=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim():undefined;

export function sleepHistory(events:FamilyEvent[],profileId:string):SleepRecord[]{
 return events.filter((event)=>event.profileId===profileId&&event.kind==='sleep'&&event.value&&event.value>0&&event.value<=960).map((event)=>({id:event.id,title:event.title,detail:event.detail,occurredAt:event.occurredAt,endedAt:new Date(new Date(event.occurredAt).getTime()+(event.value as number)*60000).toISOString(),durationMinutes:event.value as number,location:text(event.data?.location),quality:text(event.data?.quality),source:event.source})).filter((record)=>!Number.isNaN(new Date(record.occurredAt).getTime())).sort((a,b)=>+new Date(b.occurredAt)-+new Date(a.occurredAt));
}

export function sleepDaySummary(records:SleepRecord[],day:Date){const daily=records.filter((record)=>dayKey(new Date(record.occurredAt))===dayKey(day));return {periods:daily.length,totalMinutes:daily.reduce((sum,item)=>sum+item.durationMinutes,0),longestMinutes:daily.length?Math.max(...daily.map((item)=>item.durationMinutes)):0};}
export function sleepWeek(records:SleepRecord[],endDay:Date){return Array.from({length:7},(_,index)=>{const day=new Date(endDay);day.setHours(12,0,0,0);day.setDate(day.getDate()-(6-index));return {day,...sleepDaySummary(records,day)};});}
export function usableWakeIntervalCount(events:FamilyEvent[],profileId:string){const sleeps=completedSleeps(events,profileId);let count=0;for(let index=1;index<sleeps.length;index+=1){const minutes=Math.round((sleeps[index].start.getTime()-sleeps[index-1].end.getTime())/60000);if(minutes>=20&&minutes<=480)count+=1;}return Math.min(count,10);}
export const durationLabel=(minutes:number)=>minutes>=60?`${Math.floor(minutes/60)} h${minutes%60?` ${minutes%60} min`:''}`:`${minutes} min`;
