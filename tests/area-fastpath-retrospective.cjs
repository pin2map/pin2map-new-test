"use strict";
/* Retrospective, offline optimisation analysis. No external HTTP requests.
 * These assertions are based on previously measured, real browser/provider
 * results. They do NOT establish new production latency or world coverage.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const file=path.resolve(__dirname,"../docs/research/photon-uniform-coordinate-15-result.json");
const study=JSON.parse(fs.readFileSync(file,"utf8"));
assert.equal(study.summary.tested,15);
assert.equal(study.summary.correct,15);
const rows=study.rows.map(r=>{
  const position=r.selectedIds.indexOf(r.expectedId)+1;
  assert.ok(position>0,"Reference target not in selected set: "+r.name);
  assert.ok(r.containing.some(c=>c.id===r.expectedId),
    "Target geometry did not contain original click: "+r.name);
  const batchesOriginal=Math.ceil(r.selectedIds.length/6);
  const targetBatch=Math.ceil(position/6);
  return {name:r.name,position,targetBatch,batchesOriginal,
    photonMs:r.filters.reduce((s,f)=>s+f.ms,0),
    recordedMs:r.ms};
});
const summary={
  tested:rows.length,oneBatch:rows.filter(r=>r.targetBatch===1).length,
  withinTwoBatches:rows.filter(r=>r.targetBatch<=2).length,
  originalLookupBatches:rows.reduce((s,r)=>s+r.batchesOriginal,0),
  earlyStopReferenceOracleBatches:rows.reduce((s,r)=>s+r.targetBatch,0),
  recordedTotalMs:rows.reduce((s,r)=>s+r.recordedMs,0),
  measuredPhotonNetworkMs:rows.reduce((s,r)=>s+r.photonMs,0),
  photonCalls:rows.length*5,
  // Crucial: a usable stopping criterion is not proven by an oracle.
  warning:"Early-stop counts are an oracle upper bound. Correct target identity is only known retrospectively, and any-containing-area is insufficient."
};
assert.equal(summary.oneBatch,12);
assert.equal(summary.withinTwoBatches,15);
assert.equal(summary.originalLookupBatches,56);
assert.equal(summary.earlyStopReferenceOracleBatches,18);
console.log("OFFLINE_AREA_FASTPATH",JSON.stringify({summary,rows},null,2));
