"use strict";
/* Live gate: real Nominatim + Overpass, no route mocking and no stored data. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
(async()=>{
  const browser=await chromium.launch({headless:true,
    executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE||undefined,
    args:["--no-sandbox"]});
  try{
    const page=await browser.newPage();
    await page.goto(process.env.PIN2MAP_TEST_URL||
      "https://pin2map.github.io/pin2map-new-test/preview/",
      {waitUntil:"domcontentloaded",timeout:30000});
    const result=await page.evaluate(async()=>{
      const finder=new window.Pin2MapNominatimAreaFinder.NominatimAreaFinder({
        fetchImpl:(...args)=>fetch(...args)
      });
      const point={lat:54.55,lng:13.63};
      const hierarchy=await finder.hierarchyAt(point);
      const island=hierarchy.rows.find(x=>x.name==="Rügen");
      const park=hierarchy.rows.find(x=>x.name==="Nationalpark Jasmund");
      const polygon=park?await finder.findContaining(park,point,{
        countryCode:hierarchy.countryCode}):null;
      return {names:hierarchy.rows.map(x=>x.name),countryCode:hierarchy.countryCode,
        extraUnavailable:hierarchy.extraUnavailable,island,park,
        polygon:polygon?{id:polygon.osm_id,type:polygon.geojson?.type}:null};
    });
    console.log("LIVE_THEMATIC_AREA_RESULT",JSON.stringify(result));
    assert.equal(result.extraUnavailable,false,
      "A real spatial provider must return candidates, not admin-only fallback");
    assert.ok(result.island?.osmId,"Rügen island must have a real OSM polygon identity");
    assert.ok(result.park?.osmId,"Nationalpark Jasmund must have a real OSM polygon identity");
    assert.ok(["Polygon","MultiPolygon"].includes(result.polygon?.type),
      "Selected real national park must resolve to a drawable Nominatim polygon");
    console.log("PASS actual browser Overpass island, park, and selected polygon lookup");
  }finally{await browser.close()}
})().catch(error=>{console.error("LIVE_THEMATIC_AREA_FAILURE",error);process.exitCode=1});
