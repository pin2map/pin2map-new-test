"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {build,bounds}=require("../research/spatial-index-prototype.cjs");
const polygon=(id,rings)=>({id,geometry:{type:"Polygon",coordinates:rings}});
const square=(x,y,d)=>[[x,y],[x+d,y],[x+d,y+d],[x,y+d],[x,y]];
test("spatial index exact polygon containment, holes and overlap",()=>{
 const features=[
  polygon("region",[square(0,0,5)]),
  polygon("hole",[square(0,0,3),square(1,1,1)]),
  polygon("unrelated",[square(-60,-60,2)])
 ];
 const idx=build(features,{cellSize:.5});
 assert.deepEqual(idx.query(1.5,1.5).matches,["region"]);
 assert.deepEqual(idx.query(2.5,2.5).matches,["region","hole"]);
 assert.deepEqual(idx.query(-59,-59).matches,["unrelated"]);
 assert.deepEqual(idx.query(9,9).matches,[]);
 assert.equal(idx.featureCount,3);
});
test("large-worldwide bbox fallback and negative coordinates",()=>{
 const idx=build([polygon("large",[square(-50,-30,100)]),polygon("tiny",[square(1,1,.1)])],
  {cellSize:1,maxCellsPerGeometry:10});
 assert.equal(idx.largeCount,1);
 assert.deepEqual(idx.query(-40,-20).matches,["large"]);
 assert.deepEqual(idx.query(1.05,1.05).matches,["large","tiny"]);
});
test("indexed query works on synthetic 10,000-feature test without scanning all polygons",()=>{
 const data=[];
 for(let x=0;x<100;x++)for(let y=0;y<100;y++)
  data.push(polygon("p"+x+"-"+y,[square(x*.1,y*.1,.08)]));
 const started=performance.now(),idx=build(data,{cellSize:.1}),built=performance.now()-started;
 const t=performance.now();let scanned=0;
 for(let i=0;i<1000;i++){
  const r=idx.query(5.03,5.03);
  assert.deepEqual(r.matches,["p50-50"]);
  scanned+=r.scanned.length;
 }
 const queryMs=performance.now()-t;
 assert.ok(scanned<10000,"index should examine far fewer than full dataset");
 console.log("SPATIAL_INDEX_PROTOTYPE",JSON.stringify({syntheticFeatures:idx.featureCount,
  cells:idx.cellCount,buildMs:Math.round(built),queries:1000,queryMs:+queryMs.toFixed(1),
  averageBBoxCandidates:scanned/1000,warning:"Synthetic shapes; not a worldwide measured API response time."}));
});
