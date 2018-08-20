String.prototype.format = function () {
  var i = 0, args = arguments;
  return this.replace(/{}/g, function () {
    return typeof args[i] != 'undefined' ? args[i++] : '';
  });
};
var SelectedCams = getFireDashCookie(),
    generator = CameraGenerator(),
    USGSTopo_url = 'http://basemap.nationalmap.gov/ArcGIS/rest/services/USGSTopo/MapServer',
    WorldImage_url = 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer',
    FSTopo_url = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_FSTopo_01/MapServer',
    FSAdmin_url = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer',
    FireZone_url = 'https://nowcoast.noaa.gov/arcgis/services/nowcoast/forecast_meteoceanhydro_pts_zones_geolinks/MapServer/WmsServer',
    Geomac_url = 'https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer',
    WFAS_url = "https://www.wfas.net/cgi-bin/mapserv?map=/var/www/html/nfdr/mapfiles/ndfd_geog5.map&",
    Nexrad_url = 'https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer',
    SurfaceObservation_url = 'https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/obs_meteocean_insitu_sfc_time/MapServer',
    Smoke_url = 'https://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/ndgd_smoke_sfc_1hr_avg_time/ImageServer/WMSServer?',
    NasaGibs_url = 'https://gibs-{s}.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{time}/{tileMatrixSet}/{z}/{y}/{x}.jpg',
    FireCam_url = 'http://firecams.seismo.unr.edu/firecams/proxy/getptz?get=1',
    FireCamImage = "http://api.nvseismolab.org/vulcan/v0/camera/{}/image";
    
function refreshCam(){
    for (var c=0; c < 3; c++){
        var element = document.getElementById('camera' + c);
        var id  = SelectedCams[generator.next().value];
        if (id == undefined){
            element.title = 'Select cameras from the map'
            element.src = './lib/alert-tahoe-logo.png'
        } else {
            element.title = id
            element.src = FireCamImage.format(id) + '?' + new Date().getTime();
        }
    }
};
function check_times() {
    var date_time_array = [dat1.air_temp_value_1.date_time, dat2.air_temp_value_1.date_time];
    for (var date_time in date_time_array) {
        date_time = new Date(date_time_array[date_time]); // now datetime
        var update = new Date(date_time).setHours(date_time.getHours() + 1, // now + 1 hour
                                                  date_time.getMinutes() + 10); // generally takes 10 minutes for MesoWest to update
        
        if (update < new Date()) { // reload weather if it's been an hour since the last update
            console.log('Reloading weather');
            document.getElementById("weatherTable").outerHTML = "";
            mywidget.request(mywidget.default_station);
        }
    }
}
function getCookie(c_name) {
    if (document.cookie.length > 0) {
        c_start = document.cookie.indexOf(c_name + "=");
        if (c_start != -1) {
            c_start = c_start + c_name.length + 1;
            c_end = document.cookie.indexOf(";", c_start);
            if (c_end == -1) c_end = document.cookie.length;
            return unescape(document.cookie.substring(c_start, c_end));
        }
    }
    return '';
}
function getFireDashCookie(){
    var cookie = getCookie('FireDash');
    if (cookie){
        return cookie.split('|')
    } else {
        return []
    }
}
function setCameraDiv(id){
    var position = SelectedCams.length - 1;
    if (position > 2){return}; // only change the views for the first 3 chosen
    var element = document.getElementById('camera' + position);
    element.src = FireCamImage.format(id);
    element.title = id;
};
function* CameraGenerator(){
    let group = 0;
    let n = 0; // keeps one camera group for 3 iterations
    let i = -1;
    while (true){
        let number_of_groups = Math.ceil(SelectedCams.length / 3) - 1;
        // iterate i: 0, 1, 2...
        if (i > 1) {
            i = -1;
            n++;
        }
        // iterate n: 0, 1, 2...
        if (n > 2){
            n = 0;
            group++; // move to next group of cameras
            if (group > number_of_groups){ // reset the group at the end
                group = 0;
            }
        }
        i++;
        if (i + (group * 3) >= SelectedCams.length){ // if the last group has less than 3,
            yield i + ((group-1) * 3)                // keep the previous group in the other spots
        } else {
            yield i + (group * 3);
        }
    }
};

