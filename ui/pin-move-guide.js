"use strict";
/*
 * Purely visual guide for choosing a relocation target. Mouse/pen/touch
 * pointer movement updates a temporary dashed connection from the ORIGINAL
 * pin position. No pin data is mutated until explicit confirmation.
 * The guide is disabled as soon as a location is chosen.
 */
(function(root){
  class PinMoveGuide{
    constructor({mapAdapter,requestFrame=callback=>root.requestAnimationFrame(callback),
      cancelFrame=id=>root.cancelAnimationFrame(id)}){
      if(!mapAdapter)throw new TypeError("Map adapter required");
      this.map=mapAdapter;
      this.requestFrame=requestFrame;
      this.cancelFrame=cancelFrame;
      this.origin=null;this.line=null;this.point=null;this.frame=null;
      this.container=null;
      this.handlePointer=event=>{
        if(!this.origin||!this.container||event.isPrimary===false)return;
        if(event.pointerType==="touch" && event.type==="pointermove" &&
          !(event.buttons&1))return;
        if(event.target?.closest?.("button, input, select, .leaflet-control"))return;
        const rect=this.container.getBoundingClientRect();
        const x=event.clientX-rect.left,y=event.clientY-rect.top;
        if(x<0||y<0||x>rect.width||y>rect.height)return;
        this.point={x,y};
        if(this.frame!==null)return;
        this.frame=this.requestFrame(()=>{
          this.frame=null;
          if(!this.origin||!this.point)return;
          this.updateLine();
        });
      };
    }
    start(pin){
      this.stop();
      if(!pin)return;
      this.origin={lat:Number(pin.lat),lng:Number(pin.lng)};
      this.container=this.map.getContainer();
      this.container.addEventListener("pointermove",this.handlePointer,{passive:true});
      // Touch devices have no hover; show the line while the finger is down.
      this.container.addEventListener("pointerdown",this.handlePointer,{passive:true});
    }
    updateLine(){
      const target=this.map.unproject(this.point);
      if(!this.line)this.line=this.map.createLine([this.origin,target],{
        color:"#74808a",weight:2.5,dashArray:"5 6",interactive:false
      });
      else this.map.setLinePositions(this.line,[this.origin,target]);
    }
    stop(){
      if(this.container){
        this.container.removeEventListener("pointermove",this.handlePointer);
        this.container.removeEventListener("pointerdown",this.handlePointer);
        this.container=null;
      }
      if(this.frame!==null){this.cancelFrame(this.frame);this.frame=null;}
      if(this.line){this.map.removeOverlay(this.line);this.line=null;}
      this.point=null;this.origin=null;
    }
  }
  root.Pin2MapPinMoveGuide=PinMoveGuide;
  if(typeof module!=="undefined"&&module.exports)module.exports=PinMoveGuide;
})(typeof window!=="undefined"?window:globalThis);
