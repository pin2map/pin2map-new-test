"use strict";
/* Browser-engine cross-check of the *published* development preview.
 * WebKit is the Safari rendering engine, but Linux WebKit is not proof of
 * real iOS Safari or of a user's existing service-worker installation.
 */
const assert=require('node:assert/strict');
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
       const sample={engine:'',label,kind,menuWidth:box.width,menuHeight:box.height,
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
     await page.locator('#geometryEditor .geometry-layer').last().click();
     const last=page.locator('#geometryLayerMenu .pin-layer-option').last();
     await last.click({timeout:12000});
     const picked=await page.evaluate(()=>window.__safariRegression.item.layerId);
     assert.equal(picked,'a17','last row not clickable after scroll');
     console.log('SAFARI_REGRESSION_PASS',engine,setting.label,'last layer selectable');
    }finally{await context.close()}
   }
  }finally{await browser.close()}
 }
})().catch(e=>{console.error('SAFARI_REGRESSION_FAILED',e);process.exitCode=1});
