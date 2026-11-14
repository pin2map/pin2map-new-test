"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {visibleAnchor,clipRing}=require("../domain/area-label-anchor.js");
const pixel=p=>({x:p.lng,y:p.lat});
const poly=ring=>({type:"Polygon",coordinates:[ring]});
test("partially visible polygon label stays inside map and its visible land",()=>{
 const area=poly([[-450,20],[150,20],[150,190],[-450,190],[-450,20]]);
 const a=visibleAnchor(area,pixel,300,220);
 assert.ok(a&&a.x>=42&&a.x<=150&&a.y>=42&&a.y<=178,
   "Visible area needs an in-frame label: "+JSON.stringify(a));
});
test("area label tracks clipped viewport when the same area extends across many screens",()=>{
 const area=poly([[-1000,-1000],[1000,-1000],[1000,1000],[-1000,1000],[-1000,-1000]]);
 const a=visibleAnchor(area,pixel,300,220);
 const b=visibleAnchor(area,p=>({x:p.lng-430,y:p.lat+85}),300,220);
 assert.ok(a&&b&&a.x>42&&a.x<258&&b.x>42&&b.x<258);
 assert.ok(a.y>42&&a.y<178&&b.y>42&&b.y<178);
});
test("lakes with holes never label a missing island",()=>{
 const lake={type:"Polygon",coordinates:[
 [[-100,-100],[300,-100],[300,300],[-100,300],[-100,-100]],
 [[85,45],[215,45],[215,175],[85,175],[85,45]]
 ]};
 const a=visibleAnchor(lake,pixel,300,220);
 assert.ok(a,"Lake with island should still show its name");
 assert.ok(!(a.x>85&&a.x<215&&a.y>45&&a.y<175),
   "Name must not be on island hole: "+JSON.stringify(a));
});
test("MultiPolygon labels a visible island even if the largest polygon is offscreen",()=>{
 const geo={type:"MultiPolygon",coordinates:[
 [[[-400,-400],[-200,-400],[-200,-200],[-400,-200],[-400,-400]]],
 [[[50,50],[210,50],[210,160],[50,160],[50,50]]]
 ]};
 const p=visibleAnchor(geo,pixel,300,220);
 assert.ok(p&&p.x>=50&&p.x<=210&&p.y>=50&&p.y<=160);
});
test("wholly invisible polygons do not leave stray interactive name markers",()=>{
 const geo=poly([[800,800],[1000,800],[1000,950],[800,950],[800,800]]);
 assert.equal(visibleAnchor(geo,pixel,300,220),null);
});
test("large intricate rings do not overflow JS argument limits",()=>{
 const ring=[];
 for(let i=0;i<80000;i++){
   const t=i*2*Math.PI/80000;
   ring.push([150+200*Math.cos(t),110+150*Math.sin(t)]);
 }
 ring.push(ring[0]);
 const p=visibleAnchor(poly(ring),pixel,300,220);
 assert.ok(p&&Number.isFinite(p.x)&&Number.isFinite(p.y));
});
test("clipped polygon preserves an in-view portion when all vertices lie outside",()=>{
 const out=clipRing([{x:-500,y:-500},{x:500,y:-500},
   {x:500,y:500},{x:-500,y:500}],40,40,260,180);
 assert.ok(out.length>=4&&out.every(p=>p.x>=40&&p.x<=260&&p.y>=40&&p.y<=180));
});
