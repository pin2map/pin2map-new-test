"use strict";
/*
 * Filter use cases. Only the application requests visibility changes;
 * renderer and UI do not own filtering rules. The filter expression is
 * transient, and never modifies or deletes the underlying pins.
 */
(function(root){
  function setLayerVisible(project,layerId,visible){
    const layer=project.layers.find(candidate=>candidate.id===layerId);
    if(!layer)return false;
    layer.visible=Boolean(visible);
    return true;
  }
  function setQuery(filterDomain,query,fields){
    return filterDomain.createFilter(fields?{query,fields}:{query});
  }
  const api=Object.freeze({setLayerVisible,setQuery});
  root.Pin2MapFilterOperations=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