// fullscreen buttons
$(function() {
    $('.ui-icon-arrow-4-diag').click(function(){
        // if already full screen; exit
        // else go fullscreen
        if (
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        ) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        } else {
            element = this.parentNode.parentNode;
            // arcgis api fullscreen
            if (element.className === 'esri-view-user-storage') {
                element = element.parentNode;
            }
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            }
        }
    });
});
// Map
$(function() {      
    refreshCam(); // refresh off the start for any cookies
    
    var USGSTopo = L.esri.tiledMapLayer({
        url: USGSTopo_url,
        id: 'USGSTopo',
        maxZoom: 13,
        zIndex: 1
    });
    var WorldImage = L.esri.dynamicMapLayer({
        url: WorldImage_url,
        id: 'WorldImage',
        minZoom: 13,
        zIndex: 1
    });
    var FSTopo = L.esri.dynamicMapLayer({
        url: FSTopo_url,
        id: 'FSTopo',
        minZoom: 12,
        zIndex: 2
    });
    var FSAdmin = L.esri.dynamicMapLayer({
        url: FSAdmin_url,
        id: 'FSAdmin',
        maxZoom: 12,
        zIndex: 2
    });
    var FireZone = L.tileLayer.wms(
        FireZone_url,{        id: 'Smoke',
        layers: [8],
        format:'image/png', 
        transparent: true,
        zIndex: 3
    });
    var GeoMac = L.esri.dynamicMapLayer({
        url: Geomac_url,
        id: 'GeoMac',
        layers: [2, 3, 4, 5, 6],
        zIndex: 4
    });
    var FuelType = L.tileLayer.wms(WFAS_url, {
        layers: 'FM',
        format: 'image/png',
        transparent: true,
        attribution: '<a href="https://www.wfas.net">WFAS</a>'
    });
    var Nexrad = L.esri.dynamicMapLayer({
        url: Nexrad_url,
        id: 'Nexrad',
        layers: [3],
        opacity: 0.6,
        zIndex: 6
    });
    var SurfaceObservation = L.esri.dynamicMapLayer({
        url: SurfaceObservation_url,
        id: 'Surface',
        //layers: [3],
        zIndex: 6
    });
    var Smoke = L.tileLayer.wms(
        Smoke_url,
        {id: 'Smoke',
        layers: 'ndgd_smoke_sfc_1hr_avg_time:smoke_colormap',
        format: 'image/png',
        opacity: 0.6,
        zIndex: 6
    });
    // Leaflet initialize map
    var map = L.map('map', {
        center: [38.85, -120.45,],
        zoom: 9,
        crs: L.CRS.EPSG3857,
        maxBounds: [
            [-120, -220],
            [120, 220]
        ],
        fadeAnimation: false,
        layers: [USGSTopo, WorldImage, FSAdmin, FSTopo, GeoMac],
    });
    // Get the Fire Cams
    var FireCams, FireViews, camGeoJSON, viewGeoJSON;    
    $.getJSON(FireCam_url)
    .then(function(GeoJSON) {
        var GeoJSON_cam = $.extend(true, {}, GeoJSON)
        var GeoJSON_view = GeoJSON.features.map(function(feature, i){
                if (!feature.properties.hasOwnProperty('fov_rt')){
                    return
                }
                var coords = [[
                    [parseFloat(feature.geometry.coordinates[0]), parseFloat(feature.geometry.coordinates[1])],
                    [parseFloat(feature.properties.fov_rt[0]), parseFloat(feature.properties.fov_rt[1])],
                    [parseFloat(feature.properties.fov_lft[0]), parseFloat(feature.properties.fov_lft[1])],
                    [parseFloat(feature.geometry.coordinates[0]), parseFloat(feature.geometry.coordinates[1])],
                ]];
                feature.geometry = {
                    'type': 'Polygon',
                    'coordinates': coords
                };
            return feature
        });
        return [GeoJSON_cam, {type:'FeatureCollection', features:GeoJSON_view.filter(Boolean)}]
    })
    .then(function([GeoJSON_cam, GeoJSON_view]) {
        camGeoJSON = GeoJSON_cam; // moidfy the global
        console.log(typeof camGeoJSON.features[0].properties.az_current);
        viewGeoJSON = GeoJSON_view; // modify the global
        FireViews = L.geoJSON(GeoJSON_view, {
            id: 'FireViews',
            style:  {
                weight: 2,
                color: '#bac3cb',
                opacity: 1,
                fillColor: "#778899",
                fillOpacity: 0.3
            },
            zIndex: 5,
            filter: function(feature, layer){
                return SelectedCams.includes(feature.properties.id)
            }
        }).addTo(map);
        FireCams = L.geoJSON(GeoJSON_cam, {
            id: 'FireCams',
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, {
                    icon: new L.Icon({
                        iconUrl: './lib/if_arrow-circle-up_1608521.svg',
                        iconSize: 15
                    }),
                    rotationAngle: parseFloat(feature.properties.az_current),
                    rotationOrigin: 'center'
                    title: 
                    //radius: 5,
                    //fillColor: "#ff7800",
                    //color: "#000",
                    //weight: 1,
                    //opacity: 1,
                    //fillOpacity: 0.8
                });
            },
            zIndex: 6
        }).addTo(map);
        FireCams.on('click', function(f){
            var id = f.layer.feature.properties.id;
            map.removeLayer(FireViews);
            if (SelectedCams.includes(id)) {
                SelectedCams.splice(SelectedCams.indexOf(id), 1);
            } else {
                SelectedCams.push(id);
            }
            reloadCamViews();
            console.log(JSON.stringify(SelectedCams));
            document.cookie = 'FireDash='+SelectedCams.join('|');
            setCameraDiv(id);
        });
    });
    function reloadCamViews(){
        FireViews = L.geoJSON(viewGeoJSON, {
            id: 'FireViews',
            style:  {
                weight: 2,
                color: '#bac3cb',
                opacity: 1,
                fillColor: "#778899",
                fillOpacity: 0.3
            },
            zIndex: 4,
            filter: function(feature, layer){
                return SelectedCams.includes(feature.properties.id)
            }
        }).addTo(map);
        map.removeLayer(FireCams);
        map.addLayer(FireCams);
    };
    // Layer controls
    var basemaps = {
        'USGS Topo': USGSTopo,
    };
    var overlays = {
        'World Imagery': WorldImage,
        'FS Topo': FSTopo,
        'Fuel Type': FuelType,
        'Fire Zones': FireZone,
        'Surface Smoke': Smoke,
        'Nexrad Radar': Nexrad,
        'Fire Incidents': GeoMac,
        'NWS Stations': SurfaceObservation,
    };
    var LayerControl = L.control.layers(basemaps, overlays, {
        position: 'topleft',
        sortLayers: false
    }).addTo(map);
    
    //https://github.com/nasa-gibs/gibs-web-examples/blob/master/examples/leaflet/time.js
    // Seven day slider based off today, remember what today is
    var today = new Date();

    // Selected day to show on the map
    var day = new Date(today.getTime());

    // GIBS needs the day as a string parameter in the form of YYYY-MM-DD.
    // Date.toISOString returns YYYY-MM-DDTHH:MM:SSZ. Split at the 'T' and
    // take the date which is the first part.
    function dayParameter() {
        return day.toISOString().split('T')[0];
    }
    var update = function () {
        // There is only one layer in this example, but remove them all
        // anyway
        clearLayers();

        // Add the new layer for the selected time
        var newLayer = createLayer();
        LayerControl.addBaseLayer(newLayer, 'Modis Imagery');

        // Update the day label
        $("#day-label").html("MODIS Imagery Date: {}".format(dayParameter()));
    };

    function clearLayers() {
        map.eachLayer(function (layer) {
            if (layer.options.id === 'MODIS'){
                map.removeLayer(layer);
                LayerControl.removeLayer(layer);
            }
        });
    }

    var template = NasaGibs_url;
    var layer;

    function createLayer() {
        layer = L.tileLayer(template, {
            layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
            id: 'MODIS',
            zIndex: -1,
            tileMatrixSet: 'GoogleMapsCompatible_Level9',
            time: dayParameter(),
            //tileSize: 512,
            subdomains: 'abc',
            noWrap: true,
            continuousWorld: true,
            // Prevent Leaflet from retrieving non-existent tiles on the
            // borders.
            bounds: [
                [-85.051129, -180],
                [85.051129, 180]
            ],
            attribution:
                '<a href="https://wiki.earthdata.nasa.gov/display/GIBS">' +
                'NASA EOSDIS GIBS</a>&nbsp;&nbsp;&nbsp;' +
                '<a href="https://github.com/nasa-gibs/web-examples/blob/master/examples/leaflet/time.js">' +
                'View Source' +
                '</a>'
        });
        layer.on('add', function() {
            $('#day-panel')[0].style.visibility = 'visible';
        });
        layer.on('remove', function() {
            $('#day-panel')[0].style.visibility = 'hidden';
        });
        return layer;
    }
    update();
      // Slider values are in 'days from present'.
    $("#day-slider").slider({
        value: 0,
        min: -6,
        max: 0,
        step: 1,
        slide: function(event, ui) {
            // Add the slider value (effectively subracting) to today's date.
            var newDay = new Date(today.getTime());
            newDay.setUTCDate(today.getUTCDate() + ui.value);
            day = newDay;
            update();
            map.addLayer(layer);
        }
    });
});
