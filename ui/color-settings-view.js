"use strict";
/* Settings-only UI. Project palette is sync-ready; this view owns no persistence. */
(function(root){
 class ColorSettingsView{
  constructor({document:doc,getElement,palette,getProject,onChange}){
   if(!doc||!palette||typeof getProject!=="function"||typeof onChange!=="function")
    throw new TypeError("Color settings ports required");
   this.doc=doc;this.el=getElement;this.palette=palette;
   this.getProject=getProject;this.onChange=onChange;
  }
  bind(){this.render();}
  render(){
   const colors=this.palette.colors(this.getProject());
   this.draw("standardColorGrid",colors.standard.map((value,index)=>
    ({kind:"standard",key:index,value,label:"Standardfarbe "+(index+1)})));
   this.draw("signalColorGrid",Object.entries(colors.signals).map(([key,value])=>
    ({kind:"signals",key,value,label:{red:"Rot",yellow:"Gelb",green:"Grün"}[key]})));
  }
  draw(id,entries){
   const target=this.el(id);if(!target)return;
   target.replaceChildren();
   for(const entry of entries){
    const item=this.doc.createElement("div");item.className="settings-color-item";
    const swatch=this.doc.createElement("input");
    swatch.type="color";swatch.className="settings-color-swatch";
    swatch.value=entry.value;swatch.setAttribute("aria-label",entry.label+" auswählen");
    const hex=this.doc.createElement("input");
    hex.type="text";hex.className="settings-color-hex";hex.maxLength=7;
    hex.value=entry.value;hex.setAttribute("aria-label",entry.label+" HEX-Wert");
    const update=value=>{
     const normalized=this.palette.hex(value);
     if(!normalized){hex.setCustomValidity("Bitte #RRGGBB eingeben");hex.reportValidity();return;}
     hex.setCustomValidity("");
     this.palette.setColor(this.getProject(),entry.kind,entry.key,normalized);
     hex.value=normalized;swatch.value=normalized;this.onChange();
    };
    swatch.addEventListener("input",()=>update(swatch.value));
    hex.addEventListener("change",()=>update(hex.value));
    item.append(swatch,hex);target.append(item);
   }
  }
 }
 root.Pin2MapColorSettingsView=ColorSettingsView;
 if(typeof module!=="undefined"&&module.exports)module.exports=ColorSettingsView;
})(typeof window!=="undefined"?window:globalThis);
