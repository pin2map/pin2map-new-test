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
   const routeRequests=[];
   await page.route(/router\.project-osrm\.org\/route\/v1\/driving\//,async route=>{
    const url=new URL(route.request().url());
    const coords=decodeURIComponent(url.pathname.split("/driving/").at(-1)).split(";").map(s=>s.split(",").map(Number));
    routeRequests.push(coords);
    const body={code:"Ok",routes:[{distance:24000,duration:1800,
      geometry:{type:"LineString",coordinates:coords}}]};
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
     const bounds=await rolePins(kind).locator(".pin-marker-shape").boundingBox();
     assert.ok(bounds&&Math.abs(bounds.width-30)<1&&Math.abs(bounds.height-40)<1,JSON.stringify(bounds));
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
   await assertButton("pinRouteWaypoint",true,"rgb(237, 198, 54)","rgb(13, 35, 58)");
   await setRole("pinRouteWaypoint");
   await openPin(1,"Ulm");
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
   const sizes=await page.locator("#carRoutePanel .car-route-round").evaluateAll(buttons=>
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
   let guideCommitted=false;
   for(let attempt=0;attempt<60;attempt++){
     const count=await page.evaluate(async()=>{
       const store=await window.Pin2MapIndexedDBProjectStore.open();
       try{return (await store.loadProject())?.routeGuides?.length??0;}
       finally{store.close();}
     });
     if(count===1){guideCommitted=true;break;}
     await page.waitForTimeout(100);
   }
   assert.ok(guideCommitted,"Direction flag must commit to IndexedDB before reload");
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelectorAll("#map .p2m-route-guide-holder").length===1,null,{timeout:20000});
   assert.deepEqual(errors,[],"Browser script errors");
   console.log("PASS routing real UI",engineName,viewport.width,"hard legs, fixed toolbar, reverse, collapse, soft guide persistence");
   await ctx.close();
  }
 }finally{await browser.close();}
}
})().catch(e=>{console.error(e);process.exitCode=1});
