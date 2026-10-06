export const DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
export const time = n => String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
export const key = (day, minute) => day+':'+minute;
export function validSlots(slots,start,end) {
  return Array.isArray(slots) && slots.length<=336 && new Set(slots).size===slots.length && slots.every(s => {
    if(typeof s!=='string'||!/^([0-6]):(0|[1-9]\d*)$/.test(s))return false;
    const [d,m]=s.split(':').map(Number);
    return d>=0&&d<7&&m>=start&&m<end&&m%30===0;
  });
}
export function overlap(participants, start, end) {
  const responded=participants.filter(p=>p.responded);
  const sets=responded.map(p=>new Set(p.slots));
  const cells=[];
  for(let day=0;day<7;day++)for(let minute=start;minute<end;minute+=30){
    const available=responded.filter((p,i)=>sets[i].has(key(day,minute)));
    cells.push({day,minute,count:available.length,names:available.map(p=>p.name),ids:available.map(p=>p.id),all:participants.length>0&&available.length===participants.length});
  }
  const intervals=[];
  for(const c of cells){
    if(!c.count)continue;
    const previous=intervals.at(-1);
    // Same people throughout an interval; equal counts alone cannot imply a common meeting.
    const signature=c.ids.slice().sort().join('|');
    if(previous&&previous.day===c.day&&previous.end===c.minute&&previous.signature===signature)previous.end+=30;
    else intervals.push({day:c.day,start:c.minute,end:c.minute+30,count:c.count,names:c.names,all:c.all,signature});
  }
  intervals.sort((a,b)=>b.count-a.count||(b.end-b.start)-(a.end-a.start)||a.day-b.day||a.start-b.start);
  return {cells,intervals,total:participants.length,responded:responded.length};
}
export function paint(selection, slot, selected, visited) {
  if(visited.has(slot))return false;
  visited.add(slot);
  if(selected)selection.add(slot);else selection.delete(slot);
  return true;
}
