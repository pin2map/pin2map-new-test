"use strict";
/* Real Chromium integration: project transfer UI, IndexedDB and download.
 * Fresh ephemeral browser context only; never touches the user's project. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const fs=require("node:fs");
const base=process.env.PIN2MAP_TEST_URL||"http://127.0.0.1:8765/";
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PIN2MAP_CHROMIUM_EXECUTABLE?
  {executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE}:{})});
 try{
  for(const view of [{name:"desktop",width:1100,height:780,mobile:false},
                     {name:"iphone",width:375,height:667,mobile:true}]){
   const context=await browser.newContext({viewport:{width:view.width,height:view.height},
     isMobile:view.mobile,hasTouch:view.mobile,acceptDownloads:true,serviceWorkers:"block"});
   try{
    const page=await context.newPage(),errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.goto(base,{waitUntil:"domcontentloaded",timeout:30000});
    await page.waitForFunction(()=>document.documentElement.dataset.pin2mapReady==="true",null,{timeout:25000});
    const encoded=await page.evaluate(()=>{
      const project=window.Pin2MapProjectModel.defaultProject();
      project.pins=[{id:"imported-pin",name:"Transfervertrag",layerId:"private",
        lat:48.1,lng:9.2,note:"Beibehalten",url:""}];
      return window.Pin2MapProjectTransfer.encodeProject(project);
    });
    const upload=async(name,content)=>{
      await page.locator("#transferFileInput").setInputFiles({name,mimeType:"application/json",
        buffer:Buffer.from(content,"utf8")});
    };
    const snapshot=async()=>page.evaluate(async()=>{
      const db=await window.Pin2MapIndexedDBProjectStore.open();
      try{return await db.loadProject();}finally{db.close();}
    });
    await page.locator("#transferButton").click();
    await page.locator("#transferPanel").waitFor({state:"visible"});
    await upload("RouteTest.pin2map",encoded);
    await page.locator("#transferConfirm").waitFor({state:"visible"});
    assert.match(await page.locator("#transferFileSummary").textContent(),/1 Pins/);
    await page.locator("#transferAdd").click();
    await page.waitForFunction(async()=>{
      const db=await window.Pin2MapIndexedDBProjectStore.open();
      try{return (await db.loadProject())?.pins?.some(p=>p.name==="Transfervertrag");}
      finally{db.close();}
    },null,{timeout:15000});
    let current=await snapshot();
    assert.equal(current.pins.length,1);
    const addedLayer=current.layers.find(l=>l.id===current.pins[0].layerId);
    assert.ok(addedLayer&&addedLayer.name.includes("RouteTest"),"Import uses one file-named layer");
    await page.locator("#transferButton").click();
    const downloadPromise=page.waitForEvent("download",{timeout:10000});
    await page.locator("#transferExport").click();
    const download=await downloadPromise;
    assert.match(download.suggestedFilename(),/\.pin2map$/);
    const bytes=fs.readFileSync(await download.path(),"utf8");
    assert.ok(bytes.includes("Transfervertrag"),"Downloaded project contains imported pin");
    await upload("bad.pin2map",'{invalid');
    await page.waitForFunction(()=>document.querySelector("#transferFeedback")?.textContent.includes("Import nicht möglich"),null,{timeout:10000});
    const afterInvalid=await snapshot();
    assert.equal(afterInvalid.pins.length,1);
    assert.equal(afterInvalid.pins[0].name,"Transfervertrag");
    await upload("Replace.pin2map",encoded);
    await page.locator("#transferConfirm").waitFor({state:"visible"});
    page.once("dialog",dialog=>dialog.accept());
    await page.locator("#transferReplace").click();
    await page.waitForFunction(async()=>{
      const db=await window.Pin2MapIndexedDBProjectStore.open();
      try{
        const p=await db.loadProject();
        return p?.pins?.length===1&&p.pins[0].id==="imported-pin"&&
          p.pins[0].layerId==="private";
      }finally{db.close();}
    },null,{timeout:15000});
    current=await snapshot();
    assert.equal(current.pins[0].note,"Beibehalten");
    assert.equal(errors.length,0,errors.join("; "));
    console.log("[project-transfer] PASS "+view.name+" add, download, invalid-input isolation, replace");
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error("[project-transfer] FAIL",error);process.exitCode=1;});
