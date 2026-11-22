"use strict";
/* File transfer dialog and download interaction only. Project replacement
 * is delegated to the application session; no storage or map engine here. */
(function(root){
  class ProjectTransferController{
    constructor({getElement,document,windowPort,transfer,session,getProject,filterPins,
      onCloseOtherMenus,onSave,onApplied,onNotice,onError}){
      Object.assign(this,{getElement,document,windowPort,transfer,session,getProject,
        filterPins,onCloseOtherMenus,onSave,onApplied,onNotice,onError});
      this.pending=null;this.busy=false;this.gpxMode="normal";
    }
    el(id){return this.getElement(id);}
    close(){
      this.el("transferPanel").classList.add("hidden");
      this.el("transferButton").setAttribute("aria-expanded","false");
      this.el("transferConfirm").classList.add("hidden");
      this.el("transferMain").classList.remove("hidden");
      this.pending=null;
      this.el("transferFileInput").value="";
    }
    open(){
      this.onCloseOtherMenus();
      this.el("transferPanel").classList.remove("hidden");
      this.el("transferButton").setAttribute("aria-expanded","true");
      this.el("transferMain").classList.remove("hidden");
      this.el("transferConfirm").classList.add("hidden");
      this.el("transferFeedback").textContent="";
      if(!this.el("transferExportName").value.trim())
        this.el("transferExportName").value="pin2map-"+new Date().toISOString().slice(0,10);
      this.el("transferImport").focus({preventScroll:true});
    }
    filename(ext){
      const raw=this.el("transferExportName").value.trim().replace(/\.(?:pin2map|gpx)$/i,"")
        .replace(/[\\/:*?"<>|\r\n]+/g,"-").slice(0,96);
      return (raw||"pin2map-"+new Date().toISOString().slice(0,10))+"."+ext;
    }
    download(content,extension,mime,preferredName=null){
      // A single intentional download, no native share sheet.
      const blob=new Blob([content],{type:mime}),name=preferredName||this.filename(extension);
      const url=URL.createObjectURL(blob),link=this.document.createElement("a");
      link.href=url;link.download=name;
      this.document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    }
    export(type){
      if(this.busy)return;
      try{
        const visible=this.document.querySelector('input[name="transferScope"]:checked')?.value==="visible";
        const project=this.getProject();
        const subset=this.transfer.exportSubset(project,{
          visible,filterPins:pin=>this.filterPins(pin,project)
        });
        const content=type==="gpx"?this.transfer.encodeGpx(subset):this.transfer.encodeProject(subset);
        void this.onSave().catch(()=>this.onNotice("Lokale Speicherung nicht bestätigt"));
        this.download(content,type==="gpx"?"gpx":"pin2map",
          type==="gpx"?"application/gpx+xml;charset=utf-8":"application/json;charset=utf-8");
        this.el("transferFeedback").textContent="Download gestartet ("+(visible?"nur sichtbare":"alle")+" Elemente).";
      }catch(error){
        this.el("transferFeedback").textContent="Export fehlgeschlagen: "+String(error?.message||error);
      }
    }
    choose(file){
      if(!file)return;
      this.busy=true;
      this.el("transferFeedback").textContent="Datei wird geprüft …";
      (async()=>{
        if(file.size>50*1024*1024)throw Error("Maximale Dateigröße: 50 MB.");
        const contents=await file.text();
        const result=/\.gpx$/i.test(file.name)?this.transfer.gpxRead(contents,undefined,
          {attachTracks:this.gpxMode==="start",filename:file.name}):
          this.transfer.parseProject(contents,file.name);
        this.pending={...result,filename:file.name};
        this.el("transferFileInfo").textContent=file.name;
        const project=result.project;
        const counts=project.pins.length+" Pins, "+(project.areas||[]).length+
          " Flächen, "+(project.rivers||[]).length+" Flüsse/Tracks, "+
          project.layers.length+" Ebenen";
        this.el("transferFileSummary").textContent=counts+
          (result.unresolved?" · "+result.unresolved+" alte Orts-/Gebietsabfragen konnten ohne Geodaten nicht übernommen werden. Bitte die Originaldatei aufbewahren.":"")+
          (result.gpx?" · GPX enthält keine pin2map-Ebenen/Favoriten.":"")+
          (result.project.pins.some(pin=>pin.gpxAttachment)?" · Start-Pins mit GPX-Trackanhang.":"");
        this.el("transferMain").classList.add("hidden");
        this.el("transferConfirm").classList.remove("hidden");
        this.el("transferFeedback").textContent="Bitte vollständiges Ersetzen oder Import in eine neue Ebene auswählen.";
      })().catch(error=>{
        this.pending=null;
        this.el("transferFeedback").textContent="Import nicht möglich: "+String(error?.message||error);
      }).finally(()=>{this.busy=false;this.el("transferFileInput").value="";});
    }
    async apply(choice){
      if(this.busy||!this.pending)return;
      if(choice==="replace"&&!this.windowPort.confirm("Wirklich alle aktuellen Pins, Flächen, Flüsse, Ebenen und Favoriten durch die importierten Daten ersetzen?"))return;
      this.busy=true;
      let committed=false;
      try{
        const next=await this.session.commit(choice,this.pending.project,this.pending.filename);
        committed=true;
        this.close();
        await this.onApplied(next,choice);
        this.onNotice(choice==="add"?"Objekte in neue Ebene importiert":"Projekt vollständig ersetzt");
      }catch(error){
        if(committed){
          this.close();
          this.onNotice("Daten importiert, aber Kartenanzeige konnte nicht vollständig aktualisiert werden.");
          this.onError("Imported project display:",error);
        }else{
          this.el("transferFeedback").textContent=
            "Import abgebrochen, bisheriges Projekt bleibt erhalten: "+String(error?.message||error);
        }
      }finally{this.busy=false;}
    }
    bind(){
      this.el("transferButton").addEventListener("click",()=>{
        if(this.el("transferPanel").classList.contains("hidden"))this.open();
        else this.close();
      });
      this.el("transferClose").addEventListener("click",()=>this.close());
      this.el("transferPanel").addEventListener("keydown",event=>{
        if(event.key==="Escape"){event.preventDefault();this.close();}
      });
      this.el("transferImport").addEventListener("click",()=>{
        this.gpxMode="normal";this.el("transferFileInput").click();
      });
      this.el("transferImportHike").addEventListener("click",()=>{
        this.gpxMode="start";this.el("transferFileInput").click();
      });
      this.el("transferFileInput").addEventListener("change",event=>this.choose(event.target.files?.[0]));
      this.el("transferExport").addEventListener("click",()=>this.export("project"));
      this.el("transferExportGpx").addEventListener("click",()=>this.export("gpx"));
      this.el("transferAdd").addEventListener("click",()=>void this.apply("add"));
      this.el("transferReplace").addEventListener("click",()=>void this.apply("replace"));
      this.el("transferBack").addEventListener("click",()=>{
        this.pending=null;this.el("transferConfirm").classList.add("hidden");
        this.el("transferMain").classList.remove("hidden");this.el("transferFeedback").textContent="";
      });
    }
  }
  root.Pin2MapProjectTransferController=ProjectTransferController;
  if(typeof module!=="undefined"&&module.exports)module.exports=ProjectTransferController;
})(typeof window!=="undefined"?window:globalThis);
