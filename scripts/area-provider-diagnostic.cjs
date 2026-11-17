"use strict";
/* One-off real-provider diagnostic: logs *actual* point-containing OSM
 * candidates and browser CORS response headers, without changing user data.
 * Never interpret an empty/failing provider as a successful app test. */
const point={lat:54.55,lng:13.63};
const query="[out:json][timeout:16];is_in("+point.lat+","+point.lng+
  ")->.containing;(way(pivot.containing);rel(pivot.containing););out tags;";
const endpoints=[
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter"
];
(async()=>{
  for(const base of endpoints){
    const url=base+"?"+new URLSearchParams({data:query});
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
    try{
      const t=Date.now();
      const response=await fetch(url,{signal:controller.signal,headers:{"Accept-Language":"de"}});
      const raw=await response.text();
      console.log("OVERPASS_DIAGNOSTIC",JSON.stringify({
        base,status:response.status,elapsedMs:Date.now()-t,
        cors:response.headers.get("access-control-allow-origin"),
        contentType:response.headers.get("content-type"),bytes:raw.length,
        head:raw.slice(0,400)
      }));
      if(response.ok){
        const data=JSON.parse(raw);
        console.log("OVERPASS_CANDIDATES",JSON.stringify((data.elements||[]).filter(x=>x.tags?.name)
          .slice(0,100).map(x=>({id:x.id,type:x.type,name:x.tags.name,
            boundary:x.tags.boundary,place:x.tags.place,natural:x.tags.natural,
            landuse:x.tags.landuse,military:x.tags.military,water:x.tags.water}))));
      }
    }catch(error){console.log("OVERPASS_DIAGNOSTIC_ERROR",base,String(error))}
    finally{clearTimeout(timeout)}
  }
})().catch(e=>{console.log("OVERPASS_DIAGNOSTIC_FATAL",String(e))});
