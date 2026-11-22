"use strict";
/* Map controls bind UI events; domain state and project persistence are ports.
 * The yellow hitbox indicator is device-local only and must never mutate
 * project data or the actual pointer hit region. */
(function(root){
  const HITBOX_DISPLAY_KEY="pin2map-show-yellow-pin-hitboxes-v1";
  class MapViewControls{
    constructor({getElement,document:doc,getLabelsVisible,setLabelsVisible,
      onSave,onRenderMarkers,onUpdateLabelButton,layerView,overlayCoordinator,
      onToggleSettings,getGeocodeEnabled,setGeocodeEnabled,
      readLocalPreference,writeLocalPreference}){
      const callbacks=[getElement,getLabelsVisible,setLabelsVisible,onSave,
        onRenderMarkers,onUpdateLabelButton,onToggleSettings,getGeocodeEnabled,
        setGeocodeEnabled,readLocalPreference,writeLocalPreference];
      if(!doc||!doc.body||!layerView||!overlayCoordinator||
        callbacks.some(fn=>typeof fn!=="function"))
        throw new TypeError("Map view control ports required");
      Object.assign(this,{getElement,doc,getLabelsVisible,setLabelsVisible,
        onSave,onRenderMarkers,onUpdateLabelButton,layerView,overlayCoordinator,
        onToggleSettings,getGeocodeEnabled,setGeocodeEnabled,
        readLocalPreference,writeLocalPreference});
      this.listeners=[];this.mapBound=false;this.settingsBound=false;
    }
    listen(id,type,handler){
      const node=this.getElement(id);
      node.addEventListener(type,handler);
      this.listeners.push({node,type,handler});
    }
    applyHitboxDisplay(visible){
      this.doc.body.classList.toggle("pin-hitboxes-hidden",!visible);
      this.getElement("showPinHitboxes").checked=visible;
    }
    readHitboxDisplay(){
      try{return this.readLocalPreference(HITBOX_DISPLAY_KEY)!=="false";}
      catch(_){return true;}
    }
    writeHitboxDisplay(visible){
      this.applyHitboxDisplay(visible);
      try{this.writeLocalPreference(HITBOX_DISPLAY_KEY,String(visible));}catch(_){}
    }
    bindMapButtons(){
      if(this.mapBound)return;
      this.mapBound=true;
      this.listen("labelsToggle","click",()=>{
        this.setLabelsVisible(!this.getLabelsVisible());
        this.onSave();this.onRenderMarkers();this.onUpdateLabelButton();
      });
      this.listen("layersButton","click",()=>{
        if(!this.getElement("layersPanel").classList.contains("hidden")){
          this.layerView.close();return;
        }
        this.overlayCoordinator.closeAll();this.layerView.show();
      });
      this.listen("settingsButton","click",()=>this.onToggleSettings());
    }
    bindSettingsAndLayerActions(){
      if(this.settingsBound)return;
      this.settingsBound=true;
      this.applyHitboxDisplay(this.readHitboxDisplay());
      this.listen("showPinHitboxes","change",event=>this.writeHitboxDisplay(event.target.checked));
      this.getElement("allowGeocode").checked=this.getGeocodeEnabled();
      this.listen("allowGeocode","change",event=>{
        this.setGeocodeEnabled(event.target.checked);this.onSave();
      });
      this.listen("addLayer","click",()=>this.layerView.footerAction());
      this.listen("layersClose","click",()=>this.layerView.close());
      this.listen("layersCloseBottom","click",()=>this.layerView.footerCancel());
      this.listen("layersUnite","click",()=>this.layerView.beginMerge());
    }
    dispose(){
      for(const {node,type,handler} of this.listeners)node.removeEventListener(type,handler);
      this.listeners=[];this.mapBound=false;this.settingsBound=false;
    }
  }
  root.Pin2MapMapViewControls=MapViewControls;
  if(typeof module!=="undefined"&&module.exports)module.exports=MapViewControls;
})(typeof window!=="undefined"?window:globalThis);
