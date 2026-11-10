"use strict";
/* Universal click feedback for current and future controls on the map.
   Event delegation also covers buttons created later by Leaflet. */
(function(root){
  const SELECTOR="#app > button, #app #map .leaflet-control button";
  function install(doc=root.document,schedule=root.setTimeout){
    if(!doc||typeof schedule!=="function")return;
    doc.addEventListener("click",event=>{
      const button=event.target?.closest?.("button");
      if(!button||!button.matches(SELECTOR)||button.disabled)return;
      button.classList.add("p2m-map-tap-flash");
      schedule(()=>button.classList.remove("p2m-map-tap-flash"),220);
    },true);
  }
  const api=Object.freeze({SELECTOR,install});
  root.Pin2MapMapControlFeedback=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root.document)install(root.document,root.setTimeout.bind(root));
})(typeof window!=="undefined"?window:globalThis);
