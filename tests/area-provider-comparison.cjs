"use strict";
/* RESEARCH ONLY. Never writes to app, database or preview. Tests real CORS
 * from the published PWA origin and compares independently operated spatial
 * polygon services. WDPCA geometries are NOT saved or redistributed.
 */
const fs=require("node:fs");
const {chromium}=require("playwright");
const points=require("./area-source-fixtures.cjs");
const providers=[
  {id:"hydrolakes-wwf",type:"water",url:"https://wwf-sight-maps.org/arcgis/rest/services/Global/Hydrology/MapServer/0"},
  {id:"water-bodies-esri",type:"water",url:"https://services2.arcgis.com/IsDCghZ73NgoYoz5/ArcGIS/rest/services/World_Water_Bodies_World/FeatureServer/0"},
  {id:"wdpca-unep",type:"protected",url:"https://data-gis.unep-wcmc.org/server/rest/services/ProtectedSites/The_World_Database_of_Protected_Areas/FeatureServer/1"}
];
(async()=>{
 const browser=await chromium.launch({headless:true,
   executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE||undefined,args:["--no-sandbox"]});
 try{
  const page=await browser.newPage();
  await page.goto("https://pin2map.github.io/pin2map-new-test/preview/",
    {waitUntil:"domcontentloaded",timeout:30000});
  const rows=await page.evaluate(async ({points,providers})=>{
   const rows=[],jobs=[];
   for(const point of points)for(const provider of providers){
    // Comparison of requested thematic category against relevant external
    // services. Special zones are explicitly marked as not covered, rather
    // than silently mistaking a lake or reserve dataset for a mining layer.
    if(point.kind==="special")continue;
    if(provider.type!==point.kind)continue;
    jobs.push({point,provider});
   }
   let cursor=0;
   const worker=async()=>{
    while(cursor<jobs.length){
     const {point,provider}=jobs[cursor++];
     const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
     const started=Date.now();
     try{
      const params=new URLSearchParams({
       f:"json",where:"1=1",geometry:JSON.stringify({
        x:point.lng,y:point.lat,spatialReference:{wkid:4326}
       }),geometryType:"esriGeometryPoint",inSR:"4326",
       spatialRel:"esriSpatialRelIntersects",
       outFields:"*",returnGeometry:"false",resultRecordCount:"8"
      });
      const response=await fetch(provider.url+"/query?"+params,{signal:controller.signal});
      const result=await response.json();
      if(!response.ok||result.error)
       throw Error("HTTP "+response.status+" "+String(result.error?.message||"").slice(0,120));
      const features=Array.isArray(result.features)?result.features:[];
      const names=features.map(x=>{
        const a=x.attributes||{};
        const entries=Object.entries(a).filter(([key,v])=>
          /^(name|name_en|lake_name|res_name|site_name|orig_name|english_name|wdpa_name)$/i.test(key)&&
          typeof v==="string"&&v.trim());
        return entries.map(([,v])=>v).join(" / ")||"no explicit name field";
      }).slice(0,8);
      rows.push({region:point.region,expected:point.name,kind:point.kind,
       provider:provider.id,status:"ok",ms:Date.now()-started,
       count:features.length,names,exceeded:!!result.exceededTransferLimit});
     }catch(error){
      rows.push({region:point.region,expected:point.name,kind:point.kind,
       provider:provider.id,status:"failed",ms:Date.now()-started,
       error:String(error).slice(0,180)});
     }finally{clearTimeout(timer)}
    }
   };
   await Promise.all(Array.from({length:4},worker));
   return rows;
  },{points,providers});
  const order=new Map(points.map((x,i)=>[x.name,i]));
  rows.sort((a,b)=>order.get(a.expected)-order.get(b.expected)||
    a.provider.localeCompare(b.provider));
  for(const point of points){
   const subset=rows.filter(x=>x.expected===point.name);
   if(!subset.length){
     console.log("INDEPENDENT_AREA_TEST",JSON.stringify({
       region:point.region,expected:point.name,kind:point.kind,
       status:"not_covered_by_selected_independent_sources"}));
     continue;
   }
   for(const row of subset)console.log("INDEPENDENT_AREA_TEST",JSON.stringify(row));
  }
  fs.writeFileSync("area-provider-comparison.json",JSON.stringify({
    testedAt:new Date().toISOString(),pageOrigin:"https://pin2map.github.io",
    note:"Exploratory metadata-only CORS test; not an integration or a licence grant. No provider polygon geometries stored.",
    points,providers:providers.map(({id,type})=>({id,type})),results:rows},null,2)+"\n");
  console.log("INDEPENDENT_AREA_SUMMARY",JSON.stringify({
   points:points.length,requests:rows.length,
   withNamedResult:rows.filter(x=>x.status==="ok"&&x.names.some(n=>n!=="no explicit name field")).length,
   failures:rows.filter(x=>x.status==="failed").length,
   notCovered:points.filter(x=>x.kind==="special").length}));
 }finally{await browser.close();}
})().catch(error=>{console.error("INDEPENDENT_AREA_FATAL",error);process.exitCode=1});
