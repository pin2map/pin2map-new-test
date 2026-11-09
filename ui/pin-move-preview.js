"use strict";
/*
 * Temporary pin relocation display: marker, connector line and confirmation bar.
 * No domain mutation, persistence, or knowledge of Leaflet internals.
 */
(function(root){
  function barPlacement({point,mapRect,appRect,width,height,viewport,margin=8}){
    const x=mapRect.left+point.x,y=mapRect.top+point.y;
    const left=viewport?viewport.offsetLeft:0;
    const top=viewport?viewport.offsetTop:0;
    const right=left+(viewport?viewport.width:0);
    const bottom=top+(viewport?viewport.height:0);
    const centerX=Math.max(left+margin+width/2,Math.min(right-margin-width/2,x));
    const below=y+30,above=y-height-30;
    const proposedTop=below+height+margin<=bottom?below:Math.max(top+margin,above);
    return {left:centerX-width/2-appRect.left,top:proposedTop-appRect.top};
  }
  class PinMovePreview{
    constructor({mapAdapter,getElement,getAppRect,getViewport,onPosition}){
      if(!mapAdapter||typeof getElement!=="function"||typeof onPosition!=="function")
        throw new TypeError("Preview adapter and callbacks required");
      this.map=mapAdapter;this.el=getElement;
      this.getAppRect=getAppRect;this.getViewport=getViewport;this.onPosition=onPosition;
      this.marker=null;this.line=null;this.position=null;
    }
    current(){return this.position?{...this.position}:null;}
    clear(){
      if(this.marker){this.map.removeOverlay(this.marker);this.marker=null;}
      if(this.line){this.map.removeOverlay(this.line);this.line=null;}
      this.position=null;
      this.el("confirmMove").disabled=true;
      this.el("moveBar").classList.add("hidden");
    }
    show(position,pin){
      if(!pin)return;
      const next={lat:Number(position.lat),lng:Number(position.lng)};
      if(!Number.isFinite(next.lat)||!Number.isFinite(next.lng))return;
      let phase="create preview marker";
      try{
        this.position=next;
        const initial=[pin.lat,pin.lng];
        if(!this.marker){
          this.marker=this.map.createMarker(next,{draggable:true,autoPan:false,zIndexOffset:1000});
          phase="bind preview drag events";
          this.map.onMarker(this.marker,"drag",p=>this.onPosition(p));
          this.map.onMarker(this.marker,"dragend",p=>this.onPosition(p));
        }else{
          phase="update preview marker";
          this.map.setMarkerPosition(this.marker,next);
        }
        phase="create or update preview line";
        if(!this.line)this.line=this.map.createLine([initial,next],{color:"#d65a31",weight:3,dashArray:"7 5",interactive:false});
        else this.map.setLinePositions(this.line,[initial,next]);
        phase="show confirmation controls";
        this.el("confirmMove").disabled=false;
        this.el("moveText").textContent="Neue Position";
        this.el("moveBar").classList.remove("hidden");
        phase="position confirmation controls";
        this.positionBar();
      }catch(error){
        // A failed UI render is never a confirmed move. Preserve the original
        // cause and stack; annotate the failing adapter/UI boundary for CI.
        throw new Error("Pin move preview failed at "+phase+": "+error.message,{cause:error});
      }
    }
    positionBar(){
      if(!this.position)return;
      const bar=this.el("moveBar");
      if(bar.classList.contains("hidden"))return;
      const width=bar.offsetWidth,height=bar.offsetHeight;
      if(!width||!height)return;
      const rect=this.map.getContainer().getBoundingClientRect();
      const appRect=this.getAppRect();
      const viewport=this.getViewport();
      const placement=barPlacement({
        point:this.map.project(this.position),mapRect:rect,appRect,width,height,
        viewport:viewport||{offsetLeft:0,offsetTop:0,width:appRect.width,height:appRect.height}
      });
      bar.style.left=placement.left+"px";bar.style.top=placement.top+"px";
      bar.style.right="auto";bar.style.bottom="auto";bar.style.transform="none";
    }
  }
  const api=Object.freeze({barPlacement,PinMovePreview});
  root.Pin2MapPinMovePreview=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
