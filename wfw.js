'use strict';
const zoomLevel = 19;

const whatFreeWords = new class {
    geocode(query, cb, context) {
        query = query.split(/\s+/).join('.');
        const dotCount = query.match(/\./g).length;
        if (dotCount === 2) {
            const result = WhatFreeWords.words2latlon(query);
            const latLng = L.latLng(result[0], result[1]);
            cb.call(context, [{name: query, center: latLng, bbox: L.latLngBounds(latLng, latLng)}]);
        } else {
            cb.call(context, []);
        }
    }

    suggest(query, cb, context) {
        this.geocode(query, cb, context);
    }

    reverse(location, scale, cb, context) {
        this.geocode(WhatFreeWords.latlon2words(location.lat, location.lng), cb, context);
    }
}();
function combineGeocoders(geocoders) {
    return new class {
        async geocode(query, cb, context) {
            cb.call(context, (await Promise.all(geocoders.map(geocoder => new Promise((resolve) => {
                try {
                    geocoder.geocode(query, resolve);
                }
                catch (e) {
                    resolve([]);
                }
            })))).flat());
        }
        async suggest(query, cb, context) {
            cb.call(context, (await Promise.all(geocoders.map(geocoder => new Promise((resolve) => {
                try {
                    geocoder.suggest(query, resolve);
                }
                catch (e) {
                    resolve([]); 
                }
            })))).flat());
        }
        async reverse(location, scale, cb, context) {
            cb.call(context, (await Promise.all(geocoders.map(geocoder => new Promise((resolve) => {
                try {
                    geocoder.reverse(location, scale, resolve);
                }
                catch (e) {
                    resolve([]);
                }
            })))).flat());
        }
    }();
}

const map = L.map('map').setView([51.505, -0.09], 13);
let marker;

function setMarker(result) {
    const center = {lat: result.center.lat.toFixed(6), lng: result.center.lng.toFixed(6)};
    const content = `<div class="popup"><p class="name">${result.name}</p><p class="latlng"><a href="geo:${center.lat},${center.lng}">${center.lat},${center.lng}</a></p>`
    if (marker) {
        marker.setLatLng(center).setPopupContent(content);
    } else {
        marker = L.marker(center).bindPopup(content).addTo(map);
    }
    marker.openPopup();
    document.title = `${result.name} - WhatF***Words`;
}

function load() {
    let words = window.location.pathname.split('/').at(-1);
    if (/([^\.]*)\.([^\.]*)\.([^\.]*)/.test(words)) {
        whatFreeWords.geocode(words, function(results) {
            const r = results[0];
            setMarker(r);
            map.setView(r.center, zoomLevel);
        });
    }
}
load();

function reverseGeocode(latlng) {
    whatFreeWords.reverse(latlng, map.options.crs.scale(map.getZoom()), function(results) {
        var r = results[0];
        if (r) {
            setMarker(r);
            window.history.pushState(null, '', r.name);
        }
    });
}

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
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
let activating = false;
lc.options.createButtonCallback = ((original) => function (container, options) {
    const result = original.bind(this)(container, options);
    L.DomEvent.on(result.link, 'click', function (ev) {
        activating = true;
    });
    return result;
})(lc.options.createButtonCallback);
lc.addTo(map);
map.on('locationfound', (e) => {
    if (activating && e.accuracy <= 1000) {
        map.setView(e.latlng, zoomLevel);
        reverseGeocode(e.latlng);
        activating = false;
    }
});
L.Control.geocoder({
    geocoder: combineGeocoders([whatFreeWords, L.Control.Geocoder.nominatim(), L.Control.Geocoder.LatLng()]),
    collapsed: false,
    defaultMarkGeocode: false,
})
    .on( 'markgeocode', (e) => {
        map.setView(e.geocode.center, zoomLevel);
        reverseGeocode(e.geocode.center);
    })
    .addTo(map);
map.on('click', (e) => reverseGeocode(e.latlng));
window.addEventListener('popstate', load);
