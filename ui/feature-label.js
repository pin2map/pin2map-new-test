"use strict";
/* One semantic layout owner for Gebiet, See and Fluss name labels.
 * The left color strip denotes the assigned LAYER, never an optional
 * individual geometry paint override. Note/URL circles are independent. */
(function(root){
 function create(type,object,layerColor,doc){
  if(!["area","lake","river"].includes(type))throw new RangeError("Unknown feature label type");
  const icons=root.Pin2MapObjectTypeIcons,status=root.Pin2MapObjectStatus;
  if(!icons||!status)throw new TypeError("Object label dependencies missing");
  const label=doc.createElement("span");
  label.className=type==="river"?"p2m-river-name-label":"p2m-area-name-label";
  const color=/^#[0-9a-f]{6}$/i.test(layerColor||"")?layerColor:"#a4b0bd";
  label.style.setProperty("--p2m-feature-layer-color",color);
  const symbol=icons.element(type,doc);
  symbol.classList.add("p2m-feature-label-type");
  const title=doc.createElement("span");
  title.className="p2m-feature-label-name";
  title.textContent=String(object?.name||"");
  label.append(symbol,status.halves(object,doc),title);
  return label;
 }
 const api=Object.freeze({create});
 root.Pin2MapFeatureLabel=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
