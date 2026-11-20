"use strict";
/* Pure search for stored project objects. Never depends on layer visibility or mutates data. */
(function(root){
  const TYPES=Object.freeze(["all","pins","areas","lakes","rivers","texts"]);
  const text=value=>String(value??"").normalize("NFKC").toLocaleLowerCase("de");
  function kindOf(item,collection){
    if(collection==="pins")return "pins";
    if(collection==="rivers")return "rivers";
    return item.kind==="lake"?"lakes":"areas";
  }
  function dateKey(value){
    if(typeof value!=="string"||!value.trim())return null;
    const timestamp=Date.parse(value);
    if(!Number.isFinite(timestamp))return null;
    const d=new Date(timestamp);
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  }
  function calendarDay(date,offset=0){
    const d=new Date(date.getFullYear(),date.getMonth(),date.getDate()+offset);
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  }
  function search(project,{query="",kind="all",track=false,link=false,note=false,created="any",now=null}={}){
    if(!TYPES.includes(kind))throw new TypeError("Unknown object search type");
    const needle=text(query.trim());
    if(created!=="any"&&!(now instanceof Date))throw new TypeError("Calendar clock required");
    const day=created==="today"?calendarDay(now):created==="yesterday"?calendarDay(now,-1):null;
    if(created!=="any"&&!day)throw new TypeError("Unknown creation date filter");
    if(!needle&&!day)return [];
    const displayDate=value=>{const key=dateKey(value);return key?[key,key.slice(8,10)+"."+key.slice(5,7)+"."+key.slice(0,4)]:[];};
    const result=[];
    for(const collection of ["pins","areas","rivers"]){
      for(const object of project?.[collection]||[]){
        if(!object||typeof object!=="object"||!object.id)continue;
        const type=kindOf(object,collection);
        if(kind!=="all"&&kind!==type&&!(kind==="texts"&&
          (text(object.note).trim()||text(object.url).trim())))continue;
        const gpx=object.gpxAttachment||{};
        const hasTrack=Boolean(gpx.chains?.length||object.gpxKey||object.gpxTrackId||object.gpxFileId||object.gpxRef);
        if(track&&!hasTrack)continue;
        if(link&&!text(object.url).trim())continue;
        if(note&&!text(object.note).trim())continue;
        if(day&&dateKey(object.createdAt)!==day)continue;
        const fields=[object.name,object.note,object.url,object.createdAt,object.updatedAt,
          gpx.filename,object.gpxFilename,object.gpxName,
          ...displayDate(object.createdAt),...displayDate(object.updatedAt)];
        if(needle&&!fields.some(v=>text(v).includes(needle)))continue;
        result.push({type,id:object.id,object});
      }
    }
    return result;
  }
  const api=Object.freeze({search,dateKey,calendarDay,TYPES});
  root.Pin2MapObjectSearch=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
