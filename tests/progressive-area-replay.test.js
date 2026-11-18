"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {stage,replay,loadRecording,checkFixtures}=
  require("../research/progressive-area-replay.cjs");
const recording=loadRecording();
test("15 recorded world coordinates keep exact immutable reference identity",()=>{
 assert.equal(checkFixtures(recording),true);
 assert.equal(recording.rows.length,15);
 assert.ok(recording.rows.every(row=>row.selectedIds.includes(row.expectedId)));
});
test("deterministic first, progressive and complete replays retain measured positives",()=>{
 const result=replay(recording.rows),s=result.summary;
 assert.equal(s.points,15);
 assert.deepEqual({
  first:[s.first.batches,s.first.referenceConfirmed,s.first.confirmedContaining],
  preview:[s.preview.batches,s.preview.referenceConfirmed,s.preview.confirmedContaining],
  complete:[s.complete.batches,s.complete.referenceConfirmed,s.complete.confirmedContaining]
 },{first:[15,12,17],preview:[30,15,21],complete:[56,15,22]});
 assert.equal(s.savedLookupBatches,26);
 assert.equal(s.savedLookupBatchFraction,26/56);
 assert.equal(s.photonSearchRequestsUnchanged,75);
 assert.deepEqual([s.first.knownOverlappingSites,s.preview.knownOverlappingSites,
  s.complete.knownOverlappingSites],[5,6,7]);
 assert.equal(result.findings.reduce((n,r)=>n+r.additionalConfirmedDeferred.length,0),1);
 assert.equal(result.findings.every(r=>r.preview.candidateCount<=12),true);
});
test("reference ID and name never influence candidate ordering or termination",()=>{
 const source=recording.rows[0],renamed={...source,
   name:"unknown and untrusted",expectedId:"R999999999999999"};
 const a=replay([source]).findings[0],b=replay([renamed]).findings[0];
 for(const phase of ["first","preview","complete"]){
  assert.deepEqual(a[phase].candidateIds,b[phase].candidateIds);
  assert.equal(a[phase].batches,b[phase].batches);
 }
 assert.equal(b.preview.referenceConfirmed,false);
 assert.equal(b.preview.hasMore,true);
});
test("positive-only recordings cannot classify absent candidates as false",()=>{
 const result=replay(recording.rows);
 assert.ok(result.findings.some(r=>r.preview.notRecordedAsContaining>0));
 assert.ok(result.findings.every(r=>r.measuredTransferBytes===null&&
   r.predictedRequestMilliseconds===null));
 assert.equal(result.summary.measuredSpeedupSeconds,null);
 assert.equal(result.summary.actualTransferBytes,null);
});
test("additional overlapping areas are deferred explicitly, not silently discarded",()=>{
 const result=replay(recording.rows);
 const r=result.findings.find(row=>row.additionalConfirmedDeferred.length);
 assert.ok(r);
 assert.equal(r.name,"Farihy Ihotry");
 assert.equal(r.additionalConfirmedDeferred[0].name,"Morombe");
 assert.equal(r.preview.hasMore,true);
});
test("invalid inputs are rejected; no synthetic network provider is used",()=>{
 assert.throws(()=>replay(null),/rows required/);
 assert.throws(()=>replay([{selectedIds:[],containing:[]}]),/candidate IDs/);
 assert.throws(()=>replay([{selectedIds:["R1","R1"],containing:[]}]),/Duplicate/);
 assert.throws(()=>replay(recording.rows,{batchSize:4}),/six/);
 assert.throws(()=>replay(recording.rows,{initialBatches:0}),/positive integer/);
 const row=recording.rows[0];
 assert.deepEqual(stage(row,6).candidateIds,row.selectedIds.slice(0,6));
});
