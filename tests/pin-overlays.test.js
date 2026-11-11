"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {layout,escapeHtml,PinMarkerView}=require("../ui/pin-marker-view.js");
const {barPlacement,PinMovePreview}=require("../ui/pin-move-preview.js");

const basic=(pins,opts={})=>layout(pins,{
  selectedPinId:opts.selectedPinId??null,labelsVisible:opts.labelsVisible??true,
  size:{x:400,y:500},project:p=>({x:p.lng,y:p.lat}),
  cleanText:v=>String(v||"").trim(),colorsByLayer:{a:"#123456"},defaultColor:"#000000"
});

test("pin labels use the legacy permanent right tooltip contract",()=>{
  const p=basic([{id:"1",name:"Named pin",layerId:"a",lat:5,lng:20}])[0];
  assert.equal(p.label,"Named pin");
  assert.equal(p.side,"right");
  assert.doesNotMatch(p.appearance.html,/pin-side-label|Named pin/);
  assert.match(p.appearance.html,/#123456/);
});

test("overlapping names stay visible and source ordering is preserved",()=>{
  const pins=[
    {id:"a",name:"alpha",lat:100,lng:100,layerId:"a"},
    {id:"b",name:"beta",lat:100,lng:100,layerId:"a"},
    {id:"c",name:"charlie",lat:100,lng:100,layerId:"a"}
  ];
  const result=basic(pins,{selectedPinId:"c"});
  assert.deepEqual(result.map(x=>x.pin.id),["a","b","c"]);
  assert.deepEqual(result.map(x=>x.label),["alpha","beta","charlie"]);
  assert.deepEqual(result.map(x=>x.side),["right","right","right"]);
  assert.equal(pins[0].id,"a");
});

test("hidden names include selected pin, while marker itself remains visible",()=>{
  const pins=[
    {id:"a",name:"first",lat:100,lng:100,layerId:"a"},
    {id:"b",name:"second",lat:100,lng:250,layerId:"a"}
  ];
  const result=basic(pins,{selectedPinId:"b",labelsVisible:false});
  assert.deepEqual(result.map(x=>x.label),["",""]);
  assert.equal(result[1].selected,true);
  assert.match(result[1].appearance.html,/selected/);
});

function mapFixture(){
  const calls={created:[],removed:[],appearance:[],labels:[],lines:[],positions:[],clicks:[]};
  const adapter={
    getSize:()=>({x:400,y:500}),project:p=>({x:p.lng,y:p.lat}),
    createMarker:(p,opts)=>{const marker={p,opts};calls.created.push(marker);return marker;},
    onMarker:(marker,type,handler)=>{calls.clicks.push({marker,type,handler});},
    setMarkerPosition:(marker,p)=>{marker.p=p;calls.positions.push(p);},
    setMarkerAppearance:(marker,look)=>calls.appearance.push(look),
    setMarkerLabel:(marker,label)=>calls.labels.push({marker,label}),
    removeOverlay:marker=>calls.removed.push(marker),
    createLine:(points,opts)=>{const line={points,opts};calls.lines.push(line);return line;},
    setLinePositions:(line,points)=>{line.points=points;},
    getContainer:()=>({getBoundingClientRect:()=>({left:10,top:20})})
  };
  return {adapter,calls};
}
test("renderer reuses markers and synchronizes their independent tooltip labels",()=>{
  const {adapter,calls}=mapFixture(),selected=[],attached=[];
  const view=new PinMarkerView({mapAdapter:adapter,onSelect:id=>selected.push(id),
    attachGesture:(marker,id)=>attached.push(id),cleanText:v=>v||"",defaultColor:"#000"});
  const a={id:"a",name:"A",lat:40,lng:30,layerId:"a"};
  const b={id:"b",name:"B",lat:50,lng:60,layerId:"a"};
  const layers=[{id:"a",color:"#123456"}];
  view.render({pins:[a,b],layers});
  assert.equal(calls.created.length,2);
  assert.deepEqual(calls.labels.map(x=>x.label),["A","B"]);
  view.render({pins:[b],layers,labelsVisible:false});
  assert.equal(calls.created.length,2);
  assert.equal(calls.labels.at(-1).label,"");
  assert.equal(calls.removed.length,1);
  assert.equal(view.markers.has("a"),false);
  calls.clicks[1].handler();
  assert.deepEqual(selected,["b"]);
  assert.deepEqual(attached,["a","b","b"]);
});
test("placement bar selects below or above, clamping horizontal location",()=>{
  const basis={mapRect:{left:10,top:20},appRect:{left:0,top:0},
    width:120,height:50,viewport:{offsetLeft:0,offsetTop:0,width:320,height:400}};
  const below=barPlacement({...basis,point:{x:3,y:20}});
  assert.equal(below.left,8);
  assert.equal(below.top,70);
  const above=barPlacement({...basis,point:{x:290,y:350}});
  assert.equal(above.left,192);
  assert.equal(above.top,290);
});
test("temporary preview creates marker and line, updates and clears without mutating pin",()=>{
  const {adapter,calls}=mapFixture();
  const nodes=Object.fromEntries(["confirmMove","moveBar","moveText"].map(id=>[id,{
    disabled:true,textContent:"",offsetWidth:120,offsetHeight:50,
    style:{},hidden:true,
    classList:{contains:()=>false,add(){},remove(){}}
  }]));
  const preview=new PinMovePreview({
    mapAdapter:adapter,getElement:id=>nodes[id],
    getAppRect:()=>({left:0,top:0,width:320,height:400}),
    getViewport:()=>({offsetLeft:0,offsetTop:0,width:320,height:400}),
    onPosition:()=>{}
  });
  const pin={id:"p",lat:48,lng:9};
  preview.show({lat:49,lng:10},pin);
  assert.deepEqual(preview.current(),{lat:49,lng:10});
  assert.equal(calls.created.length,1);assert.equal(calls.lines.length,1);
  assert.deepEqual(calls.lines[0].points,[[48,9],{lat:49,lng:10}]);
  preview.show({lat:50,lng:11},pin);
  assert.equal(calls.created.length,1);assert.equal(calls.lines.length,1);
  assert.equal(calls.lines[0].points[1].lat,50);
  assert.deepEqual(pin,{id:"p",lat:48,lng:9});
  preview.clear();
  assert.equal(preview.current(),null);
  assert.equal(calls.removed.length,2);
  assert.equal(nodes.confirmMove.disabled,true);
});

test("preview errors report failing adapter phase without mutating the pin",()=>{
  const {adapter}=mapFixture();
  const nodes=Object.fromEntries(["confirmMove","moveBar","moveText"].map(id=>[id,{
    disabled:true,classList:{add(){},remove(){},contains:()=>false},
    style:{},offsetWidth:120,offsetHeight:50
  }]));
  const original=adapter.createLine;
  adapter.createLine=()=>{throw new TypeError("Illegal invocation");};
  const preview=new PinMovePreview({
    mapAdapter:adapter,getElement:id=>nodes[id],
    getAppRect:()=>({left:0,top:0,width:320,height:400}),
    getViewport:()=>({offsetLeft:0,offsetTop:0,width:320,height:400}),
    onPosition:()=>{}
  });
  const pin={id:"a",lat:48,lng:9};
  assert.throws(()=>preview.show({lat:49,lng:10},pin),
    /Pin move preview failed at create or update preview line: Illegal invocation/);
  assert.deepEqual(pin,{id:"a",lat:48,lng:9});
  adapter.createLine=original;
});
