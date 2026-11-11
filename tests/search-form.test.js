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
  const input={value:" Stuttgart "},calls=[],messages=[],results=[];
  let finish;
  const controller=new SearchForm({
    getElement:id=>({searchForm:form,searchInput:input,searchButton:button})[id],
    search:async(query,hooks)=>{
      calls.push(query);finish=hooks.onFinish;
      hooks.onStart();
      hooks.onFinish();
      return {kind,results:[{title:"Stuttgart"}]};
    },
    onResults:value=>results.push(value),
    onMessage:message=>messages.push(message)
  });
  return {controller,form,input,button,calls,messages,results};
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
  assert.match(sw,/const CACHE='pin2map-new-v105'/);
});
