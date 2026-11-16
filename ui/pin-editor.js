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
   const core=root.Pin2MapObjectDialogCore;
   if(core){
    core.configureSurface(this.element("pinPanel"),
      this.element("pinPanel").querySelector?.(".pin-editor-head"),
      this.element("pinPanel").querySelector?.(".pin-detail-region"),
      this.element("pinPanel").querySelector?.(".pin-actions"));
    core.configureOk(this.element("closePin"));
    const panel=this.element("pinPanel");
    core.configureName({
     legend:panel.querySelector?.(".pin-name-field legend"),
     input:this.element("pinName"),type:"pin"
    });
    core.configureNotes({
     legend:this.element("pinDetailTitle"),
     input:this.element("pinNotes"),type:"pin"
    });
    core.arrangeFooter(panel.querySelector?.(".pin-actions"),{
     move:this.element("movePin"),layer:this.element("pinLayerPicker"),
     url:this.element("pinUrlButton"),wiki:this.element("pinWikipedia"),
     meteo:this.element("pinWeather"),ok:this.element("closePin")
    });
    core.mountDeleteSymbol(this.element("deletePin"),"pin",doc,root.Pin2MapIcons);
   }
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
