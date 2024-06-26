// noinspection TypeScriptMissingAugmentationImport

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import {geocoder, geocoders} from 'leaflet-control-geocoder';
import {GeocodingCallback, GeocodingResult, IGeocoder} from 'leaflet-control-geocoder/dist/geocoders';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import WhatFreeWords from './whatfreewords.js';
import './style.css';
import 'leaflet.locatecontrol/dist/L.Control.Locate.css';
import 'leaflet.locatecontrol';

const zoomLevel = 17;

const whatFreeWords = new class implements IGeocoder {
    geocode(query : string, cb : GeocodingCallback, context? : any) {
        // noinspection AssignmentToFunctionParameterJS
        query = query.split(/\s+/).join('.');
        if ((query.match(/\./g) ?? []).length === 2) {
            try {
                const result = WhatFreeWords.words2latlon(query);
                const latLng = L.latLng(result[0], result[1]);
                cb.call(context, [{name : query, center : latLng, bbox : L.latLngBounds(latLng, latLng)}]);
            } catch (e) {
                cb.call(context, []);
            }
        } else {
            cb.call(context, []);
        }
    }

    suggest(query : string, cb : GeocodingCallback, context? : any) {
        this.geocode(query, cb, context);
    }

    reverse(location : L.LatLngLiteral, _scale : number, cb : GeocodingCallback, context? : any) {
        this.geocode(WhatFreeWords.latlon2words(location.lat, location.lng), cb, context);
    }
}();
class CombinedGeocoder implements IGeocoder {
    private readonly geocoders : IGeocoder[];
    constructor(geocoders : IGeocoder[]) {
        this.geocoders = geocoders;
    }

    private async runOnEveryGeocoder(
        action : (
            geocoder : IGeocoder
            , resolve: (value: GeocodingResult[] | PromiseLike<GeocodingResult[]>) => void
        ) => void
    ) : Promise<GeocodingResult[]> {
        return (
            await Promise.all(
                this.geocoders.map(geocoder =>
                    new Promise<GeocodingResult[]>(resolve => {
                        try {
                            action(geocoder, resolve);
                        } catch (e) {
                            resolve([]);
                        }
                    })
                )
            )
        ).flat();
    }
    async geocode(query : string, cb : GeocodingCallback, context? : any) {
        cb.call(
            context
            , await this.runOnEveryGeocoder((geocoder, resolve) =>
                geocoder.geocode(query, resolve)
            )
        );
    }
    async suggest(query : string, cb : GeocodingCallback, context? : any) {
        cb.call(
            context
            , await this.runOnEveryGeocoder((geocoder, resolve) => {
                if (geocoder.suggest === undefined) {
                    resolve([]);
                } else {
                    geocoder.suggest(query, resolve);
                }
            })
        );
    }
    async reverse(location : L.LatLngLiteral, scale : number, cb : GeocodingCallback, context? : any) {
        cb.call(
            context
            , await this.runOnEveryGeocoder((geocoder, resolve) => {
                if (geocoder.reverse === undefined) {
                    resolve([]);
                } else {
                    geocoder.reverse(location, scale, resolve);
                }
            })
        );
    }
}

const map = L.map('map').setView([51.505, -0.09] /* Central London */, 15);

L.Marker.prototype.options.icon = L.icon({
    iconUrl : icon,
    shadowUrl : iconShadow,
    iconAnchor : [13, 41],
    popupAnchor : [0, -41],
});
let marker : L.Marker;

function setMarker(result : GeocodingResult) {
    const center = result.center;
    const formattedCenter = `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`;
    const content = `<div class="popup"><p class="name">${result.name}</p><p class="latlng"><a target="_blank" href="geo:${formattedCenter}">${formattedCenter}</a></p>`;
    if (marker) {
        marker.setLatLng(center).setPopupContent(content);
    } else {
        marker = L.marker(center).bindPopup(content).addTo(map);
    }
    marker.openPopup();
    document.title = result.name;
}

function load() {
    const words = window.location.hash.substring(1);
    if (words !== '') {
        whatFreeWords.geocode(words, results => {
            if (results.length > 0) {
                const r = results[0];
                setMarker(r);
                map.setView(r.center, zoomLevel);
            }
        });
        return true;
    }
    return false;
}
let activating = !load();
let currentPosition : L.LatLng | null;

function reverseGeocode(latlng : L.LatLngLiteral) {
    whatFreeWords.reverse(
        latlng, map.options.crs!.scale(map.getZoom())
        , results => {
            const r = results[0];
            if (r) {
                window.location.hash = `#${r.name}`;
            }
        }
    );
}

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>, '
        + '<a href="https://github.com/miklcct/WhatFxxxWords/" target="_blank">WhatF***Words 🄯 Michael Tsang</a>'
}).addTo(map);
const ukrainianFlag = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" class="leaflet-attribution-flag"><path fill="#4C7BE1" d="M0 0h12v4H0z"/><path fill="#FFD500" d="M0 4h12v3H0z"/><path fill="#E0BC00" d="M0 7h12v1H0z"/></svg>';
map.attributionControl.setPrefix(`<a href="https://leafletjs.com" title="A JavaScript library for interactive maps" target="_blank">${ukrainianFlag}Leaflet</a>`);

const lc = L.control.locate({
    setView: false,
    initialZoomLevel: zoomLevel,
    clickBehavior: {inView: 'setView', outOfView: 'setView', inViewNotFollowing: 'outOfView'},
    showPopup: false,
    showCompass: true,
    drawCircle: true,
    drawMarker: true,
    cacheLocation: false,
    locateOptions: {
        enableHighAccuracy: true,
    },
});
const options = lc.options as L.Control.LocateOptions;
options.createButtonCallback = (
    original => function (this : L.Control.LocateOptions, container, options) {
        // FIXME: library bug reported as DefinitelyTyped/DefinitelyTyped#69139
        const result = original!.bind(this)(container, options) as unknown as {link : HTMLElement, icon : HTMLElement};
        L.DomEvent.on(result.link, 'click', () => {
            if (currentPosition) {
                reverseGeocode(currentPosition);
            } else {
                activating = true;
            }
        });
        return result;
    }
)(options.createButtonCallback);
lc.addTo(map);
lc.start();
map.on('locationfound', e => {
    if (e.accuracy < 100) {
        currentPosition = e.latlng;
        if (activating) {
            reverseGeocode(currentPosition);
            activating = false;
        }
    } else {
        currentPosition = null;
    }
});
geocoder({
    geocoder: new CombinedGeocoder([whatFreeWords, geocoders.latLng({next: geocoders.nominatim()})]),
    collapsed: false,
    defaultMarkGeocode: false,
    suggestMinLength: Infinity,
})
    .on( 'markgeocode', e => {
        reverseGeocode(e.geocode.center);
    })
    .addTo(map);
map.on('click', e => reverseGeocode(e.latlng));
window.addEventListener('popstate', load);
