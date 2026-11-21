"use strict";
/* Central note and URL status colors for Pins and geometry labels.
 * Geometry labels show a split circular status: left note, right URL. */
(function(root){
 const COLORS=Object.freeze({note:"#d94f55",url:"#2979d1",empty:"#e8edf2"});
 const hasText=value=>typeof value==="string"&&value.trim().length>0;
 function flags(object){return {note:hasText(object?.note),url:hasText(object?.url)};}
 function halves(object,doc){
  const status=flags(object);
  const outer=doc.createElement("span");outer.className="p2m-object-status";
  outer.setAttribute("aria-hidden","true");
  const ns="http://www.w3.org/2000/svg";
  const svg=doc.createElementNS(ns,"svg");
  svg.setAttribute("viewBox","0 0 24 24");
  const path=(d,fill)=>{
   const el=doc.createElementNS(ns,"path");el.setAttribute("d",d);
   el.setAttribute("fill",fill);svg.append(el);
  };
  path("M12 2A10 10 0 0 0 12 22Z",status.note?COLORS.note:COLORS.empty);
  path("M12 2A10 10 0 0 1 12 22Z",status.url?COLORS.url:COLORS.empty);
  const rim=doc.createElementNS(ns,"circle");
  rim.setAttribute("cx","12");rim.setAttribute("cy","12");
  rim.setAttribute("r","10");rim.setAttribute("fill","none");
  rim.setAttribute("stroke","#697c90");rim.setAttribute("stroke-width","1.5");
  svg.append(rim);outer.append(svg);
  return outer;
 }
 const api=Object.freeze({COLORS,flags,halves});
 root.Pin2MapObjectStatus=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
