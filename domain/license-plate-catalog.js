"use strict";
/* Versioned offline plate-code registry. A code identifies a geographic
 * registration area, NEVER the current location of a vehicle or its owner.
 * Only reviewed entries are published: missing countries are reported as
 * incomplete, never guessed. Status is current or historic.
 */
(function(root){
 const countries={
  DE:"🇩🇪",AT:"🇦🇹",CH:"🇨🇭",FR:"🇫🇷",IT:"🇮🇹",PL:"🇵🇱",
  CZ:"🇨🇿",RO:"🇷🇴",TR:"🇹🇷",ES:"🇪🇸",SK:"🇸🇰"
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
 const records=Object.freeze(data.map(([code,country,name,query,admin,status="current"])=>Object.freeze({
   code,country,flag:countries[country],name,query,admin,status,
   label:countries[country]+" "+code+" ("+name+")"
 })));
 const lookup=term=>{
   const code=String(term??"").normalize("NFKC").trim().toLocaleUpperCase("de-DE");
   if(!/^[A-Z0-9ÄÖÜ]{1,5}$/.test(code))return [];
   return records.filter(row=>row.code===code);
 };
 const api=Object.freeze({lookup,records,countries:Object.freeze(countries),version:"2026-11-15-seed-1"});
 root.Pin2MapLicensePlateCatalog=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
