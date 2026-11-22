"use strict";
/* Presentation and map-marker selection coordination. Only explicit UI/use-case
 * ports are supplied; no project mutation, Leaflet, persistence or routing. */
(function(root){
  class PinSelectionController{
    constructor(ports){
      const required=["getPin","getLayer","getLayers","getMoveMode","getSearchIds",
        "isSatelliteActive","getVisiblePins","getPinOverlap","getFeatureOverlap",
        "closeMapMenus","selectPinUseCase","takeGpsFocusId","scheduleFrame",
        "getElement","renderEditor","renderDetails","renderNavigation",
        "renderGpxActions","renderLayerPicker","closeLayerPicker","onLayout"];
      for(const name of required)if(typeof ports[name]!=="function")
        throw new TypeError("Pin selection port required: "+name);
      Object.assign(this,ports);
    }
    render(){
      const pin=this.getPin();
      const layer=pin?this.getLayer(pin.layerId):null;
      this.renderEditor({pin,moving:this.getMoveMode(),
        layerVisible:pin?!!layer?.visible:true,onLayout:this.onLayout});
      this.renderDetails(pin);
      this.renderNavigation(pin);
      this.renderGpxActions(pin);
      if(pin)this.renderLayerPicker({layers:this.getLayers(),selectedLayerId:pin.layerId});
      else this.closeLayerPicker();
    }
    select(id){
      this.closeMapMenus();
      this.getPinOverlap()?.close();
      this.selectPinUseCase(id);
      if(this.takeGpsFocusId(id)){
        this.scheduleFrame(()=>{
          if(this.getSelectedId()!==id)return;
          const input=this.getElement("pinName");
          if(input&&!this.getElement("pinPanel").classList.contains("hidden")){
            input.focus({preventScroll:true});
            input.select();
          }
        });
      }
    }
    handleMarkerTap(id){
      if(this.getMoveMode()||this.isSatelliteActive())return;
      const ids=this.getSearchIds();
      if(ids?.has("pins:"+id)){
        this.getPinOverlap().handleTap(id,this.getVisiblePins().filter(
          pin=>ids.has("pins:"+pin.id)));
        return;
      }
      if(this.getFeatureOverlap()?.handleTap("pin",id))return;
      const overlap=this.getPinOverlap();
      if(overlap)overlap.handleTap(id);
      else this.select(id);
    }
  }
  root.Pin2MapPinSelectionController=PinSelectionController;
  if(typeof module!=="undefined"&&module.exports)module.exports=PinSelectionController;
})(typeof window!=="undefined"?window:globalThis);
