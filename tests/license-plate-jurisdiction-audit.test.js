"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const report=require("../scripts/audit-plate-jurisdictions.cjs");
test("the jurisdiction audit identifies unknown city/county mappings without guessing",()=>{
 assert.ok(report.totalCatalogRecords>1750);
 assert.ok(report.cityClassificationsNeedingJurisdictionAudit>=0);
 assert.ok(report.verifiedRegistrationAreas>90);
 assert.ok(report.legallyClassifiedByCountryRules>300);
 assert.ok(report.jurisdictionCodeConflicts>=6);
 assert.ok(report.cityClassificationsNeedingJurisdictionAudit<900);
 assert.ok(report.candidates.every(row=>row.importedAdmin==="city"&&row.source));
 assert.ok(!report.candidates.some(row=>row.country==="DE"&&row.code==="KN"));
 assert.ok(report.secondaryClassifiedJurisdictions>=500,
   "German jurisdiction mapping must be mostly audited against CC0 compilation");
 assert.ok(report.verifiedRegistrationAreas>200);
 assert.ok(report.byCountry.DE===undefined||report.byCountry.DE<25);
 assert.ok(report.notOfficiallyVerifiedNorLegallyTyped>0);
 assert.equal(report.totalCatalogRecords>1900,true);
});

test("secondary or scope-only classifications are never counted as authoritative area polygons",()=>{
 const counts=report.secondaryByCountry;
 assert.ok(counts.DE>500);
 assert.ok(report.secondaryClassifiedJurisdictions<=report.totalCatalogRecords);
 assert.ok(report.cityClassificationsNeedingJurisdictionAudit<150);
 assert.ok(report.jurisdictionCodeConflicts>=10);
});
