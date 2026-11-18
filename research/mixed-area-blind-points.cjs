"use strict";
/* Geography-only, predeclared before index build; no expected OSM IDs,
 * expected polygon names or provider result order. Coordinates [lon,lat].
 * The index must be compared with exhaustive geometry validation.
 */
const named=Object.freeze([
 ["München",11.5755,48.1374],["Berlin",13.405,52.52],
 ["Paris",2.3522,48.8566],["Madrid",-3.7038,40.4168],
 ["Bern",7.4474,46.948],["Wien",16.3738,48.2082],
 ["Kathmandu",85.324,27.7172],["Thimphu",89.639,27.4728],
 ["Lhasa",91.1172,29.652],["Tokio",139.6917,35.6895],
 ["Sydney",151.2093,-33.8688],["Brisbane",153.0251,-27.4698],
 ["Kapstadt",18.4241,-33.9249],["Buenos Aires",-58.3816,-34.6037],
 ["Santiago",-70.6693,-33.4489],["Los Angeles",-118.2437,34.0522],
 ["Yellowstone",-110.55,44.46],["Yosemite",-119.59,37.75],
 ["Grand Canyon",-112.14,36.06],["Hawaii Volcanoes",-155.29,19.42],
 ["Lake Baikal",108.2,53.5],["Lake Victoria",33.0,-1.0],
 ["Lake Superior",-87.0,47.5],["Lake Michigan",-87.5,43.0],
 ["Lake Tanganyika",30.0,-6.0],["Lake Titicaca",-69.3,-15.9],
 ["Lake Winnipeg",-97.5,52.5],["Lake Ontario",-77.9,43.7],
 ["Nordsee",3.0,56.0],["Ostsee",19.0,57.5],
 ["Atlantik",-25.0,0.0],["Indischer Ozean",75.0,-20.0],
 ["Zentralsahara",12.0,22.0],["Sibirien",105.0,62.0],
 ["Datumsgrenze",179.5,-17.0],["Antarktis",0.0,-80.0]
].map(([name,lon,lat])=>Object.freeze({name,lon,lat,group:"predeclared"})));
function randomPoints(n=160,seed=0x514f2026){
 if(!Number.isInteger(n)||n<0||n>10000)throw new RangeError("Invalid point count");
 let state=seed>>>0;
 const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 return Array.from({length:n},(_,i)=>Object.freeze({
  name:"grid-"+String(i+1).padStart(3,"0"),
  lon:+(next()*360-180).toFixed(6),
  lat:+(next()*160-80).toFixed(6),group:"seeded-world"
 }));
}
module.exports={named,randomPoints};
