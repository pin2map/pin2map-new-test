"use strict";
(function(root){
  async function load({lat,lng},{signal,fetchImpl=root.fetch.bind(root)}={}){
    const query=new URLSearchParams({
      latitude:lat,longitude:lng,timezone:"auto",forecast_days:"7",
      current:"temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation,is_day",
      hourly:"weather_code,is_day",
      daily:"temperature_2m_min,temperature_2m_max,rain_sum,showers_sum,snowfall_sum,wind_speed_10m_max,wind_direction_10m_dominant"
    });
    const response=await fetchImpl("https://api.open-meteo.com/v1/forecast?"+query,{signal});
    if(!response.ok)throw new Error("Open-Meteo HTTP "+response.status);
    const data=await response.json();
    if(data.error||!data.daily?.time?.length)throw new Error("Keine Tagesprognose verfügbar");
    return data;
  }
  root.Pin2MapOpenMeteoForecast={load};
  if(typeof module!=="undefined"&&module.exports)module.exports={load};
})(typeof window!=="undefined"?window:globalThis);
