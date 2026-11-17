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
    // New regular layers always appear immediately after the protected
    // Private layer; do not reorder existing regular layers.
    const privateIndex=project.layers.findIndex(item=>item.id==="private");
    project.layers.splice(privateIndex<0?0:privateIndex+1,0,layer);
    return layer;
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
  function renameAndColor(project,id,name,color,cleanText,hex){
    if(id==="private")return false;
    const layer=find(project,id);if(!layer)return false;
    const next=cleanText(name);
    if(!next||project.layers.some(l=>l.id!==id&&l.name.toLocaleLowerCase("de-DE")===
      next.toLocaleLowerCase("de-DE")))return false;
    const chosen=hex(color);if(!chosen)return false;
    layer.name=next;layer.color=chosen;
    return layer;
  }
  function deleteContents(project,id){
    if(!find(project,id))return false;
    for(const key of ["pins","areas","rivers"])
      if(Array.isArray(project[key]))project[key]=project[key].filter(x=>x.layerId!==id);
    return true;
  }
  function removeEntireLayer(project,id){
    if(id==="private"||!find(project,id))return false;
    if(!deleteContents(project,id))return false;
    project.layers=project.layers.filter(l=>l.id!==id);
    return true;
  }
  // Private can donate its contents but cannot be the target or be deleted.
  function merge(project,selectedIds,targetId){
    if(!Array.isArray(selectedIds)||selectedIds.length<2||
       new Set(selectedIds).size!==selectedIds.length||
       targetId==="private"||!selectedIds.includes(targetId)||
       selectedIds.some(id=>!find(project,id)))return false;
    const sources=new Set(selectedIds.filter(id=>id!==targetId));
    const moved={pins:0,areas:0,rivers:0};
    for(const key of ["pins","areas","rivers"])
      for(const item of project[key]||[])
        if(sources.has(item.layerId)){item.layerId=targetId;moved[key]++;}
    project.layers=project.layers.filter(layer=>layer.id==="private"||!sources.has(layer.id));
    // Favorites remember layer visibility as objects, not only layer IDs.
    for(const favorite of project.favorites||[]){
      if(!favorite||typeof favorite!=="object")continue;
      if(Array.isArray(favorite.layers)){
        const target=favorite.layers.find(l=>l.id===targetId);
        const visible=selectedIds.some(id=>favorite.layers.some(l=>l.id===id&&l.visible));
        favorite.layers=favorite.layers.filter(l=>!sources.has(l.id)||l.id==="private");
        if(target)target.visible=visible;
      }
      for(const key of ["layerIds","visibleLayerIds"])
        if(Array.isArray(favorite[key]))
          favorite[key]=[...new Set(favorite[key].map(id=>sources.has(id)?targetId:id))];
    }
    return {targetId,sourceIds:[...sources],moved};
  }
  function reorder(project,fromId,toId){
    const layers=project.layers;
    if(fromId==="private"||toId==="private"||fromId===toId)return false;
    const from=layers.findIndex(l=>l.id===fromId);
    const to=layers.findIndex(l=>l.id===toId);
    if(from<0||to<0)return false;
    const [layer]=layers.splice(from,1);
    layers.splice(to,0,layer);
    return true;
  }
  const api=Object.freeze({find,nextName,create,deletionInfo,deleteLayerOrPins,
    renameAndColor,deleteContents,removeEntireLayer,merge,reorder});
  root.Pin2MapLayerOperations=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
