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
   const page=await context.newPage();
   const errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.goto(URL,{waitUntil:"domcontentloaded"});
   assert.equal(await page.locator("#heading").textContent(),"Routing Start");
   assert.equal(await page.locator("#start").inputValue(),"Bremerhaven");
   assert.equal(await page.locator("#target").inputValue(),"");
   assert.equal(await page.locator("#carOptions").isVisible(),true);
   assert.equal(await page.locator(".legacy-bottom").count(),0);
   await page.locator("#entry").selectOption("target");
   assert.equal(await page.locator("#heading").textContent(),"Routing Ziel");
   assert.equal(await page.locator("#target").inputValue(),"Bremerhaven");
   await page.locator("#entry").selectOption("edit");
   assert.equal(await page.locator("#heading").textContent(),"Route bearbeiten");
   assert.equal(await page.locator("#target").inputValue(),"Grenoble");
   await page.locator('[data-mode="bicycle"]').click();
   assert.equal(await page.locator("#carOptions").isVisible(),false);
   assert.equal(await page.locator("#otherOptions").isVisible(),true);
   await page.locator('[data-mode="car"]').click();
   await page.locator('input[name="profile"][value="country"]').check();
   await page.locator("#tolls").check();
   await page.locator("#calculate").click();
   assert.match(await page.locator("#result").textContent(),/Simulation/);
   const layout=await page.evaluate(()=>({panel:document.querySelector(".routing-panel").getBoundingClientRect().toJSON(),bodyWidth:document.documentElement.scrollWidth,windowWidth:innerWidth,sw:!!navigator.serviceWorker?.controller}));
   assert.ok(layout.panel.width>220);
   assert.ok(layout.bodyWidth<=layout.windowWidth+1,"horizontal overflow: "+JSON.stringify(layout));
   assert.equal(layout.sw,false,"mockup must not be controlled by PWA worker");
   assert.deepEqual(errors,[]);
   console.log("PASS",name,viewport.width,"mockup start/target/edit, modes, layout and isolation");
   await context.close();
  }
 }finally{await browser.close();}
}
})().catch(e=>{console.error(e);process.exitCode=1});
