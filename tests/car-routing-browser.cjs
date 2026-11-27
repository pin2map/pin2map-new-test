"use strict";
/* Isolated Chromium/WebKit contract for the actual preview routing UI.
 * No external routing network needed: provider HTTP is intercepted with
 * correctly shaped OSRM data. Tested project exists only in this browser context.
 */
const assert=require("node:assert/strict");
const {chromium,webkit}=require("playwright");
const URL_BASE=process.env.PIN2MAP_ROUTING_URL||"http://127.0.0.1:8765/";
(async()=>{
for(const [engineName,engine] of [["Chromium",chromium],["WebKit",webkit]]){
 const browser=await engine.launch({headless:true});
 try{
  for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
   const mobile=viewport.width<500;
   const ctx=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,serviceWorkers:"block"});
   const page=await ctx.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.stack||e.message));
   const base=URL_BASE.endsWith("/")?URL_BASE:URL_BASE+"/";
   const routeRequests=[],shapeRequests=[];
   let ferryFixture=false;
   await page.route(/router\.project-osrm\.org\/route\/v1\/driving\//,async route=>{
    const url=new URL(route.request().url());
    const coords=decodeURIComponent(url.pathname.split("/driving/").at(-1)).split(";").map(s=>s.split(",").map(Number));
    routeRequests.push(coords);
    if(coords.length>2)shapeRequests.push({coords,stops:url.searchParams.get("waypoints")});
    const response={distance:24000,duration:1800,geometry:{type:"LineString",coordinates:coords}};
    if(ferryFixture){
     const [from,to]=coords;
     const at=fraction=>from.map((coord,i)=>coord+(to[i]-coord)*fraction);
     const path=[from,at(.35),at(.65),to];
     response.duration=12600;
     response.geometry.coordinates=path;
     response.legs=[{steps:["driving","ferry","driving"].map((mode,i)=>({
      mode,name:mode==="ferry"?"Testfähre":"",duration:mode==="ferry"?5400:3600,distance:8000,
      geometry:{type:"LineString",coordinates:path.slice(i,i+2)}
     }))}];
    }
    const body={code:"Ok",routes:[response]};
    await route.fulfill({status:200,contentType:"application/json",headers:{"Access-Control-Allow-Origin":"*"},body:JSON.stringify(body)});
   });
   await page.goto(base,{waitUntil:"domcontentloaded"});
   await page.waitForSelector(".pin-zoom-buttons",{timeout:20000});
   await page.evaluate(async()=>{
     const Store=window.Pin2MapIndexedDBProjectStore;
     const store=await Store.open();
     const project=window.Pin2MapProjectModel.defaultProject();
     project.viewport={lat:48.5,lng:10.3,zoom:6};
     project.pins=[
      {id:"p-s",name:"Stuttgart",layerId:"private",lat:48.7758,lng:9.1829,note:"",url:""},
      {id:"p-w",name:"Ulm",layerId:"private",lat:48.3984,lng:9.9916,note:"",url:""},
      {id:"p-t",name:"München",layerId:"private",lat:48.1372,lng:11.5755,note:"",url:""}
     ];
     await store.saveProject(project);store.close();
   });
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelectorAll(".leaflet-marker-icon.pin-icon").length===3,null,{timeout:20000});
   // The established app deliberately zooms a colliding label group on
   // the first tap; honor that user interaction instead of calling UI internals.
   const markerAt=index=>page.locator(".leaflet-marker-icon.pin-icon").nth(index);
   async function openPin(index,name){
    for(let attempt=0;attempt<5;attempt++){
     const menu=page.locator(".pin-overlap-chooser");
     if(await menu.isVisible()){
      const choice=menu.locator(".pin-overlap-choice").filter({hasText:name});
      if(await choice.count())await choice.first().click();
      else await markerAt(index).click();
     }else await markerAt(index).click();
     if(await page.locator("#pinPanel").isVisible()&&await page.locator("#pinName").inputValue()===name)return;
     await page.waitForTimeout(120);
    }
    throw new Error("Cannot select expected "+name+" through real marker UX");
   }
   const normalPins=await page.locator("#map .pin-icon .pin-marker").evaluateAll(nodes=>nodes.map(n=>n.innerHTML));
   const rolePins=kind=>page.locator('#map .pin-icon .pin-marker[data-route-role="'+kind+'"]');
   async function assertRolePins(){
    assert.equal(await page.locator("#map .p2m-route-role-holder").count(),0,"No extra routing markers");
    assert.equal(await page.locator("#map .pin-icon").count(),3,"Only original pin marker handles");
    for(const [kind,color] of [["start","#ed3434"],["target","#289d54"],["waypoint","#efc63e"]]){
     assert.equal(await rolePins(kind).count(),1);
     assert.equal(await rolePins(kind).locator(".pin-status-segments").count(),0);
     assert.equal(await rolePins(kind).locator(".pin-marker-shape > path").first().getAttribute("fill"),color);
     // Measure visibility and dimensions in one frame. A deferred Leaflet fit
     // can hide the marker between separate visibility and bounding-box calls.
     await page.waitForFunction(role=>{
      const shape=document.querySelector('.pin-marker[data-route-role="'+role+'"] .pin-marker-shape');
      if(!shape||getComputedStyle(shape).visibility!=="visible")return false;
      const {width,height}=shape.getBoundingClientRect();
      return Math.abs(width-30)<1&&Math.abs(height-40)<1;
     },kind,{timeout:5000});
    }
    assert.equal(await rolePins("start").locator('[data-route-icon="arrow-up-right"][stroke="#fff"]').count(),1);
    assert.equal(await rolePins("target").locator('[data-route-icon="goal"][stroke="#fff"]').count(),1);
    assert.equal(await rolePins("waypoint").locator('text[fill="#fff"]').textContent(),"1");
   }
   async function assertButton(id,active,color,ink){
    const button=page.locator("#"+id);
    assert.equal(await button.getAttribute("aria-pressed"),String(active));
    const style=await button.evaluate(el=>{
     const s=getComputedStyle(el);
     return {bg:s.backgroundColor,border:s.borderTopColor,ink:getComputedStyle(el.querySelector("svg")).stroke};
    });
    assert.equal(style.border,color,id+" border");
    assert.equal(style.bg,active?color:"rgb(245, 246, 248)",id+" background");
    if(active)assert.equal(style.ink,ink,id+" icon");
   }
   async function setRole(id){
    await page.locator("#"+id).click();
    assert.equal(await page.locator("#pinPanel").isHidden(),true,id+" closes Pin dialog");
   }
   await openPin(0,"Stuttgart");
   await assertButton("pinRouteStart",false,"rgb(238, 69, 69)");
   await setRole("pinRouteStart");
   await openPin(0,"Stuttgart");
   await assertButton("pinRouteStart",true,"rgb(238, 69, 69)","rgb(255, 255, 255)");
   await setRole("pinRouteStart");
   await openPin(0,"Stuttgart");
   await assertButton("pinRouteStart",false,"rgb(238, 69, 69)");
   assert.equal(await rolePins("start").count(),0);
   await setRole("pinRouteStart");
   assert.equal(await rolePins("start").count(),1,"Start role appears before target selection");
   await openPin(1,"Ulm");
   await setRole("pinRouteWaypoint");
   await openPin(1,"Ulm");
   assert.equal(await page.locator("#pinRouteWaypoint").getAttribute("data-pin-icon"),"minus");
   await assertButton("pinRouteWaypoint",true,"rgb(237, 198, 54)","rgb(13, 35, 58)");
   await setRole("pinRouteWaypoint");
   await openPin(1,"Ulm");
   assert.equal(await page.locator("#pinRouteWaypoint").getAttribute("data-pin-icon"),"plus");
   await assertButton("pinRouteWaypoint",false,"rgb(237, 198, 54)");
   assert.equal(await rolePins("waypoint").count(),0);
   await setRole("pinRouteWaypoint");
   await openPin(2,"München");
   await setRole("pinRouteTarget");
   await page.locator("#carRoutePanel").waitFor({state:"visible",timeout:20000});
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===2,null,{timeout:20000});
   async function assertRouteFits(){
    await page.waitForFunction(()=>{
     const obstacles=[...document.querySelectorAll(".topbar,#carRoutePanel,#routePanelToggle,#app > button,#map .leaflet-control")]
      .filter(el=>el.getClientRects().length).map(el=>el.getBoundingClientRect());
     const lines=[...document.querySelectorAll('#map path[stroke="#ff3930"],#map path[stroke="#1987f5"]')];
     const boxes=lines.map(line=>line.getBoundingClientRect());
     const centerX=(Math.min(...boxes.map(box=>box.left))+Math.max(...boxes.map(box=>box.right)))/2;
     return lines.length===2&&Math.abs(centerX-innerWidth/2)<=2&&lines.every(line=>{
      const box=line.getBoundingClientRect();
      return box.left>=0&&box.right<=innerWidth&&box.top>=0&&box.bottom<=innerHeight&&
       obstacles.every(rect=>box.right<=rect.left||box.left>=rect.right||box.bottom<=rect.top||box.top>=rect.bottom);
     });
    },null,{timeout:5000}).catch(async error=>{
     console.error("Route fit diagnostic",await page.evaluate(()=>[...document.querySelectorAll(
      '.topbar,#carRoutePanel,#routePanelToggle,#app > button,#map .leaflet-control,#map path[stroke="#ff3930"],#map path[stroke="#1987f5"]'
     )].filter(el=>el.getClientRects().length).map(el=>{
      const {left,top,right,bottom}=el.getBoundingClientRect();return [el.id||el.getAttribute("class"),left,top,right,bottom];
     })));
     throw error;
    });
   }
   await assertRouteFits();
   const firstRoad=page.locator('#map path[stroke="#ff3930"]');
   const roadBox=()=>firstRoad.evaluate(line=>{
    const rect=line.getBoundingClientRect();return {center:(rect.left+rect.right)/2,width:rect.width};
   });
   const whole=await roadBox();
   await page.locator("#routeLegs button").first().click();
   assert.equal(await page.locator("#routeLegs button.car-route-selected-leg").count(),1);
   const stage=await roadBox();
   assert.ok(Math.abs(stage.center-viewport.width/2)<=2&&stage.width>=whole.width-1&&
    (Math.abs(stage.center-whole.center)>2||stage.width>whole.width+2),
    "Stage fit centers the selected geometry even when Leaflet uses the same integer zoom");
   await page.locator("#routePanelHide").click();
   await page.getByRole("button",{name:"Alle sichtbaren Pins anzeigen"}).click();
   await page.locator("#routePanelToggle").click();
   await assertRouteFits();
   await assertRolePins();
   assert.equal(routeRequests.length,2,"Real provider adapter must request each hard pin leg");
   assert.match(await page.locator("#routeSummary").textContent(),/48 km/);
   assert.match(await page.locator("#routeSummary").textContent(),/1 h/);
   assert.equal(await page.locator("#map .p2m-route-time").count(),2);
   assert.equal(await page.locator("#map .p2m-route-time").last().textContent(),"1");
   const beforeTimeProfile=routeRequests.length;
   const pathPositions=()=>page.locator('#map path[stroke="#ff3930"],#map path[stroke="#1987f5"]')
    .evaluateAll(lines=>lines.map(line=>{const {x,y,width,height}=line.getBoundingClientRect();return [x,y,width,height];}));
   const beforeMenu=await pathPositions();
   assert.equal(await page.locator('#routeTimes [data-pin-icon="circle-slash-2"]').count(),1);
   await page.locator("#routeTimes").click();
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.deepEqual(await pathPositions(),beforeMenu,"Transient time menu does not refit the route");
   await page.locator('[data-time-profile="quick"]').click();
   assert.equal(await page.locator('#routeTimes [data-pin-icon="gauge"]').count(),1);
   assert.match(await page.locator("#routeSummary").textContent(),/57 min/);
   assert.equal(await page.locator("#map .p2m-route-time").count(),1);
   assert.equal(routeRequests.length,beforeTimeProfile,"Time profile sends no routing request");
   assert.match(await page.locator("#routeLegs").textContent(),/Stuttgart → Ulm/);
   assert.match(await page.locator("#routeLegs").textContent(),/Ulm → München/);
   const routeLines=await page.locator("#map path.leaflet-interactive").evaluateAll(
    nodes=>nodes.filter(n=>["#ff3930","#1987f5"].includes(n.getAttribute("stroke"))).map(n=>n.getAttribute("stroke")));
   assert.ok(routeLines.includes("#ff3930")&&routeLines.includes("#1987f5"),"Distinct original route-leg colors");
   const panel=await page.locator("#carRoutePanel").evaluate(el=>{
    const r=el.getBoundingClientRect(),css=getComputedStyle(el);
    return{x:r.x,y:r.y,w:r.width,h:r.height,position:css.position,vw:innerWidth,vh:innerHeight};
   });
   assert.equal(panel.position,"fixed");
   assert.ok(panel.x>=0&&panel.x+panel.w<=panel.vw+1&&panel.y>=0&&panel.y+panel.h<=panel.vh+1,JSON.stringify(panel));
   assert.ok(Math.abs(panel.h-(mobile?290:300))<=2,JSON.stringify(panel));
   const controls=await page.evaluate(()=>{
    const box=id=>document.querySelector(id).getBoundingClientRect();
    return {routeBottom:box("#carRoutePanel").bottom,zoomBottom:box(".pin-zoom-buttons").bottom,
     toggleTop:box("#routePanelToggle").top,basemapBottom:box("#basemapButton").bottom,
     toggleRight:box("#routePanelToggle").right,basemapRight:box("#basemapButton").right};
   });
   assert.ok(Math.abs(controls.routeBottom-controls.zoomBottom)<2,JSON.stringify(controls));
   assert.ok(controls.toggleTop>controls.basemapBottom&&Math.abs(controls.toggleRight-controls.basemapRight)<2);
   const toggleBg=()=>page.locator("#routePanelToggle").evaluate(el=>getComputedStyle(el).backgroundColor);
   assert.equal(await toggleBg(),"rgb(23, 100, 191)");
   const sizes=await page.locator("#carRoutePanel .car-route-round:not(#transitDb)").evaluateAll(buttons=>
    buttons.map(button=>{const box=button.getBoundingClientRect();return [box.width,box.height];}));
   assert.ok(sizes.every(([w,h])=>w===h&&w===sizes[0][0]),JSON.stringify(sizes));
   await page.locator("#routeWaypoints").click();
   assert.deepEqual(await page.locator("#routeWaypointMenu button").allTextContents(),
    ["Alle Pins aktivieren","Reihenfolge wie erstellt","Reihenfolge optimieren"]);
   await page.keyboard.press("Escape");
   assert.equal(await page.locator("#routeWaypointMenu").isHidden(),true);
   const legsBeforeCancel=await page.locator("#routeLegs .car-route-leg").count();
   page.once("dialog",dialog=>dialog.dismiss());
   await page.locator("#routeEnd").click();
   assert.equal(await page.locator("#routeLegs .car-route-leg").count(),legsBeforeCancel);
   await page.locator("#routePanelHide").click();
   assert.equal(await page.locator("#carRoutePanel").isVisible(),false);
   assert.equal(await page.locator("#routePanelToggle").isVisible(),true);
   assert.equal(await toggleBg(),"rgb(201, 47, 57)");
   await assertRouteFits();
   await page.locator("#routePanelToggle").click();
   assert.equal(await page.locator("#carRoutePanel").isVisible(),true);
   await assertRouteFits();
   await page.locator("#routeReverse").click();
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===2,null,{timeout:12000});
   assert.match(await page.locator("#routeLegs").textContent(),/München → Ulm/);
   await assertRolePins();
   assert.equal(await markerAt(2).locator('[data-route-role="start"]').count(),1);
   assert.equal(await markerAt(0).locator('[data-route-role="target"]').count(),1);
   await page.locator("#routeSettings").click();
   assert.equal(await page.locator("#routeProfileMenu").isVisible(),true);
   assert.deepEqual(await page.locator("#routeProfileMenu button").allTextContents(),
    ["Autobahn bevorzugt","Landstraße zügig","Keine Autobahnen","Motorrad"]);
   assert.equal(await page.locator("#routeSettings .car-route-motorway").count(),1);
   // An open popup must not obscure its own toggle, including on iPhone WebKit.
   const menus=await page.evaluate(()=>{
     const button=document.getElementById("routeSettings").getBoundingClientRect();
     const menu=document.getElementById("routeProfileMenu").getBoundingClientRect();
     return{buttonTop:button.top,menuBottom:menu.bottom};
   });
   assert.ok(menus.menuBottom<=menus.buttonTop,JSON.stringify(menus));
   await page.locator("#routeSettings").click();
   await page.locator("#routeTolls").click();
   assert.equal(await page.locator("#routeTolls").getAttribute("aria-pressed"),"true");
   assert.equal(await page.locator("#routeTolls").evaluate(el=>getComputedStyle(el,"::after").backgroundColor),"rgb(207, 38, 52)");
   await page.locator("#routeTolls").click();
   page.once("dialog",dialog=>dialog.accept());
   await page.locator("#routeEnd").click();
   assert.equal(await page.locator("#carRoutePanel").isVisible(),false);
   assert.equal(await page.locator("#routePanelToggle").isVisible(),false);
   assert.equal(await page.locator("#map .pin-icon [data-route-role]").count(),0);
   assert.equal(await page.locator("#map .pin-icon .pin-status-segments").count(),3);
   assert.deepEqual(await page.locator("#map .pin-icon .pin-marker").evaluateAll(nodes=>nodes.map(n=>n.innerHTML)),normalPins);
   // A roundtrip uses one real endpoint pin plus two numbered waypoints.
   await openPin(0,"Stuttgart");
   await setRole("pinRouteStart");
   await openPin(1,"Ulm");
   await setRole("pinRouteWaypoint");
   await openPin(2,"München");
   await setRole("pinRouteWaypoint");
   await openPin(0,"Stuttgart");
   await setRole("pinRouteTarget");
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===3,null,{timeout:20000});
   assert.equal(await rolePins("roundtrip").count(),1);
   await page.locator("#routeWaypoints").click();
   await page.locator("#routeOptimize").click();
   assert.equal(await page.locator('#routeWaypoints [data-pin-icon="graph-ring"]').count(),1);
   await page.locator("#routeWaypoints").click();
   await page.locator("#routeFixed").click();
   assert.equal(await page.locator('#routeWaypoints [data-pin-icon="graph-star"]').count(),1);
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===3);
   assert.equal(await rolePins("start").count()+await rolePins("target").count(),0);
   assert.equal(await rolePins("roundtrip").locator('path[fill="#ed3434"]').count(),1);
   assert.equal(await rolePins("roundtrip").locator('path[fill="#289d54"]').count(),1);
   assert.equal(await rolePins("roundtrip").locator('[data-route-icon="flag"][stroke="#fff"]').count(),1);
   assert.equal(await page.locator("#map .p2m-route-role-holder").count(),0);
   assert.equal(await page.locator("#map .pin-icon").count(),3);
   assert.equal(await markerAt(1).locator('[data-route-role="waypoint"] text').textContent(),"1");
   assert.equal(await markerAt(2).locator('[data-route-role="waypoint"] text').textContent(),"2");
   await page.locator("#routeReverse").click();
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===3,null,{timeout:20000});
   assert.equal(await markerAt(1).locator('[data-route-role="waypoint"] text').textContent(),"2");
   assert.equal(await markerAt(2).locator('[data-route-role="waypoint"] text').textContent(),"1");
   assert.equal(await rolePins("roundtrip").count(),1);
   // The route panel can cover the endpoint. Collapse it through its own control.
   await page.locator("#routePanelHide").click();
   await openPin(0,"Stuttgart");
   await assertButton("pinRouteStart",true,"rgb(238, 69, 69)","rgb(255, 255, 255)");
   await assertButton("pinRouteTarget",true,"rgb(54, 163, 86)","rgb(255, 255, 255)");
   await setRole("pinRouteStart");
   await openPin(0,"Stuttgart");
   await assertButton("pinRouteStart",false,"rgb(238, 69, 69)");
   await assertButton("pinRouteTarget",true,"rgb(54, 163, 86)","rgb(255, 255, 255)");
   assert.equal(await rolePins("target").count(),1);
   assert.equal(await rolePins("waypoint").count(),2);
   assert.equal(await page.locator("#routePanelToggle").isVisible(),false);
   await setRole("pinRouteStart");
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===3);
   await openPin(0,"Stuttgart");
   await setRole("pinRouteTarget");
   await openPin(0,"Stuttgart");
   await assertButton("pinRouteTarget",false,"rgb(54, 163, 86)");
   await assertButton("pinRouteStart",true,"rgb(238, 69, 69)","rgb(255, 255, 255)");
   assert.equal(await rolePins("start").count(),1);
   assert.equal(await rolePins("waypoint").count(),2);
   assert.equal(await page.locator("#routePanelToggle").isVisible(),false);
   await setRole("pinRouteTarget");
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===3);
   await page.locator("#routePanelToggle").click();
   page.once("dialog",dialog=>dialog.accept());
   await page.locator("#routeEnd").click();
   assert.deepEqual(await page.locator("#map .pin-icon .pin-marker").evaluateAll(nodes=>nodes.map(n=>n.innerHTML)),normalPins);
   // Target alone toggles and closes the pin dialog before any route exists.
   await openPin(2,"München");
   await setRole("pinRouteTarget");
   await openPin(2,"München");
   await assertButton("pinRouteTarget",true,"rgb(54, 163, 86)","rgb(255, 255, 255)");
   await setRole("pinRouteTarget");
   await openPin(2,"München");
   await assertButton("pinRouteTarget",false,"rgb(54, 163, 86)");
   assert.equal(await rolePins("target").count(),0);
   await page.locator("#closePin").click();
   // Soft flag is not a pin. It exists independently of the now-ended route.
   // The first background tap closes an already open pin/overlay menu by design.
   // A subsequent real map-surface tap opens the independent action chooser.
   // Pin gesture handling intentionally suppresses background taps for 600ms.
   await page.waitForTimeout(700);
   const mapSurface=page.locator("#map");
   const chooser=page.locator("#mapActionChooser");
   await mapSurface.click({position:{x:100,y:120}});
   if(!(await chooser.isVisible()))await mapSurface.click({position:{x:100,y:120}});
   await chooser.waitFor({state:"visible",timeout:3000});
   await page.locator('#mapActionChooser button[aria-label="Richtungsflagge setzen"]').click();
   await page.waitForFunction(()=>document.querySelectorAll("#map .p2m-route-guide-holder").length===1);
   assert.equal(await page.locator("#map .pin-icon").count(),3);
   // Saving is debounced; prove the guide reached IndexedDB before reload.
   // Playwright waitForFunction polls synchronously; an async predicate itself
   // is truthy before its IndexedDB promise resolves. Poll from Node instead.
   let savedGuide;
   for(let attempt=0;attempt<60;attempt++){
     const stored=await page.evaluate(async()=>{
       const store=await window.Pin2MapIndexedDBProjectStore.open();
       try{return (await store.loadProject())?.routeGuides?.[0];}
       finally{store.close();}
     });
     if(stored){savedGuide=stored;break;}
     await page.waitForTimeout(100);
   }
   assert.ok(savedGuide?.radiusMeters>=350&&savedGuide.radiusMeters<=80000,"Direction flag persists its placement radius");
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelectorAll("#map .p2m-route-guide-holder").length===1,null,{timeout:20000});
   assert.equal(await page.locator('.p2m-route-guide-pin > path[fill="#fff8d6"][stroke="#edb92b"]').count(),1);
   assert.equal(await page.locator('.p2m-route-guide-pin [data-route-icon="flag-triangle-right"]').count(),1);
   // Set a repeatable geographic corridor for the browser transport fixture.
   await page.evaluate(async()=>{
    const store=await window.Pin2MapIndexedDBProjectStore.open();
    try{
     const project=await store.loadProject();
     project.viewport={lat:48.5,lng:10.3,zoom:6};
     Object.assign(project.routeGuides[0],{lat:48.90,lng:10.30,radiusMeters:8000});
     await store.saveProject(project);
    }finally{store.close();}
   });
   await page.reload({waitUntil:"domcontentloaded"});
   await page.locator(".leaflet-marker-icon.pin-icon").nth(2).waitFor({state:"attached"});
   await openPin(0,"Stuttgart");
   await setRole("pinRouteStart");
   await openPin(2,"München");
   await setRole("pinRouteTarget");
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===1);
   assert.equal(shapeRequests.length,2);
   assert.ok(shapeRequests.every(({coords,stops})=>coords.length===3&&stops==="0;2"&&
    (coords[1][0]!==10.30||coords[1][1]!==48.90)));
   assert.equal(await rolePins("waypoint").count(),0);
   assert.match(await page.locator("#routeLegs").textContent(),/Stuttgart → München/);
   const cycleRequests=[];
   const encode=locations=>{
    let lat=0,lng=0,shape="";
    const part=delta=>{
     let value=delta<0?-2*delta-1:2*delta;
     while(value>=32){shape+=String.fromCharCode((value%32)+95);value=Math.floor(value/32);}
     shape+=String.fromCharCode(value+63);
    };
    for(const point of locations){
     const y=Math.round(point.lat*1e6),x=Math.round(point.lon*1e6);
     part(y-lat);part(x-lng);lat=y;lng=x;
    }
    return shape;
   };
   let activeFailure=false;
   await page.route(/valhalla1\.openstreetmap\.de\/(?:route|trace_attributes)$/,async entry=>{
    const payload=entry.request().postDataJSON();
    const isRoute=new URL(entry.request().url()).pathname==="/route";
    if(isRoute)cycleRequests.push(payload);
    if(isRoute&&activeFailure)return entry.fulfill({status:400,json:{error:"No route"},
     headers:{"Access-Control-Allow-Origin":"*"}});
    const trip=(locations,length,time)=>({summary:{length,time},legs:[{shape:encode(locations),maneuvers:[]}]});
    const [first,last]=[payload.locations?.[0],payload.locations?.at(-1)];
    const alternate=isRoute&&payload.alternates&&{trip:trip([first,
     {lat:(first.lat+last.lat)/2-.18,lon:(first.lon+last.lon)/2},last],28,2600)};
    const body=isRoute?{trip:trip(payload.locations,24,2400),alternates:alternate?[alternate]:[]}:
     {edges:[{use:"road",road_class:"primary",lane_count:4,length:24,mean_elevation:300,weighted_grade:.2}]};
    await entry.fulfill({json:body,headers:{"Access-Control-Allow-Origin":"*"}});
   });
   await page.getByRole("button",{name:"Fahrrad",exact:true}).click();
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===1);
   assert.equal(await page.getByRole("button",{name:"Fahrrad",exact:true}).getAttribute("aria-pressed"),"true");
   assert.equal(await page.locator("#routeModeIcon").getAttribute("data-pin-icon"),"bike");
   assert.equal(await page.locator("#routeTolls").isDisabled(),false);
   assert.equal(await page.locator("#routeTolls").getAttribute("data-pin-icon"),"route");
   assert.equal(cycleRequests.length,3);
   assert.ok(cycleRequests.every(request=>request.costing==="bicycle"));
   assert.ok(cycleRequests.slice(1).every(request=>request.locations[1].type==="through"));
   const variants=page.locator("#routeVariants button");
   assert.ok(await variants.count()>=2);
   assert.match(await variants.first().textContent(),/48 Hm/);
   assert.equal(await variants.first().isVisible(),false);
   await page.locator("#map path.p2m-route-variant-0").waitFor();
   assert.equal(await page.locator("#map path.p2m-route-variant-1").count(),0);
   await page.locator("#routeTolls").click();
   await variants.nth(1).click();
   await page.locator("#map path.p2m-route-variant-1").waitFor();
   assert.equal(await page.locator("#map path.p2m-route-variant-0").count(),0);
   assert.equal(await variants.nth(1).getAttribute("aria-pressed"),"true");
   assert.equal(cycleRequests.length,3,"alternative selection uses already returned routes");
   await page.locator("#routeSettings").click();
   await page.getByRole("button",{name:"Gravel",exact:true}).click();
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===1);
   assert.equal(cycleRequests.at(-1).costing_options.bicycle.bicycle_type,"Cross");
   assert.equal(await page.locator("#routeSettings .route-icon-yellow").count(),1);

   assert.equal(await rolePins("waypoint").count(),0);
   cycleRequests.length=0;
   await page.getByRole("button",{name:"Zu Fuß",exact:true}).click();
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===1);
   assert.equal(await page.getByRole("button",{name:"Zu Fuß",exact:true}).getAttribute("aria-pressed"),"true");
   assert.equal(await page.locator("#routeModeIcon").getAttribute("data-pin-icon"),"footprints");
   assert.equal(await page.locator("#routeTimes").isDisabled(),true);
   assert.equal(cycleRequests.length,3);
   assert.ok(cycleRequests.every(request=>request.costing==="pedestrian"));
   assert.ok(cycleRequests.slice(1).every(request=>request.locations[1].type==="through"));
   assert.ok(await variants.count()>=2);
   assert.equal(await page.locator("#routeTolls").getAttribute("data-pin-icon"),"route");
   await page.locator("#routeTolls").click();
   await variants.nth(1).click();
   assert.equal(await variants.nth(1).getAttribute("aria-pressed"),"true");
   await page.locator("#routeSettings").click();
   await page.getByRole("button",{name:"Barrierearm",exact:true}).click();
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===1);
   assert.equal(cycleRequests.at(-1).costing_options.pedestrian.type,"wheelchair");
   assert.equal(await page.locator('#routeSettings [data-pin-icon="accessibility"]').count(),1);
   const previousRequests=cycleRequests.length;
   await page.getByRole("button",{name:"Fahrrad",exact:true}).click();
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===1);
   assert.equal(cycleRequests.length,previousRequests,"returning to a profile reuses cached route requests");
   activeFailure=true;
   await page.locator("#routeSettings").click();
   await page.getByRole("button",{name:"Rennrad",exact:true}).click();
   const warning=page.locator("#routeSummary.car-route-unavailable");
   await warning.waitFor();
   assert.match(await warning.textContent(),/Keine Fahrradroute/);
   assert.equal(await warning.evaluate(node=>getComputedStyle(node).animationIterationCount),"infinite");
   activeFailure=false;

   assert.equal(await rolePins("waypoint").count(),0);
   await page.getByRole("button",{name:"Auto",exact:true}).click();
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===1);
   assert.equal(await warning.count(),0);

   page.once("dialog",dialog=>dialog.dismiss());
   await page.locator("#routeEnd").click();
   assert.equal(await page.locator(".p2m-route-guide-holder").count(),1);
   page.once("dialog",dialog=>dialog.accept());
   await page.locator("#routeEnd").click();
   assert.equal(await page.locator(".p2m-route-guide-holder").count(),0);
   await page.waitForFunction(()=>!document.querySelector("#carRoutePanel").getClientRects().length);
   let savedEmpty=false;
   for(let attempt=0;attempt<60&&!savedEmpty;attempt++){
    savedEmpty=await page.evaluate(async()=>{
     const store=await window.Pin2MapIndexedDBProjectStore.open();
     try{return (await store.loadProject())?.routeGuides?.length===0;}
     finally{store.close();}
    });
    if(!savedEmpty)await page.waitForTimeout(100);
   }
   assert.ok(savedEmpty,"Ending route removes flags from storage");
   ferryFixture=true;
   await openPin(0,"Stuttgart");
   await setRole("pinRouteStart");
   await openPin(2,"München");
   await setRole("pinRouteTarget");
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===3);
   const ferryRows=await page.locator("#routeLegs .car-route-leg").allTextContents();
   assert.match(ferryRows[0],/Stuttgart → Abfahrtshafen/);
   assert.match(ferryRows[1],/Fähre Testfähre.*Abfahrtshafen → Ankunftshafen.*1 h 30 min/);
   assert.match(ferryRows[2],/Ankunftshafen → München/);
   assert.equal(await page.locator('#map path.p2m-ferry-leg[stroke-dasharray="8 8"]').count(),1);
   const markers=await page.locator("#map .p2m-route-time").allTextContents();
   assert.deepEqual(markers,["","1","","1","","","1"]);
   ferryFixture=false;
   await openPin(1,"Ulm");
   await setRole("pinRouteWaypoint");
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===2);
   for(const [index,name,id] of [[1,"Ulm","p-w"],[0,"Stuttgart","p-s"],[2,"München","p-t"]]){
    await openPin(index,name);
    await page.locator("#movePin").click();
    const previous=routeRequests.length;
    await page.locator("#map").click({position:{x:viewport.width*.33,y:140+index*42}});
    await page.locator("#confirmMove").click();
    await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===2);
    assert.equal(routeRequests.length,previous+2,name+" move requests both new route legs");
    const oldCoords=[[9.1829,48.7758],[9.9916,48.3984],[11.5755,48.1372]][index];
    const after=routeRequests.slice(-2).flat();
    assert.ok(after.every(([lng,lat])=>Math.abs(lng-oldCoords[0])>.000002||Math.abs(lat-oldCoords[1])>.000002));
    await page.waitForFunction(async({id,after})=>{
     const store=await window.Pin2MapIndexedDBProjectStore.open();
     try{
      const pin=(await store.loadProject()).pins.find(pin=>pin.id===id);
      return after.some(([lng,lat])=>Math.abs(lng-pin.lng)<.000002&&Math.abs(lat-pin.lat)<.000002);
     }finally{store.close();}
    },{id,after});
   }
   const measureTransitControls=()=>page.locator("#carRoutePanel").evaluate(panel=>{
    const rect=node=>node.getBoundingClientRect();
    const bounds=rect(panel);
    const list=[...panel.querySelectorAll(".car-route-transport .car-route-round")].filter(node=>node.getClientRects().length);
    const buttons=list.map(rect).sort((a,b)=>a.left-b.left);
    const fields=[...panel.querySelectorAll(".transit-time-fields .transit-field")].map(rect);
    return {box:[bounds.x,bounds.y,bounds.width,bounds.height],gaps:buttons.slice(1).map((b,i)=>b.left-buttons[i].right),
     dates:fields.map(b=>[b.x,b.y,b.right,b.height]),body:panel.scrollHeight,view:panel.clientHeight};
   });
   const carLayout=await measureTransitControls();
   const transitCalls=[];
   await page.route("https://api.transitous.org/api/v6/map/stops?**",entry=>
    entry.fulfill({json:[],headers:{"Access-Control-Allow-Origin":"*"}}));
   await page.route("https://api.transitous.org/api/v6/plan?**",async entry=>{
    const params=new URL(entry.request().url()).searchParams;
    const base=Date.parse(params.get("time"));
    transitCalls.push([...params.entries()]);
    const at=minute=>new Date(base+minute*60000).toISOString();
    const travel=(mode,start,end,from,to,tripId,lon)=>({
     mode,startTime:at(start),endTime:at(end),from:{name:from,stopId:from,track:"2"},to:{name:to},
     tripId,legGeometry:{points:encode([{lat:48.7,lon},{lat:48.8,lon:lon+.05}]),precision:6}
    });
    const a=params.get("arriveBy")==="true"?-60:0;
    const route=(legs,end)=>({startTime:legs[0].startTime,endTime:at(end),legs});
    await entry.fulfill({json:{itineraries:[
     route([travel("LONG_DISTANCE",a,a+25,"A","B","ICE1",9),travel("LONG_DISTANCE",a+30,a+45,"B","C","ICE2",9.05)],a+45),
     params.get("arriveBy")==="true"&&!params.get("additionalTransferTime")
      ?route([travel("BUS",a+5,a+25,"A","B","BUS1",9),travel("BUS",a+30,a+50,"B","C","BUS2",9.05)],a+50)
      :route([travel("BUS",a+5,a+50,"A","C","BUS",9)],a+50)
    ]},headers:{"Access-Control-Allow-Origin":"*"}});
   });
   await page.getByRole("button",{name:"ÖPNV",exact:true}).click();
   await page.locator("#transitSelected .transit-green").waitFor();
   assert.equal(await page.getByRole("button",{name:"Auto",exact:true}).isVisible(),false);
   assert.equal(await page.locator("#transitDate").isVisible(),true);
   assert.equal(await page.locator("#routeEnd").isVisible(),true);
   const railLayout=await measureTransitControls();
   assert.deepEqual(railLayout.box,carLayout.box,"identical dialog position and dimensions");
   assert.ok(railLayout.gaps.every(gap=>gap>=carLayout.gaps[0]-.6),JSON.stringify([railLayout.gaps,carLayout.gaps]));
   assert.ok(railLayout.dates[0][1]===railLayout.dates[1][1]&&railLayout.dates[0][2]<railLayout.dates[1][0]);
   assert.equal(await page.locator("#transitVehicle").count(),0);
   const controlGeometry=await page.evaluate(()=>{
    const [mode,summary,db,date,clock,reverse]=[".transit-select","#transitSelected","#transitDb",
     ".transit-time-fields .transit-field:first-child",".transit-time-fields .transit-field:nth-child(2)","#routeReverse"]
     .map(selector=>document.querySelector(selector).getBoundingClientRect());
    return {heights:[mode,summary,db,date,clock,reverse].map(rect=>rect.height),
     row:[mode,summary,db].map(rect=>rect.top+rect.height/2),
     first:[date,clock,reverse].map(rect=>rect.top+rect.height/2)};
   });
   assert.equal(new Set(controlGeometry.heights).size,1,JSON.stringify(controlGeometry));
   assert.equal(new Set(controlGeometry.row).size,1);
   assert.ok(Math.max(...controlGeometry.first)-Math.min(...controlGeometry.first)<1,JSON.stringify(controlGeometry));
   if(!mobile){
    await page.locator("#transitClockDesktop").fill("09:42");
    await page.locator("#transitClockDesktop").press("Enter");
    await page.waitForFunction(()=>document.querySelector("#transitClockLabel").textContent==="09:42");
   }
   await page.waitForFunction(()=>document.querySelectorAll("#transitAlternatives button").length>=2);
   await page.locator("#transitWhen").selectOption("arrive");
   await page.waitForFunction(()=>document.querySelectorAll("#transitAlternatives button").length>=3);
   assert.ok(transitCalls.some(row=>row.some(([key,value])=>key==="arriveBy"&&value==="true")));
   const transitSummary=page.locator("#transitSelected");
   await transitSummary.focus();
   await page.keyboard.press("ArrowDown");
   const options=page.locator("#transitAlternatives button");
   const selected=await options.evaluateAll(nodes=>nodes.findIndex(node=>node.getAttribute("aria-pressed")==="true"));
   const focusIndex=()=>options.evaluateAll(nodes=>nodes.indexOf(document.activeElement));
   assert.equal(await focusIndex(),selected);
   await page.keyboard.press("ArrowDown");
   assert.equal(await focusIndex(),Math.min(selected+1,await options.count()-1));
   await page.keyboard.press("ArrowUp");
   assert.equal(await focusIndex(),Math.max(0,Math.min(selected+1,await options.count()-1)-1));
   assert.equal(await options.nth(selected).getAttribute("aria-pressed"),"true");
   await page.keyboard.press("Escape");
   assert.equal(await transitSummary.evaluate(node=>node===document.activeElement),true);
   await page.keyboard.press("ArrowDown");
   const red=await options.evaluateAll(nodes=>nodes.findIndex(node=>node.querySelector(".transit-red")));
   for(let index=selected;index!==red;index+=Math.sign(red-selected))
    await page.keyboard.press(red<selected?"ArrowUp":"ArrowDown");
   assert.equal(await focusIndex(),red);
   await page.keyboard.press("Enter");
   await page.getByRole("img",{name:"Kritischer Umstieg"}).waitFor();
   assert.match(await page.locator(".transit-leg-critical").getAttribute("title"),/5 min verfügbar/);
   assert.ok(transitCalls.some(row=>row.some(([key,value])=>key==="transferTimeFactor"&&value==="2")));
   assert.ok((await measureTransitControls()).body>(await measureTransitControls()).view);
   await page.locator("#carRoutePanel").evaluate(panel=>{panel.scrollTop=panel.scrollHeight;});
   assert.ok(await page.locator("#carRoutePanel").evaluate(panel=>panel.scrollTop)>0);
   assert.equal(await page.locator(".transit-leg-icon").count(),2);
   assert.equal(await page.locator(".transit-leg-number").first().textContent(),"1");
   assert.match(await page.locator("#routeLegs").textContent(),/Gleis 2/);
   const legs=page.locator("#routeLegs .transit-leg");
   assert.deepEqual(await page.locator(".p2m-route-line-label small").allTextContents(),
    (await page.locator(".transit-leg").evaluateAll(rows=>rows.map(row=>
      row.querySelector(".transit-leg-depart").textContent+" – "+row.querySelector(".transit-leg-arrive").textContent))));
   await page.locator("#routeLegs").evaluate(list=>{
    const spacer=document.createElement("div");
    spacer.id="transitTestSpacer";spacer.style.height="300px";list.append(spacer);
   });
   await page.locator("#carRoutePanel").evaluate(panel=>{panel.scrollTop=panel.scrollHeight;});
   const sticky=page.locator("#transitStickyButton");
   await sticky.waitFor({state:"visible"});
   assert.match(await sticky.textContent(),/A .* → C /);
   await sticky.click();
   assert.equal(await page.locator("#carRoutePanel").evaluate(panel=>panel.scrollTop),0);
   await page.locator("#transitTestSpacer").evaluate(element=>element.remove());
   await legs.first().click();
   assert.equal(await page.locator("path.p2m-route-leg-flash").count(),1);
   await page.keyboard.press("ArrowDown");
   assert.equal(await legs.nth(1).evaluate(node=>node===document.activeElement),true);
   assert.equal(await legs.nth(1).evaluate(node=>node.classList.contains("car-route-selected-leg")),true);
   await page.keyboard.press("ArrowUp");
   assert.equal(await legs.first().evaluate(node=>node===document.activeElement),true);
   await page.getByRole("button",{name:"ÖPNV",exact:true}).click();
   assert.equal(await page.getByRole("button",{name:"Auto",exact:true}).isVisible(),true);
   const expandedLayout=await measureTransitControls();
   assert.deepEqual(expandedLayout.gaps,carLayout.gaps,"expanded vehicle toolbar matches standard button spacing");
   await page.getByRole("button",{name:"Auto",exact:true}).click();
   // Exercise the actual settings reset in the test-only browser project.
   await page.evaluate(()=>{
    localStorage.setItem("foreign-test-key","keep");
    localStorage.setItem("pin2map-route-time-factors:"+location.pathname,"{}");
   });
   await page.locator("#settingsButton").click();
   const storageDetails=page.locator("#settingsStorageDetails");
   await storageDetails.getByText("Pins und Anhänge",{exact:true}).waitFor();
   assert.match(await storageDetails.getByText("Pins und Anhänge",{exact:true}).locator("..").textContent(),/· 3/);
   const reset=page.locator("#settingsResetData");
   page.once("dialog",dialog=>dialog.dismiss());
   await reset.click();
   assert.equal(await page.locator("#map .pin-icon").count(),3);
   page.once("dialog",dialog=>dialog.accept());
   await Promise.all([page.waitForEvent("framenavigated"),reset.click()]);
   await page.locator(".pin-zoom-buttons").waitFor();
   assert.equal(await page.locator("#map .pin-icon").count(),0);
   const remaining=await page.evaluate(()=>[localStorage.getItem("foreign-test-key"),
    localStorage.getItem("pin2map-route-time-factors:"+location.pathname)]);
   assert.deepEqual(remaining,["keep",null]);
   assert.deepEqual(errors,[],"Browser script errors");
   console.log("PASS routing real UI",engineName,viewport.width,"hard legs, fixed toolbar, reverse, collapse, soft guide persistence");
   await ctx.close();
  }
 }finally{await browser.close();}
}
})().catch(e=>{console.error(e);process.exitCode=1});
