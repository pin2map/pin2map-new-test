"use strict";
/* Isolated real-Chromium contract checks. The two list dialogs must share
 * filtering, inline actions, blue/white toggles and mobile keyboard layout. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const base=process.env.PIN2MAP_TEST_URL||"http://127.0.0.1:8765/";
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PIN2MAP_CHROMIUM_EXECUTABLE?
  {executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE}:{})});
 try{
  for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
   const context=await browser.newContext({viewport,hasTouch:viewport.width<=390,
    isMobile:viewport.width<=390,serviceWorkers:"block"});
   const errors=[];
   try{
    const page=await context.newPage();
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto(base,{waitUntil:"domcontentloaded",timeout:35000});
    await page.waitForSelector("#map.leaflet-container",{timeout:20000});
    await page.waitForFunction(()=>!!document.querySelector(".pin-zoom-buttons"),null,{timeout:20000});
    await page.locator("#favoritesButton").click();
    await page.locator("#favoritesPanel").waitFor({state:"visible"});
    await page.locator("#favoritesAdd").click();
    const add=page.locator("#favoritesList .favorite-confirm");
    await add.locator(".favorite-name-input").fill("Contract Test Favorite");
    await add.getByRole("button",{name:"Speichern"}).click();
    const favorite=page.locator("#favoritesList .list-dialog-row").filter({hasText:"Contract Test Favorite"});
    await favorite.waitFor({state:"visible"});
    await favorite.getByRole("button",{name:"Favorit umbenennen"}).click();
    const editButton=favorite.getByRole("button",{name:"Favorit umbenennen"});
    const editStyle=await editButton.evaluate(el=>{
     const cs=getComputedStyle(el);return {bg:cs.backgroundColor,color:cs.color,icon:getComputedStyle(el.querySelector("svg")).stroke};
    });
    assert.equal(await editButton.getAttribute("aria-pressed"),"true");
    assert.equal(editStyle.bg,"rgb(23, 100, 191)",JSON.stringify({viewport,editStyle}));
    assert.equal(editStyle.color,"rgb(255, 255, 255)",JSON.stringify({viewport,editStyle}));
    await editButton.click();
    assert.equal(await page.locator("#favoritesList .favorite-confirm").count(),0);
    for(const action of ["Favorit löschen","Favorit durch aktuelle Ansicht ersetzen"]){
     const button=favorite.getByRole("button",{name:action});
     await button.click();
     const colors=await button.evaluate(el=>{
      const css=getComputedStyle(el),icon=getComputedStyle(el.querySelector("svg"));
      return {background:css.backgroundColor,foreground:css.color,stroke:icon.stroke};
     });
     assert.equal(await button.getAttribute("aria-pressed"),"true");
     assert.equal(colors.background,"rgb(23, 100, 191)",JSON.stringify({action,colors}));
     assert.equal(colors.foreground,"rgb(255, 255, 255)",JSON.stringify({action,colors}));
     assert.equal(colors.stroke,"rgb(255, 255, 255)",JSON.stringify({action,colors}));
     await button.click();
     assert.equal(await page.locator("#favoritesList .favorite-confirm").count(),0);
    }
    const search=page.locator("#favoritesSearch");
    await search.fill("not-existing-entry");
    assert.equal(await page.locator("#favoritesList .favorite-row:visible").count(),0);
    assert.equal(await page.locator("#favoritesList .favorite-delete-all:visible").count(),0);
    await page.locator("#favoritesSearchClear").click();
    assert.equal(await page.locator("#favoritesList .favorite-row:visible").count(),1);
    assert.equal(await search.evaluate(el=>document.activeElement===el),true);
    await page.locator("#favoritesClose").click();
    await page.locator("#layersButton").click();
    const panel=page.locator("#layersPanel");
    await panel.waitFor({state:"visible"});
    const originalLayerCount=await page.locator("#layersList .list-dialog-row:visible").count();
    const privateRow=page.locator("#layersList .list-dialog-row").filter({hasText:"Privat"});
    assert.equal(await privateRow.count(),1);
    assert.equal(await privateRow.getByRole("button",{name:"Ebene bearbeiten"}).count(),0);
    assert.equal(await privateRow.locator(".layer-merge-check").isEnabled(),true);
    assert.equal(await page.locator("#layersButton").getAttribute("aria-pressed"),"true");
    assert.equal(await page.locator("#layersSearch").evaluate(el=>
      getComputedStyle(el).borderTopLeftRadius),"7px");
    assert.equal(await page.locator("#layersVisibilityCycle").isVisible(),true);
    const helper=page.locator("#layersHelpers");
    assert.equal(await helper.isVisible(),true);
    assert.match(await helper.textContent(),/Halten und verschieben für neue Position/);
    assert.match(await helper.textContent(),/Markieren zum Zusammenführen/);
    assert.equal(await page.locator("#layersHelpers > #layersUnite").count(),1);
    assert.equal(await page.locator("#layersPanel .favorites-head #layersUnite").count(),0);
    assert.equal(await page.locator("#layersSearchClear").isVisible(),true,
      "Filter-clear action is never replaced by Merge");
    assert.equal(await helper.evaluate(el=>getComputedStyle(el).minHeight),"38px");
    // The original CSS-only test missed the button's final computed radius.
    for(const selector of ["#addLayer","#layersCloseBottom"]){
     const radius=await page.locator(selector).evaluate(el=>parseFloat(getComputedStyle(el).borderTopLeftRadius));
     assert.ok(radius<=8,"Text action must remain rectangular: "+selector+" radius "+radius);
    }
    const dialogAboveLauncher=await page.locator("#layersPanel").evaluate(panel=>{
     const launcher=document.querySelector("#favoritesButton");
     return Number(getComputedStyle(panel).zIndex)>Number(getComputedStyle(launcher).zIndex);
    });
    assert.equal(dialogAboveLauncher,true,"Dialog must paint above map launchers");
    const firstVisibleLayer=page.locator("#layersList .list-dialog-row").filter({hasText:"Ebene 1"});
    const eyeBefore=await firstVisibleLayer.locator(".layer-eye").getAttribute("class");
    await firstVisibleLayer.locator(".favorite-name").click();
    assert.equal(await firstVisibleLayer.locator(".layer-eye").getAttribute("class"),eyeBefore,
      "Text tap must never toggle a layer's visibility");
    await firstVisibleLayer.locator(".layer-eye").click();
    assert.notEqual(await firstVisibleLayer.locator(".layer-eye").getAttribute("class"),eyeBefore,
      "Only an explicit eye tap toggles visibility");
    await firstVisibleLayer.locator(".layer-eye").click();
    assert.equal(await firstVisibleLayer.locator(".layer-eye").getAttribute("class"),eyeBefore);
    const coloredCircle=firstVisibleLayer.locator(".layer-color-checkbox");
    assert.equal(await coloredCircle.count(),1);
    assert.equal(await coloredCircle.locator("input[type=checkbox]").count(),1);
    assert.notEqual(await coloredCircle.evaluate(el=>el.style.backgroundColor),"");
    assert.equal(await coloredCircle.evaluate(el=>getComputedStyle(el).borderTopColor),
      "rgba(0, 0, 0, 0)","Colored checkbox circle must have no frame");
    assert.equal(await coloredCircle.locator(".layer-merge-check").evaluate(el=>
      getComputedStyle(el).borderTopWidth),"0px",
      "The white checkbox square must also have no gray border");
    const visibleBefore=await page.locator("#layersList .layer-eye").evaluateAll(
      buttons=>buttons.map(b=>b.classList.contains("is-visible")));
    await page.locator("#layersVisibilityCycle").click();
    const inverted=await page.locator("#layersList .layer-eye").evaluateAll(
      buttons=>buttons.map(b=>b.classList.contains("is-visible")));
    assert.deepEqual(inverted,visibleBefore.map(x=>!x));
    await page.locator("#layersVisibilityCycle").click();
    assert.equal(await page.locator("#layersList .layer-eye.is-invisible").count(),0);
    await page.locator("#layersVisibilityCycle").click();
    assert.equal(await page.locator("#layersList .layer-eye.is-visible").count(),0);
    await page.locator("#layersVisibilityCycle").click();
    const restored=await page.locator("#layersList .layer-eye").evaluateAll(
      buttons=>buttons.map(b=>b.classList.contains("is-visible")));
    assert.deepEqual(restored,visibleBefore);
    await page.locator("#addLayer").click();
    const editor=page.locator("#layersList .favorite-confirm");
    await editor.waitFor({state:"visible"});
    assert.equal(await editor.locator(".layer-editor-title").textContent(),"Neue Ebene erstellen:");
    assert.equal(await editor.locator(".layer-name-caption").textContent(),"Farbe und Name der Ebene:");
    const defaultName=await editor.locator(".favorite-name-input").inputValue();
    assert.equal(await editor.getByRole("button",{name:"Abbrechen"}).evaluate(el=>
      getComputedStyle(el).backgroundColor),"rgb(234, 243, 255)",
      "New layer cancellation must be light blue");
    assert.equal(await editor.getByRole("button",{name:"Erstellen"}).evaluate(el=>
      getComputedStyle(el).backgroundColor),"rgb(23, 100, 191)",
      "New layer creation must be blue");
    const editorHeight=await editor.evaluate(el=>el.getBoundingClientRect().height);
    const bottomHeight=await editor.locator(".layer-editor-bottom").evaluate(el=>el.getBoundingClientRect().height);
    assert.match(defaultName,/^Ebene \d+$/);
    await editor.locator(".layer-swatch").click();
    assert.equal(await editor.locator(".layer-palette-choice .layer-palette-dot").count(),12);
    assert.ok(Math.abs((await editor.evaluate(el=>el.getBoundingClientRect().height))-editorHeight)<1,
      "Changing to palette must not change new-layer editor height");
    assert.equal(await editor.locator(".layer-editor-bottom").evaluate(el=>el.getBoundingClientRect().height),bottomHeight);
    assert.equal(await editor.getByRole("button",{name:"Erstellen"}).isVisible(),false);
    await editor.locator(".layer-palette-dot").nth(2).click();
    assert.equal(await editor.getByRole("button",{name:"Erstellen"}).isVisible(),true);
    assert.ok(Math.abs((await editor.evaluate(el=>el.getBoundingClientRect().height))-editorHeight)<1,
      "Returning from palette must preserve editor height");
    await editor.locator(".favorite-name-input").fill("Contract Test Layer");
    await editor.getByRole("button",{name:"Erstellen"}).click();
    const layer=page.locator("#layersList .list-dialog-row").filter({hasText:"Contract Test Layer"});
    await layer.waitFor({state:"visible"});
    assert.deepEqual(await page.locator("#layersList .list-dialog-row").evaluateAll(
      rows=>rows.slice(0,3).map(row=>row.dataset.itemId)),
      [await privateRow.getAttribute("data-item-id"),await layer.getAttribute("data-item-id"),
       await page.locator("#layersList .list-dialog-row").nth(2).getAttribute("data-item-id")],
      "New layer appears directly under Private");
    assert.equal(await page.locator("#layersList .list-dialog-row").nth(1).getAttribute("data-item-id"),
      await layer.getAttribute("data-item-id"),"Created layer inserted at index 1");
    await layer.getByRole("button",{name:"Ebene bearbeiten"}).click();
    const renameEditor=page.locator("#layersList .layer-inline-editor");
    assert.equal(await renameEditor.locator(".layer-editor-title").textContent(),"Ebene umbenennen?");
    assert.equal(await renameEditor.locator(".layer-name-caption").textContent(),"Farbe und Name der Ebene:");
    const renameHeight=await renameEditor.evaluate(el=>el.getBoundingClientRect().height);
    await renameEditor.locator(".layer-swatch").click();
    assert.ok(Math.abs((await renameEditor.evaluate(el=>el.getBoundingClientRect().height))-renameHeight)<1,
      "Renaming palette must never resize the editor");
    await renameEditor.locator(".layer-palette-dot").first().click();
    assert.ok(Math.abs((await renameEditor.evaluate(el=>el.getBoundingClientRect().height))-renameHeight)<1);
    assert.equal(await layer.getByRole("button",{name:"Ebene bearbeiten"}).getAttribute("aria-pressed"),"true");
    await layer.getByRole("button",{name:"Ebene bearbeiten"}).click();
    assert.equal(await page.locator("#layersList .favorite-confirm").count(),0);
    // Private may be a source but not a target. The top search-reset
    // stays intact; Merge only exists beside the visibility eye.
    await privateRow.locator(".layer-merge-check").check();
    await layer.locator(".layer-merge-check").check();
    assert.equal(await page.locator("#layersHelpers > #layersUnite").isVisible(),true);
    assert.equal(await page.locator("#layersSearchClear").isVisible(),true);
    const helperBounds=await page.locator("#layersVisibilityCycle").boundingBox();
    const uniteBounds=await page.locator("#layersUnite").boundingBox();
    assert.ok(uniteBounds.x>=helperBounds.x+helperBounds.width-1,
      "Merge control appears right of the visibility cycle");
    await page.locator("#layersUnite").click();
    assert.equal(await page.locator("#layersHelpers").isHidden(),true);
    const mergeGuide=page.locator("#layersList .layer-merge-guidance");
    assert.equal(await mergeGuide.locator("button").count(),0,
      "No redundant inline Merge/Cancel buttons");
    assert.equal(await mergeGuide.locator("p").first().textContent(),
      "Alle Objekte aus den gewählten Ebenen sollen verschoben werden in die Ebene (bitte anklicken):");
    assert.ok((await mergeGuide.locator("p").first().evaluate(el=>
      parseFloat(getComputedStyle(el).fontSize)))<=13.1,"Merge guidance text must be compact");
    assert.equal(await page.locator("#addLayer").textContent(),"Zusammenführen");
    assert.equal(await page.locator("#addLayer").isDisabled(),true,
      "Cannot merge until a destination was explicitly chosen");
    assert.equal(await page.locator("#layersCloseBottom").textContent(),"Abbrechen");
    assert.equal(await page.locator("#layersList .list-dialog-row").count(),1);
    assert.equal(await privateRow.count(),0);
    // Footer cancel leaves the parent Layers dialog open and preserves
    // all source rows without merging anything.
    await page.locator("#layersCloseBottom").click();
    assert.equal(await panel.isVisible(),true);
    assert.equal(await page.locator("#addLayer").textContent(),"+ Ebene hinzufügen");
    assert.equal(await privateRow.count(),1);
    await privateRow.locator(".layer-merge-check").uncheck();
    await layer.locator(".layer-merge-check").uncheck();
    await page.locator("#layersSearch").fill("CONTRACT");
    assert.equal(await page.locator("#layersList .list-dialog-row:visible").count(),1);
    await page.locator("#layersSearchClear").click();
    assert.equal(await page.locator("#layersList .list-dialog-row:visible").count(),originalLayerCount+1,
      "Reset restores both existing project layers and the newly created layer");
    const firstLayer=page.locator("#layersList .list-dialog-row").filter({hasText:"Ebene 1"});
    await firstLayer.locator(".layer-merge-check").check();
    await layer.locator(".layer-merge-check").check();
    assert.equal(await page.locator("#layersUnite").isVisible(),true);
    await page.locator("#layersUnite").click();
    assert.equal(await page.locator("#layersList .list-dialog-row").count(),2);
    assert.equal(await privateRow.count(),0);
    await page.locator("#layersList .list-dialog-row").filter({hasText:"Contract Test Layer"})
      .getByRole("button",{name:"Contract Test Layer"}).click();
    assert.equal(await page.locator("#addLayer").textContent(),"Zusammenführen");
    assert.equal(await page.locator("#addLayer").isEnabled(),true);
    assert.equal(await page.locator("#layersList .layer-merge-guidance button").count(),0);
    await page.locator("#layersCloseBottom").click();
    assert.equal(await panel.isVisible(),true);
    await firstLayer.locator(".layer-merge-check").uncheck();
    await layer.locator(".layer-merge-check").uncheck();
    await layer.getByRole("button",{name:"Ebene oder ihre Objekte löschen"}).click();
    const deleteDialog=page.locator("#layersList .favorite-confirm-danger");
    assert.equal(await deleteDialog.isVisible(),true);
    assert.equal(await deleteDialog.getByRole("button",{name:"Die Ebene als Ganzes"}).count(),1);
    assert.equal(await deleteDialog.getByRole("button",{name:"Abbrechen"}).evaluate(el=>
      getComputedStyle(el).backgroundColor),"rgb(255, 224, 223)",
      "Delete cancellation must be soft red");
    await deleteDialog.getByRole("button",{name:"Abbrechen"}).click();
    // End-to-end confirmation: only the selected target survives, including reload.
    await firstLayer.locator(".layer-merge-check").check();
    await layer.locator(".layer-merge-check").check();
    await page.locator("#layersUnite").click();
    await layer.getByRole("button",{name:"Contract Test Layer"}).click();
    assert.equal(await page.locator("#addLayer").textContent(),"Zusammenführen");
    assert.equal(await page.locator("#addLayer").isEnabled(),true);
    await page.locator("#addLayer").click();
    assert.equal(await page.locator("#addLayer").textContent(),"+ Ebene hinzufügen");
    assert.equal(await panel.isVisible(),true);
    assert.equal(await firstLayer.count(),0,"Source layer must be removed");
    assert.equal(await layer.count(),1,"Chosen target layer remains");
    assert.equal(await privateRow.count(),1,"Private remains untouched");
    await page.waitForFunction(async()=>{
      const db=await window.Pin2MapIndexedDBProjectStore.open();
      try{
        const names=(await db.loadProject()).layers.map(l=>l.name);
        return !names.includes("Ebene 1")&&names.includes("Contract Test Layer")&&names.includes("Privat");
      }finally{db.close();}
    },null,{timeout:10000});
    // Wait beyond the existing 300ms debounced save, then verify the durable record.
    await page.waitForTimeout(600);
    const persistedLayers=await page.evaluate(async()=>{
      const db=await window.Pin2MapIndexedDBProjectStore.open();
      try{return (await db.loadProject()).layers.map(l=>l.name);}finally{db.close();}
    });
    assert.equal(persistedLayers.includes("Ebene 1"),false,JSON.stringify(persistedLayers));
    assert.equal(persistedLayers.includes("Contract Test Layer"),true);
    assert.equal(persistedLayers.includes("Privat"),true);
    // Holding a layer for 450ms activates small rows and a centered gap marker.
    if(viewport.width>500){
      await page.locator("#addLayer").click();
      const addAgain=page.locator("#layersList .favorite-confirm");
      await addAgain.locator(".layer-swatch").click();
      await addAgain.locator(".layer-palette-dot").first().click();
      await addAgain.locator(".favorite-name-input").fill("Reorder Demo");
      await addAgain.getByRole("button",{name:"Erstellen"}).click();
      const source=page.locator("#layersList .list-dialog-row")
        .filter({hasText:"Reorder Demo"}).locator(".favorite-name");
      const target=page.locator("#layersList .list-dialog-row")
        .filter({hasText:"Contract Test Layer"}).locator(".favorite-name");
      const a=await source.boundingBox(),b=await target.boundingBox();
      await page.mouse.move(a.x+a.width/2,a.y+a.height/2);
      await page.mouse.down();
      await page.waitForTimeout(510);
      assert.equal(await page.locator("#layersList").evaluate(el=>
        el.classList.contains("list-reorder-active")),true);
      await page.mouse.move(b.x+b.width/2,b.y+4,{steps:5});
      assert.equal(await page.locator(".list-reorder-insert").count(),1);
      const centered=await page.locator("#layersList .list-reorder-insert").evaluate(marker=>{
       const siblings=[...document.querySelectorAll("#layersList .list-dialog-row:not(.list-reorder-source)")];
       const y=marker.getBoundingClientRect().top+marker.getBoundingClientRect().height/2;
       const before=siblings.filter(el=>el.getBoundingClientRect().bottom<=y).at(-1);
       const after=siblings.find(el=>el.getBoundingClientRect().top>=y);
       return before&&after?Math.abs((y-before.getBoundingClientRect().bottom)-
         (after.getBoundingClientRect().top-y)):null;
      });
      assert.ok(centered!==null&&centered<=2,
        "Insertion marker must bisect a real gap between two adjacent rows");
      await page.mouse.up();
      assert.equal(await page.locator("#layersList").evaluate(el=>
        el.classList.contains("list-reorder-active")),false);
    }
    await page.locator("#layersCloseBottom").click();
    assert.equal(await page.locator("#layersButton").getAttribute("aria-pressed"),"false");
    await page.locator("#settingsButton").click();
    await page.locator("#settingsColorsTab").click();
    assert.equal(await page.locator("#standardColorGrid .settings-color-item").count(),12);
    assert.equal(await page.locator("#signalColorGrid .settings-color-item").count(),3);
    const first=page.locator("#standardColorGrid .settings-color-hex").first();
    assert.equal(await first.inputValue(),"#2563EB");
    await first.fill("#112233");await first.press("Tab");
    assert.equal(await first.inputValue(),"#112233");
    assert.deepEqual(errors,[],"Uncaught errors "+errors.join("; "));
    console.log("PASS shared Favorites/Layers dialog contracts",viewport.width+"x"+viewport.height);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
