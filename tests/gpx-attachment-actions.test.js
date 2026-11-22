"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const gpx=require("../application/gpx-attachment-export.js");
const Actions=require("../ui/pin-gpx-actions.js");
test("existing GPX attachment export preserves source bytes, name, and fallback",()=>{
 const pin={id:"x",name:"Berg",gpxAttachment:{filename:"Berg Tour.gpx",
   sourceGpx:"<gpx>original</gpx>",chains:[[[1,2],[3,4]]]}};
 let encoded=0;
 assert.deepEqual(gpx.prepare(pin,{pins:[pin],rivers:[{id:"r"}]},()=>{encoded++;return "generated";}),
  {content:"<gpx>original</gpx>",filename:"Berg Tour.gpx"});
 assert.equal(encoded,0);
 delete pin.gpxAttachment.sourceGpx;
 assert.deepEqual(gpx.prepare(pin,{pins:[],rivers:[{id:"r"}]},project=>{
   encoded++;
   assert.deepEqual(project.rivers,[]);
   assert.deepEqual(project.pins,[pin]);
   return "generated";
 }),{content:"generated",filename:"Berg Tour.gpx"});
 assert.equal(encoded,1);
 pin.gpxAttachment.filename="../\u003cevil\u003e.gpx";
 assert.equal(gpx.prepare(pin,{},()=>"x").filename,"..--evil-.gpx");
 assert.throws(()=>gpx.prepare({}, {},()=>""),/GPX-Anhang/);
});
test("GPX overlay and export are controlled through one isolated UI controller",()=>{
 const handlers={},attributes={},events=[],notice=[];
 const buttons={};
 for(const id of ["pinGpxRoute","pinGpxExport"]){
   buttons[id]={textContent:"",setAttribute(k,v){attributes[id+":"+k]=v;},
     addEventListener(type,fn){handlers[id+":"+type]=fn;}};
 }
 let pin={id:"a",gpxAttachment:{chains:[[[1,2],[3,4]]]}};
 const actions=new Actions({getElement:id=>buttons[id],getPin:()=>pin,
   mapPort:{show:chains=>events.push(["show",chains]),clear:()=>events.push(["clear"])},
   prepareExport:p=>({content:"GPX-"+p.id,filename:"name.gpx"}),
   download:(content,name)=>events.push(["download",content,name]),
   onNotice:message=>notice.push(message)});
 actions.bind();
 handlers["pinGpxRoute:click"]();
 assert.equal(buttons.pinGpxRoute.textContent,"Route verbergen");
 assert.equal(attributes["pinGpxRoute:aria-pressed"],"true");
 handlers["pinGpxExport:click"]();
 assert.deepEqual(events.at(-1),["download","GPX-a","name.gpx"]);
 handlers["pinGpxRoute:click"]();
 assert.equal(buttons.pinGpxRoute.textContent,"Route anzeigen");
 assert.equal(attributes["pinGpxRoute:aria-pressed"],"false");
 pin={id:"b",gpxAttachment:{chains:[[[5,6],[7,8]]]}};
 handlers["pinGpxRoute:click"]();
 assert.equal(actions.activePinId,"b");
 actions.hide();
 assert.equal(actions.activePinId,null);
 assert.deepEqual(notice,[]);
});
