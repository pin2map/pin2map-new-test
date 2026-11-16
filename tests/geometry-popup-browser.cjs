"use strict";
/* Actual browser geometry: a DOM-only fixture avoids persisted user data.
 * Validate the rendered, portalled area URL overlay on desktop, tablet & phone.
 */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const base=process.env.PIN2MAP_TEST_URL||"http://127.0.0.1:8765/";
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PIN2MAP_CHROMIUM_EXECUTABLE?
  {executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE}:{})});
 try{
  for(const viewport of [{width:1280,height:800},{width:820,height:1180},{width:390,height:844}]){
   const context=await browser.newContext({viewport,serviceWorkers:"block"});
   try{
    const page=await context.newPage();
    await page.goto(base,{waitUntil:"domcontentloaded",timeout:35000});
    await page.waitForFunction(()=>!!window.Pin2MapGeometryEditor&&!!window.Pin2MapIcons?.svg,
      null,{timeout:15000});
    const state=await page.evaluate(({width,height})=>{
      const editor=new window.Pin2MapGeometryEditor({
       document,icons:window.Pin2MapIcons,
       onUpdate:(_type,_id,patch)=>Object.assign(item,patch),
       onDelete:()=>{},onWikipedia:()=>{}
      });
      const item={id:"synthetic-geometry-popup-test",name:"Testfläche",layerId:"private",
       note:"",url:""};
      editor.show("area",item,[{id:"private",name:"Privat",color:"#326cc2",visible:true}],
       {x:Math.round(width*.45),y:Math.round(height*.48)});
      editor.linkButton.click();
      const popup=editor.urlPopup, panel=editor.panel;
      const rect=popup.getBoundingClientRect(),p=panel.getBoundingClientRect();
      const header=editor.header.getBoundingClientRect();
      const actions=editor.actions.getBoundingClientRect();
      return {position:getComputedStyle(popup).position,display:getComputedStyle(popup).display,
       popup:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
        width:rect.width,height:rect.height},
       panel:{left:p.left,right:p.right,top:p.top,bottom:p.bottom},
       headerBottom:header.bottom,actionsTop:actions.top,
       visible:rect.width>0&&rect.height>0};
    },viewport);
    assert.equal(state.position,"fixed",JSON.stringify({viewport,state}));
    assert.equal(state.display,"flex",JSON.stringify({viewport,state}));
    assert.equal(state.visible,true,JSON.stringify({viewport,state}));
    assert.ok(state.popup.left>=state.panel.left-2,JSON.stringify({viewport,state}));
    assert.ok(state.popup.right<=state.panel.right+2,JSON.stringify({viewport,state}));
    assert.ok(state.popup.top>=state.headerBottom-2,JSON.stringify({viewport,state}));
    assert.ok(state.popup.bottom<=state.actionsTop+2,JSON.stringify({viewport,state}));
    assert.ok(state.popup.bottom<=viewport.height,JSON.stringify({viewport,state}));
    console.log("PASS area URL viewport geometry",viewport.width+"x"+viewport.height,state.popup);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
