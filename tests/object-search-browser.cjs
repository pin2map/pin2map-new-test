"use strict";
/* v275 live gate: predecessor-style compact object-search and immediate filtering. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const base=process.env.PIN2MAP_TEST_URL||
 "https://pin2map.github.io/pin2map-new-test/preview/";
(async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE||undefined,args:["--no-sandbox"]});
 try{
  for(const width of [320,375,390,1280]){
   const height=width===320?568:width===375?667:width===390?844:800;
   const context=await browser.newContext({viewport:{width,height},serviceWorkers:"block"});
   const page=await context.newPage(),errors=[];
   page.on("pageerror",err=>errors.push(err.message));
   try{
    await page.goto(base,{waitUntil:"domcontentloaded",timeout:35000});
    await page.waitForFunction(()=>document.documentElement.dataset.pin2mapReady==="true",null,{timeout:30000});
    await page.evaluate(async()=>{
     const dbName=location.pathname.includes("/preview/")?"pin2map-new-preview-v1":"pin2map-new-v1";
     const state=window.Pin2MapProjectModel.defaultProject();
     state.layers[1].visible=false;
     const d=new Date(),y=new Date(d.getFullYear(),d.getMonth(),d.getDate()-1,12).toISOString();
     const today=new Date(d.getFullYear(),d.getMonth(),d.getDate(),12).toISOString();
     state.pins=[
      {id:"search-today",name:"Karlsruhe Bahnhof",lat:49.01,lng:8.405,layerId:"layer-1",note:"",url:"",createdAt:today,updatedAt:today},
      {id:"search-yesterday",name:"Berlin Mitte",lat:52.52,lng:13.4,layerId:"layer-1",note:"",url:"",createdAt:y,updatedAt:today}
     ];
     state.areas=[{id:"search-area",name:"Karlsruhe Testgebiet",layerId:"layer-1",kind:"area",createdAt:today,
      geometry:{type:"Polygon",coordinates:[[[8.4,49],[8.41,49],[8.41,49.01],[8.4,49]]]},note:"",url:""}];
     const db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open(dbName,1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
     });
     await new Promise((resolve,reject)=>{
      const tx=db.transaction("kv","readwrite");
      tx.objectStore("kv").put(state,"appState");tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
     });db.close();
    });
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.documentElement.dataset.pin2mapReady==="true",null,{timeout:30000});
    assert.equal(await page.locator(".pin-marker").count(),0,"hidden layer baseline");
    await page.locator("#searchInput").fill("Karlsruhe");
    await page.locator("#searchTypeMenu").waitFor({state:"visible"});
    assert.equal(await page.locator(".search-type-choice:visible").count(),6,"creation menu shows six options only");
    assert.equal(await page.locator(".object-search-options:visible").count(),0,"specialized options are not yet visible");
    const launcherHit=await page.evaluate(()=>{
     const button=document.querySelector("#basemapButton"),b=button.getBoundingClientRect();
     return document.elementFromPoint((b.left+b.right)/2,(b.top+b.bottom)/2)?.closest("#basemapButton")===button;
    });
    assert.equal(launcherHit,true,"creation menu intercepts basemap launcher");
    await page.locator("#searchButton").click();
    assert.equal(await page.locator(".search-type-choice:visible").count(),0,"creation options replaced");
    assert.equal(await page.locator(".object-search-options:visible").count(),1);
    assert.equal(await page.locator(".pin-marker").count(),1,"search retrieves hidden pin");
    assert.equal(await page.locator("#searchInput").inputValue(),"Karlsruhe");
    assert.equal(await page.locator("#searchButton").evaluate(el=>getComputedStyle(el,"::before").backgroundColor),"rgb(201, 47, 57)");
    assert.equal(await page.locator("#searchButton svg").evaluate(el=>getComputedStyle(el).color),"rgb(255, 255, 255)");
    assert.equal(await page.locator("#searchInput").evaluate(el=>document.activeElement===el),false,"keyboard dismissed");
    const options=page.locator(".object-search-kind");
    assert.equal(await options.inputValue(),"all","all objects selected by default");
    const checks=page.locator(".object-search-flags input");
    assert.equal(await checks.count(),3);
    assert.deepEqual(await checks.evaluateAll(els=>els.map(e=>e.checked)),[true,true,true]);
    const layout=await page.evaluate(()=>{
      const el=document.querySelector("#searchTypeMenu");
      const b=el.getBoundingClientRect(),opts=document.querySelector(".object-search-options");
      const selector=opts.querySelector("select").getBoundingClientRect();
      const flags=opts.querySelector(".object-search-flags").getBoundingClientRect();
      const exit=opts.querySelector(".object-search-exit").getBoundingClientRect();
      return {box:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},
        selector:{top:selector.top,bottom:selector.bottom,right:selector.right},
        flags:{top:flags.top,bottom:flags.bottom,right:flags.right},
        exit:{left:exit.left,top:exit.top,width:exit.width,height:exit.height},
        width:innerWidth,height:innerHeight};
    });
    assert.ok(layout.box.left>=0&&layout.box.right<=width+1&&layout.box.bottom<=height+1,
      "compact chooser fits viewport "+JSON.stringify(layout));
    assert.ok(layout.selector.bottom<=layout.flags.top+2,"options remain two ordered rows");
    assert.ok(layout.exit.left>=layout.selector.right-2&&layout.exit.left>=layout.flags.right-2,"exit at right");
    assert.ok(Math.abs(layout.exit.width-layout.exit.height)<2&&layout.exit.width>=40,
      "exit must be circular touch target: "+JSON.stringify(layout));
    assert.equal(await page.locator(".object-search-exit svg").count(),1);
    assert.equal(await page.locator(".object-search-exit").evaluate(el=>getComputedStyle(el).backgroundColor),
      "rgb(201, 47, 57)");
    // Changing any option re-runs the search immediately, with no Apply button.
    await options.selectOption("rivers");
    assert.equal(await page.locator(".pin-marker").count(),0,"type change filters immediately");
    await options.selectOption("pins");
    assert.equal(await page.locator(".pin-marker").count(),1,"type change refreshes immediately");
    await checks.nth(0).uncheck();
    assert.equal(await page.locator(".pin-marker").count(),1,"unchecking track refreshes without losing normal pin");
    await checks.nth(1).uncheck();
    await checks.nth(2).uncheck();
    assert.equal(await page.locator(".pin-marker").count(),1);
    await page.locator(".object-search-exit").click();
    assert.equal(await page.locator("#searchTypeMenu").isHidden(),true,"right X closes chooser");
    assert.equal(await page.locator(".pin-marker").count(),0,"right X restores hidden layer");
    assert.ok(!await page.locator("body").evaluate(el=>el.classList.contains("object-search-mode")));
    await page.locator("#searchInput").fill("Karlsruhe");
    await page.locator("#searchButton").click();
    assert.equal(await page.locator(".pin-marker").count(),1);
    await page.locator("#searchClear").click();
    assert.equal(await page.locator("#searchTypeMenu").isHidden(),true,"small capsule X exits too");
    assert.equal(await page.locator(".pin-marker").count(),0);
    assert.ok(!await page.locator("body").evaluate(el=>el.classList.contains("object-search-mode")));
    assert.deepEqual(errors,[],width+" browser errors");
    console.log("PASS creation/search split, day/change filters and mobile controls:",width);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
