"use strict";
/* Isolated Chromium regression for geometry features, both local and
 * actually published Pages Preview. Provider requests are deterministically
 * mocked; no OSM infrastructure is scraped by CI.
 */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const fs=require("node:fs");
const base=process.env.PIN2MAP_TEST_URL||"http://127.0.0.1:8765/";
const poly={type:"Polygon",coordinates:[[
  [9.13,48.74],[9.23,48.74],[9.23,48.82],[9.13,48.82],[9.13,48.74]
]]};
const modes=[
  ["pin","map-pin-plus-inside"],
  ["area","vector-polygon"],
  ["lake","waves-horizontal"],
  ["river","spline"]
];
const viewports=[
  {name:"desktop",width:1100,height:780,mobile:false},
  {name:"iphone",width:375,height:667,mobile:true}
];
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PIN2MAP_CHROMIUM_EXECUTABLE?
  {executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE}:{})});
 fs.mkdirSync("geometry-browser-artifacts",{recursive:true});
 try{
  for(const view of viewports){
   const context=await browser.newContext({viewport:{width:view.width,height:view.height},
     isMobile:view.mobile,hasTouch:view.mobile,serviceWorkers:"allow"});
   const page=await context.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.route(/nominatim\.openstreetmap\.org\/search/,async route=>{
     const url=new URL(route.request().url());
     const name=url.searchParams.get("q")||"";
     const result={osm_type:"relation",osm_id:123,name:name||"Testfläche",
       display_name:name+", Baden-Württemberg, Deutschland",
       class:name.toLowerCase().includes("see")?"natural":"boundary",
       category:name.toLowerCase().includes("see")?"natural":"boundary",
       type:name.toLowerCase().includes("see")?"water":"administrative",
       geojson:poly};
     await route.fulfill({status:200,contentType:"application/json",
       body:JSON.stringify([result])});
   });
   await page.route(/nominatim\.openstreetmap\.org\/reverse/,async route=>
     route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
       name:"Testgebiet",type:"city",address:{city:"Testgebiet",country_code:"de"}
     })}));
   // River fixtures resemble OSM API full.json; network calls are intercepted.
   await page.route(/api\.openstreetmap\.org\/api\/0\.6\/relation\/12\.json/,async route=>
     route.fulfill({status:200,contentType:"application/json",
       body:JSON.stringify({elements:[{type:"relation",id:12,
         tags:{type:"waterway",name:"Testfluss",waterway:"river"}}]})}));
   await page.route(/api\.openstreetmap\.org\/api\/0\.6\/relation\/12\/full\.json/,async route=>
     route.fulfill({status:200,contentType:"application/json",
       body:JSON.stringify({elements:[
         {type:"node",id:1,lat:48.75,lon:9.14},
         {type:"node",id:2,lat:48.76,lon:9.17},
         {type:"node",id:3,lat:48.78,lon:9.20},
         {type:"way",id:2,nodes:[1,2]},
         {type:"way",id:3,nodes:[2,3]},
         {type:"relation",id:12,tags:{type:"waterway",name:"Testfluss"},
           members:[{type:"way",ref:2,role:"main_stream"},
             {type:"way",ref:3,role:"main_stream"}]}
       ]})}));
   await page.goto(base,{waitUntil:"domcontentloaded",timeout:30000});
   await page.waitForFunction(()=>window.Pin2MapAreaGeometry&&
     window.Pin2MapRiverGeometry&&document.querySelector(".leaflet-container"),
     null,{timeout:20000});
   // Never touch an existing user's project. Each browser context uses a unique
   // empty IndexedDB storage that is discarded after this test.
   await page.evaluate(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{
       const project=window.Pin2MapProjectModel.defaultProject();
       project.allowGeocode=true;
       await db.saveProject(project);
     }finally{db.close();}
   });
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelector("#searchButton")&&
     document.querySelector(".leaflet-container"),null,{timeout:15000});
   // Clicking magnifier opens the menu. It does not submit automatically.
   await page.locator("#searchButton").click();
   await page.locator("#searchTypeMenu").waitFor({state:"visible",timeout:5000});
   assert.equal(await page.locator(".search-type-choice").count(),4);
   for(let i=0;i<modes.length;i++){
     assert.equal(await page.locator(".search-type-choice").nth(i)
       .locator("svg").count(),1,"Missing Lucide "+modes[i][1]);
   }
   await page.keyboard.press("Escape");
   assert.equal(await page.locator("#searchTypeMenu").isHidden(),true);
   await page.locator("#searchInput").fill("Testfläche");
   await page.locator("#searchButton").click();
   await page.keyboard.press("f");
   await page.locator("#searchResults .result").first()
     .waitFor({state:"visible",timeout:12000});
   assert.equal(await page.locator(".result-feature-icon").count(),1);
   await page.locator("#searchResults .result").first().click();
   await page.locator("#geometryEditor").waitFor({state:"visible",timeout:10000});
   assert.equal(await page.locator("#geometryEditor .geometry-notes").isVisible(),true);
   assert.equal(await page.locator("#geometryEditor .geometry-actions button").count(),4);
   assert.equal(await page.locator("#geometryName").inputValue(),"Testfläche");
   const savedArea=await page.evaluate(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{return (await db.loadProject()).areas[0];}finally{db.close();}
   });
   assert.equal(savedArea.layerId,"private");
   assert.equal(savedArea.geometry.type,"Polygon");
   await page.locator("#geometryNotes").fill("Testkommentar");
   await page.locator("#geometryNotes").blur();
   await page.locator('.geometry-actions .geometry-ok').click();
   assert.equal(await page.locator("#geometryEditor").isHidden(),true);
   // Polygons must be completely noninteractive; ONLY the area name marker
   // opens the area dialog. Canvas/SVG path pointer-events are disabled.
   assert.equal(await page.locator("#map .leaflet-overlay-pane path").evaluateAll(nodes=>
     nodes.some(n=>!n.classList.contains("leaflet-interactive"))),true,
     "Area polygon must not have the Leaflet interactive hit-target class");
   await page.locator(".p2m-area-name-wrap").first().click({force:true});
   await page.locator("#geometryEditor").waitFor({state:"visible",timeout:5000});
   assert.equal(await page.locator("#geometryNotes").inputValue(),"Testkommentar");
   await page.locator(".geometry-ok").click();

   await page.locator("#searchInput").fill("Testsee");
   await page.locator("#searchButton").click();
   await page.keyboard.press("s");
   await page.locator("#searchResults .result").first().waitFor({state:"visible",timeout:12000});
   assert.equal(await page.locator(".result-feature-icon svg").count(),1);
   await page.locator("#searchResults .result").first().click();
   await page.locator("#geometryEditor").waitFor({state:"visible",timeout:8000});
   const lake=await page.evaluate(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{return (await db.loadProject()).areas.find(a=>a.kind==="lake");}
     finally{db.close();}
   });
   assert.equal(lake.layerId,"private");
   await page.locator(".geometry-ok").click();

   // Synthetic right-click is supported on desktop; touch gets a pointer
   // longpress regression through the existing pin browser suite.
   if(!view.mobile){
     await page.locator("#map").click({button:"right",
       position:{x:90,y:110},force:true});
     await page.locator("#mapActionChooser").waitFor({state:"visible",timeout:5000});
     assert.equal(await page.locator("#mapActionChooser button").count(),3);
     const chooserRect=await page.locator("#mapActionChooser").boundingBox();
     assert.ok(chooserRect&&chooserRect.x>40&&chooserRect.y>75);
     await page.locator('#mapActionChooser button[aria-label="Abbrechen"]').click();
     assert.equal(await page.locator("#mapActionChooser").isHidden(),true);
   }

   // Fast mock for the otherwise deliberately slow multi-stage river search.
   await page.route(/nominatim\.openstreetmap\.org\/search/,async route=>{
     const url=new URL(route.request().url());
     const name=url.searchParams.get("q")||"";
     await route.fulfill({status:200,contentType:"application/json",
       body:JSON.stringify(name.toLowerCase().includes("testfluss")?
         [{osm_type:"relation",osm_id:12,name:"Testfluss",
           display_name:"Testfluss",lat:"48.77",lon:"9.17"}]:[])});
   });
   await page.locator("#searchInput").fill("Testfluss");
   await page.locator("#searchButton").click();
   await page.keyboard.press("u");
   await page.waitForFunction(()=>document.querySelector("#geometrySearchBusy")&&
     !document.querySelector("#geometrySearchBusy").classList.contains("hidden"),
     null,{timeout:5000});
   await page.locator("#geometryEditor.is-river").waitFor({state:"visible",timeout:30000});
   assert.equal(await page.locator("#geometrySearchBusy").isHidden(),true);
   assert.equal(await page.locator("#geometryEditor.is-river .geometry-actions button:not(.hidden)").count(),4);
   const riverActionOrder=await page.locator("#geometryEditor.is-river .geometry-actions button:not(.hidden)")
     .evaluateAll(buttons=>buttons.map(b=>b.getAttribute("aria-label")));
   assert.deepEqual(riverActionOrder,["Entfernen","Ebene ändern","Wikipedia","OK"],
     "River editing row must contain four circular actions in requested order");
   const river=await page.evaluate(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{return (await db.loadProject()).rivers[0];}finally{db.close();}
   });
   assert.equal(river.layerId,"private");
   assert.equal(river.chains[0].length,3);
   await page.locator("#geometryEditor .geometry-ok").click();
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelectorAll(".p2m-area-name-wrap").length===2,
     null,{timeout:10000});
   assert.equal(await page.locator(".p2m-river-name-label").count(),1);
   await page.screenshot({path:"geometry-browser-artifacts/"+view.name+"-areas-river.png"});
   assert.deepEqual(errors,[],view.name+" page errors");
   console.log("[geometry] PASS",view.name,"search modes, private saved polygons, lake, river and UI");
   await context.close();
  }
 }finally{await browser.close();}
})().catch(err=>{console.error("[geometry] FAIL",err.stack||err);process.exitCode=1;});
