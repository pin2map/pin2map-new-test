"use strict";
/*
 * Pure pin filtering. The active baseline uses layer visibility only.
 * Future text conditions combine with layer visibility using AND; a text
 * query can never make a pin from a hidden layer visible.
 * No map, UI, persistence, or network dependencies.
 */
(function(root){
  function normalize(text){return String(text??"").normalize("NFKC").toLocaleLowerCase("de").trim();}
  function createFilter({query="",fields=["name","description","notes"]}={}){
    const q=normalize(query);
    const allowed=["name","description","notes"];
    if(!Array.isArray(fields)||fields.some(field=>!allowed.includes(field)))throw new TypeError("Unsupported search field");
    return Object.freeze({query:q,fields:Object.freeze([...new Set(fields)])});
  }
  function isVisible(pin,layers,filter=createFilter()){
    if(!pin||!Array.isArray(layers))return false;
    // Exactly one layer: when layer is missing or hidden, never show its pins.
    if(!layers.some(layer=>layer.id===pin.layerId&&layer.visible===true))return false;
    if(!filter.query)return true;
    return filter.fields.some(field=>normalize(pin[field]).includes(filter.query));
  }
  function visiblePins(pins,layers,filter=createFilter()){
    if(!Array.isArray(pins))throw new TypeError("pins must be an array");
    return pins.filter(pin=>isVisible(pin,layers,filter));
  }
  function countByLayer(pins,layers){
    return Object.fromEntries(layers.map(layer=>[
      layer.id,pins.filter(pin=>pin.layerId===layer.id).length
    ]));
  }
  const api=Object.freeze({normalize,createFilter,isVisible,visiblePins,countByLayer});
  root.Pin2MapPinFilter=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
