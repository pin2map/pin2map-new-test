"use strict";
const {chromium}=require("playwright");
const url=process.env.PIN2MAP_TEST_URL||
  "https://pin2map.github.io/pin2map-new-test/preview/";
const point={lat:54.55,lng:13.63};
const query="[out:json][timeout:16];is_in("+point.lat+","+point.lng+
  ")->.containing;(way(pivot.containing);rel(pivot.containing););out tags;";
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE||undefined,
    args:["--no-sandbox"]});
  try{
    const page=await browser.newPage();
    await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
    const out=await page.evaluate(async query=>{
      const servers=[
        "https://overpass.private.coffee/api/interpreter",
        "https://overpass-api.de/api/interpreter",
        "https://overpass.openstreetmap.fr/api/interpreter"
      ];
      const results=[];
      for(const base of servers){
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),13000);
        const start=Date.now();
        try{
          const response=await fetch(base+"?"+new URLSearchParams({data:query}),
            {headers:{"Accept-Language":"de"},signal:controller.signal});
          const text=await response.text();
          let candidates=[];
          try{candidates=(JSON.parse(text).elements||[]).filter(x=>x.tags?.name)
            .map(x=>({name:x.tags.name,type:x.type,boundary:x.tags.boundary,
              natural:x.tags.natural,place:x.tags.place,military:x.tags.military})).slice(0,80);}catch{}
          results.push({base,status:response.status,ms:Date.now()-start,
            candidates,head:text.slice(0,300)});
        }catch(error){results.push({base,error:String(error),ms:Date.now()-start});}
        finally{clearTimeout(timer)}
      }
      return results;
    },query);
    out.forEach(result=>console.log("BROWSER_OVERPASS_DIAGNOSTIC",JSON.stringify(result)));
  }finally{await browser.close()}
})().catch(error=>{console.error("BROWSER_DIAGNOSTIC_FAILURE",error);process.exitCode=1});
