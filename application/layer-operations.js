"use strict";
/* Pure application use cases for layers. No DOM, map engine or storage. */
(function(root){
  function find(project,id){return project.layers.find(layer=>layer.id===id)||null;}
  function nextName(project){
    const used=new Set(project.layers.map(layer=>layer.name.trim().toLocaleLowerCase("de")));
    let number=1;while(used.has(("Ebene "+number).toLocaleLowerCase("de")))number++;
    return "Ebene "+number;
  }
  function create(project,{id,name,cleanText,colors}){
    if(!id||project.layers.some(layer=>layer.id===id))throw new Error("Duplicate or empty layer ID");
    const cleaned=cleanText(name);
    if(!cleaned)throw new RangeError("Empty layer name");
    if(project.layers.some(layer=>layer.name.trim().toLocaleLowerCase("de")===cleaned.toLocaleLowerCase("de")))
      throw new RangeError("Duplicate layer name");
    if(!Array.isArray(colors)||colors.length===0)throw new TypeError("Missing layer colors");
    const layer={id,name:cleaned,color:colors[project.layers.length%colors.length],visible:true};
    project.layers.push(layer);return layer;
  }
  function deletionInfo(project,id,privateId){
    const layer=find(project,id);if(!layer)return null;
    const count=project.pins.filter(pin=>pin.layerId===id).length;
    const privateOnly=id===privateId;
    return {layer,count,privateOnly,allowed:!privateOnly||count>0};
  }
  function deleteLayerOrPins(project,id,privateId){
    const info=deletionInfo(project,id,privateId);
    if(!info||!info.allowed)return null;
    const removedPinIds=project.pins.filter(pin=>pin.layerId===id).map(pin=>pin.id);
    project.pins=project.pins.filter(pin=>pin.layerId!==id);
    if(!info.privateOnly)project.layers=project.layers.filter(layer=>layer.id!==id);
    return {...info,removedPinIds};
  }
  const api=Object.freeze({find,nextName,create,deletionInfo,deleteLayerOrPins});
  root.Pin2MapLayerOperations=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
