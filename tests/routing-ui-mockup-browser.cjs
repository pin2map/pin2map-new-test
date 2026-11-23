"use strict";
const {chromium,webkit}=require("playwright");
const assert=require("node:assert/strict");
const URL=process.env.PIN2MAP_MOCKUP_URL||"http://127.0.0.1:8765/routing-ui-mockup.html";
(async()=>{
 for(const [name,engine] of [["Chromium",chromium],["WebKit",webkit]]){
  const browser=await engine.launch({headless:true});
  try{
   for(const viewport of [{width:1120,height:900},{width:390,height:844}]){
    const context=await browser.newContext({viewport});
    const page=await context.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.goto(URL,{waitUntil:"domcontentloaded"});
    assert.equal(await page.locator("#destinationLabel").textContent(),"Ziel:");
    assert.equal(await page.locator("#destination").inputValue(),"");
    assert.equal(await page.locator("#carOptions").isVisible(),true);
    assert.equal(await page.locator(".modes .lucide").count(),4);
    assert.equal(await page.locator(".section-title").count(),0);
    assert.equal(await page.locator("#timeFactor").count(),0);
    assert.equal(await page.locator("#heading").count(),0);
    await page.locator("#destination").fill("ham");
    assert.ok(await page.locator("#destinationList button").count()>3);
    assert.match(await page.locator("#destinationList").textContent(),/Bilser Str/);
    assert.match(await page.locator("#destinationList").textContent(),/Hamburg/);
    assert.match(await page.locator("#destinationList").textContent(),/Neuen Pin anlegen/);
    await page.locator("#destinationList button").first().click();
    assert.equal(await page.locator("#destination").inputValue(),"Bilser Str. 49");
    await page.locator("#via1").fill("Frankfurt");
    assert.ok(await page.locator("#via1List button").count()>=2);
    await page.locator("#via1List button").last().click();
    assert.equal(await page.locator("#via1").inputValue(),"Frankfurt (Oder)");
    assert.equal(await page.locator("#demoLine").getAttribute("hidden"),"");
    await page.locator("#calculate").click();
    assert.match(await page.locator("#result").textContent(),/Demoroute eingezeichnet/);
    assert.equal(await page.locator("#demoLine").getAttribute("hidden"),null);
    assert.equal(await page.locator("#demoLine").isVisible(),true);
    await page.locator("#reset").click();
    assert.equal(await page.locator("#destination").inputValue(),"");
    await page.locator("#entry").selectOption("target");
    assert.equal(await page.locator("#destinationLabel").textContent(),"Start:");
    await page.locator("#entry").selectOption("edit");
    assert.equal(await page.locator("#destinationLabel").textContent(),"Ziel:");
    assert.equal(await page.locator("#editStartRow").isVisible(),true);
    assert.equal(await page.locator("#editStart").inputValue(),"Bremerhaven");
    assert.equal(await page.locator("#destination").inputValue(),"Grenoble");
    await page.locator('[data-mode="bicycle"]').click();
    assert.equal(await page.locator("#carOptions").isVisible(),false);
    await page.locator('[data-mode="car"]').click();
    await page.locator('input[name="profile"][value="country"]').check();
    const toll=page.locator("#tolls");
    assert.equal(await toll.getAttribute("aria-pressed"),"false");
    await toll.click();
    assert.equal(await toll.getAttribute("aria-pressed"),"true");
    assert.match(await toll.getAttribute("class"),/on/);
    await toll.click();
    assert.equal(await toll.getAttribute("aria-pressed"),"false");
    await toll.click();
    const shapes=await page.locator(".modes [data-icon]").evaluateAll(els=>els.map(x=>({name:x.dataset.icon,paths:x.querySelectorAll("path,circle,rect").length})));
    assert.deepEqual(shapes.map(x=>x.name),["car","bike","footprints","tram-front"]);
    assert.ok(shapes.every(x=>x.paths>=3));
    const geometry=await page.evaluate(()=>{
       const r=id=>document.getElementById(id).getBoundingClientRect();
       const modes=[...document.querySelectorAll(".mode")].map(x=>x.getBoundingClientRect().height);
       const destination=r("destination"),via=r("via1"),routing=document.querySelector("#carOptions .radio-frame").getBoundingClientRect(),profile=r("timeProfile"),reset=r("reset"),route=r("calculate"),noToll=r("tolls");
       return {modes,minMode:Math.min(...modes),x:[destination.x,via.x,routing.x,profile.x],resetWidth:reset.width,routeWidth:route.width,tollHeight:noToll.height,menuWidth:profile.width,panelWidth:r("routingPanel").width,containerWidth:r("routingPanel").height};
    });
    assert.ok(geometry.minMode>=50,JSON.stringify(geometry));
    assert.ok(geometry.tollHeight>=43,JSON.stringify(geometry));
    assert.ok(geometry.x.every(x=>Math.abs(x-geometry.x[0])<=1),JSON.stringify(geometry));
    assert.ok(Math.abs(geometry.resetWidth-geometry.routeWidth)<=2,JSON.stringify(geometry));
    assert.ok(geometry.menuWidth<geometry.resetWidth*1.25,JSON.stringify(geometry));
    const metrics=await page.evaluate(()=>({panel:document.querySelector(".routing-panel").getBoundingClientRect().toJSON(),width:document.documentElement.scrollWidth,viewport:innerWidth,worker:!!navigator.serviceWorker?.controller,option:document.querySelector(".options-line").getBoundingClientRect().toJSON()}));
    assert.ok(metrics.panel.width>220);assert.ok(metrics.width<=metrics.viewport+1,JSON.stringify(metrics));
    assert.equal(metrics.worker,false);assert.ok(metrics.option.height>=44&&metrics.option.height<=78,JSON.stringify(metrics));
    assert.deepEqual(errors,[]);
    console.log("PASS",name,viewport.width,"compact mockup, Lucide, pin and place suggestions, corridor ambiguity, schematic route and SW isolation");
    await context.close();
   }
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
