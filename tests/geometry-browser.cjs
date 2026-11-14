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
   await page.evaluate(()=>{
     window.__geometryWrites=[];
     const prototype=window.Pin2MapIndexedDBProjectStore.prototype;
     const original=prototype.saveProject;
     prototype.saveProject=function(project){
       window.__geometryWrites.push({at:Date.now(),areas:project.areas?.length,
         rivers:project.rivers?.length,trace:(new Error()).stack?.split("\\n").slice(1,4).join(" | ")});
       return original.call(this,project);
     };
   });
   // Clicking magnifier opens the menu. It does not submit automatically.
   await page.locator("#searchButton").click();
   await page.locator("#searchTypeMenu").waitFor({state:"visible",timeout:5000});
   // A popup inside overflow:hidden was previously reported visible by
   // Playwright although its entire lower portion was clipped. Verify
   // actual viewport geometry AND real pointer hit testing.
   const chooserGeometry=await page.evaluate(()=>{
     const menu=document.querySelector("#searchTypeMenu");
     const trigger=document.querySelector("#searchButton").getBoundingClientRect();
     const app=document.querySelector("#app").getBoundingClientRect();
     const rect=menu.getBoundingClientRect();
     const first=menu.querySelector(".search-type-choice").getBoundingClientRect();
     const at=document.elementFromPoint(first.left+first.width/2,first.top+first.height/2);
     return {rect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},
       triggerBottom:trigger.bottom,appRight:app.right,appBottom:app.bottom,
       hit:at?.closest?.(".search-type-choice")?.dataset.searchType||null,
       parentId:menu.parentElement?.id};
   });
   assert.equal(chooserGeometry.parentId,"app","Search chooser must escape clipped form");
   assert.ok(chooserGeometry.rect.top>=chooserGeometry.triggerBottom-1&&
     chooserGeometry.rect.right<=chooserGeometry.appRight+1&&
     chooserGeometry.rect.bottom<=chooserGeometry.appBottom+1,
     "Search chooser must be fully visible BELOW the magnifier: "+JSON.stringify(chooserGeometry));
   assert.equal(chooserGeometry.hit,"pin",
     "First search option must be clickable at its visual center");
   await page.screenshot({path:"geometry-browser-artifacts/"+view.name+"-search-menu.png"});
   assert.equal(await page.locator(".search-type-choice").count(),4);
   for(let i=0;i<modes.length;i++){
     assert.equal(await page.locator(".search-type-choice").nth(i)
       .locator("svg").count(),1,"Missing Lucide "+modes[i][1]);
   }
   await page.keyboard.press("Escape");
   assert.equal(await page.locator("#searchTypeMenu").isHidden(),true);
   await page.locator("#searchInput").fill("Testfläche");
   await page.locator("#searchButton").click();
   await page.locator('.search-type-choice[data-search-type="area"]').click();
   await page.locator("#searchResults .result").first()
     .waitFor({state:"visible",timeout:12000});
   assert.equal(await page.locator(".result-feature-icon").count(),1);
   await page.locator("#searchResults .result").first().click();
   await page.locator("#geometryEditor").waitFor({state:"visible",timeout:10000});
   assert.equal(await page.locator("#geometryEditor .geometry-notes").isVisible(),true);
   assert.equal(await page.locator("#geometryEditor .geometry-actions button").count(),4);
   assert.equal(await page.locator("#geometryName").inputValue(),"Testfläche");
   async function readStoredProject(){
     return page.evaluate(async()=>{
       const db=await window.Pin2MapIndexedDBProjectStore.open();
       try{return await db.loadProject();}finally{db.close();}
     });
   }
   async function waitForStored(predicate,label){
     const end=Date.now()+10000;
     while(Date.now()<end){
       const saved=await readStoredProject();
       if(predicate(saved))return saved;
       await page.waitForTimeout(120);
     }
     const latest=await readStoredProject();
     throw new Error("Timed out waiting for persisted "+label+": "+JSON.stringify({
       areas:latest?.areas?.length,rivers:latest?.rivers?.length
     }));
   }
   // Project writes are debounced; the open editor proves in-memory
   // creation, but persistent storage must be awaited independently.
   const savedArea=(await waitForStored(project=>project?.areas?.length>=1,"first area")).areas[0];
   if(!savedArea){
     const diagnostic=await page.evaluate(async()=>{
       const db=await window.Pin2MapIndexedDBProjectStore.open();
       try{const project=await db.loadProject();return {
         keys:Object.keys(project||{}),areas:project?.areas,
         areaCount:project?.areas?.length,allowGeocode:project?.allowGeocode,
         projectVersion:project?.version,writes:window.__geometryWrites};}
       finally{db.close();}
     });
     throw new Error("Missing persisted area after wait: "+JSON.stringify(diagnostic));
   }
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
   await page.locator(".p2m-area-name-label").first().click({force:true});
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
   const lake=(await waitForStored(project=>project?.areas?.some(a=>a.kind==="lake"),
     "lake")).areas.find(a=>a.kind==="lake");
   assert.equal(lake.layerId,"private");
   await page.locator(".geometry-ok").click();
   // The area/see name markers must remain legible inside a partially shown
   // polygon at different zoom levels, not fixed at the complete bounds center.
   const panelBounds=await page.locator("#map").boundingBox();
   const areaLabels=page.locator(".p2m-area-name-label");
   assert.equal(await areaLabels.count(),2);
   const inViewport=async locator=>{
     const b=await locator.boundingBox();
     return !!b&&b.x>=panelBounds.x-2&&b.y>=panelBounds.y-2&&
       b.x+b.width<=panelBounds.x+panelBounds.width+2&&
       b.y+b.height<=panelBounds.y+panelBounds.height+2;
   };
   assert.ok(await inViewport(areaLabels.nth(0)), "Area label inside current viewport");
   assert.ok(await inViewport(areaLabels.nth(1)), "Lake label inside current viewport");

   // Synthetic right-click is supported on desktop; touch gets a pointer
   // longpress regression through the existing pin browser suite.
   if(!view.mobile){
     await page.locator("#map").click({button:"right",
       position:{x:90,y:110},force:true});
     await page.locator("#mapActionChooser").waitFor({state:"visible",timeout:5000});
     assert.equal(await page.locator("#mapActionChooser button").count(),4);
     const labels=await page.locator("#mapActionChooser button").evaluateAll(
       buttons=>buttons.map(button=>button.getAttribute("aria-label")));
     assert.deepEqual(labels,["Heranzoomen","Pin setzen","Gebiet suchen","Herauszoomen"]);
     assert.equal(await page.locator("#mapActionChooser button span").count(),0,
       "Context actions must use icons only, without text captions");
     const chooserRect=await page.locator("#mapActionChooser").boundingBox();
     assert.ok(chooserRect&&chooserRect.x>40&&chooserRect.y>75);
     assert.ok(chooserRect.width<=220&&chooserRect.height<=60,
       "Four circular icon buttons must form a compact anchored chooser");
     await page.locator('#mapActionChooser button[aria-label="Heranzoomen"]').click();
     assert.equal(await page.locator("#mapActionChooser").isHidden(),true);
     // The app persists the exact selected zoom level, without creating pins.
     const stored=await waitForStored(project=>project?.viewport?.zoom===16,
       "context zoom level 16");
     assert.equal(stored.viewport.zoom,16);
     assert.equal(await page.locator("#pinPanel").isHidden(),true);
     // The gesture handler intentionally suppresses the synthetic context
     // click for 750 ms; a fresh user right-click follows that interval.
     await page.waitForTimeout(900);
     // Dismissal remains available by clicking outside or pressing Escape.
     await page.locator("#map").click({button:"right",
       position:{x:110,y:120},force:true});
     await page.locator("#mapActionChooser").waitFor({state:"visible",timeout:5000});
     await page.keyboard.press("Escape");
     assert.equal(await page.locator("#mapActionChooser").isHidden(),true);
     // Fourth action must use the same exact click point, at zoom level 8.
     await page.waitForTimeout(900);
     await page.locator("#map").click({button:"right",
       position:{x:115,y:130},force:true});
     await page.locator("#mapActionChooser").waitFor({state:"visible",timeout:5000});
     await page.locator('#mapActionChooser button[aria-label="Herauszoomen"]').click();
     const zoomOut=await waitForStored(project=>project?.viewport?.zoom===8,
       "context zoom level 8");
     assert.equal(zoomOut.viewport.zoom,8);
     assert.equal(await page.locator("#pinPanel").isHidden(),true);
   }else{
     // A single touch must keep the ordinary map behavior. Two short taps
     // on the BARE map call exactly the same chooser as Longtap.
     const mapBox=await page.locator("#map").boundingBox();
     const tx=mapBox.x+mapBox.width*.67,ty=mapBox.y+mapBox.height*.68;
     await page.touchscreen.tap(tx,ty);
     assert.equal(await page.locator("#mapActionChooser").isHidden(),true);
     await page.waitForTimeout(110);
     await page.touchscreen.tap(tx,ty);
     await page.locator("#mapActionChooser").waitFor({state:"visible",timeout:4500});
     const labels=await page.locator("#mapActionChooser button").evaluateAll(
       buttons=>buttons.map(b=>b.getAttribute("aria-label")));
     assert.deepEqual(labels,["Heranzoomen","Pin setzen","Gebiet suchen","Herauszoomen"]);
     // Dismiss without creating a pin, then ensure a control tap is never
     // mistaken for a second tap on the map's background.
     await page.keyboard.press("Escape");
     assert.equal(await page.locator("#mapActionChooser").isHidden(),true);
     await page.locator("#searchButton").tap();
     assert.equal(await page.locator("#mapActionChooser").isHidden(),true);
     await page.keyboard.press("Escape");
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
   await page.locator('.search-type-choice[data-search-type="river"]').click();
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
   const river=(await waitForStored(project=>project?.rivers?.length>=1,"river")).rivers[0];
   assert.equal(river.layerId,"private");
   assert.equal(river.chains[0].length,3);
   await page.locator("#geometryEditor .geometry-ok").click();
   // A river label must follow the visible course when only part of the
   // river is in view; the entire river's fixed midpoint is not sufficient.
   const riverLabel=page.locator(".p2m-river-name-label").first();
   await riverLabel.waitFor({state:"visible",timeout:5000});
   const nameBefore=await riverLabel.boundingBox();
   const mapBounds=await page.locator("#map").boundingBox();
   assert.ok(nameBefore&&mapBounds&&nameBefore.x>=mapBounds.x-2&&
     nameBefore.x+nameBefore.width<=mapBounds.x+mapBounds.width+2&&
     nameBefore.y>=mapBounds.y-2&&
     nameBefore.y+nameBefore.height<=mapBounds.y+mapBounds.height+2,
     "River name must be visible within the current map viewport");
   if(!view.mobile){
     const mapCenter={x:mapBounds.x+mapBounds.width*.7,
       y:mapBounds.y+mapBounds.height*.65};
     await page.mouse.move(mapCenter.x,mapCenter.y);
     await page.mouse.down();
     await page.mouse.move(mapCenter.x+170,mapCenter.y+75,{steps:8});
     await page.mouse.up();
     await page.waitForTimeout(350);
     const nameAfter=await riverLabel.boundingBox();
     assert.ok(nameAfter&&nameAfter.x>=mapBounds.x-2&&
       nameAfter.x+nameAfter.width<=mapBounds.x+mapBounds.width+2&&
       nameAfter.y>=mapBounds.y-2&&
       nameAfter.y+nameAfter.height<=mapBounds.y+mapBounds.height+2,
       "River label must remain visible after map panning");
     assert.ok(Math.abs(nameAfter.x-nameBefore.x)>20,
       "River name should re-anchor when the visible river moves");
   }
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
