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
