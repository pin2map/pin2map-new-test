"use strict";
/* Exact predecessor area polygon simplification contract, isolated from map/DOM.
 * Source: pin2map/pin2map index.html, geoPointCount through prepareAreaGeoJSON.
 * GeoJSON coordinates remain [longitude,latitude].
 */
(function(root){
  function pointCount(g){
    let n=0;
    function walk(v){
      if(!Array.isArray(v))return;
      if(v.length>=2&&typeof v[0]==="number"&&typeof v[1]==="number"){n++;return;}
      for(const child of v)walk(child);
    }
    if(g?.coordinates)walk(g.coordinates);
    else if(g?.geometries)for(const geom of g.geometries)n+=pointCount(geom);
    return n;
  }
  function sqSegDist(p,a,b){
    let x=a[0],y=a[1],dx=b[0]-x,dy=b[1]-y;
    if(dx!==0||dy!==0){
      const t=((p[0]-x)*dx+(p[1]-y)*dy)/(dx*dx+dy*dy);
      if(t>1){x=b[0];y=b[1];}
      else if(t>0){x+=dx*t;y+=dy*t;}
    }
    dx=p[0]-x;dy=p[1]-y;
    return dx*dx+dy*dy;
  }
  function dpStep(points,first,last,sqTol,keep){
    let maxSq=sqTol,index=0;
    for(let i=first+1;i<last;i++){
      const sq=sqSegDist(points[i],points[first],points[last]);
      if(sq>maxSq){index=i;maxSq=sq;}
    }
    if(maxSq>sqTol){
      if(index-first>1)dpStep(points,first,index,sqTol,keep);
      keep[index]=true;
      if(last-index>1)dpStep(points,index,last,sqTol,keep);
    }
  }
  function simplifyRing(ring,tol){
    if(!Array.isArray(ring)||ring.length<6)return ring;
    const closed=ring[0][0]===ring[ring.length-1][0]&&ring[0][1]===ring[ring.length-1][1];
    const pts=closed?ring.slice(0,-1):ring.slice();
    if(pts.length<5)return ring;
    let split=0,maxD=-1;
    const a=pts[0];
    for(let i=1;i<pts.length;i++){
      const dx=pts[i][0]-a[0],dy=pts[i][1]-a[1],d=dx*dx+dy*dy;
      if(d>maxD){maxD=d;split=i;}
    }
    const ordered=pts.slice(split).concat(pts.slice(0,split));
    ordered.push(ordered[0]);
    const keep={0:true,[ordered.length-1]:true};
    dpStep(ordered,0,ordered.length-1,tol*tol,keep);
    const out=ordered.filter((_,i)=>keep[i]);
    if(out.length<4)return ring;
    if(out[0][0]!==out[out.length-1][0]||out[0][1]!==out[out.length-1][1])
      out.push(out[0].slice());
    return out;
  }
  function tolerance(g){
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    function walk(v){
      if(!Array.isArray(v))return;
      if(v.length>=2&&typeof v[0]==="number"&&typeof v[1]==="number"){
        minX=Math.min(minX,v[0]);maxX=Math.max(maxX,v[0]);
        minY=Math.min(minY,v[1]);maxY=Math.max(maxY,v[1]);return;
      }
      for(const child of v)walk(child);
    }
    if(g?.coordinates)walk(g.coordinates);
    const span=Math.max(maxX-minX,maxY-minY);
    if(!Number.isFinite(span)||span<=0)return 0.0008;
    return Math.max(0.00018,Math.min(0.0018,span/5000));
  }
  function withTolerance(g,tol){
    const before=pointCount(g);
    function simpGeom(x){
      if(!x)return x;
      if(x.type==="Polygon")return {type:"Polygon",coordinates:x.coordinates.map(r=>simplifyRing(r,tol))};
      if(x.type==="MultiPolygon")return {type:"MultiPolygon",
        coordinates:x.coordinates.map(p=>p.map(r=>simplifyRing(r,tol)))};
      if(x.type==="GeometryCollection")return {type:"GeometryCollection",geometries:x.geometries.map(simpGeom)};
      return x;
    }
    const geometry=simpGeom(g);
    return {geometry,before,after:pointCount(geometry)};
  }
  function simplify(g){
    if(!g)return {geometry:g,before:0,after:0};
    const before=pointCount(g);
    if(before<=12000)return {geometry:g,before,after:before};
    return withTolerance(g,tolerance(g));
  }
  function prepare(g,{touchDevice=false,existingPoints=0}={}){
    const raw=pointCount(g);
    let result;
    if(!touchDevice)result=simplify(g);
    else {
      const projected=existingPoints+raw;
      let factor=1;
      if(projected>180000)factor=1.60;
      else if(projected>130000)factor=1.35;
      else if(projected>90000)factor=1.18;
      else if(projected>60000)factor=1.08;
      result=raw<=12000&&factor===1
        ?{geometry:g,before:raw,after:raw}
        :withTolerance(g,tolerance(g)*factor);
    }
    return {...result,totalPoints:existingPoints+result.after};
  }
  function containsPoint(geometry,lon,lat){
    function ringContains(ring){
      let inside=false;
      for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const a=ring[i],b=ring[j];
        if((a[1]>lat)!==(b[1]>lat)&&
          lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
      }
      return inside;
    }
    function polygonContains(poly){
      if(!poly?.length||!ringContains(poly[0]))return false;
      for(let i=1;i<poly.length;i++)if(ringContains(poly[i]))return false;
      return true;
    }
    if(geometry?.type==="Polygon")return polygonContains(geometry.coordinates);
    if(geometry?.type==="MultiPolygon")return geometry.coordinates.some(polygonContains);
    return false;
  }
  const api=Object.freeze({pointCount,tolerance,simplifyRing,withTolerance,simplify,prepare,containsPoint});
  root.Pin2MapAreaGeometry=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
