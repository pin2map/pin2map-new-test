"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Flash=require("../ui/recent-object-flash.js");
function fixture(){
  let time=1000;const pending=[],expired=[];
  const owner=new Flash({now:()=>time,schedule:(fn,ms)=>pending.push({fn,ms}),
    onExpire:()=>expired.push(time)});
  return {owner,pending,expired,setTime:value=>time=value,advance:delta=>time+=delta,
    fire:index=>pending[index].fn()};
}
test("object highlights use exact type-qualified IDs and expire at ten seconds",()=>{
  const x=fixture();x.owner.flash("pins","1");x.owner.flash("areas","1");
  assert.deepEqual(x.owner.activeIds(),new Set(["pins:1","areas:1"]));
  assert.deepEqual(x.pending.map(x=>x.ms),[10000,10000]);
  x.advance(9999);assert.equal(x.owner.activeIds().size,2);
  x.advance(1);assert.equal(x.owner.activeIds().size,0);
  x.fire(0);x.fire(1);
  assert.equal(x.expired.length,2);
});
test("stale timer cannot end a renewed object highlight early",()=>{
  const x=fixture();x.owner.flash("lakes","a");
  x.advance(5000);x.owner.flash("lakes","a");
  x.advance(5000);x.fire(0);
  assert.deepEqual(x.owner.activeIds(),new Set(["lakes:a"]));
  assert.equal(x.expired.length,0);
  x.advance(5000);x.fire(1);
  assert.equal(x.owner.activeIds().size,0);
  assert.equal(x.expired.length,1);
});
test("unrelated object expiry does not erase the other highlight",()=>{
  const x=fixture();x.owner.flash("pins","1");x.advance(2000);
  x.owner.flash("rivers","r");x.advance(8000);x.fire(0);
  assert.deepEqual(x.owner.activeIds(),new Set(["rivers:r"]));
  assert.equal(x.expired.length,1);
});
test("UI-only module remains free of storage, Leaflet and direct DOM dependencies",()=>{
  const fs=require("node:fs"),path=require("node:path");
  const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
  const source=read("ui/recent-object-flash.js");
  const html=read("index.html"),sw=read("sw.js"),app=read("app.js");
  assert.doesNotMatch(source,/\b(?:indexedDB|localStorage|document|Leaflet)\b|\bL\./);
  assert.ok(html.indexOf('src="./ui/recent-object-flash.js"')<
    html.indexOf('src="./app.js"'));
  assert.match(sw,/"\.\/ui\/recent-object-flash\.js"/);
  assert.match(app,/getFlashIds:activeFlashIds/);
});
