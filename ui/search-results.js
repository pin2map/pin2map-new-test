"use strict";
/*
 * Search-results presentation only: no geocoding, pin creation, routing,
 * map engine, IndexedDB, or ownership of application search state.
 */
(function(root){
  class SearchResultsView {
    constructor({container,document:doc,onChoose,titleOf,detailOf}){
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
      // Search results follow the actual inner search-pill width across viewports.
      // Only presentation geometry is read; no application state is modified.
      this.searchAnchor=doc.getElementById?.("searchForm")||null;
      if(this.searchAnchor&&root.ResizeObserver){
        this.widthObserver=new root.ResizeObserver(()=>this.syncWidth());
        this.widthObserver.observe(this.searchAnchor);
      }
    }
    syncWidth(){
      const box=this.searchAnchor?.getBoundingClientRect?.();
      if(!box||!this.container.style)return;
      // A pill's straight horizontal top/bottom edges start after its
      // semicircular ends. The results align to those edges, not the
      // outer rounded bounding box. No duplicate CSS width override.
      const radius=Math.min(box.height/2,box.width/2);
      const lineWidth=box.width-2*radius;
      if(lineWidth>0)this.container.style.width=lineWidth+"px";
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
      close.addEventListener("click",()=>this.hide());
      footer.append(close);
      return footer;
    }
    message(message){
      this.container.replaceChildren();
      const p=this.document.createElement("div");
      p.className="message";
      p.textContent=String(message);
      this.container.append(p,this.cancelFooter());
      this.container.classList.remove("hidden");
      this.syncWidth();
    }
    show(results){
      if(!Array.isArray(results))throw new TypeError("Search results must be an array");
      this.container.replaceChildren();
      for(const result of results){
        const item=this.document.createElement("button");
        item.type="button";
        item.className="result";
        const title=this.document.createElement("strong");
        title.textContent=this.titleOf(result);
        const detail=this.document.createElement("small");
        detail.textContent=this.detailOf(result);
        item.append(title,detail);
        item.addEventListener("click",()=>this.onChoose(result));
        this.container.append(item);
      }
      this.container.append(this.cancelFooter());
      this.container.classList.remove("hidden");
      this.syncWidth();
    }
  }
  root.Pin2MapSearchResultsView=SearchResultsView;
  if(typeof module!=="undefined"&&module.exports)module.exports=SearchResultsView;
})(typeof window!=="undefined"?window:globalThis);
