"use strict";
/*
 * Pin editor anchoring and one-shot opening correction.
 * Presentation-only. No pin mutations, storage or map-framework globals.
 * The follow-up layout does NOT continuously constrain the panel: during map
 * navigation it remains anchored to its pin even beyond viewport boundaries.
 */
(function(root){
  function anchorGeometry({point,mapRect,appRect,panelHeight,maxWidth=390,padding=16,offset=76}){
    const width=Math.min(maxWidth,appRect.width-padding);
    const x=mapRect.left+point.x-appRect.left;
    const y=mapRect.top+point.y-appRect.top;
    return {
      panel:{left:x-width/2,top:y-panelHeight-offset,width},
      tip:{left:x,top:y-offset}
    };
  }
  function openingCorrection({appRect,panelRect,tipRect,margin=12}){
    const minX=appRect.left+margin,maxX=appRect.right-margin;
    const minY=appRect.top+margin,maxY=appRect.bottom-margin;
    const dx=panelRect.left<minX?minX-panelRect.left:
      panelRect.right>maxX?maxX-panelRect.right:0;
    const lowest=Math.max(panelRect.bottom,tipRect.bottom);
    const dy=panelRect.top<minY?minY-panelRect.top:
      lowest>maxY?maxY-lowest:0;
    return {dx,dy,needsPan:Math.abs(dx)>0.5||Math.abs(dy)>0.5};
  }
  class PinPanelPositioner{
    constructor({mapAdapter,getElement,document:doc}){
      if(!mapAdapter||typeof getElement!=="function"||!doc)
        throw new TypeError("Pin panel positioning dependencies required");
      this.map=mapAdapter;this.el=getElement;this.document=doc;
    }
    layout({pin,moving=false}={}){
      const panel=this.el("pinPanel");
      const open=!!pin&&!moving&&!panel.classList.contains("hidden");
      this.document.body.classList.toggle("pin-open",open);
      const tip=this.el("pinDialogTip");
      tip.classList.toggle("hidden",!open);
      if(!open)return false;
      const positions=anchorGeometry({
        point:this.map.project({lat:pin.lat,lng:pin.lng}),
        appRect:this.el("app").getBoundingClientRect(),
        mapRect:this.map.getContainer().getBoundingClientRect(),
        panelHeight:panel.offsetHeight
      });
      panel.style.visibility="visible";
      panel.style.left=positions.panel.left+"px";
      panel.style.top=positions.panel.top+"px";
      panel.style.bottom="auto";panel.style.right="auto";
      panel.style.transform="none";panel.style.width=positions.panel.width+"px";
      panel.classList.remove("panel-near-top");
      // When a narrow mobile visual viewport is reduced by the keyboard,
      // anchor the editor near the top of the remaining visible area.
      // The fullscreen note editor handles long-form mobile typing separately.
      const vv=this.document.defaultView?.visualViewport;
      const mobile=this.document.defaultView?.innerWidth<=700;
      const keyboard=Boolean(mobile&&vv&&vv.height<this.document.defaultView.innerHeight*.78&&
        panel.contains(this.document.activeElement));
      panel.classList.toggle("pin-keyboard-mode",keyboard);
      panel.style.maxHeight=keyboard?Math.max(130,vv.height-24)+"px":"";
      panel.style.overflowY=keyboard?"auto":"";
      if(keyboard){
        panel.style.left=Math.max(12,(vv.width-positions.panel.width)/2+vv.offsetLeft)+"px";
        panel.style.top=(vv.offsetTop+12)+"px";
        tip.classList.add("hidden");
        return true;
      }
      tip.style.left=positions.tip.left+"px";
      tip.style.top=positions.tip.top+"px";
      return true;
    }
    keepVisibleAtOpen({pin,moving=false}={}){
      // Only on the initial opening event, never on subsequent map drags.
      if(!this.layout({pin,moving}))return false;
      const adjustment=openingCorrection({
        appRect:this.el("app").getBoundingClientRect(),
        panelRect:this.el("pinPanel").getBoundingClientRect(),
        tipRect:this.el("pinDialogTip").getBoundingClientRect()
      });
      if(!adjustment.needsPan)return false;
      // Match the existing map-adapter panBy sign convention exactly.
      this.map.panBy({x:-adjustment.dx,y:-adjustment.dy},{animate:false});
      this.layout({pin,moving});
      return true;
    }
  }
  const api=Object.freeze({anchorGeometry,openingCorrection,PinPanelPositioner});
  root.Pin2MapPinPanelPositioner=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
