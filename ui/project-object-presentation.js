"use strict";
/* UI-owned presentation selection for persisted objects and transient pin
 * information. Map engine, search state, project state and rendering are ports.
 * No project mutations, storage calls or map-engine dependencies. */
(function(root){
  class ProjectObjectPresentation{
    constructor({getProject,getSearchView,getPinFilter,getSelectedPinId,
      getTemporaryInfoPin,getFlashIds,mapPort,getMarkerView,pinInfoService,
      getPinInfoMarkup,onAreaLabel,onRiverLine,getAreaOverlapHandler}){
      const callbacks=[getProject,getSearchView,getPinFilter,getSelectedPinId,
        getTemporaryInfoPin,getFlashIds,getMarkerView,getPinInfoMarkup,
        onAreaLabel,onRiverLine,getAreaOverlapHandler];
      if(callbacks.some(fn=>typeof fn!=="function")||
        !mapPort||!pinInfoService||typeof pinInfoService.setVisiblePins!=="function")
        throw new TypeError("Project object presentation ports required");
      Object.assign(this,{getProject,getSearchView,getPinFilter,getSelectedPinId,
        getTemporaryInfoPin,getFlashIds,mapPort,getMarkerView,pinInfoService,
        getPinInfoMarkup,onAreaLabel,onRiverLine,getAreaOverlapHandler});
    }
    renderGeometry(){
      if(typeof this.mapPort.renderProjectGeometry!=="function")return;
      const project=this.getProject(),view=this.getSearchView();
      const visible=new Set(project.layers.filter(l=>l.visible).map(l=>l.id));
      const isMatch=(type,id,layerId)=>
        view?.onlyHits?view.ids.has(type+":"+id):
          visible.has(layerId)||!!view?.ids.has(type+":"+id);
      const layerColors=Object.fromEntries(project.layers.map(l=>[l.id,l.color]));
      this.mapPort.renderProjectGeometry({
        areas:(project.areas||[]).filter(a=>isMatch(a.kind==="lake"?"lakes":"areas",a.id,a.layerId)),
        rivers:(project.rivers||[]).filter(r=>isMatch("rivers",r.id,r.layerId)),
        layerColors,labelTypes:project.labelsVisible===false?{}:project.labelTypes,highlightIds:view?.onlyHits?null:view?.ids,
        flashIds:this.getFlashIds(),
        onAreaLabel:(area,point)=>{
          const hitType=area.kind==="lake"?"lakes":"areas";
          if(!this.getSearchView()?.ids.has(hitType+":"+area.id)&&
            this.getAreaOverlapHandler()?.("area",area.id))return;
          this.onAreaLabel(area,point);
        },
        onRiverLine:(river,point)=>this.onRiverLine(river,point)
      });
    }
    renderMarkers(){
      const markerView=this.getMarkerView();
      if(!markerView)return;
      const project=this.getProject(),view=this.getSearchView();
      const regular=this.getPinFilter(project);
      const onlyHits=!!view?.onlyHits;
      const visible=onlyHits?[]:[...regular],seen=new Set(visible.map(p=>p.id));
      if(view){
        // Canonical search IDs win; no older duplicate or unmatched hidden pin.
        for(const match of view.matches){
          if(match.type!=="pins"||seen.has(match.id))continue;
          visible.push(match.object);seen.add(match.id);
        }
      }
      const temporary=this.getTemporaryInfoPin();
      this.pinInfoService.setVisiblePins(temporary?[...visible,temporary.point]:visible);
      markerView.render({
        pins:visible,layers:project.layers,
        selectedPinId:this.getSelectedPinId(),labelsVisible:project.labelsVisible!==false&&project.labelTypes?.pins!==false,
        flashIds:new Set([...this.getFlashIds()].filter(id=>id.startsWith("pins:")).map(id=>id.slice(5))),
        highlightIds:onlyHits?null:
          new Set([...(view?.ids||[])].filter(id=>id.startsWith("pins:")).map(id=>id.slice(5)))
      });
      this.renderTemporaryPinInfo();
    }
    renderTemporaryPinInfo(){
      const temporary=this.getTemporaryInfoPin();
      if(!temporary)return;
      const info=this.pinInfoService.label(temporary.point);
      this.mapPort.setTemporaryPinInfo?.(info?this.getPinInfoMarkup(info):"");
    }
  }
  root.Pin2MapProjectObjectPresentation=ProjectObjectPresentation;
  if(typeof module!=="undefined"&&module.exports)module.exports=ProjectObjectPresentation;
})(typeof window!=="undefined"?window:globalThis);
