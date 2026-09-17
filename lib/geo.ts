import type { Location } from "./domain";
const valid=(v:number)=>Number.isFinite(v);
export function distanceKm(a:Location,b:Location):number { if (![a.latitude,a.longitude,b.latitude,b.longitude].every(valid)) throw new Error("Invalid coordinates"); const rad=(x:number)=>x*Math.PI/180; const dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude); const h=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2; return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)); }
