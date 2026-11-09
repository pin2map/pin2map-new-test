"use strict";
/*
 * Real Chromium integration regression test. Run against a local HTTP server:
 *   npm install --no-save playwright@1.56.1
 *   npx playwright install chromium
 *   python3 -m http.server 8765 --bind 127.0.0.1
 *   node tests/browser-smoke.cjs
 * Does not use Nominatim. External Leaflet CDN needs to be reachable during
 * the initial online install; all following app-shell requests are offline.
 */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const base=process.env.PIN2MAP_TEST_URL||"http://127.0.0.1:8765/";
const timeout=20000;
async function assertReady(page){
  await page.waitForFunction(()=>!!window.L&&!!document.querySelector(".leaflet-container")
    &&!!document.querySelector(".pin-zoom-buttons"),null,{timeout});
  assert.equal(await page.locator("#layersButton").count(),1);
}
async function longPress(page,x,y,ms=725){
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1100,height:780},serviceWorkers:"allow"});
  const page=await context.newPage();
  const errors=[];
  let stage="browser launch";
  const step=label=>{stage=label;console.log("[browser] "+label);};
  page.on("pageerror",error=>{errors.push(error.message);console.error("[pageerror]",error.stack||error.message);});
  page.on("console",message=>{
    if(message.type()==="error")console.error("[page console]",message.text());
  });
  try{
    step("load application");
    await page.goto(base,{waitUntil:"domcontentloaded",timeout:30000});
    await assertReady(page);
    const box=await page.locator("#map").boundingBox();
    assert.ok(box&&box.width>300&&box.height>300,"Map viewport is present");
    const center={x:box.x+box.width*.5,y:box.y+box.height*.57};
    step("long-press creates and selects a private pin");
    await longPress(page,center.x,center.y);
    await page.locator("#pinPanel").waitFor({state:"visible",timeout});
    // Surface any incidental error from the initial long-press separately
    // from a later preview error, rather than hiding it in a final count.
    if(errors.length)console.error("[browser] errors after initial pin:",errors.join(" | "));
    const coordsBefore=await page.locator("#pinCoords").textContent();
    assert.match(coordsBefore,/Koordinaten:/);
    assert.equal(await page.locator(".pin-marker").count(),1);
    assert.equal(await page.locator("#pinLayer").inputValue(),"private");
    step("cancellation retains original coordinates");
    await page.locator("#movePin").click();
    assert.equal(await page.locator("#pinPanel").isHidden(),true);
    // Deliberately click immediately after long-press-created selection:
    // the prior 850 ms click suppression must NOT block a move target.
    const first={x:box.x+box.width*.70,y:box.y+box.height*.72};
    await page.mouse.click(first.x,first.y);
    await page.locator("#confirmMove").waitFor({state:"visible",timeout});
    assert.equal(await page.locator("#confirmMove").isEnabled(),true);
    await page.locator("#cancelMove").click();
    await page.locator("#pinPanel").waitFor({state:"visible",timeout});
    assert.equal(await page.locator("#pinCoords").textContent(),coordsBefore);
    step("explicit confirmation updates coordinates");
    await page.locator("#movePin").click();
    const second={x:box.x+box.width*.72,y:box.y+box.height*.73};
    await page.mouse.click(second.x,second.y);
    await page.locator("#confirmMove").click();
    await page.locator("#pinPanel").waitFor({state:"visible",timeout});
    assert.notEqual(await page.locator("#pinCoords").textContent(),coordsBefore);
    assert.equal(await page.locator(".pin-marker").count(),1);
    step("update is persisted after reload");
    const coordsAfter=await page.locator("#pinCoords").textContent();
    await page.waitForTimeout(650); // Debounced IndexedDB save.
    await page.reload({waitUntil:"domcontentloaded"});
    await assertReady(page);
    assert.equal(await page.locator(".pin-marker").count(),1);
    // A reload clears the ephemeral pin selection. Reopen using a marker.
    await page.locator(".leaflet-marker-icon").first().click({force:true});
    await page.locator("#pinPanel").waitFor({state:"visible",timeout});
    assert.equal(await page.locator("#pinCoords").textContent(),coordsAfter);
    step("layer visibility hides/restores the persisted pin");
    await page.locator("#layersButton").click();
    const privateRow=page.locator("#layersList .layer-row").filter({hasText:"Privat"});
    const privateCheckbox=privateRow.locator('input[type="checkbox"]');
    await privateCheckbox.uncheck();
    await page.waitForFunction(()=>document.querySelectorAll(".pin-marker").length===0);
    await privateRow.locator('input[type="checkbox"]').check();
    await page.waitForFunction(()=>document.querySelectorAll(".pin-marker").length===1);
    step("pin coordinates remain unchanged by layer visibility");
    assert.equal(await page.locator("#pinCoords").textContent(),coordsAfter);
    step("offline application shell and persisted pin");
    const sw=await page.evaluate(async()=>{
      const registration=await navigator.serviceWorker.ready;
      return {active:!!registration.active,scope:registration.scope};
    });
    assert.equal(sw.active,true);
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout});
    await context.setOffline(true);
    await page.reload({waitUntil:"domcontentloaded",timeout});
    await assertReady(page);
    assert.equal(await page.locator(".pin-marker").count(),1);
    assert.equal(errors.length,0,"Browser errors: "+errors.join("; "));
    console.log("[browser] PASS – selection, move/cancel/confirm, persistence, offline reload");
  }catch(error){
    let snapshot={};
    try{
      snapshot=await page.evaluate(()=>({
        url:location.href,readyState:document.readyState,
        pinPanelHidden:document.querySelector("#pinPanel")?.classList.contains("hidden"),
        moveBarHidden:document.querySelector("#moveBar")?.classList.contains("hidden"),
        confirmDisabled:document.querySelector("#confirmMove")?.disabled,
        markerCount:document.querySelectorAll(".pin-marker").length,
        leafletMarkers:document.querySelectorAll(".leaflet-marker-icon").length,
        pinCoords:document.querySelector("#pinCoords")?.textContent,
        notice:document.querySelector("#notice")?.textContent,
        serviceWorkerControlled:!!navigator.serviceWorker?.controller
      }));
    }catch(e){snapshot={inspectionError:String(e)};}
    console.error("[browser] FAILED STAGE:",stage);
    console.error("[browser] DOM snapshot:",JSON.stringify(snapshot));
    console.error("[browser] page errors:",JSON.stringify(errors));
    await page.screenshot({path:"browser-smoke-failure.png",fullPage:true}).catch(()=>{});
    throw error;
  }finally{
    await context.close();
    await browser.close();
  }
})().catch(e=>{console.error("[browser] FAIL",e);process.exitCode=1;});
