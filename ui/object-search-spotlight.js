"use strict";
/*
 * Temporary search spotlight. Renderer-neutral: consumes screen rectangles and
 * viewport events from ports, and never touches project state or geometry.
 */
(function(root){
 const SVG="http://www.w3.org/2000/svg";
 function circleFromRect(rect,offset,{minRadius=34,maxRadius=160}={}){
  if(!rect||![rect.left,rect.right,rect.top,rect.bottom].every(Number.isFinite))return null;
  const width=rect.right-rect.left,height=rect.bottom-rect.top;
  if(width<=0||height<=0)return null;
  return {x:(rect.left+rect.right)/2-offset.left,
   y:(rect.top+rect.bottom)/2-offset.top,
   radius:Math.max(minRadius,Math.min(maxRadius,Math.hypot(width,height)/2+11))};
 }
 // Screen-space circle groups share one count if one hit falls inside
 // another's aperture. Distinct object IDs, not DOM nodes, are counted.
 function groupCircles(circles){
  // Spatial buckets keep densely overlaid search hits linear in practice.
  // A circle's centre must be inside another aperture (+8px tolerance).
  const size=176,buckets=new Map();
  const cell=c=>({x:Math.floor(c.x/size),y:Math.floor(c.y/size)});
  const key=(x,y)=>x+","+y;
  circles.forEach((circle,index)=>{
   const c=cell(circle),k=key(c.x,c.y);
   if(!buckets.has(k))buckets.set(k,new Set());
   buckets.get(k).add(index);
  });
  const groups=[],visited=new Set();
  for(let i=0;i<circles.length;i++){
   if(visited.has(i))continue;
   const queue=[i],group=[];visited.add(i);
   const initial=cell(circles[i]);buckets.get(key(initial.x,initial.y)).delete(i);
   for(let at=0;at<queue.length;at++){
    const current=circles[queue[at]],c=cell(current);
    group.push(current);
    for(let x=c.x-1;x<=c.x+1;x++)for(let y=c.y-1;y<=c.y+1;y++){
     const k=key(x,y),bucket=buckets.get(k);
     if(!bucket)continue;
     for(const j of bucket){
      const other=circles[j];
      if(Math.hypot(current.x-other.x,current.y-other.y)>
       Math.max(current.radius,other.radius)+8)continue;
      visited.add(j);bucket.delete(j);queue.push(j);
     }
    }
   }
   groups.push(group);
  }
  return groups;
 }
 class ObjectSearchSpotlight{
  constructor({mapPort,getTargets,requestFrame=cb=>requestAnimationFrame(cb),
    cancelFrame=id=>cancelAnimationFrame(id),document:doc=document}={}){
   if(!mapPort||typeof getTargets!=="function")throw new TypeError("Spotlight ports required");
   this.map=mapPort;this.getTargets=getTargets;this.doc=doc;
   this.raf=requestFrame;this.cancel=cancelFrame;this.active=false;this.pending=null;
   this.id="p2m-object-search-mask-"+Math.random().toString(36).slice(2);
   this.overlay=doc.createElementNS(SVG,"svg");
   this.overlay.setAttribute("aria-hidden","true");
   this.overlay.classList.add("p2m-object-search-spotlight");
   this.defs=doc.createElementNS(SVG,"defs");
   this.mask=doc.createElementNS(SVG,"mask");
   this.mask.setAttribute("id",this.id);
   this.mask.setAttribute("maskUnits","userSpaceOnUse");
   this.apertures=doc.createElementNS(SVG,"g");
   this.base=doc.createElementNS(SVG,"rect");this.base.setAttribute("fill","white");
   this.mask.append(this.base,this.apertures);this.defs.append(this.mask);
   this.shade=doc.createElementNS(SVG,"rect");
   this.shade.setAttribute("fill","rgba(16,31,52,0.32)");
   this.shade.setAttribute("mask","url(#"+this.id+")");
   this.badges=doc.createElementNS(SVG,"g");
   this.overlay.append(this.defs,this.shade,this.badges);
   this.map.getContainer().append(this.overlay);
   this.overlay.style.display="none";
   this.unsub=this.map.on("move zoom moveend zoomend resize",()=>this.schedule());
  }
  setActive(active){
   this.active=!!active;this.overlay.style.display=this.active?"block":"none";
   if(this.active)this.schedule();
   else{
    if(this.pending!==null)this.cancel(this.pending);
    this.pending=null;this.apertures.replaceChildren();this.badges.replaceChildren();
   }
  }
  schedule(){
   if(!this.active||this.pending!==null)return;
   this.pending=this.raf(()=>{this.pending=null;this.render();});
  }
  render(){
   if(!this.active)return;
   const container=this.map.getContainer(),view=container.getBoundingClientRect();
   const width=container.clientWidth,height=container.clientHeight;
   if(!width||!height)return;
   this.overlay.setAttribute("viewBox","0 0 "+width+" "+height);
   this.base.setAttribute("width",width);this.base.setAttribute("height",height);
   this.shade.setAttribute("width",width);this.shade.setAttribute("height",height);
   const holes=[],circles=[];
   for(const item of this.getTargets()||[]){
    // Pins use their icon's first rectangle; area/river labels use name rectangles.
    const bounds=item.rects?.[0];
    const circle=circleFromRect(bounds,view);
    if(!circle)continue;
    if(circle.x+circle.radius<0||circle.y+circle.radius<0||
      circle.x-circle.radius>width||circle.y-circle.radius>height)continue;
    const hole=this.doc.createElementNS(SVG,"circle");
    hole.setAttribute("cx",circle.x);hole.setAttribute("cy",circle.y);
    hole.setAttribute("r",circle.radius);
    hole.setAttribute("fill","black");holes.push(hole);
    circles.push({...circle,id:item.type+":"+item.id});
   }
   this.apertures.replaceChildren(...holes);
   const badges=[];
   for(const group of groupCircles(circles)){
    const count=new Set(group.map(c=>c.id)).size;
    if(count<2)continue;
    const left=Math.min(...group.map(c=>c.x-c.radius));
    const middle=(Math.min(...group.map(c=>c.y))+
      Math.max(...group.map(c=>c.y)))/2;
    const x=Math.max(5,Math.min(width-34,left-37));
    const y=Math.max(20,Math.min(height-10,middle));
    const box=this.doc.createElementNS(SVG,"rect");
    box.setAttribute("x",x);box.setAttribute("y",y-16);
    box.setAttribute("width","29");box.setAttribute("height","30");
    box.setAttribute("rx","8");box.setAttribute("fill","#fff");
    box.setAttribute("stroke","#60758a");box.setAttribute("stroke-width","1.5");
    const label=this.doc.createElementNS(SVG,"text");
    label.setAttribute("x",x+14.5);label.setAttribute("y",y+5);
    label.setAttribute("text-anchor","middle");
    label.setAttribute("font-size","17");label.setAttribute("font-weight","700");
    label.setAttribute("fill","#182c45");label.textContent=String(count);
    badges.push(box,label);
   }
   this.badges.replaceChildren(...badges);
  }
  dispose(){
   this.setActive(false);this.unsub?.();this.overlay.remove();
  }
 }
 const api=Object.freeze({ObjectSearchSpotlight,circleFromRect,groupCircles});
 root.Pin2MapObjectSearchSpotlight=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
