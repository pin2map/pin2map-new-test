"use strict";
/* v274 live gate on published Preview: iPhone keyboard-safe dual search modes. */
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
    assert.equal(await page.locator("#searchButton").evaluate(el=>getComputedStyle(el,"::before").backgroundColor),"rgb(201, 47, 57)","solid red search lens");
    assert.equal(await page.locator("#searchButton svg").evaluate(el=>getComputedStyle(el).color),"rgb(255, 255, 255)");
    assert.equal(await page.locator("#searchInput").evaluate(el=>document.activeElement===el),false,"keyboard is dismissed on search");
    assert.equal(await page.locator(".object-search-heading").innerText(),"Suchoptionen:");
    assert.equal(await page.locator(".object-search-check input:checked").count(),5,"four types and creation date default checked");
    const layout=await page.evaluate(()=>{
     const el=document.querySelector("#searchTypeMenu");
     const b=el.getBoundingClientRect();
     const row=[...document.querySelectorAll(".object-search-dates > *")].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height};});
     return {box:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},row,width:innerWidth,height:innerHeight};
    });
    assert.ok(layout.box.left>=0&&layout.box.right<=width+1&&layout.box.bottom<=height+1,"popover fits viewport "+JSON.stringify(layout));
    assert.equal(layout.row.length,3);
    assert.ok(layout.row.every(x=>x.width>=40&&x.height>=40),"date choices touch targets "+JSON.stringify(layout.row));
    assert.ok(layout.row[0].right<layout.row[1].left+2&&layout.row[1].right<layout.row[2].left+2,"dates on one line");
    await page.locator("#searchClear").click();
    assert.equal(await page.locator(".pin-marker").count(),0,"X resets previous visibility");
    assert.ok(await page.locator("body").evaluate(el=>el.classList.contains("object-search-mode")),"X keeps search mode active");
    await page.locator(".object-search-date[data-created='today']").click();
    assert.equal(await page.locator(".pin-marker").count(),1,"today created results");
    await page.locator(".object-search-date[data-created='yesterday']").click();
    assert.equal(await page.locator(".pin-marker").count(),1,"yesterday created results");
    const date=new Date();date.setDate(date.getDate()-1);
    const d=[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
    await page.locator(".object-search-picker").fill(d);
    assert.equal(await page.locator(".pin-marker").count(),1,"calendar date works");
    await page.locator('[data-search-flag="updatedAt"]').check();
    await page.locator(".object-search-picker").fill("");
    await page.locator(".object-search-picker").fill(d);
    assert.equal(await page.locator(".pin-marker").count(),0,"change-date search differs from creation-date");
    await page.locator('[data-search-flag="createdAt"]').check();
    await page.locator(".object-search-date[data-created='today']").click();
    assert.equal(await page.locator(".pin-marker").count(),1);
    await page.locator('[data-search-action="end"]').click();
    assert.equal(await page.locator(".object-search-options:visible").count(),0,"end closes options");
    assert.equal(await page.locator("#searchTypeMenu").isHidden(),true,"end closes dialog");
    assert.equal(await page.locator(".pin-marker").count(),0,"end restores map visibility");
    assert.ok(!await page.locator("body").evaluate(el=>el.classList.contains("object-search-mode")),"red state cleared");
    assert.deepEqual(errors,[],width+" browser errors");
    console.log("PASS creation/search split, day/change filters and mobile controls:",width);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
