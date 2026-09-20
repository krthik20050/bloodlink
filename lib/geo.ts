import type { Location } from "./domain";
// ponytail: fail-closed range guard — lat -90..90, lng -180..180, finite only
const okCoord=(v:number,min:number,max:number)=>Number.isFinite(v)&&v>=min&&v<=max;
const okLoc=(l:Location)=>okCoord(l.latitude,-90,90)&&okCoord(l.longitude,-180,180);
export function distanceKm(a:Location,b:Location):number { if (!okLoc(a)||!okLoc(b)) throw new Error("Invalid coordinates"); const rad=(x:number)=>x*Math.PI/180; const dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude); const h=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2; return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)); }
