"use strict";
/* Offline-only retrospective replay of measured 2026-11-17 area candidates.
 * This is NOT a provider, UI module, latency prediction, or production stop
 * rule. The expected OSM ID is used only to score a known reference fixture.
 * Candidate order and batches never depend on that ID or on a place name.
 */
const fs=require("node:fs");
const path=require("node:path");
const DEFAULT_RECORDING=path.resolve(__dirname,
  "../docs/research/photon-uniform-coordinate-15-result.json");
const DEFAULT_FIXTURES=path.resolve(__dirname,"../tests/area-source-fixtures.cjs");

function positiveIds(row){
  return new Set((row.containing||[]).filter(c=>c.contained===true).map(c=>c.id));
}
function stage(row,limit){
  const candidates=row.selectedIds.slice(0,limit);
  const positives=positiveIds(row);
  const verifiedContaining=(row.containing||[])
    .filter(c=>c.contained===true&&candidates.includes(c.id))
    .map(c=>({id:c.id,name:c.name,vertices:c.vertices,type:c.type}));
  return {
    candidateIds:candidates,
    candidateCount:candidates.length,
    batches:Math.ceil(candidates.length/6),
    verifiedContaining,
    // This count is an oracle reference metric, NEVER a production stop signal.
    referenceSeen:candidates.includes(row.expectedId),
    referenceConfirmed:verifiedContaining.some(c=>c.id===row.expectedId),
    confirmedVertexCount:verifiedContaining.reduce((sum,c)=>sum+(c.vertices||0),0),
    // Candidates absent from the positive-only recording are NOT classified
    // as outside polygons; their real geometries are not retained here.
    notRecordedAsContaining:candidates.filter(id=>!positives.has(id)).length,
    hasMore:candidates.length<row.selectedIds.length
  };
}
function replay(rows,{batchSize=6,initialBatches=2}={}){
  if(batchSize!==6)throw new RangeError("Recorded lookups used batches of six");
  if(!Number.isInteger(initialBatches)||initialBatches<1)
    throw new RangeError("initialBatches must be a positive integer");
  if(!Array.isArray(rows))throw new TypeError("rows required");
  const findings=rows.map(row=>{
    if(!Array.isArray(row.selectedIds)||!row.selectedIds.length)
      throw new TypeError("Recorded candidate IDs required");
    if(new Set(row.selectedIds).size!==row.selectedIds.length)
      throw new TypeError("Duplicate selected OSM candidates");
    if(!Array.isArray(row.containing))throw new TypeError("Confirmed polygon list required");
    const first=stage(row,batchSize),preview=stage(row,batchSize*initialBatches);
    const complete=stage(row,Infinity);
    return {
      name:row.name,region:row.region,kind:row.kind,
      first,preview,complete,
      additionalConfirmedDeferred:complete.verifiedContaining
        .filter(c=>!preview.candidateIds.includes(c.id)),
      // Cached response sizes, actual transfer durations, and false negatives
      // are unavailable for the unretained candidate geometries.
      measuredTransferBytes:null,
      predictedRequestMilliseconds:null
    };
  });
  const sum=(key,where)=>findings.reduce((total,r)=>total+where(r[key]),0);
  const totalBatches=sum("complete",s=>s.batches);
  const previewBatches=sum("preview",s=>s.batches);
  const summarizeStage=key=>({
    batches:sum(key,s=>s.batches),
    selectedCandidates:sum(key,s=>s.candidateCount),
    referenceConfirmed:findings.filter(r=>r[key].referenceConfirmed).length,
    confirmedContaining:sum(key,s=>s.verifiedContaining.length),
    knownOverlappingSites:findings.filter(r=>r[key].verifiedContaining.length>=2).length,
    recordedPositiveVertices:sum(key,s=>s.confirmedVertexCount)
  });
  return {
    summary:{
      points:findings.length,
      first:summarizeStage("first"),
      preview:summarizeStage("preview"),
      complete:summarizeStage("complete"),
      savedLookupBatches:totalBatches-previewBatches,
      savedLookupBatchFraction:totalBatches?
        (totalBatches-previewBatches)/totalBatches:0,
      photonSearchRequestsUnchanged:findings.length*5,
      referenceOracleOnly:true,
      measuredSpeedupSeconds:null,
      actualTransferBytes:null
    },
    findings
  };
}
function loadRecording(file=DEFAULT_RECORDING){
  const recording=JSON.parse(fs.readFileSync(file,"utf8"));
  if(recording.summary?.tested!==recording.rows?.length)
    throw new Error("Incomplete reference recording");
  return recording;
}
function checkFixtures(recording,fixtures=require(DEFAULT_FIXTURES)){
  if(recording.rows.length!==fixtures.length)
    throw new Error("Fixture count drift");
  for(let i=0;i<fixtures.length;i++){
    if(recording.rows[i].name!==fixtures[i].name||
       recording.rows[i].region!==fixtures[i].region||
       recording.rows[i].kind!==fixtures[i].kind)
      throw new Error("Fixture identity/order drift at "+i);
  }
  return true;
}
if(require.main===module){
  const recording=loadRecording();
  checkFixtures(recording);
  console.log("PROGRESSIVE_AREA_REPLAY",JSON.stringify(replay(recording.rows),null,2));
}
module.exports={stage,replay,loadRecording,checkFixtures};
