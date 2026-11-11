"use strict";
/* Test the published preview, not only the source checkout.
   A blank map in an otherwise visible UI must fail deployment validation. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const base=(process.env.PIN2MAP_LIVE_PREVIEW||"").replace(/\/+$/,"")+"/";
if(!/^https:\/\//.test(base))throw Error("Set PIN2MAP_LIVE_PREVIEW");
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.PIN2MAP_CHROMIUM_EXECUTABLE?{executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE}:{})});
  try{
    // Approved reference covers phone, tablet and desktop. Each is checked
    // against the *published* app; tracking-query reload is checked on phone.
    const targets=[
      {name:"phone",viewport:{width:390,height:844},variant:""},
      {name:"phone-tracking-url",viewport:{width:390,height:844},variant:"?utm_source=chatgpt.com"},
      {name:"tablet",viewport:{width:820,height:1180},variant:""},
      {name:"desktop",viewport:{width:1280,height:800},variant:""}
    ];
    for(const {name,viewport,variant} of targets){
      const context=await browser.newContext({viewport,serviceWorkers:"allow"});
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
        // Live acceptance of the search-results UI, not just a successful map start.
        // Use a local view instance: no geocoder requests or persisted pin changes.
        const searchContract=await page.evaluate(()=>{
          const host=document.getElementById("searchResults");
          const view=new window.Pin2MapSearchResultsView({
            container:host,document,
            onChoose:()=>{},titleOf:r=>r.name,detailOf:r=>r.detail
          });
          view.show([{name:"Stuttgart",detail:"Deutschland"},{name:"Stuttgart",detail:"USA"}]);
          const search=document.getElementById("searchForm").getBoundingClientRect();
          const list=host.getBoundingClientRect();
          const result={
            searchWidth:search.width,searchHeight:search.height,listWidth:list.width,
            searchX:search.x,listX:list.x,
            hasHeader:!!host.querySelector(".results-head"),
            footerLast:host.lastElementChild?.classList.contains("results-footer"),
            cancelText:host.querySelector(".results-footer button")?.textContent,
            count:host.querySelectorAll(".result").length
          };
          view.hide();
          return result;
        });
        assert.equal(searchContract.hasHeader,false,"Published search list must not show old gray header");
        assert.equal(searchContract.footerLast,true,"Published cancel must be last in results");
        assert.equal(searchContract.cancelText,"Abbrechen");
        assert.equal(searchContract.count,2);
        const endcap=Math.min(searchContract.searchWidth,searchContract.searchHeight)/2;
        assert.ok(Math.abs((searchContract.searchWidth-2*endcap)-searchContract.listWidth)<=3,
          "Published results must match straight horizontal lines of pill: "+JSON.stringify(searchContract));
        assert.ok(Math.abs((searchContract.searchX+endcap)-searchContract.listX)<=3,
          "Results must begin at left straight-line endpoint: "+JSON.stringify(searchContract));

        // Verify actual rendered mobile layout, not just CSS source rules.
        const geometry=await page.evaluate(()=>{
          const rect=id=>{
            const node=document.getElementById(id);
            const box=node.getBoundingClientRect();
            return {x:box.x,y:box.y,right:box.right,bottom:box.bottom,
                    width:box.width,height:box.height};
          };
          const attribution=document.querySelector(".leaflet-control-attribution");
          const a=attribution?.getBoundingClientRect();
          return {
            settings:rect("settingsButton"),layers:rect("layersButton"),
            search:rect("searchForm"),info:rect("labelsToggle"),
            basemap:rect("basemapButton"),
            attribution:a?{x:a.x,y:a.y,right:a.right,bottom:a.bottom,
              width:a.width,height:a.height,visible:getComputedStyle(attribution).display!=="none"}:null,
            window:{width:innerWidth,height:innerHeight}
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
        assert.ok(geometry.attribution?.visible&&geometry.attribution.height>0,
          "Leaflet/OSM attribution must remain visible: "+JSON.stringify(geometry));
        assert.ok(geometry.attribution.bottom<=geometry.window.height+3,
          "Attribution must not fall below viewport: "+JSON.stringify(geometry));
        assert.ok(geometry.attribution.y>=geometry.basemap.bottom-5,
          "Attribution must remain below bottom map controls: "+JSON.stringify(geometry));
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
        console.log("PASS live map startup, controls, attribution and reload:",name,url);
      }finally{await context.close();}
    }
  }finally{await browser.close();}
})().catch(error=>{console.error("Live map startup FAIL:",error);process.exitCode=1;});
