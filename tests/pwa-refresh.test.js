"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {refresh,parseVersion}=require("../ui/pwa-refresh.js");

function scenario({online=true,activate=true,stuck=false,saveFails=false,expected="pin2map-preview-v46"}={}){
  const notices=[],calls=[],button={
    disabled:false,attrs:{},
    setAttribute(k,v){this.attrs[k]=v;},
    removeAttribute(k){delete this.attrs[k];}
  };
  const workerVersion=version=>({
    state:"activated",
    postMessage(message,ports){
      assert.equal(message.type,"GET_VERSION");
      ports[0].send(version);
    }
  });
  // MessageChannel in a browser: posted port2 delivers to port1.
  class MessageChannel{
    constructor(){
      this.port1={onmessage:null,close(){}};
      this.port2={send:version=>{
        queueMicrotask(()=>this.port1.onmessage?.({data:{version}}));
      }};
    }
  }
  const active=workerVersion(expected);
  const controlled=workerVersion(expected);
  const pending=workerVersion("pin2map-preview-v45");
  let ready=activate;
  const registration={
    active:activate?active:pending,
    waiting:null,installing:null,
    async update(){calls.push("update");}
  };
  let currentController=activate?controlled:pending;
  const env={
    navigator:{
      onLine:online,
      serviceWorker:{
        async register(path,options){
          calls.push("register");
          assert.match(path,/^https:\/\/example\.test\/preview\/sw\.js\?__p2m_release=pin2map-preview-v46$/);
          assert.equal(options.scope,"./");
          assert.equal(options.updateViaCache,"none");
          return registration;
        },
        get controller(){return currentController;}
      }
    },
    MessageChannel,
    location:{
      href:"https://example.test/preview/?a=b",
      replace(href){calls.push("replace");this.replaced=href;}
    },
    async fetch(url,options){
      calls.push("fetch");
      assert.ok(url.includes("sw.js?refresh="));
      assert.equal(options.cache,"no-store");
      return {ok:true,text:async()=>`const CACHE='${expected}';`};
    }
  };
  if(!activate&&!stuck){
    registration.update=async()=>{
      calls.push("update");
      registration.active=active;
      currentController=controlled;
    };
  }
  return {env,calls,notices,button,save:async()=>{
    calls.push("save");
    if(saveFails)throw Error("disk full");
  },showNotice:msg=>notices.push(msg)};
}
test("reject malformed remote worker version",()=>{
  assert.equal(parseVersion("const CACHE='pin2map-preview-v46';"),"pin2map-preview-v46");
  assert.throws(()=>parseVersion("no cache declaration"),/Serverversion/);
});
test("refresh saves first and reloads only after matching active and controlled SW",async()=>{
  const v=scenario({activate:false});
  const result=await refresh({...v,timeoutMs:1500});
  assert.equal(result,true);
  assert.deepEqual(v.calls,["save","fetch","register","update","replace"]);
  assert.match(v.env.location.replaced,/v=pin2map-preview-v46/);
  assert.ok(v.env.location.replaced.includes("loaded="));
});
test("offline means no network fetch and button can be clicked again",async()=>{
  const v=scenario({online:false});
  assert.equal(await refresh({...v}),false);
  assert.deepEqual(v.calls,["save"]);
  assert.equal(v.button.disabled,false);
  assert.equal(v.notices.at(-1),"Offline – Aktualisierung benötigt Internet");
});
test("failed data save prevents any update",async()=>{
  const v=scenario({saveFails:true});
  assert.equal(await refresh({...v}),false);
  assert.deepEqual(v.calls,["save"]);
  assert.equal(v.button.attrs["aria-busy"],undefined);
});

test("failed worker activation never reloads or clears local project",async()=>{
  const v=scenario({activate:false,stuck:true});
  const result=await refresh({...v,timeoutMs:100});
  assert.equal(result,false);
  assert.ok(!v.calls.includes("replace"));
  assert.deepEqual(v.calls,["save","fetch","register","update"]);
  assert.equal(v.button.disabled,false);
  assert.equal(v.notices.at(-1),
    "Aktualisierung nicht abgeschlossen – Verbindung prüfen und erneut versuchen");
});
