"use strict";
/* Renderer-/storage-neutral creation of actual project records.
 * All project mutations go through existing pin and feature use cases. */
(function(root){
  function createObjectCreationService({pinOperations,projectFeatures,validatePosition,
    cleanText,newId,now=()=>new Date().toISOString()}){
    function create(project,entry,layerId){
      if(!entry)return null;
      if(entry.kind==="point"){
        const name=entry.referencePlace?
          entry.label+" – "+entry.referencePlace+" (Ersatzort)":
          entry.name||entry.label||"Neuer Pin";
        return pinOperations.createPin(project,{
          id:newId(),lat:entry.point.lat,lng:entry.point.lng,name,layerId,...(entry.address?{address:entry.address}:{})
        },{validatePosition,cleanText});
      }
      if(entry.kind==="river"){
        return projectFeatures.createRiver(project,{
          id:newId(),name:entry.label,chains:entry.chains,createdAt:now()
        },layerId);
      }
      if(entry.geojson){
        return projectFeatures.createArea(project,{
          id:newId(),name:entry.label,kind:entry.featureKind||"area",
          geometry:entry.geojson,createdAt:now()
        },layerId);
      }
      return null;
    }
    function createArea(project,source,kind,layerId,nameOverride=null){
      const name=nameOverride||source.name||source.display_name?.split(",")[0]||"Fläche";
      return projectFeatures.createArea(project,{
        id:newId(),name,kind,geometry:source.geojson,createdAt:now()
      },layerId);
    }
    return Object.freeze({create,createArea});
  }
  root.Pin2MapObjectCreationService=createObjectCreationService;
  if(typeof module!=="undefined"&&module.exports)module.exports=createObjectCreationService;
})(typeof window!=="undefined"?window:globalThis);
