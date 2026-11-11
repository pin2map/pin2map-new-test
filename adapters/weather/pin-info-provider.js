"use strict";
/* Provider composition only. Monthly and today routes never mix data sources. */
(function(root){
  class PinInfoProvider{
    constructor({forecast,climatology,sunTimes}){
      if(!forecast||!climatology||!sunTimes)throw new TypeError("All providers required");
      this.forecast=forecast;this.climatology=climatology;this.sunTimes=sunTimes;
    }
    request(mode,pins,period="today"){
      if((mode==="daily"||mode==="sun")&&period!=="today"){
        if(mode==="daily")return this.climatology.request(pins,period);
        return this.sunTimes.request(pins,period);
      }
      return this.forecast.request(mode,pins);
    }
  }
  root.Pin2MapPinInfoProvider=PinInfoProvider;
  if(typeof module!=="undefined"&&module.exports)module.exports=PinInfoProvider;
})(typeof window!=="undefined"?window:globalThis);
