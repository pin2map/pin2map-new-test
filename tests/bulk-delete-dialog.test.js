"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const BulkDeleteDialog=require("../ui/bulk-delete-dialog.js");
function setup(){
  const listeners=new Map();
  const dialog={
    open:false,returnValue:"",addEventListener:(kind,cb)=>listeners.set(kind,cb),
    removeEventListener:(kind,cb)=>{if(listeners.get(kind)===cb)listeners.delete(kind);},
    showModal(){this.open=true;},
    close(value){this.returnValue=value;this.open=false;listeners.get("close")?.();}
  };
  const title={textContent:""},description={textContent:""},confirmed=[];
  const controller=new BulkDeleteDialog({
    getElement:id=>({bulkDialog:dialog,bulkTitle:title,bulkDescription:description})[id],
    onConfirm:id=>confirmed.push(id)
  });
  return {controller,dialog,title,description,confirmed,listeners};
}
test("non-private layer confirmation preserves text and invokes only confirmed id",()=>{
  const x=setup();
  x.controller.show("layer-1",{allowed:true,privateOnly:false,count:3,layer:{name:"Reisen"}});
  assert.equal(x.title.textContent,"Ebene „Reisen“ löschen?");
  assert.equal(x.description.textContent,"Die Ebene und 3 zugeordnete Pins werden gelöscht.");
  assert.equal(x.dialog.returnValue,"cancel");
  x.dialog.close("confirm");
  assert.deepEqual(x.confirmed,["layer-1"]);
});
test("private layer wording retains the layer and only promises deleting private pins",()=>{
  const x=setup();
  x.controller.show("private",{allowed:true,privateOnly:true,count:2,layer:{name:"Privat"}});
  assert.equal(x.title.textContent,"Alle Pins in Privat löschen?");
  assert.equal(x.description.textContent,"Die Ebene Privat bleibt bestehen. 2 Pins werden gelöscht.");
  x.dialog.close("confirm");
  assert.deepEqual(x.confirmed,["private"]);
});
test("cancel, Escape-equivalent and repeated opens never delete without confirm",()=>{
  const x=setup(),info={allowed:true,privateOnly:false,count:0,layer:{name:"Leer"}};
  x.controller.show("one",info);
  x.dialog.close("cancel");
  x.controller.show("two",info);
  x.dialog.close("");
  assert.deepEqual(x.confirmed,[]);
  x.controller.show("three",info);
  x.dialog.close("confirm");
  assert.deepEqual(x.confirmed,["three"]);
  x.controller.dispose();
  x.controller.show("four",info);
  x.dialog.close("confirm");
  assert.deepEqual(x.confirmed,["three"]);
});
test("invalid details and concurrent dialog attempts cannot trigger deletion",()=>{
  const x=setup();
  assert.throws(()=>x.controller.show("private",{allowed:false,layer:{name:"Privat"},count:0}),/Allowed/);
  const info={allowed:true,privateOnly:false,layer:{name:"Reisen"},count:1};
  x.controller.show("one",info);
  assert.throws(()=>x.controller.show("two",info),/already open/);
  x.dialog.close("confirm");
  assert.deepEqual(x.confirmed,["one"]);
});
test("composition, offline shell and script order protect the new UI boundary",()=>{
  const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
  const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
  const sw=fs.readFileSync(path.resolve(__dirname,"../sw.js"),"utf8");
  assert.match(app,/new window\.Pin2MapBulkDeleteDialog/);
  assert.match(app,/bulkDeleteDialog\.show\(id,info\)/);
  assert.match(app,/layerOps\.deleteLayerOrPins\(state,id,PRIVATE_ID\)/);
  assert.doesNotMatch(app,/\$\("bulkDialog"\)\.onclose=/);
  assert.ok(html.indexOf('./ui/bulk-delete-dialog.js')>html.indexOf('./ui/layer-view.js'));
  assert.ok(html.indexOf('./ui/bulk-delete-dialog.js')<html.indexOf('./app.js'));
  assert.match(sw,/"\.\/ui\/bulk-delete-dialog\.js"/);
  assert.match(sw,/const CACHE='pin2map-new-v\d+'/);
});
