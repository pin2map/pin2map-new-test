"use strict";
/* Versioned offline plate-code registry. A code identifies a geographic
 * registration area, NEVER the current location of a vehicle or its owner.
 * Data is source-tagged and may be historic or of unknown present-day
 * validity. Never infer a polygon or the current holder location from a code.
 */
(function(root){
 const countries={
  DE:"🇩🇪",AT:"🇦🇹",CH:"🇨🇭",FR:"🇫🇷",IT:"🇮🇹",PL:"🇵🇱",
  CZ:"🇨🇿",RO:"🇷🇴",TR:"🇹🇷",ES:"🇪🇸",SK:"🇸🇰",
  IE:"🇮🇪",HR:"🇭🇷",SI:"🇸🇮",BG:"🇧🇬",RS:"🇷🇸",
  ME:"🇲🇪",MK:"🇲🇰",BY:"🇧🇾",UA:"🇺🇦"
 };
 // tuple: code, ISO country, German name, OSM name-query, admin kind, status
 const data=[
  ["B","DE","Berlin","Berlin","city"],["S","DE","Stuttgart","Stuttgart","city"],
  ["M","DE","München","München","city"],["HH","DE","Hamburg","Hamburg","city"],
  ["K","DE","Köln","Köln","city"],["F","DE","Frankfurt am Main","Frankfurt am Main","city"],
  ["ES","DE","Esslingen","Landkreis Esslingen","county"],
  ["W","AT","Wien","Wien","city"],["S","AT","Salzburg","Salzburg","city"],
  ["G","AT","Graz","Graz","city"],["L","AT","Linz","Linz","city"],
  ["I","AT","Innsbruck","Innsbruck","city"],
  ["ZH","CH","Zürich (Kanton)","Kanton Zürich","state"],
  ["BE","CH","Bern (Kanton)","Kanton Bern","state"],
  ["GE","CH","Genf (Kanton)","Kanton Genf","state"],
  ["BS","CH","Basel-Stadt","Basel-Stadt","state"],
  ["67","FR","Bas-Rhin","Bas-Rhin","county"],
  ["75","FR","Paris","Paris","county"],
  ["13","FR","Bouches-du-Rhône","Bouches-du-Rhône","county"],
  ["69","FR","Rhône","Rhône","county"],
  ["33","FR","Gironde","Gironde","county"],
  ["59","FR","Nord","Nord","county"],
  ["MI","IT","Mailand (Metropolitanstadt)","Città metropolitana di Milano","county"],
  ["RM","IT","Rom (Metropolitanstadt)","Città metropolitana di Roma Capitale","county"],
  ["TO","IT","Turin (Metropolitanstadt)","Città metropolitana di Torino","county"],
  ["NA","IT","Neapel (Metropolitanstadt)","Città metropolitana di Napoli","county"],
  ["FI","IT","Florenz (Metropolitanstadt)","Città metropolitana di Firenze","county"],
  ["BO","IT","Bologna (Metropolitanstadt)","Città metropolitana di Bologna","county"],
  ["WA","PL","Warschau","Warszawa","city"],
  ["KR","PL","Krakau","Kraków","city"],
  ["PO","PL","Posen","Poznań","city"],
  ["GD","PL","Danzig","Gdańsk","city"],
  ["WR","PL","Breslau","Wrocław","city"],
  ["A","CZ","Prag","Praha","city"],
  ["B","CZ","Südmähren","Jihomoravský kraj","state"],
  ["S","CZ","Mittelböhmen","Středočeský kraj","state"],
  ["P","CZ","Pilsen","Plzeňský kraj","state"],
  ["B","RO","Bukarest","București","city"],
  ["CJ","RO","Cluj","Județul Cluj","county"],
  ["TM","RO","Timiș","Județul Timiș","county"],
  ["IS","RO","Iași","Județul Iași","county"],
  ["BV","RO","Brașov","Județul Brașov","county"],
  ["34","TR","Istanbul","İstanbul","state"],
  ["06","TR","Ankara","Ankara","state"],
  ["35","TR","Izmir","İzmir","state"],
  ["67","TR","Zonguldak","Zonguldak","state"],
  ["16","TR","Bursa","Bursa","state"],
  ["01","TR","Adana","Adana","state"],
  ["M","ES","Madrid (ehemaliger Provinzcode)","Comunidad de Madrid","state","historic"],
  ["B","ES","Barcelona (ehemaliger Provinzcode)","Provincia de Barcelona","county","historic"],
  ["SE","ES","Sevilla (ehemaliger Provinzcode)","Provincia de Sevilla","county","historic"],
  ["V","ES","Valencia (ehemaliger Provinzcode)","Provincia de Valencia","county","historic"],
  ["BA","SK","Bratislava (alter Bezirkscode)","Bratislava","city","historic"],
  ["KE","SK","Košice (alter Bezirkscode)","Košice","city","historic"]
 ];
 // The original 54 carefully curated labels stay authoritative. Additional
 // region-code facts are loaded from separate offline source-tagged modules.
 // Deduplication is by country+code, NEVER by code alone (B spans countries).
 const extras=Array.isArray(root.Pin2MapPlateDataParts)?root.Pin2MapPlateDataParts:[];
 const unique=new Map();
 const add=([code,country,name,query,admin,status="current",source="seed-v191"])=>{
   if(!countries[country]||!code||!name)return;
   const normalized=String(code).normalize("NFKC").toLocaleUpperCase("de-DE");
   const key=country+"|"+normalized;
   if(unique.has(key))return;
   const hint=root.Pin2MapLicensePlateGeoHints?.[key]||{};
   unique.set(key,Object.freeze({
     code:normalized,country,flag:countries[country],name,
     query:hint.query||query,admin:hint.admin||admin,
     status:hint.status||status,source:hint.source||source,
     referencePlace:hint.referencePlace||null,
     placeRelation:hint.placeRelation||null,
     relatedArea:hint.relatedArea||null,
     label:countries[country]+" "+normalized+" ("+name+")"
   }));
 };
 data.forEach(add);
 extras.forEach(add);
 const records=Object.freeze([...unique.values()]);
 const lookup=term=>{
   const code=String(term??"").normalize("NFKC").trim().toLocaleUpperCase("de-DE");
   if(!/^[\p{L}0-9]{1,5}$/u.test(code))return [];
   return records.filter(row=>row.code===code);
 };
 const api=Object.freeze({lookup,records,countries:Object.freeze(countries),version:"2026-11-15-expanded-2"});
 root.Pin2MapLicensePlateCatalog=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
