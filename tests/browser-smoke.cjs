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
    step("search form: disabled geocoder message without network");
    assert.equal(await page.locator("#allowGeocode").isChecked(),false);
    await page.locator("#searchInput").fill("Berlin");
    await page.locator("#searchInput").press("Enter");
    await page.locator("#searchResults .message").waitFor({state:"visible",timeout});
    assert.match(await page.locator("#searchResults .message").textContent(),/Ortssuche im Test noch nicht aktiviert/);
    await page.locator("#searchResults .results-head button").click();
    assert.equal(await page.locator("#searchResults").isHidden(),true);
    step("basemap menu: switch, aria states, Escape, outside click and persistence");
    const picker=page.locator("#basemapButton");
    const menu=page.locator("#basemapMenu");
    const street=menu.locator('[data-basemap="street"]');
    const topo=menu.locator('[data-basemap="topo"]');
    assert.equal(await menu.isHidden(),true);
    assert.equal(await picker.getAttribute("aria-expanded"),"false");
    assert.equal(await street.getAttribute("aria-pressed"),"true");
    await picker.click();
    assert.equal(await menu.isVisible(),true);
    assert.equal(await picker.getAttribute("aria-expanded"),"true");
    await topo.click();
    assert.equal(await menu.isHidden(),true);
    assert.equal(await picker.getAttribute("aria-expanded"),"false");
    assert.equal(await topo.getAttribute("aria-pressed"),"true");
    assert.equal(await topo.evaluate(el=>el.classList.contains("is-selected")),true);
    // Verify the correct external source is requested. Live tile availability
    // is provider/network dependent and must be checked on Safari separately.
    await page.waitForFunction(()=>Array.from(document.querySelectorAll(".leaflet-tile-pane img"))
      .some(img=>img.src.includes("a.tile.opentopomap.org/")),
      null,{timeout:5000});
    // This diagnostic is intentionally non-gating: GitHub runners can be unable
    // to receive tiles even while the application and browser controls work.
    const topoLoaded=await page.waitForFunction(()=>Array.from(document.querySelectorAll(".leaflet-tile-pane img"))
      .some(img=>img.src.includes("a.tile.opentopomap.org/")&&img.complete&&img.naturalWidth>0),
      null,{timeout:2500}).then(()=>true,()=>false);
    console.log("[browser] Topographic external tile decoded in CI:",topoLoaded,
      "(Safari/device network test remains required)");
    assert.equal(await picker.evaluate(el=>el===document.activeElement),true);
    await page.waitForTimeout(650); // Debounced IndexedDB save.
    await page.reload({waitUntil:"domcontentloaded"});
    await assertReady(page);
    assert.equal(await page.locator('#basemapMenu [data-basemap="topo"]').getAttribute("aria-pressed"),"true",
      "Topographic choice persists after reload");
    await picker.click();
    await page.keyboard.press("Escape");
    assert.equal(await menu.isHidden(),true);
    assert.equal(await picker.getAttribute("aria-expanded"),"false");
    assert.equal(await picker.evaluate(el=>el===document.activeElement),true);
    await picker.click();
    await page.locator("#map").click({position:{x:60,y:60}});
    assert.equal(await menu.isHidden(),true,"Outside map click closes the menu");
    await page.locator("#settingsButton").click();
    assert.equal(await page.locator("#settingsPanel").isVisible(),true);
    await picker.click();
    assert.equal(await page.locator("#settingsPanel").isHidden(),true,
      "Basemap picker dismisses settings panel");
    assert.equal(await menu.isVisible(),true);
    await street.click();
    assert.equal(await street.getAttribute("aria-pressed"),"true");
    await page.waitForTimeout(650);
    await page.reload({waitUntil:"domcontentloaded"});
    await assertReady(page);
    assert.equal(await page.locator('#basemapMenu [data-basemap="street"]').getAttribute("aria-pressed"),"true",
      "Street choice persists after reload");
    assert.equal(await page.locator("#basemapMenu").isHidden(),true);
    assert.deepEqual(errors,[],"No JavaScript errors in basemap menu workflow");
    console.log("[browser] PASS – basemap toggle, street/topo, ARIA, focus, Escape, outside click, panels, persistence");
    const box=await page.locator("#map").boundingBox();
    assert.ok(box&&box.width>300&&box.height>300,"Map viewport is present");
    const center={x:box.x+box.width*.5,y:box.y+box.height*.57};
    step("long-press creates and selects a private pin");
    await longPress(page,center.x,center.y);
    await page.locator("#pinPanel").waitFor({state:"visible",timeout});
    // Surface any incidental error from the initial long-press separately
    // from a later preview error, rather than hiding it in a final count.
    assert.deepEqual(errors,[],"No JavaScript error may occur while opening the pin editor");
    const coordsBefore=await page.locator("#pinCoords").textContent();
    assert.match(coordsBefore,/Koordinaten:/);
    assert.equal(await page.locator(".pin-marker").count(),1);
    assert.equal(await page.locator("#pinLayer").inputValue(),"private");
    step("pin editor: rename and blur without changing pin coordinates");
    await page.locator("#pinName").fill("  Reise-Testpin  ");
    await page.locator("#pinName").blur();
    assert.equal(await page.locator("#pinName").inputValue(),"Reise-Testpin");
    step("bulk delete confirmation cancels without removing a private pin");
    await page.locator("#closePin").click();
    await page.locator("#pinPanel").waitFor({state:"hidden",timeout});
    await page.locator("#layersButton").click();
    await page.locator('#layersList .layer-delete[aria-label="Alle Pins in Privat löschen"]').click();
    await page.locator("#bulkDialog").waitFor({state:"visible",timeout});
    assert.equal(await page.locator("#bulkTitle").textContent(),"Alle Pins in Privat löschen?");
    assert.match(await page.locator("#bulkDescription").textContent(),/1 Pins werden gelöscht\./);
    await page.locator('#bulkDialog button[value="cancel"]').click();
    await page.locator("#bulkDialog").waitFor({state:"hidden",timeout});
    assert.equal(await page.locator(".pin-marker").count(),1,"Cancel must preserve the existing private pin");
    await page.locator("#layersButton").click();
    await page.locator(".leaflet-marker-icon").first().click({force:true});
    await page.locator("#pinPanel").waitFor({state:"visible",timeout});
    console.log("[browser] PASS – private bulk-delete cancel preserves the pin");

    step("cancellation retains original coordinates");
    await page.locator("#movePin").click();
    assert.equal(await page.locator("#pinPanel").isHidden(),true);
    assert.equal(await page.locator("#map").evaluate(el=>getComputedStyle(el).cursor),"crosshair");
    await page.waitForFunction(()=>document.querySelector(".pin-relocation-source"));
    const hover={x:box.x+box.width*.60,y:box.y+box.height*.65};
    await page.mouse.move(hover.x,hover.y);
    await page.waitForFunction(()=>document.querySelectorAll(".leaflet-overlay-pane path").length>0);
    // Deliberately click immediately after long-press-created selection:
    // the prior 850 ms click suppression must NOT block a move target.
    const first={x:box.x+box.width*.70,y:box.y+box.height*.72};
    await page.mouse.click(first.x,first.y);
    await page.locator("#confirmMove").waitFor({state:"visible",timeout});
    assert.equal(await page.locator("#confirmMove").isEnabled(),true);
    assert.equal(await page.locator(".pin-relocation-source").count(),0);
    assert.equal(await page.locator("body.pin-relocation-picking").count(),0);
    await page.locator("#cancelMove").click();
    await page.locator("#pinPanel").waitFor({state:"visible",timeout});
    assert.equal(await page.locator("#pinCoords").textContent(),coordsBefore);
    step("explicit confirmation updates coordinates");
    await page.locator("#movePin").click();
    const second={x:box.x+box.width*.72,y:box.y+box.height*.73};
    await page.mouse.click(second.x,second.y);
    await page.locator("#confirmMove").click();
    await page.locator("#pinPanel").waitFor({state:"hidden",timeout});
    assert.equal(await page.locator(".pin-marker").count(),1);
    assert.equal(await page.locator(".pin-relocation-source").count(),0);
    assert.equal(await page.locator("body.pin-relocation-picking").count(),0);
    step("update is persisted after reload");
    // A completed relocation intentionally clears selection; reopen only to
    // read back the new position, not as part of the move workflow.
    await page.locator(".leaflet-marker-icon").first().click({force:true});
    await page.locator("#pinPanel").waitFor({state:"visible",timeout});
    const coordsAfter=await page.locator("#pinCoords").textContent();
    assert.notEqual(coordsAfter,coordsBefore);
    await page.waitForTimeout(650); // Debounced IndexedDB save.
    await page.reload({waitUntil:"domcontentloaded"});
    await assertReady(page);
    assert.equal(await page.locator(".pin-marker").count(),1);
    // A reload clears the ephemeral pin selection. Reopen using a marker.
    await page.locator(".leaflet-marker-icon").first().click({force:true});
    await page.locator("#pinPanel").waitFor({state:"visible",timeout});
    assert.equal(await page.locator("#pinCoords").textContent(),coordsAfter);
    assert.equal(await page.locator("#pinName").inputValue(),"Reise-Testpin",
      "Edited pin name persists after reload");
    step("layer visibility hides/restores the persisted pin");
    // Focused pin editing intentionally hides all other map controls.
    // Close the editor before opening the bottom-center layers picker.
    await page.locator('#pinPanel [data-close="pinPanel"]').click();
    await page.locator("#pinPanel").waitFor({state:"hidden",timeout});
    await page.locator("#layersButton").click();
    const privateRow=page.locator("#layersList .layer-row").filter({hasText:"Privat"});
    const privateCheckbox=privateRow.locator('input[type="checkbox"]');
    await privateCheckbox.uncheck();
    await page.waitForFunction(()=>document.querySelectorAll(".pin-marker").length===0);
    await privateCheckbox.check();
    await page.waitForFunction(()=>document.querySelectorAll(".pin-marker").length===1);
    await page.locator("#layersButton").click();
    // Reopen the marker before checking its unchanged persisted position.
    await page.locator(".leaflet-marker-icon").first().click({force:true});
    await page.locator("#pinPanel").waitFor({state:"visible",timeout});
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
