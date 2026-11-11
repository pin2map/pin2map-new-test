"use strict";
/*
 * Search-results presentation only: no geocoding, pin creation, routing,
 * map engine, IndexedDB, or ownership of application search state.
 */
(function(root){
  class SearchResultsView {
    constructor({container,document:doc,onChoose,onCancel=()=>{},titleOf,detailOf,kindOf=()=>null,duplicateCoordinates=()=>[]}){
      if(!container||typeof container.replaceChildren!=="function")
        throw new TypeError("Search result container required");
      if(!doc||typeof doc.createElement!=="function")
        throw new TypeError("Document element factory required");
      if(typeof onChoose!=="function"||typeof titleOf!=="function"||typeof detailOf!=="function")
        throw new TypeError("Search result callbacks required");
      this.container=container;
      this.document=doc;
      this.onChoose=onChoose;
      this.titleOf=titleOf;
      this.detailOf=detailOf;
      this.kindOf=kindOf;
      this.duplicateCoordinates=duplicateCoordinates;
      this.onCancel=onCancel;
      // Presentation geometry only: the results sheet is attached to the
      // OUTER search block, extends behind its lower rounded half and stops
      // at the TOP of the lowest map controls. No domain/state ownership.
      this.searchAnchor=doc.getElementById?.("searchForm")||null;
      this.outerSearch=this.searchAnchor?.closest?.(".topbar")||this.searchAnchor;
      this.bottomControl=doc.getElementById?.("basemapButton")||null;
      this.appRoot=doc.getElementById?.("app")||null;
      if(this.outerSearch&&root.ResizeObserver){
        this.widthObserver=new root.ResizeObserver(()=>this.syncWidth());
        this.widthObserver.observe(this.outerSearch);
        if(this.bottomControl)this.widthObserver.observe(this.bottomControl);
      }
    }
    syncWidth(){
      const box=this.outerSearch?.getBoundingClientRect?.();
      if(!box||!this.container.style)return;
      const origin=this.appRoot?.getBoundingClientRect?.().top||0;
      const sheetTop=box.top-origin+box.height/2;
      const bottomTop=this.bottomControl?.getBoundingClientRect?.().top;
      const appBottom=this.appRoot?.getBoundingClientRect?.().bottom;
      const limit=Number.isFinite(bottomTop)?bottomTop:appBottom;
      this.container.style.width=box.width+"px";
      this.container.style.top=sheetTop+"px";
      if(Number.isFinite(limit))
        this.container.style.maxHeight=Math.max(0,limit-origin-sheetTop)+"px";
      // The background starts behind the rounded search block, but the first
      // TEXT begins after the outside bottom edge with 12px breathing room.
      const items=this.container.querySelector?.(".results-items");
      if(items?.style)items.style.paddingTop=Math.max(0,box.height/2+12)+"px";
    }
    isVisible(){return !this.container.classList.contains("hidden");}
    hide(){
      this.container.classList.add("hidden");
      this.container.replaceChildren();
    }
    cancelFooter(){
      const footer=this.document.createElement("div");
      footer.className="results-footer";
      const close=this.document.createElement("button");
      close.type="button";
      close.className="results-cancel";
      close.textContent="Abbrechen";
      close.addEventListener("click",()=>{this.hide();this.onCancel();});
      footer.append(close);
      return footer;
    }
    message(message){
      this.container.replaceChildren();
      const p=this.document.createElement("div");
      p.className="message";
      p.textContent=String(message);
      const items=this.document.createElement("div");
      items.className="results-items";
      items.append(p);
      this.container.append(items,this.cancelFooter());
      this.container.classList.remove("hidden");
      this.syncWidth();
    }
    show(results){
      if(!Array.isArray(results))throw new TypeError("Search results must be an array");
      this.container.replaceChildren();
      const items=this.document.createElement("div");
      items.className="results-items";
      const duplicateNotes=this.duplicateCoordinates(results);
      results.forEach((result,index)=>{
        const item=this.document.createElement("button");
        item.type="button";
        item.className="result";
        const heading=this.document.createElement("div");
        heading.className="result-heading";
        const title=this.document.createElement("strong");
        title.textContent=this.titleOf(result);
        heading.append(title);
        const kind=this.kindOf(result);
        if(kind?.label){
          const badge=this.document.createElement("span");
          badge.className="result-kind";
          badge.textContent=kind.symbol+" "+kind.label;
          heading.append(badge);
        }
        const detail=this.document.createElement("small");
        detail.textContent=this.detailOf(result);
        item.append(heading,detail);
        if(duplicateNotes[index]){
          const coords=this.document.createElement("span");
          coords.className="result-coordinates";
          coords.textContent=duplicateNotes[index];
          item.append(coords);
        }
        item.addEventListener("click",()=>this.onChoose(result));
        items.append(item);
      });
      this.container.append(items,this.cancelFooter());
      this.container.classList.remove("hidden");
      this.syncWidth();
    }
  }
  root.Pin2MapSearchResultsView=SearchResultsView;
  if(typeof module!=="undefined"&&module.exports)module.exports=SearchResultsView;
})(typeof window!=="undefined"?window:globalThis);
