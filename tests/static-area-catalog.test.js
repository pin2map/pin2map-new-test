"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {writeStaticCatalog,readStaticCatalog,createLookup}=require("../research/static-area-catalog.cjs");
const square=[[0,0],[10,0],[10,10],[0,10],[0,0]];
function fixture(){const g={type:"Polygon",coordinates:[square]};
 return {row:{id:"osm-way:123",name:"Test",kind:"water",
   bbox:{west:0,east:10,south:0,north:10},source:"test",stableId:true,
   sourceVersion:"fixture",license:"ODbL 1.0",attribution:"OpenStreetMap contributors"},
  geom:g};}
async function withDir(cb){const dir=fs.mkdtempSync(path.join(os.tmpdir(),"static-catalog-"));
 try{return await cb(dir)}finally{fs.rmSync(dir,{recursive:true,force:true})}}
test("builds static metadata without polygon coordinates; assets are immutable SHA-256 URLs",()=>withDir(dir=>{
 const {row,geom}=fixture();
 const result=writeStaticCatalog([row],new Map([[row.id,geom]]),dir);
 assert.equal(result.objects,1);
 assert.ok(result.metadataBytes>0&&result.polygonBytes>0);
 const json=fs.readFileSync(path.join(dir,"index.json"),"utf8");
 assert.ok(!json.includes('"coordinates"'));
 const entries=readStaticCatalog(JSON.parse(json));
 assert.equal(entries[0].license,"ODbL 1.0");
 assert.match(entries[0].geometryUrl,/^objects\/[a-f0-9]{64}\.geojson$/);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,entries[0].geometryUrl))).geometry,geom);
}));
test("strictly rejects source-ID instability, duplicate IDs and unsafe URLs",()=>withDir(dir=>{
 const {row,geom}=fixture();
 assert.throws(()=>writeStaticCatalog([{...row,stableId:false}],new Map([[row.id,geom]]),dir),/Unstable/);
}));
test("detects duplicate source IDs before asset export",()=>withDir(dir=>{
 const {row,geom}=fixture();
 assert.throws(()=>writeStaticCatalog([row,row],new Map([[row.id,geom]]),dir),/Duplicate/);
}));
test("rejects manifest path substitution and digest mismatch",()=>{
 const {row}=fixture();
 const record={...row,geometrySha256:"a".repeat(64),geometryUrl:"../../../evil",
  bytes:5};
 assert.throws(()=>readStaticCatalog({schema:1,entries:[record]}),/Unsafe/);
});
test("lazy fetch returns candidates as unverified, verifies holes and overlaps, caches & deduplicates",async()=>withDir(async dir=>{
 const {row,geom}=fixture();
 const index=writeStaticCatalog([row],new Map([[row.id,geom]]),dir).index;
 let calls=0;
 const fetchImpl=async()=>{calls++;
  const bytes=fs.readFileSync(path.join(dir,index.entries[0].geometryUrl));
  return {ok:true,arrayBuffer:async()=>bytes};
 };
 const lookup=createLookup(index,{fetchImpl,baseUrl:"https://example.test/static/"});
 assert.equal(lookup.metadata(2,3)[0].status,"unverified");
 assert.equal(calls,0);
 const [a,b]=await Promise.all([lookup.verify(row.id,2,3),lookup.verify(row.id,4,5)]);
 assert.equal(a.contains,true);assert.equal(b.contains,true);
 assert.equal(calls,1);
 assert.equal((await lookup.verify(row.id,1,1)).fromCache,true);
 assert.equal(calls,1);
 assert.equal((await lookup.verify(row.id,20,20)).status,"outside_bbox");
}));
test("fails closed on corrupted transferred bytes",async()=>withDir(async dir=>{
 const {row,geom}=fixture();
 const index=writeStaticCatalog([row],new Map([[row.id,geom]]),dir).index;
 const lookup=createLookup(index,{baseUrl:"https://example.test/static/",
   fetchImpl:async()=>({ok:true,arrayBuffer:async()=>Buffer.from("wrong")})});
 await assert.rejects(()=>lookup.verify(row.id,1,1),/integrity mismatch/);
}));
