"use strict";
/* Reviewed license-plate jurisdiction overrides.
 * This table overrides inferred city / county hints only when the REAL
 * registration jurisdiction is supported by a cited authority.
 * Add entries individually; NEVER infer a county merely from a namesake city.
 */
(function(root){
 const data=Object.freeze({
   "DE|KA":Object.freeze({
     areaName:"Stadt und Landkreis Karlsruhe",admin:"county",
     areaOptions:[
       {areaName:"Stadt Karlsruhe",query:"Karlsruhe",admin:"city"},
       {areaName:"Landkreis Karlsruhe",query:"Landkreis Karlsruhe",admin:"county"}
     ],
     status:"current",source:"de-ka-official-2024",
     sourceUrl:"https://www.landkreis-karlsruhe.de/PDF/14112024_TOP_007.PDF"
   }),
   "DE|HN":Object.freeze({
     areaName:"Stadt und Landkreis Heilbronn",admin:"county",
     areaOptions:[
       {areaName:"Stadt Heilbronn",query:"Heilbronn",admin:"city"},
       {areaName:"Landkreis Heilbronn",query:"Landkreis Heilbronn",admin:"county"}
     ],
     status:"current",source:"de-hn-official-2026",
     sourceUrl:"https://service.landkreis-heilbronn.de/ihr-anliegen/zulassung/wunschkennzeichen-reservieren"
   }),
   "DE|UL":Object.freeze({
     areaName:"Stadt Ulm und Alb-Donau-Kreis",admin:"county",
     areaOptions:[
       {areaName:"Stadt Ulm",query:"Ulm",admin:"city"},
       {areaName:"Alb-Donau-Kreis",query:"Alb-Donau-Kreis",admin:"county"}
     ],
     status:"current",source:"de-ul-official-2026",
     sourceUrl:"https://www.alb-donau-kreis.de/-/behoerdenwegweiser/gemeinsame-kfz-zulassung-des-alb-donau-kreises-und-der-stadt-ulm-landratsamt-alb-donau-kreis/oe6011593"
   }),
   "DE|WÜ":Object.freeze({
     areaName:"Stadt und Landkreis Würzburg",admin:"county",
     areaOptions:[
       {areaName:"Stadt Würzburg",query:"Würzburg",admin:"city"},
       {areaName:"Landkreis Würzburg",query:"Landkreis Würzburg",admin:"county"}
     ],
     status:"current",source:"de-wue-official-2026",
     sourceUrl:"https://www.landkreis-wuerzburg.de/Wunschkennzeichen"
   }),
   "DE|BA":Object.freeze({
     areaName:"Stadt und Landkreis Bamberg",admin:"county",
     areaOptions:[
       {areaName:"Stadt Bamberg",query:"Bamberg",admin:"city"},
       {areaName:"Landkreis Bamberg",query:"Landkreis Bamberg",admin:"county"}
     ],
     status:"current",source:"de-ba-official-2026",
     sourceUrl:"https://www.landkreis-bamberg.de/Landratsamt/Bürgerservice-/Wunschkennzeichen-online/"
   }),
   "DE|A":Object.freeze({
     areaName:"Stadt und Landkreis Augsburg",admin:"county",
     areaOptions:[
       {areaName:"Stadt Augsburg",query:"Augsburg",admin:"city"},
       {areaName:"Landkreis Augsburg",query:"Landkreis Augsburg",admin:"county"}
     ],
     status:"current",source:"de-a-official-2026",
     sourceUrl:"https://www.landkreis-augsburg.de/landrat-landratsamt/landratsamt/sicherheit-und-ordnung-kommunales-und-verbraucherschutz/auto-verkehr/fahrzeugzulassung/online-services-kfz-zulassung/"
   }),
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
 root.Pin2MapLicensePlateJurisdictions=Object.freeze({
   ...(root.Pin2MapLicensePlateJurisdictions||{}),...data
 });
 if(typeof module!=="undefined"&&module.exports)module.exports=data;
})(typeof window!=="undefined"?window:globalThis);
