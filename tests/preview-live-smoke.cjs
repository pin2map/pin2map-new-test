"use strict";
/* Test the published preview, not only the source checkout.
   A blank map in an otherwise visible UI must fail deployment validation. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const base=(process.env.PIN2MAP_LIVE_PREVIEW||"").replace(/\/+$/,"")+"/";
if(!/^https:\/\//.test(base))throw Error("Set PIN2MAP_LIVE_PREVIEW");
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const variant of ["","?utm_source=chatgpt.com"]){
      const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"allow"});
      try{
        const page=await context.newPage(),errors=[];
        page.on("pageerror",error=>errors.push(error.message));
        const url=base+variant;
        await page.goto(url,{waitUntil:"domcontentloaded",timeout:35000});
        await page.waitForFunction(()=>Boolean(window.L)&&
          document.querySelector("#map.leaflet-container")&&
          document.querySelectorAll(".pin-zoom-button").length===3,
          null,{timeout:22000});
        const loaded=await page.evaluate(()=>({
          leaflet:!!window.L,zoomButtons:document.querySelectorAll(".pin-zoom-button").length,
          map:!!document.querySelector("#map.leaflet-container")
        }));
        assert.equal(loaded.zoomButtons,3);
        assert.equal(loaded.map,true);
        assert.deepEqual(errors,[],"Browser JS errors: "+errors.join("; "));
        // Verify actual rendered mobile layout, not just CSS source rules.
        const geometry=await page.evaluate(()=>{
          const rect=id=>{
            const node=document.getElementById(id);
            const box=node.getBoundingClientRect();
            return {x:box.x,y:box.y,right:box.right,bottom:box.bottom,
                    width:box.width,height:box.height};
          };
          return {
            settings:rect("settingsButton"),layers:rect("layersButton"),
            search:rect("searchForm"),info:rect("labelsToggle"),
            basemap:rect("basemapButton")
          };
        });
        assert.ok(Math.abs(geometry.settings.y-geometry.layers.y)<=2,
          "Settings and Layers must share the top baseline: "+JSON.stringify(geometry));
        assert.ok(geometry.settings.right<=geometry.search.x+2,
          "Search must not overlap Settings: "+JSON.stringify(geometry));
        assert.ok(geometry.search.right<=geometry.layers.x+2,
          "Search must not overlap Layers: "+JSON.stringify(geometry));
        assert.ok(Math.abs(geometry.info.x-geometry.basemap.x)<=2,
          "Info and Map must be stacked at the same right position");
        assert.ok(geometry.info.bottom<=geometry.basemap.y-4,
          "Info must sit above Map, without overlap");
        await page.locator("#layersButton").click();
        await assert.equal(await page.locator("#layersPanel").isVisible(),true);
        const panelPosition=await page.evaluate(()=>{
          const panel=document.getElementById("layersPanel").getBoundingClientRect();
          const button=document.getElementById("layersButton").getBoundingClientRect();
          return {panelY:panel.y,buttonBottom:button.bottom,
                  panelRight:panel.right,buttonRight:button.right};
        });
        assert.ok(panelPosition.panelY>=panelPosition.buttonBottom,
          "Layers panel must open below its trigger");
        assert.ok(Math.abs(panelPosition.panelRight-panelPosition.buttonRight)<=2,
          "Layers panel must align to the trigger's right edge");
        await page.locator("#layersButton").click();
        assert.equal(await page.locator("#layersPanel").isVisible(),false);

        const sw=await page.evaluate(async()=>{
          const registration=await navigator.serviceWorker.ready;
          return !!registration.active;
        });
        assert.equal(sw,true);
        await page.reload({waitUntil:"domcontentloaded"});
        await page.waitForFunction(()=>Boolean(window.L)&&
          document.querySelector("#map.leaflet-container")&&
          document.querySelectorAll(".pin-zoom-button").length===3,
          null,{timeout:22000});
        assert.deepEqual(errors,[],"Errors after reload: "+errors.join("; "));
        console.log("PASS live map startup and reload:",url);
      }finally{await context.close();}
    }
  }finally{await browser.close();}
})().catch(error=>{console.error("Live map startup FAIL:",error);process.exitCode=1;});
