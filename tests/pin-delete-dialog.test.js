"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const PinDeleteDialog=require("../ui/pin-delete-dialog.js");
function fixture(){
  const listeners=new Map();
  function element(id){
    const attributes=new Map(),classes=new Set();
    return {id,open:false,returnValue:"",
      setAttribute:(name,value)=>attributes.set(name,String(value)),
      getAttribute:name=>attributes.get(name)??null,
      classList:{
        toggle:(name,on)=>{if(on)classes.add(name);else classes.delete(name);return on;},
        contains:name=>classes.has(name),remove:name=>classes.delete(name)
      },
      addEventListener:(event,fn)=>{const key=id+":"+event;listeners.set(key,[...(listeners.get(key)||[]),fn]);},
      removeEventListener:(event,fn)=>{const key=id+":"+event;listeners.set(key,(listeners.get(key)||[]).filter(h=>h!==fn));},
      fire(event){for(const handler of listeners.get(id+":"+event)||[])handler();}};
  }
  const button=element("deletePin"),dialog=element("deleteDialog"),confirmed=[];
  let selected="pin-1";let openings=0;
  dialog.show=()=>{dialog.open=true;openings++;};
  dialog.showModal=()=>{throw Error("Delete confirmation must not make its on/off trigger inert");};
  dialog.close=(value)=>{dialog.returnValue=value;dialog.open=false;dialog.fire("close");};
  const documentListeners=new Map();
  dialog.ownerDocument={
    addEventListener:(type,fn)=>documentListeners.set(type,fn),
    removeEventListener:(type,fn)=>{if(documentListeners.get(type)===fn)documentListeners.delete(type);}
  };
  const controller=new PinDeleteDialog({
    getElement:id=>({deletePin:button,deleteDialog:dialog})[id],
    getSelectedPinId:()=>selected,
    onConfirm:id=>confirmed.push(id)
  });
  return {controller,button,dialog,confirmed,getOpenings:()=>openings,select:id=>selected=id,
    keydown:key=>documentListeners.get("keydown")?.({key,preventDefault:()=>{}})};
}
test("confirm deletes only the id captured when the dialog opened",()=>{
  const x=fixture();x.controller.bind();
  assert.equal(x.button.getAttribute("aria-expanded"),"false");
  x.button.fire("click");
  assert.equal(x.button.getAttribute("aria-expanded"),"true");
  assert.equal(x.button.classList.contains("is-active"),true);
  x.select("pin-2");x.dialog.close("confirm");
  assert.deepEqual(x.confirmed,["pin-1"]);
  assert.equal(x.button.getAttribute("aria-expanded"),"false");
  assert.equal(x.button.classList.contains("is-active"),false);
});
test("cancel and Escape-equivalent dismissal never invoke deletion",()=>{
  const x=fixture();x.controller.bind();x.button.fire("click");x.dialog.close("cancel");
  x.button.fire("click");x.dialog.close("");
  assert.deepEqual(x.confirmed,[]);
  assert.equal(x.button.getAttribute("aria-expanded"),"false");
  assert.equal(x.button.classList.contains("is-active"),false);
});
test("a second tap on the same delete trigger turns off the confirmation without deletion",()=>{
  const x=fixture();x.controller.bind();
  x.button.fire("click");
  assert.equal(x.dialog.open,true);
  assert.equal(x.button.getAttribute("aria-expanded"),"true");
  x.select("pin-2"); // even if selection changes, the toggle only closes
  x.button.fire("click");
  assert.equal(x.dialog.open,false);
  assert.equal(x.button.getAttribute("aria-expanded"),"false");
  assert.deepEqual(x.confirmed,[]);
  assert.equal(x.getOpenings(),1);
  x.button.fire("click");
  assert.equal(x.dialog.open,true);
  assert.equal(x.getOpenings(),2);
  x.dialog.close("confirm");
  assert.deepEqual(x.confirmed,["pin-2"]);
});
test("no selected pin does not open a dialog; repeated click while open always cancels",()=>{
  const x=fixture();x.controller.bind();x.select(null);x.button.fire("click");
  assert.equal(x.getOpenings(),0);
  x.select("pin-1");x.button.fire("click");x.select("pin-2");x.button.fire("click");
  assert.equal(x.getOpenings(),1);
  assert.equal(x.dialog.open,false);
  assert.deepEqual(x.confirmed,[]);
});
test("Escape cancels the nonmodal confirmation and resets blue state",()=>{
  const x=fixture();x.controller.bind();x.button.fire("click");
  let prevented=false;
  x.dialog.ownerDocument.addEventListener("keydown",event=>{
    if(event.key==="Escape")prevented=true;
  }); // event still reaches registered handler; no destructive confirmation
  x.keydown("Escape");
  assert.equal(x.dialog.open,false);
  assert.equal(x.button.getAttribute("aria-expanded"),"false");
  assert.deepEqual(x.confirmed,[]);
});
test("bind once, dispose unbinds both listeners, rebinding is supported",()=>{
  const x=fixture();x.controller.bind();x.controller.bind();x.button.fire("click");x.dialog.close("confirm");
  assert.deepEqual(x.confirmed,["pin-1"]);
  x.controller.dispose();x.button.fire("click");assert.equal(x.getOpenings(),1);
  assert.equal(x.button.getAttribute("aria-expanded"),"false");
  x.controller.bind();x.button.fire("click");x.dialog.close("confirm");
  assert.deepEqual(x.confirmed,["pin-1","pin-1"]);
});
test("new UI module is before app and part of offline shell, mutations remain in app",()=>{
  const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
  const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
  const sw=fs.readFileSync(path.resolve(__dirname,"../sw.js"),"utf8");
  assert.match(app,/new window\.Pin2MapPinDeleteDialog/);
  assert.match(app,/pinDeleteDialog\.bind\(\)/);
  assert.match(app,/pinOps\.deletePin\(state,id\)/);
  assert.doesNotMatch(app,/\$\("deleteDialog"\)\.addEventListener\("close"/);
  assert.ok(html.indexOf("./ui/pin-delete-dialog.js")>html.indexOf("./ui/bulk-delete-dialog.js"));
  assert.ok(html.indexOf("./ui/pin-delete-dialog.js")<html.indexOf("./app.js"));
  assert.match(sw,/"\.\/ui\/pin-delete-dialog\.js"/);
  assert.match(sw,/const CACHE='pin2map-new-v\d+'/);
});
