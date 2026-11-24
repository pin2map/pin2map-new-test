"use strict";
/* Geographic preferences stay separate from the itinerary. Coordinates in
 * provider geometry are [longitude, latitude]; projected offsets are meters. */
(function(root){
 const DEFAULT_RADIUS=10000,MIN_RADIUS=350,MAX_RADIUS=80000;
 const METERS_PER_DEGREE=111195, MAX_SHAPE_POINTS=8;
 const validRadius=value=>Number.isFinite(value)&&value>=MIN_RADIUS&&value<=MAX_RADIUS;
 const radiusForScale=meters=>Number.isFinite(meters)?Math.max(MIN_RADIUS,Math.min(MAX_RADIUS,meters)):DEFAULT_RADIUS;
 const wrap=degrees=>((degrees+180)%360+360)%360-180;
 const longitudeScale=lat=>METERS_PER_DEGREE*Math.max(.002,Math.cos(lat*Math.PI/180));

 function locate(geometry,flag){
  const coords=geometry?.coordinates||[];
  const scale=longitudeScale(flag.lat);
  let nearest={meters:Infinity};
  for(let i=1;i<coords.length;i++){
   const [lng,lat]=coords[i-1], [nextLng,nextLat]=coords[i];
   const deltaLng=wrap(nextLng-lng);
   const x=(wrap(lng+deltaLng/2-flag.lng)-deltaLng/2)*scale;
   const y=(lat-flag.lat)*METERS_PER_DEGREE;
   const dx=deltaLng*scale, dy=(nextLat-lat)*METERS_PER_DEGREE;
   const fraction=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));
   const east=x+fraction*dx,north=y+fraction*dy,meters=Math.hypot(east,north);
   if(meters<nearest.meters)nearest={meters,east,north,position:i-1+fraction};
  }
  return nearest;
 }

 function assignGuides(legs,flags){
  const assigned=legs.map(()=>[]);
  for(const flag of flags){
   if(!Number.isFinite(flag?.lat)||!Number.isFinite(flag?.lng))continue;
   const radius=validRadius(flag.radiusMeters)?flag.radiusMeters:DEFAULT_RADIUS;
   let best,index;
   for(let i=0;i<legs.length;i++){
    const match=locate(legs[i].geometry,flag);
    if(!best||match.meters<best.meters){best=match;index=i;}
   }
   if(Number.isFinite(best?.meters))assigned[index].push({flag,radius,...best});
  }
  return assigned;
 }

 function candidates(guides){
  const unsatisfied=guides.filter(guide=>guide.meters>guide.radius);
  if(!unsatisfied.length)return [];
  const selected=unsatisfied.sort((a,b)=>a.meters-b.meters).slice(0,MAX_SHAPE_POINTS)
   .sort((a,b)=>a.position-b.position);
  // Probe on each side of the flag, inside its area. A candidate may pass
  // anywhere inside the area and can be rejected without changing the route.
  return [.55,-.55].map(offset=>selected.map(({flag,radius,meters,east,north})=>({
   lat:Math.max(-89.999,Math.min(89.999,flag.lat+offset*radius*north/meters/METERS_PER_DEGREE)),
   lng:wrap(flag.lng+offset*radius*east/meters/longitudeScale(flag.lat))
  })));
 }

 function preferred(a,b){
  if(a.mode==="bicycle"&&b.mode==="bicycle"){
   const rank=(x,y)=>(x??Infinity)-(y??Infinity);
   const difference=rank(a.ascentMeters,b.ascentMeters)||rank(a.maxGrade,b.maxGrade)||b.cycleShare-a.cycleShare;
   if(difference)return difference<0;
  }
  return a.durationSeconds<b.durationSeconds;
 }
 function selectLeg(baseline,alternatives,guides){
  let best=baseline, count=guides.filter(guide=>guide.meters<=guide.radius).length;
  const originalCount=count;
  for(const option of alternatives){
   if(option.durationSeconds>baseline.durationSeconds*1.35+600||
      option.distanceMeters>baseline.distanceMeters*1.35+10000)continue;
   let hits=0,lost=false;
   for(const guide of guides){
    if(locate(option.geometry,guide.flag).meters<=guide.radius)hits++;
    else if(guide.meters<=guide.radius)lost=true;
   }
   if(!lost&&(hits>count||(hits===count&&hits>originalCount&&preferred(option,best)))){
    best=option;count=hits;
   }
  }
  return best;
 }

 const api=Object.freeze({DEFAULT_RADIUS,validRadius,radiusForScale,assignGuides,candidates,selectLeg});
 root.Pin2MapRouteGuideCorridor=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
