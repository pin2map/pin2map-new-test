"use strict";
/* Actual Chrome marker-tap regression for the v167 disentangling workflow.
 * Each test context uses independent IndexedDB; no real user pins are read. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {chromium}=require("playwright");
const base=process.env.PIN2MAP_TEST_URL||"http://127.0.0.1:8765/";
const viewports=[
  {name:"iphone",width:375,height:667,hasTouch:true,isMobile:true},
  {name:"ipad",width:768,height:1024,hasTouch:true,isMobile:true},
  {name:"desktop",width:1100,height:780,hasTouch:false,isMobile:false}
];
async function setPins(page,pins,zoom=12){
  await page.evaluate(async ({pins,zoom})=>{
    const store=await window.Pin2MapIndexedDBProjectStore.open();
    try{
      const project=window.Pin2MapProjectModel.defaultProject();
      project.viewport={lat:48.7758,lng:9.1829,zoom};
      project.pins=pins.map(p=>({
        id:p.id,lat:p.lat,lng:p.lng,name:p.name,layerId:"private",
        note:"",url:""
      }));
      await store.saveProject(project);
    }finally{store.close();}
  },{pins,zoom});
  await page.reload({waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForFunction(()=>document.querySelectorAll("#map .pin-icon").length>0,{timeout:20000});
  await page.waitForTimeout(120);
}
async function zoom(page){
  return page.locator("#map .leaflet-container").count()
    .then(async()=>{
      // Leaflet remains private to the adapter in production;
      // browser diagnostics can read its scale through the global map
      // only if mounted. Use pixel-to-latlng of fixed points otherwise.
      const value=await page.evaluate(()=>{
        const line=document.querySelector(".leaflet-control-scale-line");
        return line?.textContent?.trim()||"";
      });
      return value;
    });
}
(async()=>{
  fs.mkdirSync("pin-overlap-artifacts",{recursive:true});
  const browser=await chromium.launch({headless:true,...(process.env.PIN2MAP_CHROMIUM_EXECUTABLE
    ?{executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE}:{})});
  try{
    for(const viewport of viewports){
      const context=await browser.newContext({
        viewport:{width:viewport.width,height:viewport.height},
        hasTouch:viewport.hasTouch,isMobile:viewport.isMobile,deviceScaleFactor:1,
        serviceWorkers:"allow"
      });
      const page=await context.newPage();
      const errors=[];
      page.on("pageerror",e=>errors.push(e.message));
      try{
        await page.goto(base,{waitUntil:"domcontentloaded",timeout:30000});
        await page.waitForFunction(()=>!!window.L&&!!document.querySelector(".leaflet-container"),
          null,{timeout:20000});
        const near=[
          {id:"near-A",lat:48.7758,lng:9.1829,name:"Near A"},
          {id:"near-B",lat:48.7758,lng:9.1839,name:"Near B"}
        ];
        await setPins(page,near);
        assert.equal(await page.locator(".pin-icon").count(),2);
        const firstBox=await page.locator(".pin-icon").first().boundingBox();
        const secondBox=await page.locator(".pin-icon").last().boundingBox();
        assert.ok(Math.abs(firstBox.x-secondBox.x)<52,
          "Precondition: actual 52px hitboxes overlap at low zoom");
        const initialScale=await zoom(page);
        await page.screenshot({path:"pin-overlap-artifacts/"+viewport.name+"-before.png"});
        const tap=async locator=>viewport.hasTouch?locator.tap({force:true}):locator.click({force:true});
        await tap(page.locator(".pin-icon").last());
        assert.equal(await page.locator("#pinPanel").isHidden(),true,
          "First ambiguous tap must zoom, never select topmost pin");
        assert.equal(await page.locator(".pin-overlap-chooser").count(),0,
          "Separable nearby pins must not force a chooser");
        const afterScale=await zoom(page);
        await page.screenshot({path:"pin-overlap-artifacts/"+viewport.name+"-after-zoom.png"});
        assert.notEqual(afterScale,initialScale,
          "First ambiguous tap must change map zoom");
        const afterA=await page.locator(".pin-icon").first().boundingBox();
        const afterB=await page.locator(".pin-icon").last().boundingBox();
        assert.ok(Math.abs(afterA.x-afterB.x)>=52||Math.abs(afterA.y-afterB.y)>=56,
          "Hitboxes must be separated after autozoom");
        await tap(page.locator(".pin-icon").first());
        await page.locator("#pinPanel").waitFor({state:"visible",timeout:8000});
        assert.equal(await page.locator("#pinName").inputValue(),"Near A",
          "Second tap must select the intended individual pin");
        await page.locator("#closePin").click();

        // Two pins at EXACTLY the same coordinates cannot be separated by
        // any amount of zoom. The user must be offered a labeled choice.
        const same=[
          {id:"same-A",lat:48.7758,lng:9.1829,name:"Identisch A"},
          {id:"same-B",lat:48.7758,lng:9.1829,name:"Identisch B"}
        ];
        await setPins(page,same);
        await tap(page.locator(".pin-icon").last());
        await page.locator(".pin-overlap-chooser").waitFor({state:"visible",timeout:8000});
        assert.equal(await page.locator("#pinPanel").isHidden(),true);
        assert.equal(await page.locator(".pin-overlap-choice").count(),2);
        assert.equal(await zoom(page),initialScale,
          "Identical coordinates must offer choices without needless zoom");
        await page.screenshot({path:"pin-overlap-artifacts/"+viewport.name+"-exact-chooser.png"});
        await page.locator(".pin-overlap-choice").filter({hasText:"Identisch A"}).click();
        await page.locator("#pinPanel").waitFor({state:"visible",timeout:8000});
        assert.equal(await page.locator("#pinName").inputValue(),"Identisch A");
        assert.equal(await page.locator(".pin-overlap-chooser").count(),0);
        await page.locator("#closePin").click();

        // A single isolated marker still opens immediately and keeps zoom.
        await setPins(page,[{id:"solo",lat:48.7758,lng:9.1829,name:"Allein"}]);
        const soloScale=await zoom(page);
        await tap(page.locator(".pin-icon").first());
        await page.locator("#pinPanel").waitFor({state:"visible",timeout:8000});
        assert.equal(await page.locator("#pinName").inputValue(),"Allein");
        assert.equal(await zoom(page),soloScale);
        assert.deepEqual(errors,[]);
        console.log("[overlap] PASS",viewport.name,
          "tap zoom, second tap selection, exact-coordinates chooser, isolated pin");
      }finally{await context.close();}
    }
  }finally{await browser.close();}
})().catch(e=>{console.error("[overlap] FAIL",e.stack||e);process.exitCode=1;});
