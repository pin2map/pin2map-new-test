"use strict";
/* Device-geometry contract: the desktop-approved one-column chooser must
 * remain fully visible whenever there is space above a simulated iOS keyboard.
 * Run independently in Chromium AND WebKit, before and after publication. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {chromium,webkit}=require("playwright");
const base=process.env.PIN2MAP_TEST_URL||"http://127.0.0.1:8765/";
const cases=[
 {name:"iphone375",width:375,height:812,keyboardTop:545},
 {name:"iphone390",width:390,height:844,keyboardTop:570},
 {name:"ipad820",width:820,height:1180,keyboardTop:810},
 {name:"desktop",width:1280,height:800,keyboardTop:null}
];
fs.mkdirSync("search-chooser-regression-artifacts",{recursive:true});
(async()=>{
 for(const [engine,type] of [["chromium",chromium],["webkit",webkit]]){
  const browser=await type.launch({headless:true,args:engine==="chromium"?["--no-sandbox"]:[]});
  try{
   for(const specimen of cases){
    const ctx=await browser.newContext({
     viewport:{width:specimen.width,height:specimen.height},
     isMobile:specimen.name!=="desktop",hasTouch:specimen.name!=="desktop",
     serviceWorkers:"block"
    });
    const page=await ctx.newPage();
    try{
     await page.goto(base,{waitUntil:"domcontentloaded",timeout:35000});
     await page.waitForFunction(()=>document.documentElement.dataset.pin2mapReady==="true",null,{timeout:30000});
     await page.locator("#searchInput").click();
     await page.locator("#searchTypeMenu").waitFor({state:"visible"});
     const measure=()=>page.evaluate(()=>{
      const menu=document.querySelector("#searchTypeMenu");
      const field=document.querySelector("#searchForm");
      const m=menu.getBoundingClientRect(),f=field.getBoundingClientRect();
      const nodes=[...menu.querySelectorAll(".search-type-choice")];
      const choices=nodes.map(x=>{let r=x.getBoundingClientRect();return {
       top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,
       label:x.innerText.trim()
      };});
      return {menu:{top:m.top,bottom:m.bottom,left:m.left,right:m.right,height:m.height},
       field:{top:f.top,bottom:f.bottom,left:f.left,right:f.right},
       choices,display:getComputedStyle(menu).display,position:getComputedStyle(menu).position,
       listDirection:getComputedStyle(menu.querySelector(".search-creation-choices")).flexDirection,
       scrollHeight:menu.scrollHeight,clientHeight:menu.clientHeight};
     });
     const verify=(data,stage,bottom)=>{
      const tag=engine+" "+specimen.name+" "+stage;
      assert.equal(data.position,"fixed",tag+" fixed overlay");
      assert.equal(data.listDirection,"column",tag+" one column");
      assert.equal(data.choices.length,7,tag+" seven options");
      assert.ok(data.menu.top>=data.field.bottom+7,tag+" menu below search "+JSON.stringify(data));
      assert.ok(data.menu.bottom<=bottom+2,tag+" above keyboard "+JSON.stringify(data));
      assert.ok(data.choices.every((r,i)=>i===0||
       (r.top>=data.choices[i-1].bottom-1&&Math.abs(r.left-data.choices[0].left)<2)),
       tag+" strict vertical list "+JSON.stringify(data));
      assert.ok(data.choices.every(r=>r.height>=40),tag+" approved row height");
      // In these test viewports all seven rows FIT: scrolling or a tiny blank
      // strip is a contract failure, even when all buttons exist in the DOM.
      assert.ok(data.menu.height>=320,tag+" must not collapse "+JSON.stringify(data));
      assert.ok(data.clientHeight>=data.scrollHeight-2,tag+" full list visible");
      assert.ok(data.choices[6].bottom<=data.menu.bottom+1,tag+" last item actually visible");
      assert.ok(Math.abs((data.menu.left+data.menu.right-data.field.left-data.field.right)/2)<12,
       tag+" horizontally centered");
     };
     verify(await measure(),"normal",specimen.height);
     if(specimen.keyboardTop){
      await page.evaluate(h=>{
       const fake={offsetLeft:0,offsetTop:0,width:innerWidth,height:h};
       Object.defineProperty(window,"visualViewport",{configurable:true,value:fake});
       window.dispatchEvent(new Event("resize"));
      },specimen.keyboardTop);
      verify(await measure(),"keyboard",specimen.keyboardTop);
      // The exact v291 screenshot symptom: after an intermediate collapsed
      // state, the real repositioning handler must recover full geometry.
      await page.evaluate(()=>{
       const menu=document.querySelector("#searchTypeMenu");
       menu.style.maxHeight="0px";
       window.dispatchEvent(new Event("resize"));
      });
      verify(await measure(),"keyboard-recovered",specimen.keyboardTop);
      await page.screenshot({path:
       "search-chooser-regression-artifacts/"+engine+"-"+specimen.name+"-keyboard.png"});
      await page.evaluate(()=>{delete window.visualViewport;window.dispatchEvent(new Event("resize"));});
      verify(await measure(),"keyboard-dismissed",specimen.height);
     }
     console.log("[chooser] PASS "+engine+" "+specimen.name+
      " vertical geometry and keyboard recovery");
    }finally{await ctx.close();}
   }
  }finally{await browser.close();}
 }
})().catch(e=>{console.error("[chooser] FAIL",e);process.exitCode=1;});
