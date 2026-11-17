"use strict";
/* Browser-engine cross-check of the *published* development preview.
 * WebKit is the Safari rendering engine, but Linux WebKit is not proof of
 * real iOS Safari or of a user's existing service-worker installation.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
fs.mkdirSync('geometry-layer-regression-artifacts',{recursive:true});
const {chromium,webkit}=require('playwright');
const origin=process.env.PIN2MAP_TEST_URL||'https://pin2map.github.io/pin2map-new-test/preview/';
const sizes=[
 {label:'iphone390',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
 {label:'iphone320',viewport:{width:320,height:700},isMobile:true,hasTouch:true},
 {label:'ipad',viewport:{width:820,height:1180},isMobile:false,hasTouch:true},
];
(async()=>{
 for(const [engine,browserType] of [['webkit',webkit],['chromium',chromium]]){
  const browser=await browserType.launch({headless:true});
  try{
   for(const setting of sizes){
    const context=await browser.newContext({...setting,deviceScaleFactor:2,
      serviceWorkers:'block',locale:'de-DE'});
    try{
     const page=await context.newPage();
     await page.goto(origin,{waitUntil:'domcontentloaded',timeout:45000});
     await page.waitForFunction(()=>Boolean(window.Pin2MapGeometryEditor&&window.Pin2MapObjectLayerPicker),null,{timeout:15000});
     const body=await page.evaluate(async({label})=>{
      const results=[];
      for(const kind of ['area','lake','river']){
       const item={id:'regression-'+kind,name:'Dachsteingebirge',layerId:'a0',
        kind:kind==='lake'?'lake':'area',note:'',url:''};
       const layers=Array.from({length:18},(_,n)=>({
        id:'a'+n,name:'Testebene '+String(n).padStart(2,'0'),visible:n%4!==0,color:'#4477bb'
       }));
       let lastPatch;
       const editor=new window.Pin2MapGeometryEditor({document,
        icons:window.Pin2MapIcons,onUpdate:(_t,_id,p)=>{lastPatch=p;Object.assign(item,p);return item},
        onDelete:()=>{},onWikipedia:()=>{}});
       editor.show(kind==='river'?'river':'area',item,layers,
        {x:innerWidth*.5,y:innerHeight*.65});
       editor.layerButton.click();
       const menu=editor.layerMenu, panel=editor.panel;
       const box=menu.getBoundingClientRect(), pb=panel.getBoundingClientRect();
       const opts=[...menu.querySelectorAll('.pin-layer-option')];
       const displayed=opts.filter(x=>{
        const r=x.getBoundingClientRect();
        return r.height>=25&&r.top>=box.top&&r.bottom<=box.bottom;
       }).length;
       const rowRect=opts[0]?.getBoundingClientRect();
       // Detect *visual occlusion*: bounding boxes may look correct even
       // when the entire chooser is painted behind the main editor.
       const row=opts[1],r=row?.getBoundingClientRect();
       const px=r?Math.min(r.right-8,Math.max(r.left+8,r.left+r.width*.5)):0;
       const py=r?Math.min(r.bottom-6,Math.max(r.top+6,r.top+r.height*.5)):0;
       const hit=r?document.elementFromPoint(px,py):null;
       const hitIsOption=!!(hit&&(hit===row||row.contains(hit)));
       const sample={engine:'',label,kind,hitIsOption,
        hitElement:hit?.tagName||null,hitClass:String(hit?.className||'').slice(0,80),
        rowPoint:{x:px,y:py},menuParent:menu.parentElement?.id||menu.parentElement?.tagName,
        menuWidth:box.width,menuHeight:box.height,
        panelWidth:pb.width,panelHeight:pb.height,menuLeft:box.left,menuRight:box.right,
        panelLeft:pb.left,panelRight:pb.right,menuTop:box.top,menuBottom:box.bottom,
        panelTop:pb.top,panelBottom:pb.bottom,rowHeight:rowRect?.height,
        displayed,options:opts.length,scrollHeight:menu.scrollHeight,
        clientHeight:menu.clientHeight,
        cssHeight:getComputedStyle(menu).height,
        vv:{width:visualViewport?.width,height:visualViewport?.height,
          offsetTop:visualViewport?.offsetTop}};
       // A *real* click on the last, initially offscreen item must scroll
       // and apply the stored layer ID.
       results.push(sample);
       editor.close();
      }
      return results;
     },{label:setting.label});
     for(const record of body){
      record.engine=engine;
      console.log('SAFARI_REGRESSION_METRICS',JSON.stringify(record));
      assert.ok(record.options===18,record.kind+' options not rendered');
      assert.ok(record.menuWidth>=record.panelWidth-25,
        'chooser not restored to original editor width: '+JSON.stringify(record));
      assert.ok(record.menuHeight>=210,
        'filter-only collapsed menu: '+JSON.stringify(record));
      assert.ok(record.displayed>=2,
        'at least two complete selectable rows must be visible: '+JSON.stringify(record));
      assert.ok(record.hitIsOption,
        'REGRESSION: second layer row is OCCLUDED by editor despite correct rect: '+JSON.stringify(record));
      assert.equal(record.menuParent,'app',
        'REGRESSION: geometry list must be portalled into fixed app stacking context, never BODY: '+JSON.stringify(record));
      assert.ok(record.menuTop>=record.panelTop-2&&record.menuBottom<=record.panelBottom+2,
        'chooser is outside editor panel: '+JSON.stringify(record));
      assert.ok(record.menuLeft>=record.panelLeft-2&&record.menuRight<=record.panelRight+2,
        'chooser width overflows editor panel: '+JSON.stringify(record));
     }
     // Exercise touch/scroll/selection on actual runtime menus via Playwright.
     const geom=page.locator('#geometryEditor').last();
     // Each synthetic instance was closed; instantiate one active editor.
     await page.evaluate(()=>{
      const item={id:'touch-1',name:'Dachsteingebirge',layerId:'a0',kind:'area',note:'',url:''};
      const layers=Array.from({length:18},(_,n)=>({id:'a'+n,name:'Testebene '+n,visible:true,color:'#4477bb'}));
      const editor=new window.Pin2MapGeometryEditor({document,
        icons:window.Pin2MapIcons,onUpdate:(_t,_id,p)=>{Object.assign(item,p);return item},
        onDelete:()=>{},onWikipedia:()=>{}});
      editor.show('area',item,layers,{x:innerWidth*.5,y:innerHeight*.65});
      window.__safariRegression={editor,item};
     });
     await page.locator('.geometry-editor:not(.hidden) .geometry-layer').last().click();
     await page.screenshot({path:'geometry-layer-regression-artifacts/'+engine+'-'+setting.label+'-18layers.png'});
     const last=page.locator('#geometryLayerMenu:not(.hidden) .pin-layer-option').last();
     await last.click({timeout:12000});
     const picked=await page.evaluate(()=>window.__safariRegression.item.layerId);
     assert.equal(picked,'a17','last row not clickable after scroll');
     console.log('SAFARI_REGRESSION_PASS',engine,setting.label,'last layer selectable');
    }finally{await context.close()}
   }
  if(engine==='chromium'){
   // Separate end-to-end check with Service Worker ACTIVE (earlier cross-
   // engine tests bypass it to isolate the renderer). A fresh installed
   // shell must serve the correct popup after reload and offline restart.
   const context=await browser.newContext({
    viewport:{width:390,height:844},deviceScaleFactor:2,
    isMobile:true,hasTouch:true,serviceWorkers:'allow'});
   try{
    const page=await context.newPage();
    await page.goto(origin,{waitUntil:'domcontentloaded',timeout:45000});
    const version=await page.evaluate(async()=>{
     const reg=await Promise.race([navigator.serviceWorker.ready,
      new Promise((_,reject)=>setTimeout(()=>reject(Error('Service worker install timeout')),100000))]);
     const channel=new MessageChannel();
     return await new Promise((resolve,reject)=>{
      const t=setTimeout(()=>reject(Error('Service worker version timeout')),6000);
      channel.port1.onmessage=e=>{clearTimeout(t);resolve(e.data?.version)};
      reg.active.postMessage({type:'GET_VERSION'},[channel.port2]);
     });
    });
    const expectedNumber=require('node:fs').readFileSync('sw.js','utf8').match(/pin2map-new-v(\d+)/)?.[1];
    assert.ok(expectedNumber,'source service-worker version must be present');
    const expectedPrefix=new URL(origin).pathname.includes('/preview/')?'pin2map-preview-v':'pin2map-new-v';
    assert.equal(version,expectedPrefix+expectedNumber,'installed service worker must match release number');
    await page.reload({waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>Boolean(window.Pin2MapGeometryEditor&&window.Pin2MapObjectLayerPicker));
    await page.evaluate(()=>{
     const item={id:'installed-1',name:'Dachsteingebirge',kind:'area',layerId:'a0',note:'',url:''},
      layers=Array.from({length:18},(_,n)=>({id:'a'+n,name:'Testebene '+n,
       color:'#4477bb',visible:true}));
     const editor=new window.Pin2MapGeometryEditor({document,
      icons:window.Pin2MapIcons,onUpdate:(_t,_id,p)=>{Object.assign(item,p);return item},
      onDelete:()=>{},onWikipedia:()=>{}});
     editor.show('area',item,layers,{x:innerWidth/2,y:innerHeight*.65});
     editor.layerButton.click();
     window.__pwaReg={editor,item};
    });
    let dims=await page.evaluate(()=>{
     const p=window.__pwaReg.editor,box=p.layerMenu.getBoundingClientRect(),
      panel=p.panel.getBoundingClientRect();
     const option=p.layerPicker.options[1].button,or=option.getBoundingClientRect();
     const hit=document.elementFromPoint(or.left+or.width/2,or.top+or.height/2);
     return {width:box.width,height:box.height,panelWidth:panel.width,
      count:p.layerPicker.options.length,
      hitIsOption:hit===option||option.contains(hit),
      menuParent:p.layerMenu.parentElement?.id};
    });
    assert.ok(dims.width>=dims.panelWidth-25&&dims.height>=210&&dims.count===18,
      'installed PWA clipped its layer list: '+JSON.stringify(dims));
    assert.ok(dims.hitIsOption,'installed PWA layer rows are hidden BEHIND the object dialog: '+JSON.stringify(dims));
    assert.equal(dims.menuParent,'app',
      'installed PWA must keep geometry layer list in map app stacking context: '+JSON.stringify(dims));
    await page.screenshot({path:'geometry-layer-regression-artifacts/installed-pwa-active-sw.png'});
    await page.locator('#geometryLayerMenu .pin-layer-option').last().click();
    assert.equal(await page.evaluate(()=>window.__pwaReg.item.layerId),'a17');
    console.log('SAFARI_REGRESSION_INSTALLED_PWA_PASS',version,JSON.stringify(dims));
   }finally{await context.close()}
  }
  }finally{await browser.close()}
 }
})().catch(e=>{console.error('SAFARI_REGRESSION_FAILED',e);process.exitCode=1});
