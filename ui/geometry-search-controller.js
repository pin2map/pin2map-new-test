"use strict";
/* Asynchronous geometry-search orchestration. No storage, Leaflet or direct
 * provider construction: each provider and UI operation is supplied as a port.
 * Request ownership, cancellation and hierarchy selection live here. */
(function(root){
  const placeNames=root.Pin2MapPlaceSearch||(typeof module!=="undefined"?require("../domain/place-search.js"):{});
  function createGeometrySearchController(ports){
    const $=ports.getElement;
    const state={get allowGeocode(){return ports.getState().allowGeocode;}};
    const mapAdapter={getViewport:()=>ports.getMap().getViewport()};
    const searchForm={cancel:()=>ports.cancelPlace()};
    const searchView={hide:()=>ports.hideResults(),
      show:(results,options)=>ports.showResults(results,options),
      message:message=>ports.message(message)};
    const areaFinder=ports.areaFinder,riverFinder=ports.riverFinder,
      riverGeometry=ports.riverGeometry,plateSearch=ports.plateSearch;
    const showObjectPreview=entry=>ports.showObjectPreview(entry);
    const clearObjectPreview=()=>ports.clearObjectPreview();
    const showNotice=message=>ports.showNotice(message);
    let featureRun=0,featureController=null;
    let areaHierarchyPoint=null,areaHierarchyCountry="";
  function setGeometryBusy(message){
    const element=$("geometrySearchBusy");
    if(!element)return;
    element.textContent=message||"Suche läuft …";
    element.classList.toggle("hidden",!message);
    if(message){
      const outer=$("searchForm").getBoundingClientRect();
      const app=$("app").getBoundingClientRect();
      element.style.left=Math.max(8,outer.left-app.left)+"px";
      element.style.top=Math.max(8,outer.bottom-app.top+7)+"px";
    }
  }
  function cancelGeometrySearch(){
    ++featureRun;
    featureController?.abort();featureController=null;setGeometryBusy("");
  }
  async function findGeometry(kind,query){
    if(!query.trim()){ $("searchInput").focus();return;}
    cancelGeometrySearch();
    searchForm.cancel();
    if(!state.allowGeocode){
      searchView.message("Bitte zuerst in den Einstellungen die Nominatim-Suche aktivieren.");
      return;
    }
    const run=featureRun,controller=new AbortController();featureController=controller;
    searchView.hide();
    if(kind==="river")setGeometryBusy("Flusssuche läuft …");
    try{
      if(kind==="area"||kind==="lake"){
        const results=await areaFinder.find(query,{kind,signal:controller.signal});
        if(run!==featureRun)return;
        if(!results.length){
          searchView.message(kind==="lake"?"Kein passender kartierter See gefunden.":"Keine passende kartierte Fläche gefunden.");
          return;
        }
        searchView.show(results.map(x=>({...x,__featureType:placeNames.featureType(x)==="lake"?"lake":kind})));
      }else{
        const candidates=await riverFinder.find(query,{
          center:mapAdapter.getViewport().center,signal:controller.signal,
          onProgress:p=>{
            if(run!==featureRun)return;
            const text=p.phase==="alternative"?"Alternative Flussnamen werden geprüft …":
              "Flusssuche läuft … "+(p.step||1)+"/"+(p.total||1);
            setGeometryBusy(text);
          }
        });
        if(run!==featureRun)return;
        const relations=candidates.filter(c=>c.osmType==="relation"&&c.nameScore>=100);
        const choices=relations.length?relations:candidates;
        if(choices.length===1)await chooseGeometryResult({
          __featureType:"river",candidate:choices[0],name:placeNames.localizedName(choices[0].tags)||query,
          query
        });
        else searchView.show(choices.map(c=>({
          __featureType:"river",candidate:c,name:placeNames.localizedName(c.tags)||query,query,
          detail:[c.osmType==="relation"?"OSM-Relation":"OSM-Way",
            c.tags?.waterway,c.display].filter(Boolean).join(" · ")
        })));
      }
    }catch(error){
      if(run!==featureRun||error?.name==="AbortError")return;
      searchView.message("Suche fehlgeschlagen: "+(error?.message||"Netzwerkfehler"));
    }finally{
      if(run===featureRun){featureController=null;setGeometryBusy("");}
    }
  }
  async function chooseGeometryResult(result){
    searchView.hide();
    const kind=result.__featureType;
    if(kind==="areaHierarchy"){
      if(!areaHierarchyPoint)return;
      featureController?.abort(); // Stop delayed enrichment of the previous list.
      const run=++featureRun,controller=new AbortController();featureController=controller;
      try{
        const choice=await areaFinder.findContaining(result,areaHierarchyPoint,{
          countryCode:areaHierarchyCountry,signal:controller.signal
        });
        if(run!==featureRun)return;
        if(!choice){searchView.message("Keine eindeutige Gebietsgrenze am Klickpunkt gefunden.");return;}
        const featureKind=result.kind==="lake"||placeNames.featureType(choice)==="lake"?"lake":"area";
        previewAreaObject(choice,featureKind,result.name,true);
      }catch(error){
        if(run===featureRun)searchView.message("Gebietssuche fehlgeschlagen: "+error.message);
      }finally{if(run===featureRun)featureController=null;}
      return;
    }
    if(kind==="area"||kind==="lake"){
      if(["Polygon","MultiPolygon"].includes(result.geojson?.type)){previewAreaObject(result,kind);return;}
      if(!state.allowGeocode){
        searchView.message("Bitte zuerst in den Einstellungen die Nominatim-Suche aktivieren.");
        return;
      }
      featureController?.abort();
      const run=++featureRun,controller=new AbortController();featureController=controller;
      try{
        const source=await areaFinder.lookupPolygon(result.osm_type,result.osm_id,{signal:controller.signal});
        if(run!==featureRun)return;
        if(!source){searchView.message("Keine kartierte Grenze für diesen Treffer gefunden.");return;}
        previewAreaObject(source,placeNames.featureType(source)==="lake"?"lake":kind);
      }catch(error){
        if(run===featureRun)searchView.message("Gebietssuche fehlgeschlagen: "+error.message);
      }finally{if(run===featureRun)featureController=null;}
      return;
    }
    if(kind==="river"){
      if(!state.allowGeocode){
        searchView.message("Bitte zuerst in den Einstellungen die Nominatim-Suche aktivieren.");
        return;
      }
      featureController?.abort();
      const run=++featureRun,controller=new AbortController();featureController=controller;
      setGeometryBusy("Flussverlauf wird geladen …");
      try{
        const candidate=result.candidate||{id:result.osm_id,osmType:result.osm_type,
          tags:{name:placeNames.title(result),waterway:result.type,...result.namedetails}};
        const source=await riverFinder.resolve(candidate,{
          query:result.query||placeNames.title(result),signal:controller.signal,
          onProgress:p=>{if(run===featureRun)setGeometryBusy(
            p.phase==="parent"?"Übergeordnete Flussrelation wird geprüft …":"Flussverlauf wird geladen …");}
        });
        if(run!==featureRun)return;
        const resolved=riverGeometry.resolve(source.data,source.match);
        showObjectPreview({kind:"river",label:resolved.name||placeNames.title(result),
          chains:resolved.chains});
      }catch(error){
        if(run===featureRun)searchView.message("Fluss konnte nicht geladen werden: "+error.message);
      }finally{if(run===featureRun){featureController=null;setGeometryBusy("");}}
    }
  }
  function previewAreaObject(source,kind,nameOverride=null,preserveViewport=false){
    const name=placeNames.localizedName(source.namedetails)||nameOverride||placeNames.title(source)||"Fläche";
    return showObjectPreview({kind:"area",featureKind:kind,
      label:name,geojson:source.geojson,preserveViewport,
      anchorPoint:preserveViewport?areaHierarchyPoint:null});
  }
  async function findAreaAt(point){
    clearObjectPreview();
    cancelGeometrySearch();
    searchForm.cancel();searchView.hide();
    if(!state.allowGeocode){
      searchView.message("Bitte zuerst in den Einstellungen die Nominatim-Suche aktivieren.");
      return;
    }
    const run=featureRun,controller=new AbortController();featureController=controller;
    try{
      const showHierarchy=(rows,loading=false)=>searchView.show(rows.map(row=>({
        ...row,__featureType:"areaHierarchy"
      })),{loading});
      const result=await areaFinder.hierarchyAt(point,{
        signal:controller.signal,
        onPartial:partial=>{
          if(run!==featureRun)return;
          areaHierarchyPoint=point;areaHierarchyCountry=partial.countryCode;
          if(partial.rows.length)showHierarchy(partial.rows,true);
        }
      });
      if(run!==featureRun)return;
      areaHierarchyPoint=point;areaHierarchyCountry=result.countryCode;
      if(result.extraUnavailable)showNotice("Zusätzliche Schutz- und Sondergebiete derzeit nicht erreichbar.");
      if(!result.rows.length){
        searchView.message("Keine Gebietshierarchie für diesen Kartenpunkt gefunden.");
        return;
      }
      showHierarchy(result.rows);
    }catch(error){
      if(run===featureRun)searchView.message("Gebietssuche fehlgeschlagen: "+error.message);
    }finally{if(run===featureRun)featureController=null;}
  }
  function findPlateCode(code){
    const input=String(code||"").trim();
    cancelGeometrySearch();searchForm.cancel();searchView.hide();
    if(!input){$("searchInput").focus();return;}
    const matches=plateSearch.find(input);
    if(!matches.length){
      searchView.message("Für „"+input+"“ ist noch kein überprüfter Kennzeichencode im lokalen Katalog hinterlegt.");
      return;
    }
    searchView.show(matches.map(entry=>({...entry,__plateEntry:entry})));
  }
  function showPlateSelection(result){
    searchView.hide();
    showObjectPreview(result);
  }
  async function choosePlateResult(entry){
    searchView.hide();cancelGeometrySearch();searchForm.cancel();
    if(!state.allowGeocode){
      searchView.message("Gebietsgrenzen benötigen die in Einstellungen aktivierte Nominatim-Suche.");
      return;
    }
    const run=featureRun,controller=new AbortController();
    featureController=controller;
    setGeometryBusy("Kennzeichengebiet wird gesucht …");
    try{
      const resolved=await plateSearch.resolve(entry,{signal:controller.signal});
      if(run!==featureRun)return;
      if(resolved.kind==="choices"){
        searchView.show(resolved.choices.map(choice=>({...choice,__plateChoice:choice})));
      }else showPlateSelection(resolved);
    }catch(error){
      if(run===featureRun&&error?.name!=="AbortError")
        searchView.message("Kennzeichengebiet: "+error.message);
    }finally{
      if(run===featureRun){featureController=null;setGeometryBusy("");}
    }
  }

    return Object.freeze({cancelGeometrySearch,findGeometry,chooseGeometryResult,
      previewAreaObject,findAreaAt,findPlateCode,showPlateSelection,choosePlateResult,
      getAreaHierarchyPoint:()=>areaHierarchyPoint});
  }
  root.Pin2MapGeometrySearchController=createGeometrySearchController;
  if(typeof module!=="undefined"&&module.exports)module.exports=createGeometrySearchController;
})(typeof window!=="undefined"?window:globalThis);
