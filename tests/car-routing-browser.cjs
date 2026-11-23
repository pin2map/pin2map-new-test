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
   // Each click is a real Leaflet marker interaction, never a direct call to a private controller.
   const markerAt=index=>page.locator(".leaflet-marker-icon.pin-icon").nth(index);
   await markerAt(0).click();
   assert.equal(await page.locator("#pinName").inputValue(),"Stuttgart");
   await page.locator("#pinRouteStart").click();
   await markerAt(1).click();
   assert.equal(await page.locator("#pinName").inputValue(),"Ulm");
   await page.locator("#pinRouteWaypoint").click();
   await markerAt(2).click();
   assert.equal(await page.locator("#pinName").inputValue(),"München");
   await page.locator("#pinRouteTarget").click();
   await page.locator("#carRoutePanel").waitFor({state:"visible",timeout:20000});
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===2,null,{timeout:20000});
   assert.equal(routeRequests.length,2,"Real provider adapter must request each hard pin leg");
   assert.match(await page.locator("#routeSummary").textContent(),/48 km/);
   assert.match(await page.locator("#routeSummary").textContent(),/1 h/);
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
   await page.locator("#routePanelHide").click();
   assert.equal(await page.locator("#carRoutePanel").isVisible(),false);
   assert.equal(await page.locator("#routePanelToggle").isVisible(),true);
   await page.locator("#routePanelToggle").click();
   assert.equal(await page.locator("#carRoutePanel").isVisible(),true);
   await page.locator("#routeReverse").click();
   await page.waitForFunction(()=>document.querySelectorAll("#routeLegs .car-route-leg").length===2,null,{timeout:12000});
   assert.match(await page.locator("#routeLegs").textContent(),/München → Ulm/);
   await page.locator("#routeSettings").click();
   assert.equal(await page.locator("#routeProfileMenu").isVisible(),true);
   await page.locator("#routeSettings").click();
   await page.locator("#routeTolls").click();
   assert.equal(await page.locator("#routeTolls").getAttribute("aria-pressed"),"true");
   await page.locator("#routeTolls").click();
   await page.locator("#routeEnd").click();
   assert.equal(await page.locator("#carRoutePanel").isVisible(),false);
   assert.equal(await page.locator("#routePanelToggle").isVisible(),false);
   // Soft flag is not a pin. It exists independently of the now-ended route.
   await page.locator("#map").click({position:{x:100,y:120}});
   await page.locator("#mapActionChooser").waitFor({state:"visible"});
   await page.locator('#mapActionChooser button[aria-label="Richtungsflagge setzen"]').click();
   await page.waitForFunction(()=>document.querySelectorAll("#map .p2m-route-guide-holder").length===1);
   assert.equal(await page.locator("#map .pin-icon").count(),3);
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelectorAll("#map .p2m-route-guide-holder").length===1,null,{timeout:20000});
   assert.deepEqual(errors,[],"Browser script errors");
   console.log("PASS routing real UI",engineName,viewport.width,"hard legs, fixed toolbar, reverse, collapse, soft guide persistence");
   await ctx.close();
  }
 }finally{await browser.close();}
}
})().catch(e=>{console.error(e);process.exitCode=1});
