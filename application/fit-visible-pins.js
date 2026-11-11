"use strict";
/* Fit visible project pins via a renderer-independent map port. */
(function(root){
  function fitVisiblePins({pins,layers,filter,pinFilter,mapPort,onEmpty=()=>{},onFit=()=>{}}){
    const points=pinFilter.visiblePins(pins,layers,filter).map(p=>[p.lat,p.lng]);
    if(!points.length){onEmpty();return false;}
    if(points.length===1){
      mapPort.setView({
        center:{lat:points[0][0],lng:points[0][1]},
        zoom:Math.max(mapPort.getViewport().zoom,13)
      },{animate:false});
    }else{
      mapPort.fitBounds(points,{padding:[35,35],maxZoom:15,animate:false});
    }
    onFit();
    return true;
  }
  root.Pin2MapFitVisiblePins=fitVisiblePins;
  if(typeof module!=="undefined"&&module.exports)module.exports=fitVisiblePins;
})(typeof window!=="undefined"?window:globalThis);
