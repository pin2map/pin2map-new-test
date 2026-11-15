"use strict";
/* Country-level official registration area scopes. Official statutes often
 * define multi-municipality regions without an equivalent single OSM polygon.
 * In that case render ONLY a clearly marked, country-validated reference
 * point. Never show the eponymous city as the whole vehicle registration area.
 */
(function(root){
 const sources=Object.freeze({
   SI:"https://pisrs.si/pregledPredpisa?id=PRAV7282&tab=analiticni",
   HR:"https://cvh.hr/gradani/informacije/propisi-i-upute/pravilnici/zakon-o-sigurnosti-prometa-na-cestama/pravilnik-o-registraciji-i-oznacavanju-vozila/",
   RS:"https://www.paragraf.rs/propisi/pravilnik_o_registraciji_motornih_i_prikljucnih_vozila.html",
   ME:"https://wapi.gov.me/download-preview/e820de62-a4bf-4365-b8c1-d421983c568b?version=1.0"
 });
 const keys={"SI":"CE GO KK KP KR LJ MB MS NM PO SG","HR":"BJ BM ČK DA DE DJ DU GS IM KA KC KR KT KŽ MA NA NG OG OS PU PŽ RI SB SK SL ST ŠI VK VT VU VŽ ZD ZG ŽU","RS":"AL AR AC BB BG BO BP BT BĆ BU BČ VA VB VL VP VR VS VŠ GM DE ZA ZR IN IC JA KA KC KV KG KŽ KI KL KO KU KŠ LB LE LO LU NV NG NI NP NS PA PB PŽ PI PK PN PO PP PT RA RU SA SM SV SD SJ SO SP ST SU SC TO TS TT ĆU UB UE ČA ŠA ŠI","ME":"AN BA BD BP BR CT DG GS HN KL KO MK NK PG PL PT PŽ PV RO ŠN TV UL ŽB"};
 const all=root.Pin2MapPlateDataParts||[];
 const data={};
 for(const [country,list] of Object.entries(keys)){
   for(const code of list.split(" ")){
     const row=all.find(x=>x[0]===code&&x[1]===country);
     if(!row)throw Error("Missing official registration area "+country+" "+code);
     // Existing local labels are named issuing centres, not regional extents.
     const namesake=row[3]||row[2];
     data[country+"|"+code]=Object.freeze({
       areaName:"Zulassungsregion "+row[2],
       areaQuery:namesake,
       admin:"county",namesakePlace:namesake,
       referencePlace:namesake,
       placeRelation:"Namensgebender Ort in einer amtlichen Zulassungsregion; keine vollständige Gebietsfläche",
       geometryPolicy:"reference-only",status:"unknown",
       source:"official-scope-"+country.toLowerCase(),
       sourceUrl:sources[country],
       reviewStatus:"official-scope-only"
     });
   }
 }
 // Government Montenegrin regulation lists TU for Tuzi, not just the
 // inherited community code TZ. Do not quietly conflate the two codes.
 if(!all.some(x=>x[0]==="TU"&&x[1]==="ME"))
   all.push(["TU","ME","Tuzi","Tuzi","city","unknown","me-government-2019"]);
 data["ME|TU"]=Object.freeze({
   areaName:"Gemeinde Tuzi",areaQuery:"Tuzi",admin:"city",
   namesakePlace:"Tuzi",referencePlace:"Tuzi",
   placeRelation:"Gemeinde Tuzi",status:"unknown",
   source:"me-government-2019",sourceUrl:sources.ME,
   reviewStatus:"official-scope-only"
 });
 root.Pin2MapLicensePlateJurisdictions=Object.freeze({
   ...(root.Pin2MapLicensePlateJurisdictions||{}),...data
 });
 root.Pin2MapOfficialRegionCounts=Object.freeze(
   Object.fromEntries(Object.entries(keys).map(([k,v])=>[k,v.split(" ").length])));
 if(typeof module!=="undefined"&&module.exports)module.exports=data;
})(typeof window!=="undefined"?window:globalThis);
