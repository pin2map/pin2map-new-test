"use strict";
/* Project hydration retains the v113 startup data contract. Loading and
 * schema ownership stay with the injected storage adapter; no migrations. */
(function(root){
  function hydrate(saved,{defaults,privateLayerId,cleanupSearch}){
    if(typeof defaults!=="function"||typeof privateLayerId!=="string"||
      typeof cleanupSearch!=="function")throw new TypeError("Project hydration ports required");
    // Exactly the legacy acceptance contract: both arrays must be present.
    const state=saved&&Array.isArray(saved.layers)&&Array.isArray(saved.pins)
      ?{...defaults(),...saved}:defaults();
    // The private layer is mandatory, but do not replace any existing layer.
    if(!state.layers.some(layer=>layer?.id===privateLayerId))
      state.layers.unshift(defaults().layers[0]);
    delete state.activeLayer;
    cleanupSearch(state);
    return state;
  }
  const api=Object.freeze({hydrate});
  root.Pin2MapProjectHydration=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
