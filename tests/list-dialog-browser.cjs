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
    await page.locator("#layersSearch").fill("CONTRACT");
    assert.equal(await page.locator("#layersList .list-dialog-row:visible").count(),1);
    await page.locator("#layersSearchClear").click();
    assert.equal(await page.locator("#layersList .list-dialog-row:visible").count(),originalLayerCount+1,
      "Reset restores both existing project layers and the newly created layer");
    await layer.getByRole("button",{name:"Ebene oder ihre Objekte löschen"}).click();
    const deleteDialog=page.locator("#layersList .favorite-confirm-danger");
    assert.equal(await deleteDialog.isVisible(),true);
    assert.equal(await deleteDialog.getByRole("button",{name:"Die Ebene als Ganzes"}).count(),1);
    await deleteDialog.getByRole("button",{name:"Abbrechen"}).click();
    await page.locator("#layersCloseBottom").click();
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
