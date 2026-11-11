"use strict";
/* Pure presentation mapping; all displayed text is escaped before HTML.
 * Geometry, markers and Leaflet ownership remain in the map adapter.
 */
(function(root){
  const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function temperatureClass(value){
    if(!Number.isFinite(value))return "";
    const t=Math.round(value);
    return t<=-16?"p2m-wx-black":t<=-6?"p2m-wx-darkblue":t<=0?"p2m-wx-cold":
      t<=12?"p2m-wx-darkgreen":t<=18?"p2m-wx-lightgreen":
      t<=26?"p2m-wx-warm":t<=32?"p2m-wx-hot":"p2m-wx-veryhot";
  }
  const MONTH_NAMES=Object.freeze(["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"]);
  function labelMarkup(data){
    if(!data||!data.mode||data.mode==="off"||data.text==="")return "";
    const type=data.mode;
    let content=escapeHtml(data.text??"");
    if(type==="temperature")content='<span class="'+temperatureClass(data.value)+'">'+content+'</span>';
    if((type==="daily"||type==="sun")&&Array.isArray(data.parts)){
      const classes=type==="daily"?["p2m-label-min","p2m-label-max"]:["p2m-label-rise","p2m-label-set"];
      content=data.parts.map((value,i)=>'<span class="p2m-label-half '+classes[i]+'">'+escapeHtml(value)+'</span>').join("");
    }
    if(type==="precipitation"&&data.period&&data.period!=="today"){
      const month=MONTH_NAMES[Number(data.period)-1]||"";
      content='<span class="p2m-info-month-prefix">Ø '+escapeHtml(month)+'</span>'+content;
    }
    if((type==="daily"||type==="sun")&&data.period&&data.period!=="today"){
      const period=Number(data.period);
      const monthLabel=MONTH_NAMES[period-1]||"";
      const prefix=type==="sun"?"15. "+monthLabel:"Ø "+monthLabel;
      content='<span class="p2m-info-month-prefix">'+escapeHtml(prefix)+'</span>'+content;
    }
    const kind=type==="temperature"?" p2m-temperature-label":type==="daily"?" p2m-daily-label":type==="sun"?" p2m-sun-label":type==="precipitation"?" p2m-precipitation-label":"";
    return '<span class="elevation-label'+kind+'">'+content+'</span>';
  }
  const api=Object.freeze({escapeHtml,temperatureClass,labelMarkup});
  root.Pin2MapPinInfoLabel=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
