"use strict";
/* Derive the label anchor of a Polygon/MultiPolygon from its CURRENT visible
 * intersection with the map viewport. Pure pixel geometry, independent of
 * Leaflet or the DOM. A partially visible land area or lake must not keep its
 * label at the (offscreen) center of the complete geometry.
 */
(function(root){
  function clipRing(ring,xmin,ymin,xmax,ymax){
    let points=ring;
    for(const [inside,intersection] of [
      [p=>p.x>=xmin,(a,b)=>intersectX(a,b,xmin)],
      [p=>p.x<=xmax,(a,b)=>intersectX(a,b,xmax)],
      [p=>p.y>=ymin,(a,b)=>intersectY(a,b,ymin)],
      [p=>p.y<=ymax,(a,b)=>intersectY(a,b,ymax)]
    ]){
      const output=[];
      for(let i=0;i<points.length;i++){
        const a=points[i],b=points[(i+1)%points.length];
        const ia=inside(a),ib=inside(b);
        if(ia&&ib)output.push(b);
        else if(ia&&!ib)output.push(intersection(a,b));
        else if(!ia&&ib)output.push(intersection(a,b),b);
      }
      points=output;
      if(points.length<3)break;
    }
    return points;
  }
  function intersectX(a,b,x){
    const t=(x-a.x)/(b.x-a.x);
    return {x,y:a.y+t*(b.y-a.y)};
  }
  function intersectY(a,b,y){
    const t=(y-a.y)/(b.y-a.y);
    return {x:a.x+t*(b.x-a.x),y};
  }
  function contains(ring,point){
    let hit=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i],b=ring[j];
      if((a.y>point.y)!==(b.y>point.y)&&
         point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)hit=!hit;
    }
    return hit;
  }
  function centroid(ring){
    let sum=0,x=0,y=0;
    for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length];
      const cross=a.x*b.y-b.x*a.y;
      sum+=cross;x+=(a.x+b.x)*cross;y+=(a.y+b.y)*cross;
    }
    if(Math.abs(sum)>1e-5)return {x:x/(3*sum),y:y/(3*sum)};
    return {x:ring.reduce((n,p)=>n+p.x,0)/ring.length,
      y:ring.reduce((n,p)=>n+p.y,0)/ring.length};
  }
  function nearestSquared(point,ring){
    let best=Infinity;
    for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length];
      const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
      const t=den?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/den)):0;
      best=Math.min(best,(point.x-a.x-dx*t)**2+(point.y-a.y-dy*t)**2);
    }
    return best;
  }
  function visibleAnchor(geometry,project,width,height,{padding=42}={}){
    if(!geometry||!["Polygon","MultiPolygon"].includes(geometry.type))return null;
    const border=Math.min(padding,width*.22,height*.22);
    const left=border,top=border,right=width-border,bottom=height-border;
    if(right<=left||bottom<=top)return null;
    const polygons=geometry.type==="Polygon"?[geometry.coordinates]:geometry.coordinates;
    let best=null;
    for(const rings of polygons){
      if(!rings?.[0]?.length)continue;
      const outer=rings[0].map(p=>project({lat:p[1],lng:p[0]}));
      const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
      for(const point of outer){
        bounds.minX=Math.min(bounds.minX,point.x);bounds.maxX=Math.max(bounds.maxX,point.x);
        bounds.minY=Math.min(bounds.minY,point.y);bounds.maxY=Math.max(bounds.maxY,point.y);
      }
      if(bounds.maxX<left||bounds.minX>right||bounds.maxY<top||bounds.minY>bottom)continue;
      const clipped=clipRing(outer,left,top,right,bottom);
      if(clipped.length<3)continue;
      const holes=rings.slice(1).map(r=>r.map(p=>project({lat:p[1],lng:p[0]})));
      const valid=point=>contains(clipped,point)&&!holes.some(h=>contains(h,point));
      const xmin=Math.max(left,Math.min(...clipped.map(p=>p.x)));
      const xmax=Math.min(right,Math.max(...clipped.map(p=>p.x)));
      const ymin=Math.max(top,Math.min(...clipped.map(p=>p.y)));
      const ymax=Math.min(bottom,Math.max(...clipped.map(p=>p.y)));
      const cx=(xmin+xmax)/2,cy=(ymin+ymax)/2;
      const candidates=[centroid(clipped),{x:cx,y:cy}];
      // Grid probes handle long narrow lakes and highly concave polygons,
      // where the centroid may lie outside the geometry or inside a hole.
      for(let iy=0;iy<=12;iy++)for(let ix=0;ix<=12;ix++)
        candidates.push({x:xmin+(xmax-xmin)*ix/12,
          y:ymin+(ymax-ymin)*iy/12});
      // Edges of small clipped components still supply valid candidates.
      for(let i=0;i<clipped.length;i+=Math.max(1,Math.ceil(clipped.length/48))){
        const a=clipped[i],b=clipped[(i+1)%clipped.length];
        candidates.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
      }
      for(const point of candidates){
        if(!valid(point))continue;
        const clearance=nearestSquared(point,clipped);
        const centerPenalty=((point.x-width/2)/width)**2+
          ((point.y-height/2)/height)**2;
        // Prefer an interior point with space for a legible label, and
        // prefer the middle of the VIEWPORT rather than the whole polygon.
        const score=Math.min(clearance,3600)-150*centerPenalty;
        if(!best||score>best.score)best={point,score};
      }
    }
    return best?.point||null;
  }
  const api=Object.freeze({clipRing,contains,centroid,visibleAnchor});
  root.Pin2MapAreaLabelAnchor=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
