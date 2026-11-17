"use strict";
const {chromium}=require("playwright");
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE||undefined,args:["--no-sandbox"]});
 try{
  const page=await browser.newPage();
  await page.goto("https://pin2map.github.io/pin2map-new-test/preview/",{waitUntil:"domcontentloaded",timeout:30000});
  const results=await page.evaluate(async()=>{
   const tests=[
    {label:"South America - Rio lake",lat:-22.9737,lng:-43.2125},
    {label:"Australia - Canberra lake",lat:-35.2925,lng:149.1310}
   ];
   const servers=[
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.osm.jp/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
   ];
   const rows=[];

   for(const point of tests){
    const data="[out:json][timeout:15];is_in("+point.lat+","+point.lng+")->.inside;("+
      'area.inside["natural"="water"];'+
      'area.inside["water"~"^(lake|reservoir)$"];'+
      'area.inside["boundary"~"^(national_park|protected_area)$"];'+
      'area.inside["place"~"^(island|islet)$"];'+
      'area.inside["landuse"="military"];'+
      ")->.found;.found out ids tags;";
    for(const server of servers)for(const method of ["GET"]){
      await (async()=>{
       const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),16000),start=Date.now();
       try{
        const opts={method,signal:ctl.signal,headers:{"Accept":"application/json"}};
        let url=server;
        if(method==="GET")url+="?"+new URLSearchParams({data});
        else{opts.headers["Content-Type"]="application/x-www-form-urlencoded";opts.body=new URLSearchParams({data}).toString();}
        const r=await fetch(url,opts),text=await r.text();
        let parsed=null,names=[],remark="";
        try{parsed=JSON.parse(text);names=(parsed.elements||[]).map(x=>x.tags?.name).filter(Boolean).slice(0,16);remark=parsed.remark||"";}catch{}
        rows.push({region:point.label,server,method,status:r.status,ms:Date.now()-start,contentType:r.headers.get("content-type"),names,remark,head:!parsed?text.slice(0,160):""});
       }catch(e){rows.push({region:point.label,server,method,error:String(e),ms:Date.now()-start});}
       finally{clearTimeout(t);}
      })();
    }
   }

   return rows;
  });
  results.forEach(x=>console.log("GLOBAL_OVERPASS_PROBE",JSON.stringify(x)));
 }finally{await browser.close()}
})().catch(e=>{console.error("GLOBAL_OVERPASS_PROBE_FATAL",String(e));process.exitCode=1});
