"use strict";
/* View history lifecycle and map-event coordination. The bounded history
 * model stays in application/map-view-history.js; map, storage, timer and
 * notification behavior is supplied exclusively through explicit ports. */
(function(root){
  class MapViewHistoryController{
    constructor({History,mapPort,loadHistory,saveHistory,onNotice,onFitAll,
      onBeforeNavigate,onPersistViewport,setTimer,clearTimer}){
      const callbacks=[History,loadHistory,saveHistory,onNotice,onFitAll,
        onBeforeNavigate,onPersistViewport,setTimer,clearTimer];
      if(callbacks.some(fn=>typeof fn!=="function")||!mapPort||
        ["getViewport","setView","updateZoomHistory","addZoomControls","onMoveEnd"]
          .some(name=>typeof mapPort[name]!=="function"))
        throw new TypeError("Map view history controller ports required");
      Object.assign(this,{History,mapPort,loadHistory,saveHistory,onNotice,onFitAll,
        onBeforeNavigate,onPersistViewport,setTimer,clearTimer});
      this.history=null;
      this.recordTimer=null;
      this.initialized=false;
    }
    flush(){
      if(this.recordTimer!==null){
        this.clearTimer(this.recordTimer);
        this.recordTimer=null;
      }
      if(this.history)this.history.push(this.mapPort.getViewport());
    }
    navigate(direction){
      this.flush();
      const view=direction==="undo"?this.history?.undo():this.history?.redo();
      if(!view)return;
      this.onBeforeNavigate();
      this.mapPort.setView(view,{animate:false});
      this.onPersistViewport();
    }
    scheduleRecord(){
      if(this.recordTimer!==null)this.clearTimer(this.recordTimer);
      this.recordTimer=this.setTimer(()=>this.flush(),320);
    }
    async initialize(){
      if(this.initialized)return this.history;
      this.initialized=true;
      this.history=new this.History({
        onChange:availability=>this.mapPort.updateZoomHistory(availability),
        onSave:value=>{
          // Keep the existing optional store and non-blocking error reporting.
          const operation=this.saveHistory(value);
          operation?.catch(()=>this.onNotice("Ansichts-Historie konnte nicht gespeichert werden"));
        }
      });
      let saved=null;
      try{saved=await this.loadHistory();}
      catch(_){this.onNotice("Ansichts-Historie konnte nicht geladen werden");}
      const restored=this.history.load(saved,this.mapPort.getViewport());
      if(restored)this.mapPort.setView(restored,{animate:false});
      this.mapPort.addZoomControls({
        onFitAll:()=>this.onFitAll(),
        onUndo:()=>this.navigate("undo"),
        onRedo:()=>this.navigate("redo")
      });
      this.mapPort.updateZoomHistory({
        undo:this.history.canUndo(),redo:this.history.canRedo()
      });
      // One completed drag/wheel/pinch gesture becomes one settled entry.
      this.mapPort.onMoveEnd(()=>this.scheduleRecord());
      return this.history;
    }
  }
  root.Pin2MapMapViewHistoryController=MapViewHistoryController;
  if(typeof module!=="undefined"&&module.exports)module.exports=MapViewHistoryController;
})(typeof window!=="undefined"?window:globalThis);
