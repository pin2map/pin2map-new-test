"use strict";
/* Actual Chrome marker-tap regression for the v167 disentangling workflow.
 * Each test context uses independent IndexedDB; no real user pins are read. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {chromium}=require("playwright");
const base=process.env.PIN2MAP_TEST_URL||"http://127.0.0.1:8765/";
const viewports=[
  {name:"iphone",width:375,height:667,hasTouch:true,isMobile:true},
  {name:"ipad",width:768,height:1024,hasTouch:true,isMobile:true},
  {name:"desktop",width:1100,height:780,hasTouch:false,isMobile:false}
];
async function setPins(page,pins,zoom=12){
  await page.evaluate(async ({pins,zoom})=>{
    const store=await window.Pin2MapIndexedDBProjectStore.open();
    try{
      const project=window.Pin2MapProjectModel.defaultProject();
      project.viewport={lat:48.7758,lng:9.1829,zoom};
      project.pins=pins.map(p=>({
        id:p.id,lat:p.lat,lng:p.lng,name:p.name,layerId:"private",
        note:"",url:""
      }));
      await store.saveProject(project);
      // New v169 history intentionally survives reload. Each fixture must
      // explicitly reset its own device history when replacing the project.
      await store.saveViewHistory(null);
    }finally{store.close();}
  },{pins,zoom});
  await page.reload({waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForFunction(()=>document.querySelectorAll("#map .pin-icon").length>0,{timeout:20000});
  await page.waitForTimeout(120);
}
async function zoom(page){
  return page.locator("#map .leaflet-container").count()
    .then(async()=>{
      // Leaflet remains private to the adapter in production;
      // browser diagnostics can read its scale through the global map
      // only if mounted. Use pixel-to-latlng of fixed points otherwise.
      const value=await page.evaluate(()=>{
        const line=document.querySelector(".leaflet-control-scale-line");
        return line?.textContent?.trim()||"";
      });
      return value;
    });
}
(async()=>{
  fs.mkdirSync("pin-overlap-artifacts",{recursive:true});
  const browser=await chromium.launch({headless:true,...(process.env.PIN2MAP_CHROMIUM_EXECUTABLE
    ?{executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE}:{})});
  try{
    for(const viewport of viewports){
      const context=await browser.newContext({
        viewport:{width:viewport.width,height:viewport.height},
        hasTouch:viewport.hasTouch,isMobile:viewport.isMobile,deviceScaleFactor:1,
        serviceWorkers:"allow"
      });
      const page=await context.newPage();
      const errors=[];
      page.on("pageerror",e=>errors.push(e.message));
      try{
        await page.goto(base,{waitUntil:"domcontentloaded",timeout:30000});
        await page.waitForFunction(()=>!!window.L&&!!document.querySelector(".leaflet-container"),
          null,{timeout:20000});
        const near=[
          {id:"near-A",lat:48.7758,lng:9.1829,name:"Near A"},
          {id:"near-B",lat:48.7758,lng:9.1839,name:"Near B"}
        ];
        await setPins(page,near);
        assert.equal(await page.locator(".pin-icon").count(),2);
        const firstBox=await page.locator(".pin-icon").first().boundingBox();
        const secondBox=await page.locator(".pin-icon").last().boundingBox();
        assert.ok(Math.abs(firstBox.x-secondBox.x)<52,
          "Precondition: actual 52px hitboxes overlap at low zoom");
        const initialScale=await zoom(page);
        assert.equal(await page.locator(".pin-zoom-buttons button").first().getAttribute("title"),"Zurück zur letzten Ansicht");
        await page.screenshot({path:"pin-overlap-artifacts/"+viewport.name+"-before.png"});
        const tap=async locator=>viewport.hasTouch?locator.tap({force:true}):locator.click({force:true});
        await tap(page.locator(".pin-icon").last());
        assert.equal(await page.locator("#pinPanel").isHidden(),true,
          "First ambiguous tap must zoom, never select topmost pin");
        assert.equal(await page.locator(".pin-overlap-chooser").count(),0,
          "Separable nearby pins must not force a chooser");
        const afterScale=await zoom(page);
        await page.screenshot({path:"pin-overlap-artifacts/"+viewport.name+"-after-zoom.png"});
        assert.notEqual(afterScale,initialScale,
          "First ambiguous tap must change map zoom");
        const afterA=await page.locator(".pin-icon").first().boundingBox();
        const afterB=await page.locator(".pin-icon").last().boundingBox();
        assert.ok(Math.abs(afterA.x-afterB.x)>=52||Math.abs(afterA.y-afterB.y)>=56,
          "Hitboxes must be separated after autozoom");
        await tap(page.locator(".pin-icon").first());
        await page.locator("#pinPanel").waitFor({state:"visible",timeout:8000});
        assert.equal(await page.locator("#pinName").inputValue(),"Near A",
          "Second tap must select the intended individual pin");
        await page.locator("#closePin").click();

        // Two pins at EXACTLY the same coordinates cannot be separated by
        // any amount of zoom. The user must be offered a labeled choice.
        const same=[
          {id:"same-A",lat:48.7758,lng:9.1829,name:"Identisch A"},
          {id:"same-B",lat:48.7758,lng:9.1829,name:"Identisch B"}
        ];
        await setPins(page,same);
        await tap(page.locator(".pin-icon").last());
        assert.equal(await page.locator(".pin-overlap-chooser").count(),0,
          "Overview tap must first zoom and show the pin");
        assert.notEqual(await zoom(page),initialScale);
        const centered=await page.locator(".pin-icon").last().boundingBox();
        assert.ok(centered&&centered.x>viewport.width*.25&&centered.x<viewport.width*.75,
          "Identical-position pins remain visible near the horizontal center");
        // Emulated mobile tap generates a ghost-click suppression interval;
        // wait for it to expire before asserting a distinct second gesture.
        await page.waitForTimeout(720);
        await tap(page.locator(".pin-icon").last());
        await page.locator(".pin-overlap-chooser").waitFor({state:"visible",timeout:8000});
        assert.equal(await page.locator("#pinPanel").isHidden(),true);
        assert.equal(await page.locator(".pin-overlap-choice").count(),2);
        assert.match(await page.locator(".pin-overlap-choice").first().textContent(),/Privat/,
          "Chooser must identify the pin layer");
        await page.screenshot({path:"pin-overlap-artifacts/"+viewport.name+"-exact-chooser.png"});
        await page.locator(".pin-overlap-choice").filter({hasText:"Identisch A"}).click();
        await page.locator("#pinPanel").waitFor({state:"visible",timeout:8000});
        assert.equal(await page.locator("#pinName").inputValue(),"Identisch A");
        assert.equal(await page.locator(".pin-overlap-chooser").count(),0);
        await page.locator("#closePin").click();
        // A pin-editor opening pan is also an intentional history step, so
        // returning to the overview may require more than one Undo.
        await page.waitForTimeout(400);
        let restored=false;
        for(let n=0;n<20;n++){
          if(await zoom(page)===initialScale){restored=true;break;}
          const undo=page.locator(".pin-zoom-buttons button").first();
          if(await undo.isDisabled())break;
          await undo.click();
          await page.waitForTimeout(60);
        }
        assert.equal(restored||await zoom(page)===initialScale,true,
          "Undo history must eventually return to the overview after editor pans");

        // A single isolated marker still opens immediately and keeps zoom.
        await setPins(page,[{id:"solo",lat:48.7758,lng:9.1829,name:"Allein"}]);
        const soloScale=await zoom(page);
        await tap(page.locator(".pin-icon").first());
        await page.locator("#pinPanel").waitFor({state:"visible",timeout:8000});
        assert.equal(await page.locator("#pinName").inputValue(),"Allein");
        assert.equal(await zoom(page),soloScale);
        await page.locator("#closePin").click();
        // The debug switch hides paint ONLY, not the 52x56 marker hitbox.
        const hitbox=page.locator("#map .leaflet-marker-icon.pin-icon").first();
        const boundsBefore=await hitbox.boundingBox();
        const visiblePaint=await hitbox.evaluate(el=>({
          background:getComputedStyle(el).backgroundColor,
          border:getComputedStyle(el).borderTopColor
        }));
        assert.equal(visiblePaint.background,"rgba(255, 224, 0, 0.55)");
        await page.locator("#settingsButton").click();
        assert.equal(await page.locator("#showPinHitboxes").isChecked(),true);
        await page.locator("#showPinHitboxes").uncheck();
        const hiddenPaint=await hitbox.evaluate(el=>({
          background:getComputedStyle(el).backgroundColor,
          border:getComputedStyle(el).borderTopColor
        }));
        assert.equal(hiddenPaint.background,"rgba(0, 0, 0, 0)");
        assert.equal(hiddenPaint.border,"rgba(0, 0, 0, 0)");
        const boundsAfter=await hitbox.boundingBox();
        assert.deepEqual({width:boundsAfter.width,height:boundsAfter.height},
          {width:boundsBefore.width,height:boundsBefore.height},
          "Hiding yellow hitboxes must not alter touch target dimensions");
        await page.locator('#settingsPanel [data-close="settingsPanel"]').click();
        await tap(hitbox);
        await page.locator("#pinPanel").waitFor({state:"visible",timeout:8000});
        await page.locator("#closePin").click();
        await page.reload({waitUntil:"domcontentloaded"});
        await page.waitForFunction(()=>document.querySelector("#map .pin-icon"),null,{timeout:10000});
        await page.locator("#settingsButton").click();
        assert.equal(await page.locator("#showPinHitboxes").isChecked(),false,
          "The debug visibility switch survives reload independently of the project");
        await page.locator("#showPinHitboxes").check();
        await page.locator('#settingsPanel [data-close="settingsPanel"]').click();
        assert.equal(await hitbox.evaluate(el=>getComputedStyle(el).backgroundColor),
          "rgba(255, 224, 0, 0.55)");
        // Favorites panel is modeless and must preserve all map content.
        const favoriteTrigger=page.locator("#favoritesButton");
        assert.equal(await favoriteTrigger.getAttribute("data-pin-icon"),"star");
        const layerButtonBounds=await page.locator("#layersButton").boundingBox();
        await favoriteTrigger.click();
        assert.equal(await page.locator("#favoritesPanel").isVisible(),true);
        assert.equal(await favoriteTrigger.isVisible(),true,
          "Active favorite trigger remains visible below Layers");
        assert.equal(await favoriteTrigger.getAttribute("aria-expanded"),"true");
        assert.equal(await favoriteTrigger.evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(23, 100, 191)",
          "Expanded menu trigger must be blue");
        const circle=await favoriteTrigger.boundingBox();
        assert.ok(circle&&Math.abs(circle.width-circle.height)<1,
          "Upper-right favorite trigger must be exactly circular");
        assert.ok(layerButtonBounds&&circle.y>layerButtonBounds.y+layerButtonBounds.height,
          "Favorites trigger must be below the Layers control");
        assert.equal(await page.locator(".pin-icon").count(),1);
        assert.equal(await page.locator("#basemapButton").isHidden(),true);
        assert.equal(await page.locator(".pin-zoom-buttons").isHidden(),true);
        assert.equal(await page.locator("#map .leaflet-control-attribution").isVisible(),true);
        const footer=page.locator("#favoritesAdd");
        assert.match(await footer.innerText(),/Ansicht hinzufügen/);
        assert.equal(await footer.locator("svg").count(),1);
        const box=await footer.boundingBox();
        const closeBox=await page.locator("#favoritesCloseBottom").boundingBox();
        assert.ok(box&&box.width>100&&box.height<75,
          "Add action must stay a compact rectangular text button");
        assert.ok(closeBox&&Math.abs(closeBox.y-box.y)<2,
          "Add and Close footer buttons must sit side-by-side");
        assert.equal(await footer.locator("svg").first().getAttribute("class"),"p2m-lucide");

        // New favorite asks for a name and suggests the pin nearest center.
        await footer.click();
        assert.equal(await page.locator(".favorite-confirm").count(),1);
        assert.equal(await page.locator(".favorite-name-input").inputValue(),"Allein");
        await page.locator(".favorite-name-input").fill("Meine Übersicht");
        await page.locator(".favorite-confirm-actions button").last().click();
        assert.equal(await page.locator(".favorite-row").count(),1);
        assert.equal(await page.locator(".favorite-open").first().textContent(),"A");
        assert.equal(await page.locator(".favorite-name").first().textContent(),"Meine Übersicht");
        // Filter substring case-insensitively, keep all original IDs unchanged.
        const search=page.locator("#favoritesSearch");
        const clear=page.locator("#favoritesSearchClear");
        assert.equal(await page.locator(".favorites-head-star svg").count(),1);
        assert.equal(await page.locator(".favorites-head strong").count(),0);
        assert.equal(await clear.getAttribute("data-pin-icon"),"funnel-x");
        assert.equal(await clear.isDisabled(),true);
        await search.fill("ÜBERS");
        assert.equal(await page.locator(".favorite-row").count(),1);
        assert.equal(await page.locator(".favorite-open").first().textContent(),"A");
        assert.equal(await clear.isEnabled(),true);
        assert.equal(await clear.evaluate(el=>getComputedStyle(el).color),"rgb(188, 40, 51)");
        const clearBox=await clear.boundingBox();
        assert.ok(clearBox&&Math.abs(clearBox.width-clearBox.height)<1,
          "The funnel-x reset control remains perfectly circular");
        await search.fill("auss");
        assert.equal(await page.locator(".favorite-row").count(),0);
        assert.match(await page.locator(".favorites-empty").textContent(),/Keine passenden/);
        await clear.click();
        assert.equal(await search.inputValue(),"");
        assert.equal(await clear.isDisabled(),true);
        assert.equal(await page.locator(".favorite-row").count(),1);
        // The letter, name, date and blank row surface ALL activate the
        // saved view. Renaming is reserved for the square-pen button only.
        for(const target of [".favorite-name",".favorite-open",".favorite-date"]){
          await page.locator(target).first().click();
          assert.equal(await page.locator("#favoritesPanel").isHidden(),true,
            target+" must open the view, not the rename editor");
          assert.equal(await page.locator(".favorite-confirm").count(),0);
          await favoriteTrigger.click();
        }
        await page.locator(".favorite-row").first().click({position:{x:135,y:4}});
        assert.equal(await page.locator("#favoritesPanel").isHidden(),true,
          "Clicking a blank part of a favorite row opens the saved view");
        await favoriteTrigger.click();
        assert.match(await page.locator(".favorite-date").first().textContent(),/\d{2}\.\d{2}\.\d{4}/);

        // Any pointer interaction outside the dialog dismisses it.
        await page.locator("#map").click({position:{x:viewport.width/2,y:100}});
        assert.equal(await page.locator("#favoritesPanel").isHidden(),true);
        await favoriteTrigger.click();
        await page.locator("#favoritesCloseBottom").click();
        assert.equal(await page.locator("#favoritesPanel").isHidden(),true);
        assert.equal(await page.locator(".pin-zoom-buttons").isVisible(),true);
        await page.locator(".pin-zoom-button").nth(2).click();
        await page.waitForTimeout(450);
        assert.notEqual(await zoom(page),soloScale,"Zoom+ changes viewport after saving favorite");
        await favoriteTrigger.click();
        await page.locator(".favorite-open").first().click();
        assert.equal(await zoom(page),soloScale,"Favorite A restores saved zoom");
        await page.waitForTimeout(450);
        await page.locator(".pin-zoom-button").first().click();
        assert.notEqual(await zoom(page),soloScale,"Undo returns from favorite to previous map view");
        await page.locator(".pin-zoom-button").nth(1).click();
        assert.equal(await zoom(page),soloScale,"Redo returns to selected favorite");

        // Square-pen edits inside panel. The name is also an edit shortcut.
        await favoriteTrigger.click();
        assert.equal(await page.locator(".favorite-edit").first().getAttribute("data-pin-icon"),"square-pen");
        await page.locator(".favorite-edit").first().click();
        assert.equal(await page.locator(".favorite-name-input").inputValue(),"Meine Übersicht");
        const stacking=await page.evaluate(()=>{
          const star=document.querySelector("#favoritesButton");
          const panel=document.querySelector("#favoritesPanel");
          return {star:Number.parseInt(getComputedStyle(star).zIndex,10),
                  panel:Number.parseInt(getComputedStyle(panel).zIndex,10)};
        });
        assert.ok(stacking.panel>stacking.star,
          "Favorite list and inline editor must stack ABOVE the active star button");
        await page.locator(".favorite-name-input").fill("Umbenannt");
        await page.locator(".favorite-confirm-actions button").last().click();
        assert.equal(await page.locator(".favorite-name").first().textContent(),"Umbenannt");

        // Replacement needs in-panel confirmation and now uses plus.
        assert.equal(await page.locator(".favorite-row .favorite-icon").first().getAttribute("data-pin-icon"),"plus");
        await page.locator(".favorite-row .favorite-icon").first().click();
        assert.equal(await page.locator(".favorite-confirm").count(),1);
        await page.locator(".favorite-confirm-actions button").first().click();
        assert.equal(await page.locator(".favorite-confirm").count(),0);
        await page.locator(".favorite-row .favorite-icon").first().click();
        await page.locator(".favorite-name-input").fill("Ersatz");
        await page.locator(".favorite-confirm-actions button").last().click();
        assert.equal(await page.locator(".favorite-name").first().textContent(),"Ersatz");
        await footer.click();
        await page.locator(".favorite-name-input").fill("Zweiter Platz");
        await page.locator(".favorite-confirm-actions button").last().click();
        assert.equal(await page.locator(".favorite-open").last().textContent(),"B");
        // A filtered B must keep its ORIGINAL index 1 for the edit operation.
        await search.fill("zweiter");
        assert.equal(await page.locator(".favorite-row").count(),1);
        assert.equal(await page.locator(".favorite-open").first().textContent(),"B");
        await page.locator(".favorite-edit").first().click();
        assert.equal(await page.locator(".favorite-name-input").inputValue(),"Zweiter Platz");
        await page.locator(".favorite-confirm-actions button").first().click();
        await clear.click();
        assert.equal(await page.locator(".favorite-row").count(),2);

        // Delete is red and requires explicit in-panel confirmation.
        await page.locator(".favorite-row").first().locator(".favorite-remove").click();
        assert.equal(await page.locator(".favorite-confirm-danger").count(),1);
        assert.match(await page.locator(".favorite-confirm-actions .favorite-action-danger").textContent(),/Löschen/);
        await page.locator(".favorite-confirm-actions button").first().click();
        assert.equal(await page.locator(".favorite-row").count(),2);
        const removeCircle=await page.locator(".favorite-row").first().locator(".favorite-remove").boundingBox();
        assert.ok(removeCircle&&Math.abs(removeCircle.width-removeCircle.height)<1,
          "Favorite row icon buttons must remain perfectly round");
        // Audits ALL visible buttons that present as round: map controls,
        // favorites actions, pin dialog / toolbar and overlay close controls.
        const geometryProblems=await page.evaluate(()=>{
          const roundCandidates=[
            ...document.querySelectorAll("button.p2m-icon-control, .favorite-row .favorite-icon, #favoritesClose")
          ];
          return roundCandidates.filter(el=>{
            const css=getComputedStyle(el),box=el.getBoundingClientRect();
            if(css.display==="none"||css.visibility==="hidden"||
              !box.width||!box.height||!el.getClientRects().length)return false;
            const radius=css.borderTopLeftRadius;
            return radius==="50%"||parseFloat(radius)>=Math.min(box.width,box.height)*.45;
          }).filter(el=>{
            const box=el.getBoundingClientRect();
            return Math.abs(box.width-box.height)>1;
          }).map(el=>({selector:el.id||el.className,width:el.getBoundingClientRect().width,
            height:el.getBoundingClientRect().height}));
        });
        assert.deepEqual(geometryProblems,[],
          "Every visible round control must have equal rendered width and height");
        assert.equal(await page.locator(".favorite-row").first().locator(".favorite-remove").evaluate(
          el=>getComputedStyle(el.querySelector("svg")).color),"rgb(191, 36, 49)",
          "Remove icon itself must be red");
        await page.locator(".favorite-row").first().locator(".favorite-remove").click();
        await page.locator(".favorite-confirm-actions .favorite-action-danger").click();
        assert.equal(await page.locator(".favorite-open").first().textContent(),"A",
          "Removing A renumbers former B to A without gaps");
        assert.equal(await page.locator(".favorite-row").count(),1);
        await page.locator("#favoritesCloseBottom").click();
        await page.waitForTimeout(650);
        await page.reload({waitUntil:"domcontentloaded"});
        await page.waitForFunction(()=>!!document.querySelector(".pin-zoom-buttons"),null,{timeout:10000});
        assert.equal(await page.locator(".pin-zoom-button").first().isEnabled(),true,
          "Local Undo history must survive application restart");
        await favoriteTrigger.click();
        assert.equal(await page.locator(".favorite-row").count(),1,
          "Project favorite must survive application restart");
        assert.equal(await page.locator(".favorite-open").first().textContent(),"A");
        assert.equal(await page.locator(".favorite-name").first().textContent(),"Zweiter Platz");
        const saved=await page.evaluate(async()=>{
          const store=await window.Pin2MapIndexedDBProjectStore.open();
          try{return {project:await store.loadProject(),history:await store.loadViewHistory()};}
          finally{store.close();}
        });
        assert.equal(saved.project.favorites.length,1);
        assert.equal(saved.project.favorites[0].layers[0].id,"private");
        assert.equal(saved.project.favorites[0].name,"Zweiter Platz");
        assert.equal(saved.project.favorites[0].basemap,"street");
        assert.ok(saved.history?.entries.length>0);
        assert.equal(Object.hasOwn(saved.project,"localMapViewHistory"),false,
          "Project sync data must not contain device-specific history");
        // All fifteen active A-O places can be filled, then add is disabled.
        // Existing slots remain editable/replacable at full capacity.
        for(let i=1;i<15;i++){
          await page.locator("#favoritesAdd").click();
          await page.locator(".favorite-name-input").fill("Platz "+String.fromCharCode(65+i));
          await page.locator(".favorite-confirm-actions button").last().click();
        }
        assert.equal(await page.locator(".favorite-row").count(),15);
        assert.equal(await page.locator(".favorite-open").last().textContent(),"O");
        assert.equal(await page.locator("#favoritesAdd").isDisabled(),true);
        assert.equal(await page.locator(".favorite-row").last().locator(".favorite-edit").isEnabled(),true);
        // Simulate a keyboard-shrunken visual area and edit the last row.
        await page.locator(".favorite-row").last().locator(".favorite-edit").click();
        assert.equal(await page.locator("#favoritesPanel.is-editing").count(),1);
        await page.setViewportSize({width:viewport.width,height:390});
        await page.waitForTimeout(280);
        const editorBounds=await page.locator(".favorite-confirm").boundingBox();
        const viewportBounds=await page.locator("#favoritesPanel").boundingBox();
        assert.ok(editorBounds&&viewportBounds&&editorBounds.y>=viewportBounds.y-2&&
          editorBounds.y+Math.min(editorBounds.height,viewportBounds.height-90)<=
          viewportBounds.y+viewportBounds.height+3,
          "Favorite name editor must remain accessible inside reduced keyboard viewport");
        await page.setViewportSize({width:viewport.width,height:viewport.height});
        await page.locator(".favorite-confirm-actions button").first().click();
        await page.locator("#favoritesCloseBottom").click();
        assert.deepEqual(errors,[]);
        console.log("[favorites] PASS",viewport.name,
          "map content retained, save/replace/delete, Undo/Redo, restart persistence");
        console.log("[overlap] PASS",viewport.name,
          "tap zoom, second tap selection, exact-coordinates chooser, isolated pin");
      }finally{await context.close();}
    }
  }finally{await browser.close();}
})().catch(e=>{console.error("[overlap] FAIL",e.stack||e);process.exitCode=1;});
