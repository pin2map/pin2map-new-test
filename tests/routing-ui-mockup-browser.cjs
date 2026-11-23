"use strict";
const {chromium,webkit}=require("playwright");
const assert=require("node:assert/strict");
const URL=process.env.PIN2MAP_MOCKUP_URL||"http://127.0.0.1:8765/routing-ui-mockup.html";
(async()=>{
for(const [engineName,engine] of [["Chromium",chromium],["WebKit",webkit]]){
const browser=await engine.launch({headless:true});
try{
for(const viewport of [{width:1120,height:900},{width:390,height:844},{width:320,height:700}]){
const ctx=await browser.newContext({viewport,isMobile:viewport.width<500,hasTouch:viewport.width<500});
const page=await ctx.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
await page.goto(URL,{waitUntil:"domcontentloaded"});
const box=id=>page.locator("#"+id).boundingBox();
async function assertLayout(where){
const m=await page.evaluate(()=>{
const r=x=>document.getElementById(x).getBoundingClientRect();
const doc=document.documentElement;
const elements=["destination","via1","routeStyle","timeProfile"];
const inputs=[...document.querySelectorAll("input,select")];
const overflow=[...document.querySelectorAll(".pin-dialog,.routing-panel,.compact-line,.options-line,.via-fields,.action-fields")].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>({cls:e.className,scroll:e.scrollWidth,client:e.clientWidth}));
return{docWidth:doc.scrollWidth,viewport:innerWidth,overflow,x:elements.map(x=>r(x).x),font:inputs.map(x=>({id:x.id,size:parseFloat(getComputedStyle(x).fontSize)})),modes:[...document.querySelectorAll(".mode")].map(x=>x.getBoundingClientRect().height),route:r("calculate").height,panel:r("routingPanel").height,dialog:r("pinName").height};
});
assert.ok(m.docWidth<=m.viewport+1,where+JSON.stringify(m));
assert.deepEqual(m.overflow,[],where+JSON.stringify(m));
assert.ok(m.x.every(x=>Math.abs(x-m.x[0])<=1),where+JSON.stringify(m));
assert.ok(m.font.every(x=>x.size>=16),where+JSON.stringify(m));
assert.ok(Math.min(...m.modes)>=48,where+JSON.stringify(m));
assert.ok(m.route>=42,where+JSON.stringify(m));
return m;
}
assert.equal(await page.locator("#destinationLabel").textContent(),"Ziel:");
assert.equal(await page.locator("#routeField").isVisible(),false);
assert.equal(await page.locator("#reset").isVisible(),true);
assert.equal(await page.locator("#carOptions select").count(),1);
assert.equal(await page.locator("#destinationRow").isVisible(),true);
assert.equal(await page.locator("#tolls").getAttribute("aria-pressed"),"false");
assert.deepEqual(await page.locator(".modes [data-icon]").evaluateAll(a=>a.map(e=>e.dataset.icon)),["car","bike","footprints","tram-front"]);
await assertLayout("start");
const initialScale=await page.evaluate(()=>({scale:visualViewport?.scale||1,width:document.documentElement.clientWidth}));
await page.locator("#destination").focus();
const afterScale=await page.evaluate(()=>({scale:visualViewport?.scale||1,width:document.documentElement.clientWidth,font:parseFloat(getComputedStyle(document.querySelector("#destination")).fontSize)}));
assert.equal(afterScale.scale,initialScale.scale);
assert.equal(afterScale.width,initialScale.width);
assert.ok(afterScale.font>=16);
await page.locator("#destination").fill("ham");
assert.match(await page.locator("#destinationList").textContent(),/Bilser Str. 49/);
assert.match(await page.locator("#destinationList").textContent(),/Neuen Pin anlegen/);
await page.locator("#destinationList button").first().click();
await page.locator("#via1").fill("Frankfurt");
assert.ok(await page.locator("#via1List button").count()>=2);
await page.locator("#via1List button").last().click();
await page.locator("#routeStyle").selectOption("country");
await page.locator("#tolls").click();
assert.equal(await page.locator("#tolls").getAttribute("aria-pressed"),"true");
await page.locator("#calculate").click();
assert.equal(await page.locator("#demoLine").getAttribute("hidden"),null);
assert.equal(await page.locator("#demoLine").isVisible(),true);
await page.locator("#reset").click();
assert.equal(await page.locator("#tolls").getAttribute("aria-pressed"),"false");
assert.equal(await page.locator("#routeStyle").inputValue(),"fast");
await page.locator("#entry").selectOption("edit");
assert.equal(await page.locator("#destinationRow").isVisible(),false);
assert.equal(await page.locator("#routeField").isVisible(),true);
assert.equal(await page.locator("#routeStart").textContent(),"Bremerhaven");
assert.equal(await page.locator("#routeGoal").textContent(),"Grenoble");
assert.equal(await page.locator("#editStartRow").count(),0);
await assertLayout("edit");
await page.locator("#plusButton").click();
assert.equal(await page.locator("#waypointOverlay").isVisible(),true);
assert.match(await page.locator("#waypointList").textContent(),/Lausanne/);
await page.locator("#newWaypoint").selectOption("Celle");
await page.locator("#addWaypoint").click();
assert.match(await page.locator("#waypointList").textContent(),/Celle/);
await page.getByRole("button",{name:"Celle Nach oben"}).click();
assert.match(await page.locator(".waypoint-row").first().textContent(),/Celle/);
await page.getByRole("button",{name:"Lausanne Löschen"}).click();
assert.equal(await page.locator(".waypoint-row").count(),1);
await page.locator("#closeWaypoints").click();
await page.locator("#routeGoal").click();
assert.equal(await page.locator("#entry").inputValue(),"target");
assert.equal(await page.locator("#pinName").textContent(),"Grenoble");
assert.equal(await page.locator("#destinationLabel").textContent(),"Start:");
await page.locator("#entry").selectOption("free");
await page.locator("#plusButton").click();
assert.match(await page.locator("#waypointList").textContent(),/Celle/);
await page.locator("#closeWaypoints").click();
await page.locator("#entry").selectOption("roundtrip");
await page.locator("#entry").selectOption("edit");
assert.equal(await page.locator("#routeStart").textContent(),"Bremerhaven");
assert.equal(await page.locator("#routeGoal").textContent(),"Bremerhaven");
await page.locator("#routeStart").click();
assert.equal(await page.locator("#pinName").textContent(),"Bremerhaven");
await page.locator("#entry").selectOption("roundtrip");
await page.locator("#plusButton").click();
assert.equal(await page.locator("#waypointOverlay").isVisible(),true);
await page.locator("#closeWaypoints").click();
assert.deepEqual(errors,[],engineName+JSON.stringify(errors));
assert.equal(await page.evaluate(()=>Boolean(navigator.serviceWorker?.controller)),false);
console.log("PASS",engineName,viewport.width,"compact touch, input no zoom, route header, waypoint editor, roundtrip");
await ctx.close();
}
}finally{await browser.close()}
}
})().catch(err=>{console.error(err);process.exitCode=1});
