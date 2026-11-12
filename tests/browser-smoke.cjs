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
  const browser=await chromium.launch({headless:true,...(process.env.PIN2MAP_CHROMIUM_EXECUTABLE?{executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE}:{})});
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
    step("predecessor scale: single metric Leaflet control centered below header, updates on zoom");
    const scale=page.locator("#map .leaflet-control-scale");
    assert.equal(await scale.count(),1,"One Leaflet scale must be present");
    assert.equal(await scale.locator(".leaflet-control-scale-line").count(),1,
      "Metric scale only, no second imperial line");
    const scaleBefore=await scale.evaluate(el=>{
      const line=el.querySelector(".leaflet-control-scale-line");
      const box=el.getBoundingClientRect(),styles=getComputedStyle(el);
      const lineStyles=getComputedStyle(line);
      return {text:line.textContent.trim(),width:box.width,left:box.left,
        top:box.top,opacity:lineStyles.backgroundColor,fontWeight:lineStyles.fontWeight,
        pointerEvents:styles.pointerEvents};
    });
    assert.match(scaleBefore.text,/^(?:[\d,.]+)\s*(?:m|km)$/);
    assert.ok(scaleBefore.width>0&&scaleBefore.width<=165,JSON.stringify(scaleBefore));
    assert.ok(Math.abs(scaleBefore.left+scaleBefore.width/2-550)<=3,
      "Scale centered in 1100px desktop viewport: "+JSON.stringify(scaleBefore));
    assert.ok(scaleBefore.top>=70&&scaleBefore.top<=130,JSON.stringify(scaleBefore));
    assert.equal(scaleBefore.pointerEvents,"none");
    assert.equal(scaleBefore.fontWeight,"600");
    const labelBefore=scaleBefore.text;
    await page.locator(".pin-zoom-button").first().click();
    await page.waitForFunction(before=>
      document.querySelector("#map .leaflet-control-scale-line")?.textContent.trim()!==before,
      labelBefore,{timeout:6000});
    assert.equal(await scale.count(),1,"Zoom must not insert a second scale");
    assert.equal(await scale.locator(".leaflet-control-scale-line").count(),1);
    await page.locator(".pin-zoom-button").nth(1).click();
    await page.waitForFunction(before=>
      document.querySelector("#map .leaflet-control-scale-line")?.textContent.trim()===before,
      labelBefore,{timeout:6000});
    console.log("[browser] PASS – predecessor scale visible, centered, metric and zoom-responsive");
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
    assert.equal(await page.locator("#searchResults .results-head").count(),0,
      "Search results no longer have a gray header row");
    const footer=page.locator("#searchResults .results-footer");
    assert.equal(await footer.count(),1);
    assert.equal(await page.locator("#searchResults").evaluate(el=>el.lastElementChild?.className),"results-footer",
      "Cancel belongs at the bottom of the result list");
    const sheet=await page.evaluate(()=>{
      const outer=document.querySelector(".topbar").getBoundingClientRect();
      const host=document.querySelector("#searchResults").getBoundingClientRect();
      const bottom=document.querySelector("#basemapButton").getBoundingClientRect();
      const items=document.querySelector("#searchResults .results-items");
      const first=items.firstElementChild.getBoundingClientRect();
      return {outer:{x:outer.x,width:outer.width,top:outer.top,bottom:outer.bottom,height:outer.height},
        host:{x:host.x,width:host.width,top:host.top,bottom:host.bottom,height:host.height},
        bottomEdge:bottom.bottom,firstTop:first.top,
        framed:getComputedStyle(document.querySelector("#searchResults")).borderTopWidth,
        listBackground:getComputedStyle(items).backgroundColor,
        footerBackground:getComputedStyle(document.querySelector(".results-footer")).backgroundColor};
    });
    assert.ok(Math.abs(sheet.outer.width-sheet.host.width)<=3,JSON.stringify(sheet));
    assert.ok(Math.abs(sheet.outer.x-sheet.host.x)<=3,JSON.stringify(sheet));
    assert.ok(Math.abs(sheet.host.top-(sheet.outer.bottom+8))<=3,
      "Framed chooser must open below the OUTER search block: "+JSON.stringify(sheet));
    assert.ok(sheet.firstTop>=sheet.outer.bottom+8,
      "First text starts below OUTER search block: "+JSON.stringify(sheet));
    assert.ok(sheet.host.bottom<=sheet.bottomEdge+2,
      "List must stop at the BOTTOM EDGE of the lowest buttons: "+JSON.stringify(sheet));
    assert.ok(sheet.host.top<sheet.bottomEdge-40,"Framed chooser must have room to grow");
    assert.equal(sheet.framed,"1px");
    assert.equal(sheet.listBackground,"rgb(242, 244, 247)");
    assert.equal(sheet.footerBackground,"rgb(223, 228, 235)");
    await footer.locator("button").getByText("Abbrechen").click();
    assert.equal(await page.locator("#searchResults").isHidden(),true);
    step("search results: multi-result footer is last and cancel closes without selecting");
    await page.evaluate(()=>{
      window.__searchChooseCalls=0;
      const view=new window.Pin2MapSearchResultsView({
        container:document.getElementById("searchResults"),document,
        onChoose:()=>{window.__searchChooseCalls++;},
        titleOf:r=>r.name,detailOf:r=>r.detail
      });
      view.show([{name:"Berlin",detail:"Deutschland"},{name:"Bonn",detail:"Deutschland"}]);
    });
    assert.equal(await page.locator("#searchResults .result").count(),2);
    assert.equal(await page.locator("#searchResults .results-head").count(),0);
    assert.equal(await page.locator("#searchResults").evaluate(el=>el.lastElementChild?.className),"results-footer");
    await page.locator("#searchResults .results-cancel").click();
    assert.equal(await page.locator("#searchResults").isHidden(),true);
    assert.equal(await page.evaluate(()=>window.__searchChooseCalls),0);
    step("keyboard search choice: arrow wrap, Enter selects, Escape cancels");
    await page.evaluate(()=>{
      window.__keyboardSearchPicked=null;
      new window.Pin2MapSearchResultsView({
        container:document.getElementById("searchResults"),document,
        titleOf:x=>x.name,detailOf:x=>x.name,
        onChoose:x=>{window.__keyboardSearchPicked=x.name;}
      }).show([{name:"A"},{name:"B"},{name:"C"}]);
    });
    assert.equal(await page.locator("#searchResults .is-keyboard-selected").count(),1);
    await page.keyboard.press("ArrowDown");
    assert.equal(await page.locator("#searchResults .result").nth(1).evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    assert.equal(await page.locator("#searchResults .result").first().evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press("ArrowUp");
    assert.equal(await page.locator("#searchResults .result").last().evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(()=>window.__keyboardSearchPicked),"C");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#searchResults").isHidden(),true);
    step("search results: old place-kind metadata, scrolling footer and edit-to-dismiss");
    await page.evaluate(()=>{
      const host=document.getElementById("searchResults");
      const domain=window.Pin2MapPlaceSearch;
      const view=new window.Pin2MapSearchResultsView({
        container:host,document,onChoose:()=>{},
        titleOf:domain.title,detailOf:domain.detail,kindOf:domain.kind,
        duplicateCoordinates:domain.duplicateCoordinates
      });
      const results=Array.from({length:28},(_,i)=>({
        name:"Springfield",display_name:"Springfield, USA",
        addresstype:"city",class:i%2?"boundary":"place",
        osm_type:i%2?"relation":"node",lat:String(39+i/100),lon:"-89"
      }));
      view.show(results);
    });
    assert.equal(await page.locator("#searchResults .result-kind").first().textContent(),"● Stadt · Ortsmittelpunkt");
    assert.equal(await page.locator("#searchResults .result-kind").nth(1).textContent(),"▧ Stadt · Gebiet");
    assert.match(await page.locator("#searchResults .result-coordinates").first().textContent(),/Position: 39\.00000, -89\.00000/);
    const fixedFooter=await page.evaluate(()=>{
      const host=document.getElementById("searchResults");
      const items=host.querySelector(".results-items"),footer=host.querySelector(".results-footer");
      const before=footer.getBoundingClientRect().top;
      items.scrollTop=items.scrollHeight;
      return {before,after:footer.getBoundingClientRect().top,
        canScroll:items.scrollHeight>items.clientHeight,
        footerInView:footer.getBoundingClientRect().bottom<=host.getBoundingClientRect().bottom+2};
    });
    assert.equal(fixedFooter.canScroll,true,JSON.stringify(fixedFooter));
    assert.ok(Math.abs(fixedFooter.before-fixedFooter.after)<=1,JSON.stringify(fixedFooter));
    assert.equal(fixedFooter.footerInView,true);
    await page.locator("#searchInput").fill("Berlin bearbeitet");
    assert.equal(await page.locator("#searchResults").isHidden(),true,
      "Any search input edit dismisses visible results without new search");
    await page.locator("#searchInput").press("Enter");
    await page.locator("#searchResults .message").waitFor({state:"visible",timeout});
    await page.locator("#searchInput").fill("");
    assert.equal(await page.locator("#searchResults").isHidden(),true,
      "Clearing via the search input closes results");
    step("mobile-safe search clear is explicit and cancels without submitting");
    const searchClear=page.locator("#searchClear");
    assert.equal(await searchClear.isHidden(),true);
    await page.locator("#searchInput").fill("Hamburg");
    assert.equal(await searchClear.isVisible(),true);
    await searchClear.click();
    assert.equal(await page.locator("#searchInput").inputValue(),"");
    assert.equal(await searchClear.isHidden(),true);
    assert.equal(await page.locator("#searchResults").isHidden(),true);
    assert.equal(await page.locator("#searchInput").evaluate(el=>document.activeElement===el),true);

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
    assert.equal(await picker.evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(23, 100, 191)");
    assert.equal(await picker.evaluate(el=>getComputedStyle(el).color),"rgb(255, 255, 255)");
    assert.equal(await menu.locator(".basemap-menu-title").count(),0);
    assert.deepEqual(await menu.locator("[data-basemap]").evaluateAll(nodes=>nodes.map(n=>n.dataset.basemap)),
      ["street","international","humanitarian","topo","satellite"]);
    assert.equal(await street.textContent(),"Standard");
    assert.equal(await menu.locator("hr.basemap-satellite-divider").count(),2);
    assert.equal(await menu.locator("#satelliteInspect").isDisabled(),true);
    assert.equal(await menu.locator("#satelliteRoads").isDisabled(),true);
    await topo.click();
    assert.equal(await menu.isHidden(),true);
    assert.equal(await picker.getAttribute("aria-expanded"),"false");
    assert.notEqual(await picker.evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(23, 100, 191)");
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
    assert.equal(await page.locator("#settingsButton").getAttribute("aria-expanded"),"true");
    assert.equal(await page.locator("#settingsButton").evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(23, 100, 191)");
    await picker.click();
    assert.equal(await page.locator("#settingsButton").getAttribute("aria-expanded"),"false");
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
    step("satellite brightness: default 140, reset, disabled labels, persistence and tile isolation");
    await picker.click();
    await menu.locator('[data-basemap="satellite"]').click();
    await picker.click();
    const brightness=menu.locator("#satelliteBrightness"),reset=menu.locator("#satelliteReset");
    assert.equal(await brightness.isEnabled(),true);
    assert.equal(await menu.locator("#satelliteContrast").count(),0);
    assert.equal(await menu.locator('.basemap-slider-icon[data-pin-icon="sun-medium"] svg').count(),1);
    assert.equal(await reset.getAttribute("aria-label"),"Helligkeit auf 120 % zurücksetzen");
    assert.equal((await reset.innerText()).trim(),"Standard");
    await brightness.evaluate(el=>{
      el.value="165";el.dispatchEvent(new Event("input",{bubbles:true}));
      el.dispatchEvent(new Event("change",{bubbles:true}));
    });
    assert.equal(await menu.locator("#satelliteBrightnessValue").textContent(),"165 %");
    assert.equal(await menu.isVisible(),true,"Slider must not close menu");
    const satelliteFilter=await page.evaluate(()=>{
      const img=document.querySelector('.leaflet-tile-pane img[src*="World_Imagery"]');
      return img?.closest(".leaflet-layer")?.style.filter;
    });
    assert.equal(satelliteFilter,"brightness(1.65)");
    assert.equal(await page.locator("#map .leaflet-marker-pane").evaluate(el=>getComputedStyle(el).filter),"none",
      "Pin markers must not inherit satellite brightness");
    await page.waitForTimeout(650);
    await page.reload({waitUntil:"domcontentloaded"});
    await assertReady(page);
    await picker.click();
    assert.equal(await brightness.inputValue(),"165");
    assert.equal(await page.evaluate(()=>{
      const img=document.querySelector('.leaflet-tile-pane img[src*="World_Imagery"]');
      return img?.closest(".leaflet-layer")?.style.filter;
    }),"brightness(1.65)");
    await menu.locator('[data-basemap="street"]').click();
    const streetFilter=await page.evaluate(()=>{
      const img=document.querySelector('.leaflet-tile-pane img[src*="tile.openstreetmap.org"]');
      return img?.closest(".leaflet-layer")?.style.filter;
    });
    assert.ok(!streetFilter,"Street map must have no satellite filters: "+streetFilter);
    await picker.click();
    assert.equal(await brightness.isDisabled(),true);
    assert.equal(await reset.isDisabled(),true);
    const inactiveStyle=await menu.locator(".basemap-satellite-slider").first().evaluate(el=>({
      color:getComputedStyle(el).color,
      iconOpacity:getComputedStyle(el.querySelector(".basemap-slider-icon")).opacity
    }));
    assert.equal(inactiveStyle.color,"rgb(156, 167, 179)");
    assert.equal(inactiveStyle.iconOpacity,"0.48");
    await menu.locator('[data-basemap="satellite"]').click();
    await picker.click();
    assert.equal(await brightness.inputValue(),"165");
    assert.equal(await reset.isEnabled(),true);
    await reset.click();
    assert.equal(await menu.isVisible(),true);
    assert.equal(await reset.isDisabled(),true);
    assert.equal(await brightness.inputValue(),"120");
    assert.equal(await page.evaluate(()=>{
      const img=document.querySelector('.leaflet-tile-pane img[src*="World_Imagery"]');
      return img?.closest(".leaflet-layer")?.style.filter;
    }),"brightness(1.2)");
    await page.waitForTimeout(650);
    await page.reload({waitUntil:"domcontentloaded"});
    await assertReady(page);
    await picker.click();
    assert.equal(await brightness.inputValue(),"120");
    const reliefToggle=page.locator("#esriReliefToggle");
    assert.equal(await reliefToggle.isDisabled(),true,"Relief cannot be enabled on satellite imagery");
    await menu.locator('[data-basemap="street"]').click();
    await picker.click();
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
    step("pin details: multiline notes, floating URL popup, five routing placeholders and six footer controls");
    assert.equal(await page.locator("#pinNotes").count(),1);
    assert.equal(await page.locator("#pinUrlBlock").isHidden(),true);
    assert.equal(await page.locator("#pinPanel .pin-navigation-buttons button").count(),5);
    for(const item of await page.locator("#pinPanel .pin-navigation-buttons button").all())
      assert.equal(await item.isDisabled(),true);
    assert.equal(await page.locator("#deletePin").isVisible(),true);
    assert.equal(await page.locator("#cancelPin").count(),0);
    const footerIds=["movePin","pinLayerTrigger","pinUrlButton","pinWikipedia","pinWeather","closePin"];
    const footerLayout=await page.locator("#pinPanel .pin-actions").evaluate(row=>
      [...row.querySelectorAll(":scope > button, :scope > .pin-layer-picker > .pin-layer-trigger")].map(b=>({id:b.id,left:b.getBoundingClientRect().left,
        width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height})));
    assert.deepEqual(footerLayout.map(b=>b.id),footerIds);
    for(const item of footerLayout)assert.ok(Math.abs(item.width-42)<1&&Math.abs(item.height-42)<1,JSON.stringify(item));
    await page.locator("#pinNotes").fill("Erste Zeile\nZweite Zeile");
    await page.locator("#pinUrlButton").click();
    assert.equal(await page.locator("#pinNotesBlock").isVisible(),true);
    assert.equal(await page.locator("#pinUrlBlock").isVisible(),true);
    assert.equal(await page.locator("#pinUrlBlock").evaluate(el=>el.parentElement.tagName),"BODY");
    assert.equal(await page.locator("#pinUrl").evaluate(el=>el.tagName),"TEXTAREA");
    assert.equal(await page.locator("#pinUrl").getAttribute("rows"),"3");
    assert.equal(await page.locator("#pinUrlOpen").isDisabled(),true);
    await page.locator("#pinUrl").fill("https://example.org/path");
    assert.equal(await page.locator("#pinUrlOpen").isEnabled(),true);
    await page.locator("#pinUrlButton").click();
    assert.equal(await page.locator("#pinUrlBlock").isHidden(),true);
    await page.locator("#pinUrlButton").click();
    assert.equal(await page.locator("#pinUrl").inputValue(),"");
    await page.locator("#pinUrl").fill("https://example.org/path");
    await page.locator("#pinUrlSave").click();
    assert.equal(await page.locator("#pinNotesBlock").isVisible(),true);
    assert.equal(await page.locator("#pinNotes").inputValue(),"Erste Zeile\nZweite Zeile");
    assert.equal(await page.locator("#pinWeather").isDisabled(),true);
    assert.equal(await page.locator("#pinCreated").count(),0);
    assert.equal(await page.locator("#pinUpdated").count(),0);
    await page.waitForTimeout(650);
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
    assert.equal(await page.locator("#pinNotes").inputValue(),"Erste Zeile\nZweite Zeile",
      "Multiline notes persist in existing IndexedDB project");
    await page.locator("#pinUrlButton").click();
    assert.equal(await page.locator("#pinUrl").inputValue(),"https://example.org/path",
      "Saved pin URL persists across reload");
    await page.locator("#pinUrlButton").click();

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
    // The taller inline notes editor triggers the existing opening correction:
    // the map can pan slightly so the selected pin/dialog remains visible.
    // Verify the search position is still close and the adjusted view persists.
    assert.ok(Math.abs(projectAfterSelection.viewport.lat-48.7758)<0.25,
      "Choosing place keeps the selected location near the visible map center");
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
    let holdTemperature=true;
    const temperatureReleases=[];
    const releaseNextTemperature=async()=>{
      for(let attempt=0;attempt<300&&!temperatureReleases.length;attempt++)
        await new Promise(resolve=>setTimeout(resolve,10));
      assert.ok(temperatureReleases.length,"Expected a held visible-pin weather request");
      temperatureReleases.shift()();
    };
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
          if(url.searchParams.get("daily")==="precipitation_sum")return {timezone:"Europe/Brussels",
            daily:{time:[date],precipitation_sum:[1.8]}};
          if(url.searchParams.get("daily")?.includes("sunrise"))return {timezone:"Europe/Brussels",
            daily:{time:[date],sunrise:[date+"T07:30"],sunset:[date+"T17:15"]}};
          return {timezone:"Europe/Brussels",utc_offset_seconds:3600,current:{temperature_2m:19}};
        };
        values=count===1?row():Array.from({length:count},row);
      }
      forecastRequests.push({count,url:route.request().url()});
      if(holdTemperature&&url.searchParams.get("current")==="temperature_2m")
        await new Promise(resolve=>temperatureReleases.push(resolve));
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
    assert.equal(await infoButton.getAttribute("aria-busy"),"false","Off starts idle");
    await infoButton.click();
    assert.equal(await infoMenu.isVisible(),true);
    assert.equal(await infoButton.getAttribute("aria-expanded"),"true");
    assert.equal(await infoButton.evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(23, 100, 191)");
    assert.equal(await infoButton.evaluate(el=>getComputedStyle(el).color),"rgb(255, 255, 255)");
    assert.equal(await infoMenu.locator("[data-pin-info-mode]").count(),7);
    assert.deepEqual(await infoMenu.locator("[data-pin-info-mode]").evaluateAll(els=>els.map(el=>el.dataset.pinInfoMode)),
      ["off","elevation","temperature","daily","precipitation","sun","zone"]);
    assert.equal(await infoMenu.locator(".basemap-menu-title").count(),0,"Menu has no headline");
    assert.equal(await infoMenu.locator(".pin-info-separator").count(),5);
    assert.equal(await infoMenu.locator('button[data-pin-info-mode="zone"] + hr.pin-info-separator').count(),0,
      "Zone must have no trailing separator");
    assert.equal(await infoMenu.locator('[data-pin-info-mode="daily"] + hr.pin-info-separator + [data-pin-info-mode="precipitation"]').count(),1,"Divider separates min/max and precipitation");
    assert.equal(await infoMenu.locator("#pinInfoDailyPeriod").inputValue(),"today");
    assert.equal(await infoMenu.locator("#pinInfoSunPeriod").inputValue(),"today");
    assert.equal(await infoMenu.locator("#pinInfoPrecipitationPeriod").inputValue(),"today");
    assert.equal(await infoMenu.locator(".pin-info-credit").count(),0,
      "No source/explanation block belongs in the pin-info menu");
    assert.equal(await infoMenu.getByText("NASA POWER").count(),0,
      "Data attribution moved to Settings");
    await infoMenu.locator('button[data-pin-info-mode="zone"]').count().then(n=>
      assert.equal(n,1,"Zone remains last selectable entry"));
    for(const icon of ["eye-off","mountain-snow","thermometer","thermometer-sun","thermometer-snowflake","cloud-rain-wind","sunrise","sunset","rotate-cw-clock"])
      assert.equal(await infoMenu.locator('[data-pin-icon="'+icon+'"] svg').count(),1,icon);
    assert.equal(await page.locator(".elevation-label-wrap").count(),0);
    // Sources live in existing Settings, not in the popup; open only after closing it.
    await infoButton.click();
    await page.locator("#settingsButton").click();
    assert.equal(await page.locator("#settingsPanel").isVisible(),true);
    const credit=page.locator("#settingsPinInfoSources");
    assert.equal(await credit.count(),1);
    assert.match(await credit.innerText(),/Monatsmittel/);
    assert.match(await credit.innerText(),/15\. des ausgewählten Monats/);
    assert.match(await credit.innerText(),/sichtbarer Ebenen/);
    for(const url of ["https://open-meteo.com/","https://power.larc.nasa.gov/","https://sunrise-sunset.org/"])
      assert.equal(await credit.locator('a[href="'+url+'"]').count(),1);
    assert.doesNotMatch(await credit.innerText(),/am 21\./,"Obsolete date must not remain");
    await page.locator('#settingsPanel [data-close="settingsPanel"]').click();
    await infoButton.click();
    await infoMenu.locator('[data-pin-info-mode="temperature"]').click();
    await page.waitForFunction(()=>document.querySelector("#pinInfoButton")?.classList.contains("is-loading"),
      null,{timeout:6000});
    assert.equal(await infoButton.getAttribute("aria-busy"),"true");
    const spinner=await infoButton.evaluate(el=>({
      name:getComputedStyle(el,"::after").animationName,
      content:getComputedStyle(el,"::after").content,
      size:getComputedStyle(el,"::after").width
    }));
    assert.match(spinner.name,/p2m-pin-info-spin/);
    assert.notEqual(spinner.content,"none");
    assert.equal(spinner.size,"14px");
    assert.equal(await infoButton.getAttribute("data-pin-icon"),"message-circle-exclamation-point",
      "Loading must not replace Lucide mode icon");
    await releaseNextTemperature();
    await page.waitForFunction(()=>document.querySelectorAll(".elevation-label.p2m-temperature-label").length===1
      &&document.querySelector("#pinInfoButton")?.getAttribute("aria-busy")==="false",
      null,{timeout:6000});
    assert.equal(forecastRequests.length,1,"Only the visible pin must be queried");
    assert.equal(forecastRequests[0].count,1);
    assert.equal(await infoButton.getAttribute("data-pin-icon"),"message-circle-exclamation-point");
    assert.match(await page.locator(".elevation-label").first().textContent(),/19 °C/);
    await page.locator("#layersButton").click();
    await page.locator('#layersList input[aria-label="Wettertest sichtbar"]').check();
    await page.waitForFunction(()=>document.querySelector("#pinInfoButton")?.getAttribute("aria-busy")==="true",
      null,{timeout:6000});
    assert.equal(await page.locator(".elevation-label.p2m-temperature-label").count(),2,
      "First pin stays drawn and second pin has a temporary placeholder");
    await releaseNextTemperature();
    holdTemperature=false;
    await page.waitForFunction(()=>document.querySelectorAll(".elevation-label.p2m-temperature-label").length===2
      &&document.querySelector("#pinInfoButton")?.getAttribute("aria-busy")==="false",
      null,{timeout:6000});
    assert.equal(forecastRequests.length,2,"Newly visible pins load after layer reveal");
    assert.equal(forecastRequests[1].count,1);
    step("pin editor preserves visible pin information and name labels while disabling map controls");
    assert.equal(await page.locator("#map .elevation-label-wrap").count(),2);
    await page.locator("#map .pin-marker").first().click();
    await page.locator("#pinPanel").waitFor({state:"visible",timeout});
    assert.notEqual(await page.locator("#map .elevation-label-wrap").first().evaluate(
      el=>getComputedStyle(el).display),"none",
      "Pin information labels must remain visible while editing");
    assert.equal(await page.locator("#pinInfoButton").isHidden(),true);
    assert.equal(await page.locator("#map .pin-marker").count(),2,
      "Other pins remain visible");
    await page.locator("#closePin").click();
    await page.locator("#pinPanel").waitFor({state:"hidden",timeout});
    assert.notEqual(await page.locator("#map .elevation-label-wrap").first().evaluate(
      el=>getComputedStyle(el).display),"none",
      "Upper pin information remains visible after closing the editor");
    await page.locator("#layersButton").click();
    // Historical monthly normals are NOT forecasts. Mock both provider contracts.
    const climateRequests=[],sunRequests=[];
    await page.route("https://power.larc.nasa.gov/api/temporal/climatology/point**",async route=>{
      const q=new URL(route.request().url()).searchParams;
      climateRequests.push(q);
      const lows={JAN:3.2,FEB:4.5},highs={JAN:11.6,FEB:13.7};
      const parameter=q.get("parameters")==="PRECTOTCORR"
        ?{PRECTOTCORR:{JAN:2,FEB:1.5,MAR:1,APR:1,MAY:1,JUN:1,JUL:1,AUG:1,SEP:1,OCT:1,NOV:1,DEC:1}}
        :{T2M_MIN_AVG:lows,T2M_MAX_AVG:highs};
      await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
        properties:{parameter}
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
    // New independent precipitation selector: Today = local-date forecast mm.
    const rainRequestsBefore=forecastRequests.length;
    await infoButton.click();
    await infoMenu.locator("#pinInfoPrecipitationPeriod").focus();
    await infoButton.click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll(".elevation-label.p2m-precipitation-label"))
      .some(el=>el.textContent.includes("1,8 mm")),null,{timeout:6000});
    assert.equal(forecastRequests.length,rainRequestsBefore+1);
    assert.match(forecastRequests.at(-1).url,/daily=precipitation_sum/);
    const precipClimateBefore=climateRequests.length;
    await infoButton.click();
    await infoMenu.locator("#pinInfoPrecipitationPeriod").selectOption("01");
    await infoButton.click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll(".elevation-label.p2m-precipitation-label"))
      .some(el=>el.textContent.includes("Ø Jan")&&el.textContent.includes("62 mm")),null,{timeout:6000});
    assert.equal(climateRequests.length,precipClimateBefore+2,"Only two visible pins need new NASA rain data");
    assert.ok(climateRequests.slice(precipClimateBefore).every(q=>q.get("parameters")==="PRECTOTCORR"));
    await infoButton.click();
    assert.equal(await infoMenu.locator("#pinInfoDailyPeriod").inputValue(),"02","Daily month retained");
    assert.equal(await infoMenu.locator("#pinInfoSunPeriod").inputValue(),"today","Sun month retained");
    await infoMenu.locator("#pinInfoPrecipitationPeriod").selectOption("02");
    await infoButton.click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll(".elevation-label.p2m-precipitation-label"))
      .some(el=>el.textContent.includes("Ø Feb")&&el.textContent.includes("42 mm")),null,{timeout:6000});
    assert.equal(climateRequests.length,precipClimateBefore+2,"Feb reuses fetched 12-month corrected NASA normal");
    await infoButton.click();
    assert.equal(await infoMenu.locator("#pinInfoPrecipitationPeriod option[value=year]").textContent(),"Jahr");
    await infoMenu.locator("#pinInfoPrecipitationPeriod").selectOption("year");
    await infoButton.click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll(".elevation-label.p2m-precipitation-label"))
      .some(el=>el.textContent.includes("Ø Jahr")&&el.textContent.includes("410 mm")),null,{timeout:6000});
    assert.equal(climateRequests.length,precipClimateBefore+2,"Year reuses cached twelve-month NASA data");
    const spacing=await page.locator(".p2m-precipitation-value").first().evaluate(el=>{
      const p=getComputedStyle(el);
      return {left:parseFloat(p.paddingLeft),right:parseFloat(p.paddingRight)};
    });
    assert.ok(spacing.left>=8&&spacing.right>=8,"Rain amount has legible spacing inside blue segment");
    await infoButton.click();
    await infoMenu.locator("#pinInfoPrecipitationPeriod").selectOption("today");
    await infoButton.click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll(".elevation-label.p2m-precipitation-label"))
      .some(el=>el.textContent.includes("1,8 mm")),null,{timeout:6000});
    assert.equal(climateRequests.length,precipClimateBefore+2);
    await infoButton.click();
    assert.equal(await infoMenu.locator('button[data-pin-info-mode]').last().getAttribute("data-pin-info-mode"),"zone");
    await infoMenu.locator('button[data-pin-info-mode="zone"]').click();
    await page.waitForFunction(()=>document.querySelectorAll(".elevation-label .p2m-zone-information svg").length===2,
      null,{timeout:6000});
    assert.equal(await page.locator(".p2m-zone-information svg").first().locator("path").first().getAttribute("d"),
      "M12 7v5l4 2","Live timezone displays official clockwise Lucide geometry");
    assert.match(await page.locator(".p2m-zone-information").first().innerText(),/\+[0-9]/);
    const iconMarkup=await page.evaluate(()=>{
      const f=window.Pin2MapPinInfoLabel.labelMarkup,shapes=window.Pin2MapIcons;
      const svg=name=>shapes.svg(name,document).outerHTML;
      return {
        positive:f({mode:"zone",text:"+2",icon:"rotate-cw-clock"},{getIconSvg:svg}),
        negative:f({mode:"zone",text:"-3",icon:"rotate-ccw-clock"},{getIconSvg:svg}),
        equal:f({mode:"zone",text:"",icon:"clock-check"},{getIconSvg:svg})
      };
    });
    assert.match(iconMarkup.positive,/M12 7v5l4 2/);
    assert.match(iconMarkup.positive,/\+2/);
    assert.match(iconMarkup.negative,/M3 12a9 9 0 1 0 9-9/);
    assert.match(iconMarkup.negative,/-3/);
    assert.match(iconMarkup.equal,/m16 19 2 2 4-4/);
    assert.doesNotMatch(iconMarkup.equal,/>0</);
    await infoButton.click();
    await infoMenu.locator('[data-pin-info-mode="off"]').click();
    assert.equal(await infoButton.getAttribute("data-pin-icon"),"message-circle-exclamation-point-off");
    assert.equal(await infoButton.locator("svg path").last().getAttribute("d"),"M2 22 22 2");
    await page.waitForFunction(()=>document.querySelectorAll(".elevation-label").length===0,
      null,{timeout:6000});
    console.log("[browser] PASS – six information modes, legacy info labels, cache and lazy hidden-layer fetch");
    // Run the UI-only selector activation after the request-count assertions.
    // Focusing a native select changes the active mode and may issue requests.
    await infoButton.click();
    step("pin info native period selectors: taps must not dismiss the popup");
    for(const id of ["pinInfoDailyPeriod","pinInfoPrecipitationPeriod","pinInfoSunPeriod"]){
      const select=infoMenu.locator("#"+id);
      await select.evaluate(el=>el.closest("label").dispatchEvent(new MouseEvent("click",{bubbles:true})));
      assert.equal(await infoMenu.isVisible(),true,id+" label click must not dismiss menu");
      await select.click();
      assert.equal(await infoMenu.isVisible(),true,id+" select activation must not dismiss menu");
      assert.equal(await infoButton.getAttribute("aria-expanded"),"true");
    }
    await infoMenu.locator('button[data-pin-info-mode="off"]').click();



    step("satellite inspector: deliberate click, street overlays, single marker and reversible relief");
    await page.route("**/World_Imagery/MapServer/identify?**",async route=>{
      await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
        results:[{layerId:4,attributes:{"DATE (YYYYMMDD)":20240115,"RESOLUTION (M)":0.5,"ACCURACY (M)":1.2,SOURCE_INFO:"Imagery provider",SOURCE:"Vantor"}}]
      })});
    });
    await page.locator("#basemapButton").click();
    await page.locator('#basemapMenu [data-basemap="satellite"]').click();
    await page.locator("#basemapButton").click();
    assert.equal(await page.locator("#esriReliefToggle").isDisabled(),true);
    await page.locator("#satelliteRoads").check();
    assert.equal(await page.locator("#satelliteInspect").isEnabled(),true);
    const imageryOverlaySources=await page.locator("#map .leaflet-pane img").evaluateAll(imgs=>imgs.map(img=>img.src));
    assert.ok(imageryOverlaySources.filter(src=>src.includes("World_Transportation")||src.includes("World_Boundaries_and_Places")).every(src=>src.includes("/Reference/")), "Esri references must use Reference/ service paths");
    assert.ok(imageryOverlaySources.some(src=>src.includes("World_Transportation")));
    assert.ok(imageryOverlaySources.some(src=>src.includes("World_Boundaries_and_Places")));
    await page.locator("#satelliteInspect").click();
    assert.equal(await page.locator("#basemapMenu").isHidden(),true);
    assert.equal(await page.locator("#satelliteInspect").getAttribute("aria-pressed"),"true");
    assert.equal(await page.locator("#map").evaluate(el=>getComputedStyle(el).cursor),"crosshair");
    await page.locator("#map").click({position:{x:38,y:305}});
    await page.waitForFunction(()=>document.querySelector("#satelliteInfoFields")?.textContent?.includes("20240115"),null,{timeout:6000});
    const infoRows=page.locator("#satelliteInfoFields .satellite-info-row");
    assert.deepEqual(await infoRows.locator("strong").allTextContents(),[
      "Aufnahmedatum","Resolution","Accuracy","Source_info","Datenquelle","Link zu Wayback"
    ]);
    assert.equal(await infoRows.nth(0).locator("span").innerText(),"20240115");
    assert.equal(await infoRows.nth(1).locator("span").innerText(),"0.5");
    assert.equal(await infoRows.nth(2).locator("span").innerText(),"1.2");
    const wayback=infoRows.last().locator("a");
    assert.equal(await wayback.getAttribute("target"),"_blank");
    assert.equal(await wayback.getAttribute("rel"),"noopener noreferrer");
    assert.ok((await wayback.getAttribute("href")).startsWith("https://livingatlas.arcgis.com/wayback/#mapCenter="));
    assert.equal(await page.locator("#map .p2m-satellite-selection-icon").count(),1);
    await page.locator("#map").click({position:{x:58,y:326}});
    assert.equal(await page.locator("#map .p2m-satellite-selection-icon").count(),1);
    await page.locator("#satelliteInfoClose").click();
    assert.equal(await page.locator("#satelliteInfoPanel").isHidden(),true);
    assert.equal(await page.locator("#map .p2m-satellite-selection-icon").count(),0);
    assert.notEqual(await page.locator("#map").evaluate(el=>getComputedStyle(el).cursor),"crosshair");
    await page.locator("#basemapButton").click();
    await page.locator('#basemapMenu [data-basemap="street"]').click();
    assert.equal(await page.locator("#satelliteInspect").isDisabled(),true);
    console.log("[browser] PASS – satellite imagery inspection and reversible overlay controls");

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
