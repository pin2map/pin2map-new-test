"use strict";
/* Reviewed license-plate jurisdiction overrides.
 * This table overrides inferred city / county hints only when the REAL
 * registration jurisdiction is supported by a cited authority.
 * Add entries individually; NEVER infer a county merely from a namesake city.
 */
(function(root){
 const data=Object.freeze({
   "DE|KN":Object.freeze({
     areaName:"Landkreis Konstanz",
     areaQuery:"Landkreis Konstanz",
     admin:"county",
     namesakePlace:"Konstanz",
     referencePlace:"Konstanz",
     placeRelation:"Namensgebende Stadt im Landkreis (kein Zulassungsgebiet)",
     status:"current",
     source:"landkreis-konstanz-2026",
     sourceUrl:"https://www.lrakn.de/service-und-verwaltung/aemter/strassenverkehr%20und%20schifffahrt/zulassungsstellen"
   })
 });
 root.Pin2MapLicensePlateJurisdictions=data;
 if(typeof module!=="undefined"&&module.exports)module.exports=data;
})(typeof window!=="undefined"?window:globalThis);
