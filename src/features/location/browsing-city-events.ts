// A transition notification, not a location store. The server cookie remains authoritative.
export const browsingCitySelectedEvent = "rafal:browsing-city-selected";

export function notifyBrowsingCitySelected(cityId: number) {
  window.dispatchEvent(new CustomEvent<number>(browsingCitySelectedEvent, { detail: cityId }));
}
