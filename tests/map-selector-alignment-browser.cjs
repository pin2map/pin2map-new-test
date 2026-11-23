"use strict";
/* Live UI gate: basemap selector must line up with Refresh on desktop,
 * iPad and phone; menu remains accessible; normal purple, open blue.
 * PWA worker lifecycle is tested independently of these layout assertions.
 */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const url=process.env.PIN2MAP_TEST_URL||
 "https://pin2map.github.io/pin2map-new-test/preview/";
const sizes=[{name:"desktop",width:1366,height:768},
 {name:"ipad",width:768,height:1024},
 {name:"iphone",width:375,height:667},
 {name:"iphone-small",width:320,height:568}];
(async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE||undefined,
  args:["--no-sandbox"]});
 try{
  for(const size of sizes){
   const context=await browser.newContext({viewport:{width:size.width,height:size.height},
    isMobile:size.name.startsWith("iphone"),hasTouch:size.name!=="desktop",
    serviceWorkers:"block"});
   const page=await context.newPage();
   try{
    await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
    // Icons render before the application installs its click handlers.
    // The app sets this only after bind() and all initialization is complete.
    await page.waitForFunction(()=>document.documentElement.dataset.pin2mapReady==="true"&&
      !!document.querySelector("#basemapButton svg")&&
      !!document.querySelector("#refreshButton svg"),null,{timeout:20000});
    const metrics=async()=>page.evaluate(()=>{
      const button=document.querySelector("#basemapButton");
      const refresh=document.querySelector("#refreshButton");
      const menu=document.querySelector("#basemapMenu");
      const box=el=>{const b=el.getBoundingClientRect();return {
       left:b.left,right:b.right,top:b.top,bottom:b.bottom,
       width:b.width,height:b.height,centerY:(b.top+b.bottom)/2}};
      return {button:box(button),refresh:box(refresh),menu:box(menu),
       color:getComputedStyle(button).backgroundColor,
       icon:getComputedStyle(button).color,
       expanded:button.getAttribute("aria-expanded"),
       menuHidden:menu.classList.contains("hidden"),
       viewport:{width:innerWidth,height:innerHeight}};
    });
    const before=await metrics();
    assert.ok(Math.abs(before.button.centerY-before.refresh.centerY)<=1.5,
     size.name+" basemap center not level with Refresh: "+JSON.stringify(before));
    assert.equal(before.color,"rgb(128, 82, 184)",
     size.name+" basemap background not medium purple");
    assert.equal(before.icon,"rgb(255, 255, 255)",size.name+" white map icon");
    assert.ok(before.button.right<=before.viewport.width&&before.button.left>=0,
     size.name+" map button inside horizontal viewport");
    assert.equal(before.menuHidden,true);
    await page.locator("#basemapButton").click();
    const opened=await metrics();
    assert.equal(opened.expanded,"true",size.name+" menu opened");
    assert.equal(opened.menuHidden,false);
    assert.equal(opened.color,"rgb(23, 100, 191)",
     size.name+" blue active contract");
    assert.ok(opened.menu.top>=opened.button.bottom+3,
     size.name+" menu must open below trigger, not overlap it");
    assert.ok(opened.menu.bottom<=opened.viewport.height+1,
     size.name+" menu fits within viewport, scrolling internally");
    assert.ok(opened.menu.width>150&&opened.menu.height>80);
    await page.locator("#basemapButton").click();
    assert.equal((await metrics()).menuHidden,true);
    console.log("PASS MAP_SELECTOR_ALIGN "+size.name,
      JSON.stringify({refreshCenterY:before.refresh.centerY,
       mapCenterY:before.button.centerY,closedColor:before.color,
       openColor:opened.color,menu:opened.menu}));
   }finally{await context.close()}
  }
 }finally{await browser.close()}
})().catch(error=>{console.error("MAP_SELECTOR_ALIGN_FAILURE",error);process.exitCode=1});
