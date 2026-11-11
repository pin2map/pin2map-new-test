"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const SearchForm=require("../ui/search-form.js");
function fixture(kind="results"){
  const listeners=new Map(),button={disabled:false};
  const form={
    addEventListener:(type,fn)=>listeners.set(type,fn),
    removeEventListener:(type,fn)=>{if(listeners.get(type)===fn)listeners.delete(type);},
    emit:()=>listeners.get("submit")?.({preventDefault(){}})
  };
  const inputListeners=new Map();
  const input={value:" Stuttgart ",addEventListener:(type,fn)=>inputListeners.set(type,fn),
    removeEventListener:(type,fn)=>{if(inputListeners.get(type)===fn)inputListeners.delete(type);},
    emitInput:()=>inputListeners.get("input")?.()},calls=[],messages=[],results=[];
  let finish;
  let cancelled=0,dismissed=0;
  const controller=new SearchForm({
    getElement:id=>({searchForm:form,searchInput:input,searchButton:button})[id],
    search:async(query,hooks)=>{
      calls.push(query);finish=hooks.onFinish;
      hooks.onStart();
      hooks.onFinish();
      return {kind,results:[{title:"Stuttgart"}]};
    },
    onResults:value=>results.push(value),
    onMessage:message=>messages.push(message),
    cancelSearch:()=>cancelled++,onInputChange:()=>dismissed++
  });
  return {controller,form,input,button,calls,messages,results,
    getCancelled:()=>cancelled,getDismissed:()=>dismissed};
}
test("empty or whitespace searches do nothing; bind and dispose manage one listener",async()=>{
  const x=fixture();x.controller.bind();x.controller.bind();
  x.input.value="  ";
  await x.controller.submit({preventDefault(){}});
  assert.deepEqual(x.calls,[]);
  x.controller.dispose();
  assert.equal(x.form.emit(),undefined);
});
test("results and button state are delegated without invoking geocoding directly",async()=>{
  const x=fixture();await x.controller.submit({preventDefault(){}});
  assert.deepEqual(x.calls,["Stuttgart"]);
  assert.equal(x.button.disabled,false);
  assert.equal(x.results.length,1);
  assert.deepEqual(x.messages,["Ort wird gesucht …"]);
});
for(const [kind,message] of [
  ["disabled","Ortssuche im Test noch nicht aktiviert."],
  ["throttled","Bitte kurz warten"],
  ["error","Ortssuche derzeit nicht verfügbar."]
]){
  test(kind+" shows the preserved notice",async()=>{
    const x=fixture(kind);await x.controller.submit();
    assert.ok(x.messages.at(-1).startsWith(message));
    assert.deepEqual(x.results,[]);
  });
}
test("stale searches produce no result or error notice",async()=>{
  const x=fixture("stale");await x.controller.submit();
  assert.deepEqual(x.results,[]);
  assert.deepEqual(x.messages,["Ort wird gesucht …"]);
});
test("wiring, script ordering, offline app shell and release are synchronized",()=>{
  const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
  const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
  const sw=fs.readFileSync(path.resolve(__dirname,"../sw.js"),"utf8");
  assert.match(app,/new window\.Pin2MapSearchFormController/);
  assert.match(app,/searchForm\.bind\(\)/);
  assert.doesNotMatch(app,/async function runSearch\(/);
  assert.ok(html.indexOf("./ui/search-form.js")>html.indexOf("./ui/search-results.js"));
  assert.ok(html.indexOf("./ui/search-form.js")<html.indexOf("./app.js"));
  assert.match(sw,/"\.\/ui\/search-form\.js"/);
  assert.match(sw,/const CACHE='pin2map-new-v\d+'/); // App shell release can advance independently.
});

test("editing or clearing input closes results, cancels search and suppresses late result",async()=>{
  const x=fixture();x.controller.bind();
  x.input.value="Stuttgart X";x.input.emitInput();
  assert.equal(x.getDismissed(),1);
  assert.equal(x.getCancelled(),1);
  assert.equal(x.button.disabled,false);
  x.input.value="";x.input.emitInput();
  assert.equal(x.getDismissed(),2);
  assert.equal(x.getCancelled(),2);
  x.controller.dispose();
  x.input.emitInput();
  assert.equal(x.getDismissed(),2);
});
test("late results cannot reopen results after edit; explicit submit can reopen",async()=>{
  let resolveSearch,closed=0,abortCount=0;
  const listeners=new Map(),inputListeners=new Map(),button={disabled:false};
  const form={addEventListener:(event,fn)=>listeners.set(event,fn),
    removeEventListener:(event)=>listeners.delete(event)};
  const input={value:"Stuttgart",addEventListener:(event,fn)=>inputListeners.set(event,fn),
    removeEventListener:(event)=>inputListeners.delete(event)};
  const results=[];
  const ctl=new SearchForm({getElement:id=>({searchForm:form,searchInput:input,searchButton:button})[id],
    search:()=>new Promise(resolve=>{resolveSearch=resolve;}),
    onResults:r=>results.push(r),onMessage:()=>{},
    onInputChange:()=>closed++,cancelSearch:()=>abortCount++});
  ctl.bind();
  const old=ctl.submit();
  input.value="Stuttgarter";inputListeners.get("input")();
  resolveSearch({kind:"results",results:[{name:"Stuttgart"}]});
  await old;
  assert.equal(closed,1);assert.equal(abortCount,1);
  assert.deepEqual(results,[]);
  const fresh=ctl.submit();
  resolveSearch({kind:"results",results:[{name:"Stuttgarter"}]});
  await fresh;
  assert.equal(results.length,1);
  ctl.dispose();
});
