"use strict";
/* Read-only jurisdiction quality inventory. Data may correctly identify the
 * namesake while still misclassifying the actual licensing jurisdiction.
 * This intentionally DOES NOT guess an administrative kind from spelling.
 * Run: node scripts/audit-plate-jurisdictions.cjs [--json]
 */
for(const part of ["dach","europe","central","east"])
  require("../domain/license-plate-data-"+part+".js");
require("../domain/license-plate-jurisdiction-kinds.js");
require("../domain/license-plate-geo-hints.js");
require("../domain/license-plate-jurisdictions-at.js");
require("../domain/license-plate-jurisdictions.js");
const catalog=require("../domain/license-plate-catalog.js");
const unverified=catalog.records.filter(row=>
  !row.jurisdictionVerified && !row.adminRuleVerified && row.admin==="city" &&
  ["cc0-offene-daten","community-check-2026","pl-2024-regulation"].includes(row.source));
const perCountry=Object.fromEntries(
  [...new Set(unverified.map(x=>x.country))].sort().map(country=>[
    country,unverified.filter(x=>x.country===country).length
  ]));
const report={
  totalCatalogRecords:catalog.records.length,
  verifiedRegistrationAreas:catalog.records.filter(x=>x.jurisdictionVerified).length,
  legallyClassifiedByCountryRules:catalog.records.filter(x=>x.adminRuleVerified).length,
  jurisdictionCodeConflicts:catalog.records.filter(x=>x.areaOptions?.length>1).length,
  cityClassificationsNeedingJurisdictionAudit:unverified.length,
  byCountry:perCountry,
  candidates:unverified.map(({country,code,name,admin,source})=>({
    country,code,namesakeOrImportedName:name,importedAdmin:admin,source
  }))
};
if(require.main===module){
  if(process.argv.includes("--json"))console.log(JSON.stringify(report,null,2));
  else{
    console.log("Kennzeichen: "+report.totalCatalogRecords+" Einträge; "+
      report.verifiedRegistrationAreas+" gesicherte Zulassungsgebiete");
    console.log("Zur Prüfung vorgemerkte Stadtklassifizierungen: "+
      unverified.length+"; Länder: "+JSON.stringify(perCountry));
    console.log("Einzelzuordnungen bitte anhand behördlicher Quelle prüfen.");
  }
}
module.exports=report;
