"use strict";
/*
 * Pin editor presentation only. No pin mutations, geometry calculations,
 * Leaflet primitives or database calls.
 */
(function(root){
 class PinEditorView{
  constructor({getElement,document:doc,scheduleFrame}){
   if(typeof getElement!=="function"||!doc||typeof scheduleFrame!=="function")
     throw new TypeError("Pin editor dependencies required");
   this.element=getElement;this.document=doc;this.scheduleFrame=scheduleFrame;
  }
  render({pin,moving=false,layerVisible=true,onLayout}){
   const panel=this.element("pinPanel");
   const shown=!!pin&&!moving;
   panel.classList.toggle("hidden",!shown);
   this.document.body.classList.toggle("pin-open",shown);
   this.element("pinDialogTip").classList.toggle("hidden",!shown);
   if(!pin)return;
   const name=this.element("pinName");
   if(this.document.activeElement!==name)name.value=pin.name||"";
   this.element("pinLayer").value=pin.layerId;
   this.element("pinCoords").textContent="Koordinaten: "+pin.lat.toFixed(6)+", "+pin.lng.toFixed(6);
   this.element("pinHiddenInfo").classList.toggle("hidden",Boolean(layerVisible));
   // Preserve the SVG child: assigning textContent would remove the icon.
   const moveButton=this.element("movePin");
   const moveLabel=moving?"Verschieben abbrechen":"Pin verschieben";
   moveButton.title=moveLabel;
   moveButton.setAttribute("aria-label",moveLabel);
   this.scheduleFrame(onLayout);
  }
 }
 root.Pin2MapPinEditorView=PinEditorView;
 if(typeof module!=="undefined"&&module.exports)module.exports=PinEditorView;
})(typeof window!=="undefined"?window:globalThis);
