"use strict";
/* Real Chromium geometry & image evidence for the pin dialog.
 * Independent contexts prevent leftover map state from masking layout bugs.
 * Real iOS Safari keyboard acceptance remains a separate manual gate. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const fs=require("node:fs");
const base=process.env.PIN2MAP_TEST_URL||"http://127.0.0.1:8765/";
const cases=[
 {name:"iphone-narrow",width:320,height:568,button:36},
 {name:"iphone",width:375,height:667,button:38},
 {name:"ipad",width:768,height:1024,button:38}
];
const browserOptions=process.env.PIN2MAP_CHROMIUM_EXECUTABLE
 ?{executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE}:{};
async function metrics(page){
 return page.evaluate(()=>{
  const get=id=>document.getElementById(id);
  const rect=id=>{
   const b=get(id).getBoundingClientRect();
   return {x:b.left,y:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};
  };
  const footer=[...get("pinPanel").querySelectorAll(".pin-actions > button, .pin-actions > .pin-layer-picker > button")];
  const panel=get("pinPanel"),notes=get("pinNotes");
  const styles=getComputedStyle(panel);
  return {
   panel:rect("pinPanel"),name:rect("pinName"),meta:rect("pinCreated"),
   details:rect("pinNotesBlock"),footer:rect("closePin"),
   noteHeight:notes.getBoundingClientRect().height,
   noteFont:Number.parseFloat(getComputedStyle(notes).fontSize),
   overflowY:styles.overflowY,scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight,
   footerItems:footer.map(button=>{const b=button.getBoundingClientRect();return {
    id:button.id,x:b.left,y:b.top,right:b.right,width:b.width,height:b.height,
    radius:getComputedStyle(button).borderRadius,
    svgSize:button.querySelector("svg")?.getBoundingClientRect().width||0
   };}),
   weatherOpacity:getComputedStyle(get("pinWeather")).opacity,
   viewport:{width:innerWidth,height:innerHeight},
   documentScrollWidth:document.documentElement.scrollWidth,
   bodyScrollWidth:document.body.scrollWidth
  };
 });
}
(async()=>{
 const browser=await chromium.launch({headless:true,...browserOptions});
 fs.mkdirSync("pin-dialog-visual-artifacts",{recursive:true});
 try{
  for(const viewport of cases){
   const ctx=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},
    hasTouch:true,isMobile:true,deviceScaleFactor:1,serviceWorkers:"allow"});
   const page=await ctx.newPage();
   const errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   try{
    await page.goto(base,{waitUntil:"domcontentloaded",timeout:30000});
    await page.waitForFunction(()=>!!window.L&&!!document.querySelector(".leaflet-container"),null,{timeout:20000});
    const at={x:Math.floor(viewport.width/2),y:Math.floor(viewport.height*.7)};
    await page.mouse.move(at.x,at.y);
    await page.mouse.down();
    await page.waitForTimeout(735);
    await page.mouse.up();
    await page.locator("#pinPanel").waitFor({state:"visible",timeout:15000});
    await page.waitForTimeout(200);
    const m=await metrics(page);
    assert.equal(m.footerItems.length,6,JSON.stringify(m));
    assert.deepEqual(m.footerItems.map(item=>item.id),
     ["movePin","pinLayerTrigger","pinUrlButton","pinWikipedia","pinWeather","closePin"]);
    assert.ok(m.panel.x>=4&&m.panel.right<=viewport.width-4,JSON.stringify(m));
    assert.ok(m.panel.y>=4&&m.panel.bottom<=viewport.height-4,JSON.stringify(m));
    assert.ok(m.scrollHeight<=m.clientHeight+2,"Nested pin dialog scroll: "+JSON.stringify(m));
    assert.ok(m.meta.y>m.name.y,"Date line must be below name");
    assert.ok(m.details.y>m.meta.y,"Note detail must follow dates with no routing placeholder");
    assert.ok(m.footer.y>m.details.y,"Footer must follow detail");
    assert.ok(Math.abs(m.noteHeight-144)<=1,JSON.stringify(m));
    assert.ok(m.noteFont>=16,"Touch input font must prevent iOS zoom: "+JSON.stringify(m));
    for(let i=0;i<m.footerItems.length;i++){
     const item=m.footerItems[i];
     assert.ok(Math.abs(item.width-viewport.button)<=1&&Math.abs(item.height-viewport.button)<=1,
      "Action size differs: "+JSON.stringify(item));
     assert.ok(item.x>=m.panel.x&&item.right<=m.panel.right,"Button outside panel: "+JSON.stringify(item));
     if(i)assert.ok(item.x>=m.footerItems[i-1].right-1,"Footer overlaps: "+JSON.stringify(m));
    }
    assert.equal(m.weatherOpacity,"1","Disabled weather icon remains clearly recognizable");
    assert.ok(m.documentScrollWidth<=viewport.width+2,"Unexpected horizontal document scroll");
    await page.screenshot({path:"pin-dialog-visual-artifacts/"+viewport.name+"-notes.png"});
    await page.locator("#pinLayerTrigger").click();
    await page.locator("#pinLayerMenu").waitFor({state:"visible",timeout:5000});
    const pop=await page.evaluate(()=>{
     const menu=document.getElementById("pinLayerMenu"),b=menu.getBoundingClientRect();
     return {parent:menu.parentElement.tagName,x:b.left,y:b.top,right:b.right,bottom:b.bottom,
      scrollWidth:menu.scrollWidth,clientWidth:menu.clientWidth,
      scrollHeight:menu.scrollHeight,clientHeight:menu.clientHeight,
      items:menu.querySelectorAll(".pin-layer-option").length,
      bodyScrollWidth:document.body.scrollWidth};
    });
    assert.equal(pop.parent,"BODY","Layer list must escape scrolling pin panel");
    assert.ok(pop.x>=4&&pop.right<=viewport.width-4,JSON.stringify(pop));
    assert.ok(pop.y>=4&&pop.bottom<=viewport.height-4,JSON.stringify(pop));
    assert.ok(pop.scrollWidth<=pop.clientWidth+2,"Horizontal layer menu scrolling: "+JSON.stringify(pop));
    assert.ok(pop.items>=2,"All layers must be present");
    assert.ok(pop.bodyScrollWidth<=viewport.width+2,"Menu causes horizontal page scrolling");
    await page.screenshot({path:"pin-dialog-visual-artifacts/"+viewport.name+"-layers.png"});
    await page.locator("#pinLayerMenu .pin-layer-option").nth(1).click();
    assert.equal(await page.locator("#pinLayerMenu").isHidden(),true);
    await page.locator("#pinUrlButton").click();
    assert.equal(await page.locator("#pinNotesBlock").isHidden(),true);
    assert.equal(await page.locator("#pinUrlBlock").isVisible(),true);
    await page.screenshot({path:"pin-dialog-visual-artifacts/"+viewport.name+"-url.png"});
    await page.locator("#pinUrlCancel").click();
    assert.equal(await page.locator("#pinNotesBlock").isVisible(),true);
    assert.deepEqual(errors,[],"Uncaught page error");
    console.log("[visual] PASS",viewport.name,JSON.stringify({panel:m.panel,notes:m.noteHeight,
     button:viewport.button,layerList:pop}));
   }finally{await ctx.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error("[visual] FAIL",error.stack||error);process.exitCode=1;});
