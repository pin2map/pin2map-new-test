"use strict";
/* Austrian registration jurisdiction register, transcribed by exact CODE
 * from the nine official 2026 province tables at oesterreich.gv.at.
 * Imported code names are not independently a spatial classification.
 */
(function(root){
 const base="https://www.oesterreich.gv.at/de/themen/mobilitaet/kfz/5/1/";
 const groups={
   "Seite.061402":"E EU GS JE MA ND OP OW",
   "Seite.061403":"FE HE K KL SP SV VI VK VL WO",
   "Seite.061404":"AM BL BN GD GF HL HO KG KO KR KS LF MD ME MI NK P PL SB SW TU WB WN WT WY ZT",
   "Seite.061405":"BR EF FR GM GR KI L LL PE RI RO SD SE SR UU VB WE WL",
   "Seite.061406":"HA JO S SL TA ZE",
   "Seite.061407":"BA BM DL G GB GU HF LB LE LI LN MT MU SO VO WZ",
   "Seite.061408":"I IL IM KB KU LA LZ RE SZ",
   "Seite.061409":"B BZ DO FK",
   "Seite.061410":"W"
 };
 const urban=new Set("G I K KS L LE P S SR VI WE WN WY W".split(" "));
 const sourceRows=(root.Pin2MapPlateDataParts||[]).filter(row=>row[1]==="AT");
 const byCode=new Map(sourceRows.map(row=>[row[0],row]));
 const special={
   EU:"Eisenstadt-Umgebung",KR:"Krems-Land",KL:"Klagenfurt-Land",
   PL:"St. Pölten-Land",LL:"Linz-Land",SE:"Steyr-Land",
   SL:"Salzburg-Umgebung",IL:"Innsbruck-Land",LN:"Leoben",
   UU:"Urfahr-Umgebung",VL:"Villach-Land",WB:"Wiener Neustadt-Land",
   WL:"Wels-Land",GB:"Gröbming"
 };
 const referenceOnly={
   BA:{areaName:"Bad Aussee, Altaussee, Grundlsee und Bad Mitterndorf",
     referencePlace:"Bad Aussee",placeRelation:"Viergemeinde-Zulassungsgebiet, kein Einzelpolygon"},
   E:{areaName:"Eisenstadt und Rust (Zulassungsgebiet)",
     referencePlace:"Eisenstadt",placeRelation:"Zwei Städte, keine Eisenstadt-Alleinfläche"},
   SW:{areaName:"Schwechat und Teile des Flughafens Wien",
     referencePlace:"Schwechat",placeRelation:"Sondergebiet, keine Schwechat-Alleinfläche"},
   GB:{areaName:"Expositur Gröbming",
     referencePlace:"Gröbming",placeRelation:"Politische Expositur, keine Gemeinde-Alleinfläche"}
 };
 const data={};
 for(const [page,codes] of Object.entries(groups)){
   for(const code of codes.split(" ")){
     const row=byCode.get(code),isUrban=urban.has(code),specialArea=referenceOnly[code];
     if(!row&&code!=="BA"&&code!=="KG")
       throw Error("Official Austrian code absent from imported rows: "+code);
     const baseName=code==="KG"?"Klosterneuburg":code==="BA"?"Bad Aussee":
       row[2].replace(/\s*\((?:Land|Stadt|Umgebung)\)\s*$/,"").trim();
     const name=special[code]||baseName;
     const admin=isUrban||code==="KG"?"city":"county";
     const areaName=specialArea?.areaName||(
       admin==="county"?"Bezirk "+name:code==="KG"?"Gemeinde Klosterneuburg":baseName);
     const obj={
       areaName,areaQuery:areaName,admin,
       namesakePlace:baseName,status:"current",
       source:"at-official-2026",sourceUrl:base+page,
       ...(specialArea?{geometryPolicy:"reference-only",...specialArea}: {})
     };
     // Only a verified in-district reference town may be a point fallback.
     if(code==="GU"){
       obj.areaName="Bezirk Graz-Umgebung";
       obj.areaQuery="Bezirk Graz-Umgebung";
       obj.referencePlace="Gratkorn";
       obj.placeRelation="Ort im Zulassungsbezirk";
     }
     if(code==="KG"){
       obj.referencePlace="Klosterneuburg";
       obj.placeRelation="Gemeindegebiet";
     }
     data["AT|"+code]=Object.freeze(obj);
   }
 }
 // The superseded Vienna-Umgebung district was dissolved in 2017.
 // Old WU plates may remain, but its former extent is not a present polygon.
 data["AT|WU"]=Object.freeze({
   areaName:"Wien-Umgebung (ehemaliger Bezirk)",
   areaQuery:"Wien-Umgebung",
   admin:"county",status:"historic",
   source:"at-official-2026",
   sourceUrl:base+"Seite.061404",
   geometryPolicy:"unmapped-historic"
 });
 for(const [code,name] of [["BA","Bad Aussee"],["KG","Klosterneuburg"]])
   if(!byCode.has(code))root.Pin2MapPlateDataParts.push([
     code,"AT",name,name,code==="KG"?"city":"county",
     "current","at-official-2026"
   ]);
 root.Pin2MapLicensePlateJurisdictions=Object.freeze({
   ...(root.Pin2MapLicensePlateJurisdictions||{}),...data
 });
 root.Pin2MapAustriaJurisdictionGroups=Object.freeze(groups);
 if(typeof module!=="undefined"&&module.exports)module.exports=data;
})(typeof window!=="undefined"?window:globalThis);
