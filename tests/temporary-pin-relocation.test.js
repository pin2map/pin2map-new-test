"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
const begin=app.indexOf("  function beginTemporaryMove(entry){");
const end=app.indexOf("  // All creation pathways must stage an ephemeral object first.",begin);
assert.ok(begin>=0&&end>begin,"actual temporary move implementation must exist");
const moveImplementation=app.slice(begin,end);
function fixture({autoNamed=true,name="Bebra"}={}){
 let current=null,previewPoint=null,clears=0,saves=0,views=[],requests=[],
 guideStarts=[],guideStops=0,invalidations=0,showCount=0;
 const temporaryLayerPicker={close(){}},platePanel={close(){}},
  manualPinLocality={invalidate(){invalidations++},resolve:entry=>{
    requests.push({point:{...entry.point},name:entry.name,mapZoom:entry.mapZoom});
  }};
 const moveView={clear(){clears++;previewPoint=null},
  current(){return previewPoint},
  show(point){previewPoint={...point}}};
 const moveGuide={start:point=>guideStarts.push({...point}),stop(){guideStops++}};
 const mapAdapter={getViewport:()=>({zoom:16})};
 const projectModel={position:(lat,lng)=>{
   if(Math.abs(lat)>90||Math.abs(lng)>180)throw Error("Out of range");
   return {lat,lng};
 }};
 const uiState={moveMode:false};
 const updateModeUI=()=>{};
 const showObjectPreview=entry=>{views.push({position:{...entry.point},
    name:entry.name,label:entry.label});showCount++;return entry};
 const actions=new Function("deps",`
  let {temporaryLayerPicker,platePanel,manualPinLocality,moveView,moveGuide,
   mapAdapter,projectModel,uiState,updateModeUI,showObjectPreview}=deps;
  let temporaryMoveEntry=null;
  ${moveImplementation}
  return {beginTemporaryMove,previewTemporaryMove,cancelTemporaryMove,confirmTemporaryMove,
   getCurrent:()=>temporaryMoveEntry};`)({
   temporaryLayerPicker,platePanel,manualPinLocality,moveView,moveGuide,
   mapAdapter,projectModel,uiState,updateModeUI,showObjectPreview
  });
 const entry={kind:"point",point:{lat:50.971,lng:9.795},label:name,name,
  autoNamed,mapZoom:12};
 return {actions,entry,requests,views,guideStarts,stats:()=>({clears,guideStops,
  invalidations,showCount,saves})};
}
test("move is staged and not committed until existing move confirm is pressed",()=>{
 const x=fixture();
 assert.equal(x.actions.beginTemporaryMove(x.entry),true);
 assert.equal(x.actions.previewTemporaryMove({lat:51.001,lng:9.84}),true);
 assert.deepEqual(x.entry.point,{lat:50.971,lng:9.795});
 assert.equal(x.entry.name,"Bebra");
 assert.equal(x.requests.length,0);
 assert.equal(x.actions.confirmTemporaryMove(),true);
 assert.deepEqual(x.entry.point,{lat:51.001,lng:9.84});
 assert.equal(x.stats().saves,0);
 assert.equal(x.views.length,1);
 assert.equal(x.entry.mapZoom,16);
});
test("map-click pin is re-geocoded at new Hein(e)bach location only after confirm",()=>{
 const x=fixture({autoNamed:true,name:"Bebra"});
 x.actions.beginTemporaryMove(x.entry);
 x.actions.previewTemporaryMove({lat:51.001,lng:9.84});
 assert.equal(x.requests.length,0);
 x.actions.confirmTemporaryMove();
 assert.equal(x.entry.label,"Neuer Pin");
 assert.equal(x.entry.name,"");
 assert.deepEqual(x.requests,[{point:{lat:51.001,lng:9.84},name:"",mapZoom:16}]);
});
test("search-generated pin keeps its search name after the same relocation",()=>{
 const x=fixture({autoNamed:false,name:"Bebra (Suchtreffer)"});
 x.actions.beginTemporaryMove(x.entry);
 x.actions.previewTemporaryMove({lat:51.001,lng:9.84});
 x.actions.confirmTemporaryMove();
 assert.equal(x.entry.name,"Bebra (Suchtreffer)");
 assert.equal(x.entry.label,"Bebra (Suchtreffer)");
 assert.equal(x.requests.length,0);
});
test("cancel preserves original location and label and never re-geocodes",()=>{
 const x=fixture();
 x.actions.beginTemporaryMove(x.entry);
 x.actions.previewTemporaryMove({lat:51.001,lng:9.84});
 assert.equal(x.actions.cancelTemporaryMove(),true);
 assert.equal(x.actions.confirmTemporaryMove(),false);
 assert.deepEqual(x.entry.point,{lat:50.971,lng:9.795});
 assert.equal(x.entry.label,"Bebra");
 assert.equal(x.requests.length,0);
});
test("invalid target leaves temporary point untouched",()=>{
 const x=fixture();x.actions.beginTemporaryMove(x.entry);
 x.actions.previewTemporaryMove({lat:100,lng:9.84});
 assert.equal(x.actions.confirmTemporaryMove(),false);
 assert.deepEqual(x.entry.point,{lat:50.971,lng:9.795});
 assert.equal(x.requests.length,0);
});
test("only a map-click marker sets autoNamed, never search or GPS",()=>{
 assert.match(app,/function addPin\(lat,lng,name,source="search"\)/);
 assert.match(app,/autoNamed:source==="map"&&!name/);
 assert.match(app,/onPin:point=>addPin\(point.lat,point.lng,"","map"\)/);
 assert.match(app,/onAccept:\(point,name,"gps"\)=>addPin\(point.lat,point.lng,name\)/);
 assert.match(app,/addPin:\(lat,lng,name\)=>addPin\(lat,lng,name\)/);
 assert.match(app,/onMove:entry=>beginTemporaryMove\(entry\)/);
});
