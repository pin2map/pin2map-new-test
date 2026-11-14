"use strict";
/* Watercourse line reconstruction. Ported from predecessor river952WayCoords
 * and river952Join, retaining its 1e-7 degree endpoint tolerance, reversed
 * segment joins, longest-first output and main_stream preference.
 * No Leaflet, DOM, network or browser dependencies.
 */
(function(root){
  function wayCoordinates(way,nodes){
    if(!way||!Array.isArray(way.nodes))return null;
    const pts=way.nodes.map(id=>nodes[id]?[nodes[id].lat,nodes[id].lon]:null).filter(Boolean);
    return pts.length>1?pts:null;
  }
  function join(parts){
    const unused=parts.slice(),chains=[];
    const same=(a,b)=>Math.abs(a[0]-b[0])<1e-7&&Math.abs(a[1]-b[1])<1e-7;
    while(unused.length){
      let chain=unused.pop().slice(),changed=true;
      while(changed){
        changed=false;
        for(let i=unused.length-1;i>=0;i--){
          const p=unused[i],a=chain[0],z=chain[chain.length-1],pa=p[0],pz=p[p.length-1];
          if(same(z,pa))chain=chain.concat(p.slice(1));
          else if(same(z,pz))chain=chain.concat(p.slice(0,-1).reverse());
          else if(same(a,pz))chain=p.slice(0,-1).concat(chain);
          else if(same(a,pa))chain=p.slice(1).reverse().concat(chain);
          else continue;
          unused.splice(i,1);changed=true;
        }
      }
      chains.push(chain);
    }
    chains.sort((x,y)=>y.length-x.length);
    return chains;
  }
  function resolve(full,match){
    const elements=full?.elements;
    if(!Array.isArray(elements))throw new Error("Flussverlauf – keine Elemente erhalten");
    const nodes={},ways={};
    let relation=null,targetWay=null;
    for(const element of elements){
      if(element.type==="node")nodes[element.id]={lat:Number(element.lat),lon:Number(element.lon)};
      else if(element.type==="way"){
        ways[element.id]=element;
        if(match.osmType==="way"&&String(element.id)===String(match.id))targetWay=element;
      }else if(element.type==="relation"&&String(element.id)===String(match.id))relation=element;
    }
    const parts=[];
    let tags=match.tags||{};
    if(match.osmType==="way"){
      const one=wayCoordinates(targetWay,nodes);
      if(one)parts.push(one);
    }else{
      if(!relation||relation.tags?.type!=="waterway"||!Array.isArray(relation.members))
        throw new Error("Flussverlauf – keine gültige Flussrelation");
      tags=relation.tags||tags;
      for(const member of relation.members){
        if(member.type!=="way"||(member.role&&member.role!=="main_stream"))continue;
        const pts=wayCoordinates(ways[member.ref],nodes);
        if(pts)parts.push(pts);
      }
      if(!parts.length)for(const member of relation.members){
        if(member.type!=="way")continue;
        const pts=wayCoordinates(ways[member.ref],nodes);
        if(pts)parts.push(pts);
      }
    }
    if(!parts.length)throw new Error("Flussverlauf – keine Linienabschnitte gefunden");
    return {name:tags.name||match.tags?.name||"",chains:join(parts),segmentCount:parts.length};
  }
  const api=Object.freeze({wayCoordinates,join,resolve});
  root.Pin2MapRiverGeometry=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
