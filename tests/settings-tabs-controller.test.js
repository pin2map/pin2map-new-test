"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const Settings=require("../ui/settings-tabs-controller.js");
const tabNames=["General","Interface","Services","Colors","Routing"];
function fixture({version="pin2map-preview-v319",estimated={usage:123456},worker=true}={}){
  const elements=new Map(),calls=[],pending=[];
  function element(id){
    if(!elements.has(id)){
      const classes=new Set(id==="settingsPanel"?["hidden"]:[]);
      const listeners=new Map();
      elements.set(id,{id,classes,listeners,tabIndex:0,
        classList:{toggle:(name,enabled)=>{enabled?classes.add(name):classes.delete(name);},
          contains:name=>classes.has(name)},
        setAttribute:(name,value)=>calls.push(["attribute",id,name,value]),
        addEventListener:(type,handler)=>listeners.set(type,handler),
        removeEventListener:(type,handler)=>{if(listeners.get(type)===handler)listeners.delete(type);}
      });
    }
    return elements.get(id);
  }
  const x=new Settings({
    getElement:element,
    renderColors:()=>calls.push(["colors"]),
    versionOf:async(...args)=>{calls.push(["version",...args]);return worker?version:null;},
    parseVersion:code=>{calls.push(["parse",code]);return code.match(/pin2map-(?:preview|new)-v\d+/)?.[0]||"nicht verfügbar";},
    getWorkerController:()=>worker?{active:true}:undefined,
    getMessageChannel:()=>function MessageChannel(){},
    fetchWorker:async(url,options)=>{calls.push(["fetch",url,options]);return {ok:true,text:async()=>version};},
    estimateStorage:async()=>{calls.push(["storage"]);return estimated;}
  });
  return {x,element,calls,pending};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test("bind initializes general tab, ARIA attributes, keyboard order and async storage values",async()=>{
  const f=fixture({version:"pin2map-preview-v319",estimated:{usage:2048}});
  f.x.bind();f.x.bind();await settle();
  assert.equal(f.element("settingsProductVersion").textContent,"v319");
  assert.equal(f.element("settingsStorageUsage").textContent,"ca. 2 KB (gesamter lokaler Speicher)");
  for(const name of tabNames){
    assert.equal(f.element("settings"+name+"Tab").tabIndex,name==="General"?0:-1);
    assert.equal(f.element("settings"+name+"Content").classList.contains("hidden"),name!=="General");
    assert.equal(f.element("settings"+name+"Tab").listeners.size,1,"no duplicate tab binding");
  }
  assert.ok(f.calls.some(x=>x[0]==="attribute"&&x[1]==="settingsGeneralTab"&&x[3]==="true"));
});
test("switching settings tabs renders colors only on Colors and reopens General",async()=>{
  const f=fixture();f.x.bind();await settle();f.calls.length=0;
  f.element("settingsColorsTab").listeners.get("click")();
  assert.equal(f.element("settingsGeneralContent").classList.contains("hidden"),true);
  assert.equal(f.element("settingsColorsContent").classList.contains("hidden"),false);
  assert.deepEqual(f.calls.filter(x=>x[0]==="colors"),[["colors"]]);
  f.element("settingsButton").listeners.get("click")();
  assert.equal(f.element("settingsColorsContent").classList.contains("hidden"),false,"closed settings must not reset tabs");
  f.element("settingsPanel").classList.toggle("hidden",false);
  f.element("settingsButton").listeners.get("click")();
  await settle();
  assert.equal(f.element("settingsGeneralContent").classList.contains("hidden"),false);
  assert.equal(f.element("settingsColorsContent").classList.contains("hidden"),true);
  assert.ok(f.calls.some(x=>x[0]==="version"));
});
test("version fallback fetch uses no-store and worker response is preferred",async()=>{
  const f=fixture({worker:false,version:"pin2map-new-v319",estimated:{usageDetails:{caches:1048576},usage:3000000}});
  f.x.bind();await settle();
  assert.equal(f.element("settingsProductVersion").textContent,"v319");
  assert.equal(f.element("settingsStorageUsage").textContent,"ca. 1 MB");
  assert.deepEqual(f.calls.filter(x=>x[0]==="fetch").map(x=>x[2]),[{cache:"no-store"}]);
  assert.match(f.calls.find(x=>x[0]==="fetch")[1],/^\.\/sw\.js\?version=\d+$/);
  assert.ok(f.calls.some(x=>x[0]==="parse"));
});
test("unavailable version or storage reports not available without interfering with other tabs",async()=>{
  const f=fixture({worker:false,version:"unmatched",estimated:null});
  f.x.bind();await settle();
  assert.equal(f.element("settingsProductVersion").textContent,"nicht verfügbar");
  assert.equal(f.element("settingsStorageUsage").textContent,"nicht verfügbar");
  f.element("settingsServicesTab").listeners.get("click")();
  assert.equal(f.element("settingsServicesContent").classList.contains("hidden"),false);
});
test("dispose removes tab and settings-button handlers; rebinding works",()=>{
  const f=fixture();f.x.bind();f.x.dispose();
  for(const name of tabNames)assert.equal(f.element("settings"+name+"Tab").listeners.size,0);
  assert.equal(f.element("settingsButton").listeners.size,0);
  f.x.bind();assert.equal(f.element("settingsGeneralTab").listeners.size,1);
});
test("offline shell and boot order include isolated settings tabs controller",()=>{
  const fs=require("node:fs"),path=require("node:path");
  const read=x=>fs.readFileSync(path.resolve(__dirname,"..",x),"utf8");
  const html=read("index.html"),app=read("app.js"),sw=read("sw.js");
  assert.ok(html.indexOf('src="./ui/settings-tabs-controller.js"')>0);
  assert.ok(html.indexOf('src="./ui/settings-tabs-controller.js"')<html.indexOf('src="./app.js"'));
  assert.match(app,/settingsTabs\.bind\(\)/);
  assert.match(sw,/"\.\/ui\/settings-tabs-controller\.js"/);
});
