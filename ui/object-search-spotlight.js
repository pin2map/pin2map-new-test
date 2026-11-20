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
   this.rings=doc.createElementNS(SVG,"g");
   this.overlay.append(this.defs,this.shade,this.rings);
   this.map.getContainer().append(this.overlay);
   this.overlay.style.display="none";
   this.unsub=this.map.on("move zoom moveend zoomend resize",()=>this.schedule());
  }
  setActive(active){
   this.active=!!active;this.overlay.style.display=this.active?"block":"none";
   if(this.active)this.schedule();
   else{
    if(this.pending!==null)this.cancel(this.pending);
    this.pending=null;this.apertures.replaceChildren();this.rings.replaceChildren();
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
   const holes=[],rings=[];
   for(const item of this.getTargets()||[]){
    // Pins use their icon's first rectangle; area/river labels use name rectangles.
    const bounds=item.rects?.[0];
    const circle=circleFromRect(bounds,view);
    if(!circle)continue;
    if(circle.x+circle.radius<0||circle.y+circle.radius<0||
      circle.x-circle.radius>width||circle.y-circle.radius>height)continue;
    const hole=this.doc.createElementNS(SVG,"circle");
    const ring=this.doc.createElementNS(SVG,"circle");
    for(const shape of [hole,ring]){
     shape.setAttribute("cx",circle.x);shape.setAttribute("cy",circle.y);
     shape.setAttribute("r",circle.radius);
    }
    hole.setAttribute("fill","black");holes.push(hole);
    ring.setAttribute("fill","none");ring.setAttribute("stroke","rgba(255,255,255,0.85)");
    ring.setAttribute("stroke-width","4");rings.push(ring);
   }
   this.apertures.replaceChildren(...holes);
   this.rings.replaceChildren(...rings);
  }
  dispose(){
   this.setActive(false);this.unsub?.();this.overlay.remove();
  }
 }
 const api=Object.freeze({ObjectSearchSpotlight,circleFromRect});
 root.Pin2MapObjectSearchSpotlight=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
