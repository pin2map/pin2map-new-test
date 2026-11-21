"use strict";
/* One canonical symbol per object type; consumers never copy asset or icon names. */
(function(root){
 const TYPES=Object.freeze({
  pin:Object.freeze({icon:"map-pin"}),
  gps:Object.freeze({icon:"locate-fixed"}),
  area:Object.freeze({asset:"region.svg"}),
  lake:Object.freeze({asset:"lake.svg"}),
  river:Object.freeze({asset:"river.svg"}),
  plate:Object.freeze({icon:"car"}),
  objects:Object.freeze({icon:"scan-search"})
 });
 function descriptor(type){return TYPES[type==="areaHierarchy"?"area":type]||null;}
 function element(type,doc,icons=root.Pin2MapIcons){
  const d=descriptor(type);
  if(!d)throw new RangeError("Unknown object type: "+type);
  if(d.asset){
   const img=doc.createElement("img");img.src="./assets/"+d.asset;
   img.alt="";img.setAttribute("aria-hidden","true");return img;
  }
  return icons.svg(d.icon,doc);
 }
 const api=Object.freeze({TYPES,descriptor,element});
 root.Pin2MapObjectTypeIcons=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
