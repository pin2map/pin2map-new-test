"use strict";
/* Published preview gate: saved-object search, restoration and iPhone controls. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const base=process.env.PIN2MAP_TEST_URL||
  "https://pin2map.github.io/pin2map-new-test/preview/";
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
  for(const width of [320,375,1280]){
   const context=await browser.newContext({viewport:{width,height:width===320?568:width===375?667:800},serviceWorkers:"block"});
   const page=await context.newPage(),errors=[];
   page.on("pageerror",err=>errors.push(err.message));
   try{
    await page.goto(base,{waitUntil:"domcontentloaded",timeout:35000});
    await page.waitForFunction(()=>document.documentElement.dataset.pin2mapReady==="true",null,{timeout:30000});
    // Dedicated ephemeral browser context. Never touch a real user's IndexedDB.
    await page.evaluate(async()=>{
     const preview=location.pathname.includes("/preview/");
     const dbName=preview?"pin2map-new-preview-v1":"pin2map-new-v1";
     const state=window.Pin2MapProjectModel.defaultProject();
     state.layers[1].visible=false;
     const local=new Date(),old=new Date(local.getFullYear(),local.getMonth(),local.getDate()-1,12).toISOString();
     const today=new Date(local.getFullYear(),local.getMonth(),local.getDate(),12).toISOString();
     state.pins=[
      {id:"test-1",name:"Karlsruhe Bahnhof",lat:49.01,lng:8.405,layerId:"layer-1",note:"",url:"",createdAt:today,updatedAt:today},
      {id:"test-2",name:"Berlin Mitte",lat:52.52,lng:13.4,layerId:"layer-1",note:"",url:"",createdAt:old,updatedAt:today}
     ];
     state.areas=[{id:"test-area",name:"Karlsruhe Testgebiet",layerId:"layer-1",kind:"area",createdAt:today,
       geometry:{type:"Polygon",coordinates:[[[8.40,49.0],[8.41,49.0],[8.41,49.01],[8.40,49.0]]]},note:"",url:""}];
     const req=indexedDB.open(dbName,1);
     const db=await new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);});
     await new Promise((res,rej)=>{const tx=db.transaction("kv","readwrite");tx.objectStore("kv").put(state,"appState");tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
     db.close();
    });
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.documentElement.dataset.pin2mapReady==="true",null,{timeout:30000});
    assert.equal(await page.locator(".pin-marker").count(),0,"hidden layer baseline");
    await page.locator("#searchInput").fill("Karlsruhe");
    await page.locator("#searchTypeMenu").waitFor({state:"visible"});
    const dateButtons=page.locator(".object-search-date");
    assert.equal(await dateButtons.count(),2);
    assert.equal(await dateButtons.nth(0).innerText(),"Heute erstellt");
    assert.equal(await dateButtons.nth(1).innerText(),"Gestern erstellt");
    const layout=await page.evaluate(()=>{
     const menu=document.querySelector("#searchTypeMenu").getBoundingClientRect();
     const buttons=[...document.querySelectorAll(".object-search-date")].map(x=>x.getBoundingClientRect());
     return {menu:{left:menu.left,right:menu.right,top:menu.top,bottom:menu.bottom},
      buttons:buttons.map(x=>({left:x.left,right:x.right,width:x.width,height:x.height})),width:innerWidth,height:innerHeight};
    });
    assert.ok(layout.menu.left>=0&&layout.menu.right<=layout.width+1&&layout.menu.bottom<=layout.height+1,
      "menu outside viewport "+JSON.stringify(layout));
    assert.ok(Math.abs(layout.buttons[0].width-layout.buttons[1].width)<2,"date buttons unequal");
    assert.ok(layout.buttons.every(x=>x.height>=40&&x.width>=100),"date buttons too small");
    await page.locator('[data-search-type="objects"]').click();
    assert.equal(await page.locator(".pin-marker").count(),1,"hidden pin found by search");
    assert.equal(await page.locator("#searchInput").inputValue(),"Karlsruhe");
    assert.ok(await page.locator("body").evaluate(el=>el.classList.contains("object-search-active")));
    assert.equal(await page.locator("#searchButton").evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(201, 47, 57)");
    await page.locator("#searchClear").click();
    assert.equal(await page.locator(".pin-marker").count(),0,"restored hidden layer after clear");
    assert.ok(!await page.locator("body").evaluate(el=>el.classList.contains("object-search-active")));
    await page.locator("#searchInput").focus();
    await page.locator(".object-search-date[data-created='today']").click();
    assert.equal(await page.locator(".pin-marker").count(),1,"today created, not edited");
    assert.equal(await page.locator("#searchInput").inputValue(),"");
    await page.locator("#searchClear").click();
    await page.locator("#searchInput").focus();
    await page.locator(".object-search-date[data-created='yesterday']").click();
    assert.equal(await page.locator(".pin-marker").count(),1,"yesterday created, not edited");
    assert.deepEqual(errors,[],width+" browser errors");
    console.log("PASS stored object search, daily shortcuts, mobile layout:",width);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
