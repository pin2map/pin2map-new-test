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
    assert.match(await helper.textContent(),/Zum verschieben einer Ebene/);
    assert.equal(await helper.evaluate(el=>getComputedStyle(el).minHeight),"38px");
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
    const defaultName=await editor.locator(".favorite-name-input").inputValue();
    assert.match(defaultName,/^Ebene \d+$/);
    await editor.locator(".layer-swatch").click();
    assert.equal(await editor.locator(".layer-palette-choice .layer-palette-dot").count(),12);
    assert.equal(await editor.getByRole("button",{name:"Erstellen"}).isVisible(),false);
    await editor.locator(".layer-palette-dot").nth(2).click();
    assert.equal(await editor.getByRole("button",{name:"Erstellen"}).isVisible(),true);
    await editor.locator(".favorite-name-input").fill("Contract Test Layer");
    await editor.getByRole("button",{name:"Erstellen"}).click();
    const layer=page.locator("#layersList .list-dialog-row").filter({hasText:"Contract Test Layer"});
    await layer.waitFor({state:"visible"});
    await layer.getByRole("button",{name:"Ebene bearbeiten"}).click();
    assert.equal(await layer.getByRole("button",{name:"Ebene bearbeiten"}).getAttribute("aria-pressed"),"true");
    await layer.getByRole("button",{name:"Ebene bearbeiten"}).click();
    assert.equal(await page.locator("#layersList .favorite-confirm").count(),0);
    // Private can be marked as source, but never appears among target choices.
    await privateRow.locator(".layer-merge-check").check();
    await layer.locator(".layer-merge-check").check();
    await page.locator("#layersUnite").click();
    assert.equal(await page.locator("#layersHelpers").isHidden(),true);
    const mergeGuide=page.locator("#layersList .layer-merge-guidance");
    assert.equal(await mergeGuide.locator(":scope > :first-child").textContent(),"Abbrechen");
    assert.equal(await mergeGuide.locator("p").first().textContent(),
      "Alle Objekte aus den gewählten Ebenen sollen verschoben werden in die Ebene (bitte anklicken):");
    assert.equal(await page.locator("#layersList .list-dialog-row").count(),1);
    assert.equal(await privateRow.count(),0);
    await page.locator("#layersList .layer-merge-guidance")
      .getByRole("button",{name:"Abbrechen"}).click();
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
    assert.equal(await page.getByRole("button",{name:"Zusammenführen"}).count(),1);
    await page.locator("#layersList .layer-merge-guidance").getByRole("button",{name:"Abbrechen"}).click();
    await firstLayer.locator(".layer-merge-check").uncheck();
    await layer.locator(".layer-merge-check").uncheck();
    await layer.getByRole("button",{name:"Ebene oder ihre Objekte löschen"}).click();
    const deleteDialog=page.locator("#layersList .favorite-confirm-danger");
    assert.equal(await deleteDialog.isVisible(),true);
    assert.equal(await deleteDialog.getByRole("button",{name:"Die Ebene als Ganzes"}).count(),1);
    await deleteDialog.getByRole("button",{name:"Abbrechen"}).click();
    // End-to-end confirmation: only the selected target survives, including reload.
    await firstLayer.locator(".layer-merge-check").check();
    await layer.locator(".layer-merge-check").check();
    await page.locator("#layersUnite").click();
    await layer.getByRole("button",{name:"Contract Test Layer"}).click();
    await page.locator("#layersList .layer-merge-guidance")
      .getByRole("button",{name:"Zusammenführen"}).click();
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
    // Long-press on a layer name activates the shared reorder indicator.
    if(viewport.width>500){
      await page.locator("#addLayer").click();
      const addAgain=page.locator("#layersList .favorite-confirm");
      await addAgain.locator(".layer-swatch").click();
      await addAgain.locator(".layer-palette-dot").first().click();
      await addAgain.locator(".favorite-name-input").fill("Reorder Demo");
      await addAgain.getByRole("button",{name:"Erstellen"}).click();
      const source=page.locator("#layersList .list-dialog-row")
        .filter({hasText:"Contract Test Layer"}).locator(".favorite-name");
      const target=page.locator("#layersList .list-dialog-row")
        .filter({hasText:"Reorder Demo"}).locator(".favorite-name");
      const a=await source.boundingBox(),b=await target.boundingBox();
      await page.mouse.move(a.x+a.width/2,a.y+a.height/2);
      await page.mouse.down();
      // Layers now activate on movement, never by waiting 480ms.
      await page.mouse.move(a.x+a.width/2,a.y+a.height/2+14,{steps:4});
      assert.equal(await page.locator("#layersList").evaluate(el=>
        el.classList.contains("list-reorder-active")),true);
      assert.equal(await page.locator(".list-reorder-insert").count(),1);
      await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:5});
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
