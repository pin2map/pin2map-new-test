"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=file=>fs.readFileSync(path.resolve(__dirname,"..",file),"utf8");
const model=require("../domain/project-model.js");
const palette=require("../application/layer-palette.js");
const ops=require("../application/layer-operations.js");
test("Privat is immediately selected for new records, not via the obsolete layer-choice step",()=>{
 const app=read("app.js"),service=read("application/object-creation-service.js");
 const controller=read("ui/object-acceptance-controller.js");
 assert.match(app,/privateId:PRIVATE_ID/);
 assert.match(controller,/this.service.create\(this.getProject\(\),entry,this.privateId\)/);
 assert.match(service,/name,layerId(?:[,\s]|\})/);
 assert.doesNotMatch(controller,/temporaryLayerPicker\.show|platePanel\.show|onAccept:/);
});
test("Privat has an editable color but retains its fixed name and protected identity",()=>{
 const project=model.defaultProject();
 assert.equal(project.layers[0].color,"#E64294");
 assert.ok(ops.renameAndColor(project,"private","Privat","#123456",model.cleanText,palette.hex));
 assert.equal(project.layers[0].color,"#123456");
 assert.equal(project.privateColorCustomized,true);
 assert.equal(ops.renameAndColor(project,"private","Andere","#000000",model.cleanText,palette.hex),false);
 assert.equal(project.layers[0].name,"Privat");
 assert.equal(ops.removeEntireLayer(project,"private"),false);
});
test("gray chosen explicitly for Privat persists while uncustomized legacy gray becomes pink",()=>{
 const custom=model.defaultProject();custom.layers[0].color="#808080";
 custom.privateColorCustomized=true;palette.repairPrivate(custom);
 assert.equal(custom.layers[0].color,"#808080");
 const legacy=model.defaultProject();legacy.layers[0].color="#808080";
 palette.repairPrivate(legacy);assert.equal(legacy.layers[0].color,"#E64294");
});