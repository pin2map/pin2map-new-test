"use strict";
/* Offline provider-catalog research against real, locally checked-out files.
 * No provider API, no public OSM mass query, no database publishing.
 * Source revisions are recorded from read-only git checkouts.
 */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process");
const {normalizeGeoJSON,manifest,coverageProbe,diff}=require("./area-source-catalog.cjs");
const registry=require("./area-source-registry.cjs");
const fixtures=require("../tests/area-source-fixtures.cjs");
const ne=process.env.PIN2MAP_NATURAL_EARTH_ROOT,eco=process.env.PIN2MAP_RESOLVE_ROOT;
if(!ne||!eco)throw Error("Two read-only checked out research sources required");
const revision=root=>execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim();
const sources=registry.map(s=>({...s,version:revision(s.key==="resolve-eco"?eco:ne)}));
const datasets=[];
const neSources=sources.filter(s=>s.key!=="resolve-eco");
for(const src of neSources){
 const collection=JSON.parse(fs.readFileSync(path.join(ne,src.sourceFile),"utf8"));
 assert.equal(collection.type,"FeatureCollection");
 datasets.push({source:src,features:collection.features});
}
const ecoSrc=sources.find(s=>s.key==="resolve-eco");
const ecoIds=[689,676,751,513],ecos=[];
for(const id of ecoIds){
 const f=JSON.parse(fs.readFileSync(path.join(eco,"teow/features/"+id+".geojson"),"utf8"));
 assert.equal(f.properties.ECO_ID,id);
 assert.equal(f.properties.LICENSE,"CC-BY 4.0");
 ecos.push(f);
}
datasets.push({source:ecoSrc,features:ecos});
const record=normalizeGeoJSON(datasets);
const builtAt="2026-11-18T00:00:00.000Z";
const revisions={"natural-earth":revision(ne),"resolve":revision(eco)};
const snapshot=manifest(record.rows,{builtAt,sourceRevisions:revisions});
const repeat=manifest(normalizeGeoJSON(datasets).rows,{builtAt,sourceRevisions:revisions});
assert.deepEqual(diff(snapshot,repeat),{
 added:[],removed:[],geometryChanged:[],metadataChanged:[],rightsChanged:[],needsReview:
 record.rows.filter(r=>!r.stableId).map(r=>r.id)
});
const coverage=coverageProbe(record.rows,record.geometries,fixtures);
assert.equal(coverage.length,15);
const summary={
 sourceRevisions:revisions,entries:record.rows.length,
 licenseCounts:Object.fromEntries([...new Set(record.rows.map(r=>r.license))].map(license=>
  [license,record.rows.filter(x=>x.license===license).length])),
 categoryCounts:Object.fromEntries([...new Set(record.rows.map(r=>r.kind))].map(kind=>
  [kind,record.rows.filter(x=>x.kind===kind).length])),
 recordsBySource:record.counts,
 unstableIdCount:record.rows.filter(x=>!x.stableId).length,
 manifestSha256:snapshot.sha256,
 metadataBytes:Buffer.byteLength(JSON.stringify(snapshot),"utf8"),
 recordedOsmIds:0,
 explicitlyUnsupported:[
  "No direct OSM object IDs in this source catalog",
  "No OSM military or training-area polygon feed",
  "Only Natural Earth 110m lakes and limited parks",
  "Source geometry is local; no HTTP latency or incremental update measured"
 ],
 knownReferencePoints:coverage,
 sameKindCorpusHits:coverage.filter(r=>r.sameKindCount>0).length,
 nameKindAgreement:coverage.filter(r=>r.exactNormalizedNameCount>0).length
};
console.log("AREA_SOURCE_CATALOG_AUDIT",JSON.stringify(summary,null,2));
