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
    step("overlay coordination: outside map pointer closes search results");
    await page.locator("#map").click({position:{x:75,y:95}});
    assert.equal(await page.locator("#searchResults").isHidden(),true,
      "Map pointerdown dismisses search results without submitting or changing pins");
    await page.locator("#searchInput").press("Enter");
    await page.locator("#searchResults .message").waitFor({state:"visible",timeout});
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
    step("legacy map catalog: International, Satellite, Humanitarian and optional Esri hillshade");
    const sources=[
      ["international","World_Street_Map"],
      ["satellite","World_Imagery"],
      ["humanitarian","tile.openstreetmap.fr/hot"]
    ];
    for(const [choice,source] of sources){
      await picker.click();
      await menu.locator('[data-basemap="'+choice+'"]').click();
      assert.equal(await menu.locator('[data-basemap="'+choice+'"]').getAttribute("aria-pressed"),"true");
      await page.waitForFunction(part=>Array.from(document.querySelectorAll(".leaflet-tile-pane img"))
        .some(img=>img.src.includes(part)),source,{timeout:5000});
    }
    await picker.click();
    const reliefToggle=page.locator("#esriReliefToggle");
    await reliefToggle.check();
    assert.equal(await menu.isVisible(),true,"Relief toggle must not close map selector");
    await page.waitForFunction(()=>!!document.querySelector(".leaflet-pane[style*='250'] img[src*='World_Hillshade']"),
      null,{timeout:5000});
    assert.equal(await page.locator("#map .leaflet-pane[style*='250']").evaluate(el=>
      el.style.pointerEvents==="none"&&el.style.mixBlendMode==="multiply"),true);
    await page.waitForTimeout(650);
    await page.reload({waitUntil:"domcontentloaded"});
    await assertReady(page);
    await picker.click();
    assert.equal(await reliefToggle.isChecked(),true,"Relief choice persists after reload");
    await reliefToggle.uncheck();
    await page.waitForFunction(()=>!document.querySelector(".leaflet-pane[style*='250'] img[src*='World_Hillshade']"),
      null,{timeout:5000});
    await menu.locator('[data-basemap="street"]').click();
    assert.deepEqual(errors,[],"No JavaScript errors in basemap menu workflow");
    console.log("[browser] PASS – basemap toggle, street/topo, ARIA, focus, Escape, outside click, panels, persistence");
    const box=await page.locator("#map").boundingBox();
    assert.ok(box&&box.width>300&&box.height>300,"Map viewport is present");

    step("viewport persistence: map pan survives reload through repository");
    const readViewport=()=>page.evaluate(async()=>{
      const store=await window.Pin2MapIndexedDBProjectStore.open();
      try{return (await store.loadProject())?.viewport;}finally{store.close();}
    });
    const viewBefore=await readViewport();
    assert.ok(viewBefore&&Number.isFinite(viewBefore.zoom),"Project viewport exists in storage");
    const dragX=box.x+box.width*.47,dragY=box.y+box.height*.55;
    await page.mouse.move(dragX,dragY);
    await page.mouse.down();
    await page.mouse.move(dragX+135,dragY-85,{steps:8});
    await page.mouse.up();
    await page.waitForTimeout(750); // moveend + 300 ms debounced write.
    const viewAfter=await readViewport();
    assert.ok(viewAfter&&Math.abs(viewAfter.lng-viewBefore.lng)>0.0001,
      "Moving the map must write the updated viewport");
    await page.reload({waitUntil:"domcontentloaded"});
    await assertReady(page);
    const viewReloaded=await readViewport();
    assert.deepEqual(viewReloaded,viewAfter,"Viewport must survive reload");
    console.log("[browser] PASS – viewport moveend persistence and reload");
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
    step("layer creation via prompt persists new layer without affecting private pin");
    page.once("dialog",dialog=>dialog.accept("Reisen"));
    await page.locator("#addLayer").click();
    await page.locator("#layersList .layer-row").filter({hasText:"Reisen"}).waitFor({state:"visible",timeout});
    await page.waitForTimeout(650);
    const layerNames=await page.evaluate(async()=>{
      const store=await window.Pin2MapIndexedDBProjectStore.open();
      try{return (await store.loadProject()).layers.map(layer=>layer.name);}
      finally{store.close();}
    });
    assert.ok(layerNames.includes("Reisen"),"New layer is saved in the existing project");
    console.log("[browser] PASS – create named layer, persisted in project");
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
    step("single pin delete dialog: cancel, confirm and offline persistence");
    await page.locator(".leaflet-marker-icon").first().click({force:true});
    await page.locator("#pinPanel").waitFor({state:"visible",timeout});
    await page.locator("#deletePin").click();
    await page.locator("#deleteDialog").waitFor({state:"visible",timeout});
    await page.locator('#deleteDialog button[value="cancel"]').click();
    await page.locator("#deleteDialog").waitFor({state:"hidden",timeout});
    assert.equal(await page.locator(".pin-marker").count(),1,"Cancel preserves pin");
    await page.locator("#deletePin").click();
    await page.locator("#deleteDialog").waitFor({state:"visible",timeout});
    await page.locator('#deleteDialog button[value="confirm"]').click();
    await page.locator("#deleteDialog").waitFor({state:"hidden",timeout});
    await page.waitForFunction(()=>document.querySelectorAll(".pin-marker").length===0);
    await page.waitForTimeout(650);
    await page.reload({waitUntil:"domcontentloaded",timeout});
    await assertReady(page);
    assert.equal(await page.locator(".pin-marker").count(),0,"Confirmed removal persists offline");
    assert.deepEqual(errors,[],"Single-pin delete must not raise browser errors");
    console.log("[browser] PASS – pin delete cancel, confirm and offline persistence");
    step("offline cached search: empty, multiple selection and single result create pins");
    await page.evaluate(async()=>{
      const store=await window.Pin2MapIndexedDBProjectStore.open();
      try{
        const project=await store.loadProject();
        const time=Date.now();
        project.geoCache={
          ...project.geoCache,
          "nohit":{time,results:[]},
          "multihit":{time,results:[
            {lat:"48.7758",lon:"9.1829",name:"Stuttgart",address:{city:"Stuttgart"}},
            {lat:"48.1371",lon:"11.5754",name:"München",address:{city:"München"}}
          ]},
          "singlehit":{time,results:[
            {lat:"50.1109",lon:"8.6821",name:"Frankfurt",address:{city:"Frankfurt"}}
          ]}
        };
        await store.saveProject(project);
      }finally{store.close();}
    });
    await page.reload({waitUntil:"domcontentloaded",timeout});
    await assertReady(page);
    const runCachedSearch=async query=>{
      await page.locator("#searchInput").fill(query);
      await page.locator("#searchInput").press("Enter");
    };
    await runCachedSearch("nohit");
    await page.locator("#searchResults .message").waitFor({state:"visible",timeout});
    assert.match(await page.locator("#searchResults .message").textContent(),/Kein Ort gefunden/);
    await runCachedSearch("multihit");
    assert.equal(await page.locator("#searchResults button.result").count(),2);
    assert.equal(await page.locator(".pin-marker").count(),0,"Multiple results must not auto-create pins");
    await page.locator("#searchResults button.result").first().click();
    await page.locator("#pinPanel").waitFor({state:"visible",timeout});
    assert.equal(await page.locator("#pinName").inputValue(),"Stuttgart");
    assert.equal(await page.locator(".pin-marker").count(),1);
    await page.waitForTimeout(750);
    await page.reload({waitUntil:"domcontentloaded",timeout});
    await assertReady(page);
    assert.equal(await page.locator(".pin-marker").count(),1,"Chosen place persists offline");
    const projectAfterSelection=await page.evaluate(async()=>{
      const store=await window.Pin2MapIndexedDBProjectStore.open();
      try{return await store.loadProject();}finally{store.close();}
    });
    assert.equal(projectAfterSelection.pins.length,1);
    assert.equal(projectAfterSelection.pins[0].name,"Stuttgart");
    assert.ok(Math.abs(projectAfterSelection.viewport.lat-48.7758)<0.002,
      "Choosing place centers persisted map viewport");
    await runCachedSearch("singlehit");
    await page.locator("#pinPanel").waitFor({state:"visible",timeout});
    assert.equal(await page.locator("#pinName").inputValue(),"Frankfurt");
    assert.equal(await page.locator(".pin-marker").count(),2);
    await page.waitForTimeout(750);
    await page.reload({waitUntil:"domcontentloaded",timeout});
    await assertReady(page);
    const finalPins=await page.evaluate(async()=>{
      const store=await window.Pin2MapIndexedDBProjectStore.open();
      try{return (await store.loadProject()).pins;}finally{store.close();}
    });
    assert.deepEqual(finalPins.map(pin=>pin.name).sort(),["Frankfurt","Stuttgart"]);
    assert.deepEqual(errors,[],"Offline cached search transfer raises no page errors");
    console.log("[browser] PASS – offline cached search: nohit, multi choose, single auto-pin and persisted viewport/pins");
    step("startup hydration: repair missing private layer without losing stored pins");
    await page.evaluate(async()=>{
      const store=await window.Pin2MapIndexedDBProjectStore.open();
      try{
        const project=await store.loadProject();
        project.layers=project.layers.filter(layer=>layer.id!=="private");
        project.activeLayer="legacy-obsolete";
        await store.saveProject(project);
      }finally{store.close();}
    });
    await page.reload({waitUntil:"domcontentloaded",timeout});
    await assertReady(page);
    assert.equal(await page.locator(".pin-marker").count(),2,
      "Hydration must preserve existing private pins and restore private layer");
    await page.locator("#layersButton").click();
    assert.ok(await page.locator("#layersList").getByText("Privat").count()>0);
    assert.ok(await page.locator("#layersList").getByText("Reisen").count()>0);
    await page.locator("#layersButton").click();
    const labelToggle=page.locator("#labelsToggle");
    assert.equal(await labelToggle.getAttribute("data-pin-icon"),"tags");
    assert.equal(await labelToggle.getAttribute("aria-pressed"),"true");
    const tooltip=page.locator(".leaflet-tooltip.address-label");
    assert.ok(await tooltip.count()>0,"Visible named pins show permanent right-hand tooltips");
    assert.equal(await tooltip.first().evaluate(el=>el.classList.contains("leaflet-tooltip-right")),true);
    await labelToggle.click();
    await page.waitForFunction(()=>document.querySelectorAll(".leaflet-tooltip.address-label").length===0,
      null,{timeout:2000});
    assert.equal(await tooltip.count(),0,"Global toggle hides all names");
    assert.equal(await labelToggle.getAttribute("data-pin-icon"),"tags-off");
    assert.equal(await labelToggle.getAttribute("aria-pressed"),"false");
    assert.equal(await labelToggle.locator("svg path").last().getAttribute("d"),"M2 22 22 2");
    await labelToggle.click();
    assert.equal(await labelToggle.getAttribute("data-pin-icon"),"tags");
    assert.equal(await labelToggle.getAttribute("aria-pressed"),"true");
    await page.waitForTimeout(650);
    const repaired=await page.evaluate(async()=>{
      const store=await window.Pin2MapIndexedDBProjectStore.open();
      try{return await store.loadProject();}finally{store.close();}
    });
    assert.equal(repaired.pins.length,2);
    assert.ok(repaired.layers.some(layer=>layer.id==="private"));
    assert.equal(Object.hasOwn(repaired,"activeLayer"),false);
    console.log("[browser] PASS – startup hydration preserves pins, repairs private layer and drops obsolete selection");

    step("pin information: six-menu selection and visible-layer-only lazy weather requests");
    const forecastRequests=[];
    await page.route("https://api.open-meteo.com/v1/**",async route=>{
      const url=new URL(route.request().url());
      const count=url.searchParams.get("latitude").split(",").length;
      const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Brussels",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
      let values;
      if(url.pathname.includes("elevation"))values={elevation:Array(count).fill(250)};
      else{
        const row=()=>{
          if(url.searchParams.get("daily")?.includes("temperature"))return {timezone:"Europe/Brussels",
            daily:{time:[date],temperature_2m_min:[4],temperature_2m_max:[16]}};
          if(url.searchParams.get("daily")?.includes("sunrise"))return {timezone:"Europe/Brussels",
            daily:{time:[date],sunrise:[date+"T07:30"],sunset:[date+"T17:15"]}};
          return {timezone:"Europe/Brussels",utc_offset_seconds:3600,current:{temperature_2m:19}};
        };
        values=count===1?row():Array.from({length:count},row);
      }
      forecastRequests.push({count,url:route.request().url()});
      await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(values)});
    });
    await page.evaluate(async()=>{
      const store=await window.Pin2MapIndexedDBProjectStore.open();
      try{
        const project=await store.loadProject();
        project.layers.push({id:"info-test-hidden",name:"Wettertest",color:"#16836b",visible:false});
        project.pins[1].layerId="info-test-hidden";
        await store.saveProject(project);
      }finally{store.close();}
    });
    await page.reload({waitUntil:"domcontentloaded",timeout});
    await assertReady(page);
    assert.equal(await page.locator(".pin-marker").count(),1);
    const infoButton=page.locator("#pinInfoButton");
    const infoMenu=page.locator("#pinInfoMenu");
    assert.equal(await infoButton.getAttribute("data-pin-icon"),"message-circle-exclamation-point-off");
    await infoButton.click();
    assert.equal(await infoMenu.isVisible(),true);
    assert.equal(await infoMenu.locator("[data-pin-info-mode]").count(),5);
    assert.deepEqual(await infoMenu.locator("[data-pin-info-mode]").evaluateAll(els=>els.map(el=>el.dataset.pinInfoMode)),
      ["off","elevation","temperature","daily","sun"]);
    assert.equal(await infoMenu.locator(".basemap-menu-title").count(),0,"Menu has no headline");
    assert.equal(await infoMenu.locator(".pin-info-separator").count(),4);
    assert.equal(await infoMenu.locator("#pinInfoDailyPeriod").inputValue(),"today");
    assert.equal(await infoMenu.locator("#pinInfoSunPeriod").inputValue(),"today");
    assert.match(await infoMenu.locator(".pin-info-credit").innerText(),/Monatsmittel/);
    assert.match(await infoMenu.locator(".pin-info-credit").innerText(),/15\. des Monats/);
    for(const icon of ["mountain-snow","thermometer","thermometer-sun","thermometer-snowflake","sunrise","sunset"])
      assert.equal(await infoMenu.locator('[data-pin-icon="'+icon+'"] svg').count(),1,icon);
    assert.equal(await page.locator(".elevation-label-wrap").count(),0);
    await infoMenu.locator('[data-pin-info-mode="temperature"]').click();
    await page.waitForFunction(()=>document.querySelectorAll(".elevation-label.p2m-temperature-label").length===1,
      null,{timeout:6000});
    assert.equal(forecastRequests.length,1,"Only the visible pin must be queried");
    assert.equal(forecastRequests[0].count,1);
    assert.equal(await infoButton.getAttribute("data-pin-icon"),"message-circle-exclamation-point");
    assert.match(await page.locator(".elevation-label").first().textContent(),/19 °C/);
    await page.locator("#layersButton").click();
    await page.locator('#layersList input[aria-label="Wettertest sichtbar"]').check();
    await page.waitForFunction(()=>document.querySelectorAll(".elevation-label.p2m-temperature-label").length===2,
      null,{timeout:6000});
    assert.equal(forecastRequests.length,2,"Newly visible pins load after layer reveal");
    assert.equal(forecastRequests[1].count,1);
    await page.locator("#layersButton").click();
    // Historical monthly normals are NOT forecasts. Mock both provider contracts.
    const climateRequests=[],sunRequests=[];
    await page.route("https://power.larc.nasa.gov/api/temporal/climatology/point**",async route=>{
      const q=new URL(route.request().url()).searchParams;
      climateRequests.push(q);
      const lows={JAN:3.2,FEB:4.5},highs={JAN:11.6,FEB:13.7};
      await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
        properties:{parameter:{T2M_MIN_AVG:lows,T2M_MAX_AVG:highs}}
      })});
    });
    await page.route("https://api.sunrise-sunset.org/v2**",async route=>{
      const q=new URL(route.request().url()).searchParams;
      sunRequests.push(q);
      const mo=q.get("date").slice(5,7);
      await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
        sunrise:"2026-"+mo+"-15T06:35:00+01:00",
        sunset:"2026-"+mo+"-15T18:20:00+01:00"
      })});
    });
    const nextMode=async(mode,match)=>{
      await infoButton.click();
      if(mode==="sun"||mode==="daily"){
        const control=mode==="sun"?"#pinInfoSunPeriod":"#pinInfoDailyPeriod";
        await infoMenu.locator(control).focus();
        await infoButton.click(); // Native selector remains open until menu is explicitly dismissed.
      }else await infoMenu.locator('[data-pin-info-mode="'+mode+'"]').click();
      await page.waitForFunction(value=>Array.from(document.querySelectorAll(".elevation-label"))
        .some(el=>el.textContent.includes(value)),match,{timeout:6000});
      assert.equal(await infoButton.getAttribute("data-pin-icon"),"message-circle-exclamation-point");
    };
    await nextMode("elevation","250 m");
    await nextMode("daily","16 °C");
    assert.equal(await page.locator(".p2m-label-min").count(),2);
    await nextMode("sun","07:30");
    assert.equal(await page.locator(".p2m-label-rise").count(),2);
    // Each row has its own month; switching modes MUST retain the other month.
    await infoButton.click();
    await infoMenu.locator("#pinInfoSunPeriod").selectOption("01");
    await infoButton.click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll(".elevation-label.p2m-sun-label"))
      .some(el=>el.textContent.includes("15. Jan")&&el.textContent.includes("06:35")),
      null,{timeout:6000});
    assert.equal(sunRequests.length,2);
    assert.ok(sunRequests.every(q=>q.get("date")==="2026-01-15"));
    assert.equal(await page.locator('.p2m-info-month-prefix svg').count(),0);
    await infoButton.click();
    assert.equal(await infoMenu.locator("#pinInfoSunPeriod").inputValue(),"01");
    assert.equal(await infoMenu.locator("#pinInfoDailyPeriod").inputValue(),"today");
    await infoMenu.locator("#pinInfoDailyPeriod").selectOption("01");
    await infoButton.click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll(".elevation-label.p2m-daily-label"))
      .some(el=>el.textContent.includes("Ø Jan")&&el.textContent.includes("12 °C")),null,{timeout:6000});
    assert.equal(climateRequests.length,2);
    assert.ok(climateRequests.every(q=>q.get("parameters")==="T2M_MIN_AVG,T2M_MAX_AVG"));
    assert.equal(await page.locator('.p2m-info-month-prefix svg').count(),0);
    assert.equal(await page.locator('.p2m-info-month-prefix').first().innerText(),"Ø Jan");
    await infoButton.click();
    await infoMenu.locator("#pinInfoDailyPeriod").selectOption("02");
    await infoButton.click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll(".elevation-label.p2m-daily-label"))
      .some(el=>el.textContent.includes("Ø Feb")&&el.textContent.includes("14 °C")),null,{timeout:6000});
    assert.equal(climateRequests.length,2,"Second month reuses 12-month NASA responses");
    await nextMode("sun","15. Jan");
    await infoButton.click();
    assert.equal(await infoMenu.locator("#pinInfoSunPeriod").inputValue(),"01","Sun preserves Jan");
    assert.equal(await infoMenu.locator("#pinInfoDailyPeriod").inputValue(),"02","Daily preserves Feb");
    await infoMenu.locator("#pinInfoSunPeriod").selectOption("02");
    await infoButton.click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll(".elevation-label.p2m-sun-label"))
      .some(el=>el.textContent.includes("15. Feb")),null,{timeout:6000});
    assert.ok(sunRequests.every(q=>q.get("date")?.endsWith("-15")));
    await infoButton.click();
    await infoMenu.locator("#pinInfoSunPeriod").selectOption("today");
    await infoButton.click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll(".elevation-label.p2m-sun-label"))
      .some(el=>el.textContent.includes("07:30")),null,{timeout:6000});
    assert.equal(await page.locator('.p2m-info-month-prefix').count(),0);
    await infoButton.click();
    await infoMenu.locator('[data-pin-info-mode="off"]').click();
    assert.equal(await infoButton.getAttribute("data-pin-icon"),"message-circle-exclamation-point-off");
    assert.equal(await infoButton.locator("svg path").last().getAttribute("d"),"M2 22 22 2");
    await page.waitForFunction(()=>document.querySelectorAll(".elevation-label").length===0,
      null,{timeout:6000});
    console.log("[browser] PASS – six information modes, legacy info labels, cache and lazy hidden-layer fetch");

    step("startup hydration: malformed stored project uses existing default-project fallback");
    await page.evaluate(async()=>{
      const store=await window.Pin2MapIndexedDBProjectStore.open();
      try{await store.saveProject({layers:"invalid",pins:[{id:"bad-pin"}],activeLayer:"legacy"});}
      finally{store.close();}
    });
    await page.reload({waitUntil:"domcontentloaded",timeout});
    await assertReady(page);
    assert.equal(await page.locator(".pin-marker").count(),0);
    await page.locator("#layersButton").click();
    assert.ok(await page.locator("#layersList").getByText("Privat").count()>0);
    assert.ok(await page.locator("#layersList").getByText("Ebene 1").count()>0);
    await page.locator("#layersButton").click();
    assert.deepEqual(errors,[],"Hydration regressions must not produce page errors");
    console.log("[browser] PASS – malformed project safely falls back to defaults");



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
