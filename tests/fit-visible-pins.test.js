"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const fit=require("../application/fit-visible-pins.js");
function rig(pins,zoom=9){
  const calls=[],layers=[{id:"private",visible:true}];
  const mapPort={getViewport:()=>({zoom}),setView:(...args)=>calls.push(["setView",...args]),fitBounds:(...args)=>calls.push(["fitBounds",...args])};
  const pinFilter={visiblePins:(list,ly,filter)=>{assert.equal(list,pins);assert.equal(ly,layers);assert.equal(filter,"filter");return list;}};
  return {calls,layers,mapPort,pinFilter,options:{pins,layers,filter:"filter",mapPort,pinFilter,onEmpty:()=>calls.push(["empty"]),onFit:()=>calls.push(["layout"])}};
}
test("no visible pins only reports empty; no map change or panel relayout",()=>{
  const x=rig([]);
  assert.equal(fit(x.options),false);
  assert.deepEqual(x.calls,[["empty"]]);
});
test("single pin retains coordinates, minimum zoom 13 and no animation",()=>{
  const x=rig([{lat:48.7,lng:9.1}]);
  assert.equal(fit(x.options),true);
  assert.deepEqual(x.calls,[["setView",{center:{lat:48.7,lng:9.1},zoom:13},{animate:false}],["layout"]]);
  const y=rig([{lat:-33,lng:151}],16);
  fit(y.options);
  assert.equal(y.calls[0][1].zoom,16);
});
test("multiple pins preserve exact bounds options, order and layout callback",()=>{
  const x=rig([{lat:1,lng:2},{lat:3,lng:4}]);
  assert.equal(fit(x.options),true);
  assert.deepEqual(x.calls,[["fitBounds",[[1,2],[3,4]],{padding:[35,35],maxZoom:15,animate:false}],["layout"]]);
});
test("wiring: composition delegates to application and offline shell includes module",()=>{
  const app=fs.readFileSync(path.resolve(__dirname,"../app.js"),"utf8");
  const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
  const sw=fs.readFileSync(path.resolve(__dirname,"../sw.js"),"utf8");
  assert.match(app,/const fitVisiblePins = window\.Pin2MapFitVisiblePins;/);
  assert.match(app,/fitVisiblePins\(\{/);
  assert.ok(html.indexOf("./application/fit-visible-pins.js")<html.indexOf("./app.js"));
  assert.match(sw,/"\.\/application\/fit-visible-pins\.js"/);
  assert.match(sw,/const CACHE='pin2map-new-v\d+'/); // Versioned app shell, not a fixed release.
});
