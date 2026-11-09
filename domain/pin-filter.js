"use strict";
/*
 * Layer-based visibility is the only currently decided filter criterion.
 * Other future filter targets/fields/policies are deliberately UNDECIDED.
 * A caller may inject a predicate without this module knowing what it tests.
 * No UI, map, data storage, or provider dependencies.
 */
(function(root){
  function createFilter({matches=null}={}){
    if(matches!==null&&typeof matches!=="function")
      throw new TypeError("matches must be a function or null");
    return Object.freeze({matches});
  }
  function isVisible(pin,layers,filter=createFilter()){
    if(!pin||!Array.isArray(layers))return false;
    // Existing baseline: every pin belongs to exactly one layer.
    if(!layers.some(layer=>layer.id===pin.layerId&&layer.visible===true))return false;
    if(!filter||typeof filter!=="object")throw new TypeError("Invalid filter");
    return filter.matches===null||filter.matches===undefined
      ?true:Boolean(filter.matches(pin));
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
  const api=Object.freeze({createFilter,isVisible,visiblePins,countByLayer});
  root.Pin2MapPinFilter=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
