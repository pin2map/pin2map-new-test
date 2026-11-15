"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const report=require("../scripts/audit-plate-jurisdictions.cjs");
test("the jurisdiction audit identifies unknown city/county mappings without guessing",()=>{
 assert.ok(report.totalCatalogRecords>1750);
 assert.ok(report.cityClassificationsNeedingJurisdictionAudit>0);
 assert.equal(report.verifiedRegistrationAreas,1);
 assert.ok(report.candidates.every(row=>row.importedAdmin==="city"&&row.source));
 assert.ok(!report.candidates.some(row=>row.country==="DE"&&row.code==="KN"));
 assert.ok(report.byCountry.DE>0);
});
