"use strict";
/* Curated geographic hints (not licensing third-party geometry).
 * These are mapping aids, never claims about where a car or owner is.
 * The reference place must be located INSIDE the named registration region.
 */
(function(root){
 const hints=Object.freeze({
  "DE|NAU":Object.freeze({query:"Nauen",admin:"city",status:"current",source:"official-2026",referencePlace:"Nauen",
    placeRelation:"Namensgebender Ort",relatedArea:"Landkreis Havelland"}),
  "DE|HVL":Object.freeze({query:"Landkreis Havelland",admin:"county",status:"current",source:"official-2026",
    referencePlace:"Rathenow",placeRelation:"Kreisverwaltung"}),
  "DE|LRO":Object.freeze({query:"Landkreis Rostock",admin:"county",status:"current",source:"official-2026",
    referencePlace:"Güstrow",placeRelation:"Kreisverwaltung"}),
  "DE|BÜS":Object.freeze({query:"Büsingen am Hochrhein",admin:"city",status:"current",source:"official-2026",
    referencePlace:"Büsingen am Hochrhein",placeRelation:"Gemeinde"}),
  "DE|FRI":Object.freeze({query:"Landkreis Friesland",admin:"county",status:"current",source:"official-2026",
    referencePlace:"Jever",placeRelation:"Kreisverwaltung"}),
  "AT|GU":Object.freeze({query:"Bezirk Graz-Umgebung",admin:"county",status:"current",source:"official-2026",
    referencePlace:"Gratkorn",placeRelation:"Ort im Zulassungsbezirk"})
 });
 root.Pin2MapLicensePlateGeoHints=hints;
 if(typeof module!=="undefined"&&module.exports)module.exports=hints;
})(typeof window!=="undefined"?window:globalThis);
