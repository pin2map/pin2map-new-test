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
  ["pin","map-pin"],
  ["gps","locate-fixed"],
  ["area","region.svg"],
  ["lake","lake.svg"],
  ["river","river.svg"],
  ["plate","car-front"]
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
   // Focusing the search input opens the menu without clicking the magnifier.
   await page.locator("#searchInput").click();
   await page.locator("#searchTypeMenu").waitFor({state:"visible",timeout:5000});
   // A popup inside overflow:hidden was previously reported visible by
   // Playwright although its entire lower portion was clipped. Verify
   // actual viewport geometry AND real pointer hit testing.
   const chooserGeometry=await page.evaluate(()=>{
     const menu=document.querySelector("#searchTypeMenu");
     const trigger=document.querySelector("#searchForm").getBoundingClientRect();
     const app=document.querySelector("#app").getBoundingClientRect();
     const rect=menu.getBoundingClientRect();
     const first=menu.querySelector(".search-type-choice").getBoundingClientRect();
     const at=document.elementFromPoint(first.left+first.width/2,first.top+first.height/2);
     return {rect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},
       triggerBottom:trigger.bottom,triggerCenter:trigger.left+trigger.width/2,
       menuCenter:rect.left+rect.width/2,appRight:app.right,appBottom:app.bottom,
       hit:at?.closest?.(".search-type-choice")?.dataset.searchType||null,
       parentId:menu.parentElement?.id};
   });
   assert.equal(chooserGeometry.parentId,"app","Search chooser must escape clipped form");
   assert.ok(chooserGeometry.rect.top>=chooserGeometry.triggerBottom-1&&
     chooserGeometry.rect.right<=chooserGeometry.appRight+1&&
     chooserGeometry.rect.bottom<=chooserGeometry.appBottom+1&&
     Math.abs(chooserGeometry.triggerCenter-chooserGeometry.menuCenter)<2,
     "Search chooser must be fully visible BELOW the magnifier: "+JSON.stringify(chooserGeometry));
   assert.equal(chooserGeometry.hit,"pin",
     "First search option must be clickable at its visual center");
   await page.screenshot({path:"geometry-browser-artifacts/"+view.name+"-search-menu.png"});
   assert.equal(await page.locator(".search-type-choice").count(),6);
   assert.equal(await page.locator(".search-type-choice.is-selected").count(),0,"Opening must not prehighlight Pin");
   for(let i=0;i<modes.length;i++){
     const option=page.locator(".search-type-choice").nth(i);
     assert.equal(await option.locator((i<=1||i===5)?"svg":"img").count(),1,
       "Missing icon "+modes[i][1]);
     assert.equal(await option.locator("kbd").count(),0);
     if(i===0)assert.equal(await option.locator("span").first().innerText(),"Pin");
     else assert.equal(await option.locator("strong").innerText(),["","G","G","S","F","K"][i]);
   }
   assert.equal(await page.locator("#searchTypeMenu").evaluate(el=>getComputedStyle(el).backgroundColor),
     "rgb(255, 255, 255)");
   await page.keyboard.press("Tab");
   assert.equal(await page.locator(".search-type-choice.is-selected").getAttribute("data-search-type"),"pin");
   await page.keyboard.press("ArrowDown");
   assert.equal(await page.locator(".search-type-choice.is-selected").getAttribute("data-search-type"),"gps");
   await page.keyboard.press("ArrowDown");
   assert.equal(await page.locator(".search-type-choice.is-selected").getAttribute("data-search-type"),"area");
   await page.locator("#searchInput").focus();
   await page.keyboard.press("Escape");
   assert.equal(await page.locator("#searchTypeMenu").isHidden(),true);
   await page.locator("#searchInput").fill("");
   await page.keyboard.press("Enter");
   assert.equal(await page.locator("#searchTypeMenu").isHidden(),true,
     "Enter from the input launches default Pin search and closes chooser");
   // GPS permission and coordinates are controlled within this isolated context.
   await context.grantPermissions(["geolocation"],{origin:new URL(base).origin});
   await context.setGeolocation({latitude:47.6501,longitude:9.1802,accuracy:8});
   await page.locator("#searchInput").fill("bodensee");
   await page.keyboard.press("Tab");
   await page.keyboard.press("p");
   await page.locator("#gpsPinPrompt").waitFor({state:"visible",timeout:10000});
   assert.equal(await page.evaluate(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{return (await db.loadProject()).pins.length;}finally{db.close();}
   }),0,"Locating GPS must not create a Pin");
   await page.locator(".gps-pin-no").click();
   assert.equal(await page.locator("#gpsPinPrompt").isHidden(),true);
   assert.equal(await page.evaluate(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{return (await db.loadProject()).pins.length;}finally{db.close();}
   }),0,"No must leave the temporary point unsaved");
   await page.locator("#searchInput").click();
   await page.locator('.search-type-choice[data-search-type="gps"]').click();
   await page.locator("#gpsPinPrompt").waitFor({state:"visible",timeout:10000});
   await page.locator(".gps-pin-yes").click();
   await page.locator("#pinPanel").waitFor({state:"visible"});
   assert.match(await page.locator("#pinName").inputValue(),/^GPS - \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
   assert.equal(await page.locator("#pinName").evaluate(el=>
     el.selectionStart===0&&el.selectionEnd===el.value.length),true,
     "GPS Pin name must be selected for immediate editing");
   await page.waitForFunction(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{return (await db.loadProject()).pins.length===1;}finally{db.close();}
   },null,{timeout:8000});
   const savedGpsPins=await page.evaluate(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{return (await db.loadProject()).pins;}finally{db.close();}
   });
   assert.equal(savedGpsPins.length,1,"Yes creates exactly one private GPS Pin: "+JSON.stringify(savedGpsPins));
   assert.equal(savedGpsPins[0].layerId,"private");
   assert.ok(Math.abs(savedGpsPins[0].lat-47.6501)<0.001,
     "GPS position must match mocked coordinates: "+JSON.stringify(savedGpsPins[0]));
   await page.locator("#closePin").click();
   await page.evaluate(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{const project=await db.loadProject();project.pins=[];await db.saveProject(project);}
     finally{db.close();}
   });
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelector("#searchInput")&&
     document.querySelector(".leaflet-container"),null,{timeout:15000});
   // The offline catalog yields multiple regions; a boundary must match
   // both the selected code and country.
   await page.route(/nominatim\.openstreetmap\.org\/search/,async route=>{
     const name=new URL(route.request().url()).searchParams.get("q");
     if(name!=="Berlin"){await route.fallback();return;}
     await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify([
       {osm_type:"relation",osm_id:62422,name:"Berlin",display_name:"Berlin, Deutschland",
         addresstype:"city",type:"administrative",class:"boundary",
         address:{country_code:"de"},geojson:poly}
     ])});
   });
   await page.locator("#searchInput").fill("B");
   await page.locator('.search-type-choice[data-search-type="plate"]').click();
   const candidates=page.locator("#searchResults .result");
   await candidates.first().waitFor({state:"visible"});
   assert.ok(await candidates.count()>=2);
   assert.ok((await candidates.allInnerTexts()).some(t=>t.includes("Bukarest")));
   await candidates.filter({hasText:"Berlin"}).first().click();
   await page.locator(".p2m-plate-label").waitFor({state:"visible",timeout:12000});
   assert.equal(await page.locator(".p2m-plate-label").innerText(),"🇩🇪 B (Berlin)");
   assert.equal(await page.evaluate(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{return (await db.loadProject()).areas.length;}finally{db.close();}
   }),0,"Pink preview must not be stored in project areas");
   await page.locator(".p2m-plate-label").click();
   await page.locator("#plateAreaConfirm").waitFor({state:"visible"});
   await page.locator(".plate-area-no").click();
   assert.equal(await page.locator(".p2m-plate-label").isVisible(),true);
   await page.locator(".p2m-plate-label").click();
   await page.locator(".plate-area-yes").click();
   await page.locator("#geometryEditor").waitFor({state:"visible"});
   await page.waitForFunction(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{return (await db.loadProject()).areas.length===1;}finally{db.close();}
   },null,{timeout:8000});
   assert.equal(await page.evaluate(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{
       const area=(await db.loadProject()).areas[0];
       return area.layerId==="private"&&area.name==="🇩🇪 B (Berlin)"&&area.kind==="area";
     }finally{db.close();}
   }),true);
   await page.locator(".geometry-ok").click();
   await page.evaluate(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{const project=await db.loadProject();
       project.areas=[];await db.saveProject(project);}finally{db.close();}
   });
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelector("#searchInput")&&
     document.querySelector(".leaflet-container"),null,{timeout:15000});
   await page.locator("#searchInput").fill("B");
   await page.locator('.search-type-choice[data-search-type="plate"]').click();
   await page.locator("#searchResults .result").filter({hasText:"Berlin"}).first().click();
   await page.locator(".p2m-plate-label").waitFor({state:"visible",timeout:12000});
   await page.locator("#searchInput").fill("Testfläche");
   await page.locator('.search-type-choice[data-search-type="area"]').click();
   assert.equal(await page.locator(".p2m-plate-label").count(),0,
     "New regular area search removes the temporary license plate area");
   // Restore an isolated empty test fixture after the plate scenario. Otherwise
   // delayed viewport writes from the previous test may restore the saved
   // confirmation area during the later two-area regression (especially iPhone).
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelector(".leaflet-container"),
     null,{timeout:15000});
   await page.evaluate(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{
       const project=window.Pin2MapProjectModel.defaultProject();
       project.allowGeocode=true;
       await db.saveProject(project);
     }finally{db.close();}
   });
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelector("#searchInput")&&
     document.querySelector(".leaflet-container"),null,{timeout:15000});
   await page.locator("#searchInput").fill("Testfläche");
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
   await page.keyboard.press("Tab");
   assert.equal(await page.evaluate(()=>document.activeElement?.dataset?.searchType),"pin");
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

   // The free map surface uses one click/tap to open the two-icon chooser.
   // If any menu is open, the FIRST map tap closes it and MUST NOT reopen.
   const contextMenu=page.locator("#mapActionChooser");
   const mapBox=await page.locator("#map").boundingBox();
   const point={x:mapBox.x+90,y:mapBox.y+160};
   const clickMap=async(at=point)=>{
     if(view.mobile)await page.touchscreen.tap(at.x,at.y);
     else await page.mouse.click(at.x,at.y);
   };
   await clickMap();
   await contextMenu.waitFor({state:"visible",timeout:5000});
   const labels=await contextMenu.locator("button").evaluateAll(buttons=>
     buttons.map(button=>button.getAttribute("aria-label")));
   assert.deepEqual(labels,["Pin setzen","Gebiet suchen"]);
   assert.equal(await contextMenu.locator("button span").count(),0);
   const chooserRect=await contextMenu.boundingBox();
   assert.ok(chooserRect&&chooserRect.width<=120&&chooserRect.height<=60,
     "Two icon actions must remain compact");
   await clickMap();
   assert.equal(await contextMenu.isHidden(),true,
     "First outside click closes chooser without reopening it");
   await clickMap();
   await contextMenu.waitFor({state:"visible",timeout:5000});
   await page.keyboard.press("Escape");
   assert.equal(await contextMenu.isHidden(),true);
   // Search and settings menus must obey the very same two-step rule.
   await page.locator("#settingsButton").click();
   await page.locator("#settingsPanel").waitFor({state:"visible",timeout:5000});
   // The settings panel occupies the upper-left part of the map. Pick a
   // genuinely exposed map point, rather than clicking INSIDE that panel.
   const outsideSettings=await page.evaluate(()=>{
     const map=document.getElementById("map").getBoundingClientRect();
     const panel=document.getElementById("settingsPanel").getBoundingClientRect();
     for(const [fx,fy] of [[.86,.62],[.88,.42],[.55,.88],[.40,.75],[.90,.78],[.15,.88]]){
       const x=map.left+map.width*fx,y=map.top+map.height*fy;
       if(x>=panel.left&&x<=panel.right&&y>=panel.top&&y<=panel.bottom)continue;
       const target=document.elementFromPoint(x,y);
       if(target?.closest?.("#map")&&
         !target.closest(".leaflet-control,.leaflet-marker-icon,.leaflet-interactive"))
         return {x,y};
     }
     return null;
   });
   if(!outsideSettings){
     // On narrow phones settings can fill the entire visible map. No
     // physical map surface remains tappable; close using its own button,
     // then verify the two-step behavior through a smaller search menu.
     await page.locator("#settingsButton").click();
     await page.locator("#searchButton").click();
     await page.locator("#searchTypeMenu").waitFor({state:"visible"});
     await clickMap();
     assert.equal(await page.locator("#searchTypeMenu").isHidden(),true);
     assert.equal(await contextMenu.isHidden(),true);
     await clickMap();
     await contextMenu.waitFor({state:"visible"});
     await page.keyboard.press("Escape");
   }else{
   await page.evaluate(()=>{
     window.__mapTapTrace=[];
     const snap=(event,phase)=>{
       const e=document.getElementById("settingsPanel");
       const menu=document.getElementById("mapActionChooser");
       window.__mapTapTrace.push({phase,type:event.type,
         target:String(event.target?.className?.baseVal||event.target?.className||event.target?.tagName),
         settings:e.classList.contains("hidden"),chooser:menu.classList.contains("hidden")});
     };
     window.addEventListener("pointerdown",e=>snap(e,"window-capture"),true);
     document.addEventListener("pointerdown",e=>snap(e,"document-capture"),true);
     document.getElementById("map").addEventListener("pointerdown",e=>snap(e,"map-capture"),true);
     document.addEventListener("click",e=>snap(e,"click-document-capture"),true);
   });
   await clickMap(outsideSettings);
   assert.equal(await page.locator("#settingsPanel").isHidden(),true);
   assert.equal(await contextMenu.isHidden(),true,
     "First map tap must not open chooser: "+
     JSON.stringify(await page.evaluate(()=>window.__mapTapTrace)));
   await clickMap(outsideSettings);
   await contextMenu.waitFor({state:"visible",timeout:5000});
   await page.keyboard.press("Escape");
   }
   if(!view.mobile){
     // Legacy gestures no longer open the chooser.
     await page.locator("#map").click({button:"right",
       position:{x:90,y:160},force:true});
     assert.equal(await contextMenu.isHidden(),true);
     await page.mouse.move(point.x,point.y);
     await page.mouse.down();await page.waitForTimeout(750);await page.mouse.up();
     assert.equal(await contextMenu.isHidden(),true);
     await page.locator("#map").dblclick({position:{x:90,y:160},force:true});
     assert.equal(await contextMenu.isHidden(),true,
       "Double-click must not leave the chooser open");
   }else{
     // Two sequential taps now open then CLOSE instead of being required
     // to trigger the initial context menu.
     await clickMap();await contextMenu.waitFor({state:"visible",timeout:5000});
     await clickMap();assert.equal(await contextMenu.isHidden(),true);
   }
   await page.locator("#searchButton").click();
   assert.equal(await contextMenu.isHidden(),true);
   await page.keyboard.press("Escape");

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
   await page.keyboard.press("Tab");
   await page.keyboard.press("f");
   assert.equal(await page.locator("#searchTypeMenu").isHidden(),true,
     "F activates Fluss search only after keyboard focus enters chooser");
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
   // New South Wales regression: clicking near the shore may have the
   // correct state in reverse hierarchy even when the searched polygon
   // is outside a legacy 6-degree box or misses that point after provider
   // simplification. A unique selected state must still resolve.
   await page.route(/nominatim\.openstreetmap\.org\/reverse/,async route=>
     route.fulfill({status:200,contentType:"application/json",
       body:JSON.stringify({address:{state:"Neusüdwales",country_code:"au"}})}));
   await page.route(/nominatim\.openstreetmap\.org\/search/,async route=>{
     const url=new URL(route.request().url());
     assert.equal(url.searchParams.has("bounded"),false);
     assert.equal(url.searchParams.get("countrycodes"),"au");
     await route.fulfill({status:200,contentType:"application/json",
       body:JSON.stringify([{osm_type:"relation",osm_id:2316596,
         name:"New South Wales",namedetails:{"name:de":"Neusüdwales"},
         addresstype:"state",type:"administrative",
         geojson:{type:"Polygon",coordinates:[[[
           141,-37.5],[154,-37.5],[154,-28],[141,-28],[141,-37.5]
         ]]}}])});
   });
   const free=await page.locator("#map").boundingBox();
   const px=free.x+85,py=free.y+150;
   if(view.mobile)await page.touchscreen.tap(px,py);
   else await page.mouse.click(px,py);
   await page.locator("#mapActionChooser").waitFor({state:"visible",timeout:5000});
   await page.locator('#mapActionChooser button[aria-label="Gebiet suchen"]').click();
   await page.locator("#searchResults .result").first().waitFor({
     state:"visible",timeout:12000
   });
   assert.match(await page.locator("#searchResults .result").first().textContent(),
     /Neusüdwales/);
   await page.locator("#searchResults .result").first().click();
   const nsw=(await waitForStored(project=>project?.areas?.some(
     area=>area.name==="Neusüdwales"),"New South Wales via hierarchy")).areas
     .find(area=>area.name==="Neusüdwales");
   assert.equal(nsw.layerId,"private");
   assert.equal(nsw.geometry.type,"Polygon");
   assert.equal(await page.locator("#searchResults .message").count(),0);
   // True browser regression for a mixed pin + area LABEL at the same map
   // position. The first click must zoom the group, NOT open either editor.
   await page.evaluate(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{
       const project=await db.loadProject();
       project.viewport={lat:48.75,lng:9.2,zoom:9};
       project.pins=[{id:"mixed-pin",name:"Misch-Pin",
         lat:48.75,lng:9.2,layerId:"private",note:"",url:""}];
       project.areas=[{id:"mixed-area",name:"Mischfläche",kind:"area",
         layerId:"private",note:"",url:"",
         geometry:{type:"Polygon",coordinates:[[
           [9,48.6],[9.4,48.6],[9.4,48.9],[9,48.9],[9,48.6]
         ]]}}];
       project.rivers=[];
       await db.saveProject(project);
       await db.saveViewHistory({entries:[
         {center:{lat:48.75,lng:9.2},zoom:9}
       ],index:0});
     }finally{db.close();}
   });
   await page.reload({waitUntil:"domcontentloaded"});
   await page.locator(".p2m-area-name-label").waitFor({state:"visible",timeout:15000});
   await page.locator(".pin-icon").waitFor({state:"visible",timeout:15000});
   const overlap=await page.evaluate(()=>{
     const a=document.querySelector(".p2m-area-name-label").getBoundingClientRect();
     const b=document.querySelector(".pin-icon").getBoundingClientRect();
     return a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
   });
   assert.equal(overlap,true,"Fixture must genuinely overlap pin hitbox and area label");
   await page.locator(".p2m-area-name-label").first().click({force:true});
   await waitForStored(project=>project?.viewport?.zoom>9,
     "mixed pin/area label zoom");
   assert.equal(await page.locator("#geometryEditor").isHidden(),true);
   assert.equal(await page.locator("#pinPanel").isHidden(),true);
   // Country-neutral fallback: no valid administrative polygon but a
   // geocoder-validated reference city. User consent alone creates a Pin.
   await page.route(/nominatim\.openstreetmap\.org\/search/,async route=>{
     const query=new URL(route.request().url()).searchParams.get("q");
     if(query==="Landkreis Havelland"||query==="Bezirk Graz-Umgebung"){
       await route.fulfill({status:200,contentType:"application/json",body:"[]"});
       return;
     }
     if(query==="Rathenow"||query==="Gratkorn"){
       await route.fulfill({status:200,contentType:"application/json",
         body:JSON.stringify([{name:query,display_name:query+", Testland",
           lat:query==="Rathenow"?"52.605":"47.134",
           lon:query==="Rathenow"?"12.333":"15.337",
           addresstype:"town",type:"town",
           address:{country_code:query==="Rathenow"?"de":"at"}}])});
       return;
     }
     await route.fallback();
   });
   await page.locator("#searchInput").fill("HVL");
   await page.locator('.search-type-choice[data-search-type="plate"]').click();
   await page.locator('#searchResults .result').filter({hasText:"HVL"}).first().click();
   await page.locator(".p2m-plate-reference").waitFor({state:"visible",timeout:12000});
   assert.match(await page.locator(".p2m-plate-reference").innerText(),/Rathenow.*Ersatzort/);
   const beforePins=await page.evaluate(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{return (await db.loadProject()).pins.length;}finally{db.close();}
   });
   await page.locator(".p2m-plate-reference").click();
   await page.locator("#plateAreaConfirm").waitFor({state:"visible"});
   assert.match(await page.locator("#plateAreaConfirm").innerText(),/Ersatzort als Pin speichern/);
   await page.locator(".plate-area-no").click();
   assert.equal(await page.locator(".p2m-plate-reference").isVisible(),true);
   assert.equal(await page.evaluate(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{return (await db.loadProject()).pins.length;}finally{db.close();}
   }),beforePins,"No must not persist a reference town");
   await page.locator(".p2m-plate-reference").click();
   await page.locator(".plate-area-yes").click();
   await page.locator("#pinPanel").waitFor({state:"visible"});
   assert.match(await page.locator("#pinName").inputValue(),/HVL.*Rathenow.*Ersatzort/);
   assert.equal(await page.locator("#pinName").evaluate(el=>
     el.selectionStart===0&&el.selectionEnd===el.value.length),true);
   await page.waitForFunction(async()=>{
     const db=await window.Pin2MapIndexedDBProjectStore.open();
     try{return (await db.loadProject()).pins.some(pin=>
       pin.layerId==="private"&&pin.name.includes("HVL")&&
       Math.abs(pin.lat-52.605)<0.001);}
     finally{db.close();}
   },null,{timeout:12000});
   await page.locator("#closePin").click();
   await page.locator("#searchInput").fill("GU");
   await page.locator('.search-type-choice[data-search-type="plate"]').click();
   await page.locator("#searchResults .result").filter({hasText:"Graz"}).first().click();
   await page.locator(".p2m-plate-reference").waitFor({state:"visible",timeout:12000});
   assert.match(await page.locator(".p2m-plate-reference").innerText(),/Gratkorn.*Ersatzort/);
   await page.locator("#searchInput").fill("B");
   await page.locator('.search-type-choice[data-search-type="plate"]').click();
   assert.equal(await page.locator(".p2m-plate-reference").count(),0,
     "Any new search clears the temporary Austrian fallback point");
   await page.locator("#searchResults .result").first().waitFor({state:"visible"});
   assert.deepEqual(errors,[],view.name+" page errors");
   console.log("[geometry] PASS",view.name,"search modes, private saved polygons, lake, river and UI");
   await context.close();
  }
 }finally{await browser.close();}
})().catch(err=>{console.error("[geometry] FAIL",err.stack||err);process.exitCode=1;});
