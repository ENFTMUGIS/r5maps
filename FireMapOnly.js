String.prototype.format = function () {
  var i = 0, args = arguments;
  return this.replace(/{}/g, function () {
    return typeof args[i] != 'undefined' ? args[i++] : '';
  });
};
// Modeled after this:
// https://developers.arcgis.com/javascript/latest/sample-code/sandbox/index.html?sample=layers-featurelayer-collection
require([
    "esri/config",
    "esri/Map",
    "esri/views/MapView",
    "esri/Graphic",
    "esri/widgets/LayerList",
    "esri/widgets/Legend",
    "esri/layers/GroupLayer",
    "esri/layers/MapImageLayer",
    "esri/layers/WMSLayer",
    "esri/layers/WebTileLayer",
    "esri/layers/FeatureLayer",
    "esri/geometry/Point",
    "esri/geometry/Polygon",
    "esri/layers/KMLLayer",
    "esri/core/Collection",
    "esri/layers/support/LabelClass",
    "esri/request",
    "dojo/on",
    "dojo/domReady!"
], function(esriConfig, Map, MapView, Graphic, LayerList, Legend, GroupLayer, MapImageLayer, WMSLayer, WebTileLayer, 
        FeatureLayer, Point, Polygon, KMLLayer, Collection, LabelClass, esriRequest, on) {
    // Enable CORS for satellite imagery
    esriConfig.request.corsEnabledServers.push(
        "https://gibs.earthdata.nasa.gov");
    esriConfig.request.corsEnabledServers.push(
        "https://fsapps.nwcg.gov");

    var worldImagery = new MapImageLayer({
        url: "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer",
        id: "worldImagery",
        minScale: 50000
    });
    var nexrad = new MapImageLayer({
        url: "https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer",
        id: "nexrad",
        title: 'NOAA RADAR',
        maxScale: 80000,
        opacity: 0.8,
        sublayers: [
            {
                id: 3,
                title: 'Weather Radar Base Reflectivity Mosaic ',
                visible: true,
            }]
    });
    var lightningIntensity = new MapImageLayer({
        url: "https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/sat_meteo_emulated_imagery_lightningstrikedensity_goes_time/MapServer",
        id: "lightningIntensity",
        title: 'NOAA Lightning Intensity',
        maxScale: 80000,
        opacity: 0.65,
        sublayers: [
            {
                id: 3,
                title: '15-Minute Lightning Strike Density (strikes/km^2/min * 10^3)',
                visible: true,
            }]
    });
    var snow = new MapImageLayer({
        url: "https://idpgis.ncep.noaa.gov/arcgis/rest/services/NWS_Observations/NOHRSC_Snow_Analysis/MapServer",
        id: "snow",
        maxScale: 80000,
        opacity: 0.75,
        sublayers: [
            {
                id: 3,
                title: 'Snow Depth',
                visible: true,
                popupEnabled: true
            }]
    });
    var NWSgroup = new GroupLayer({
        title: 'NWS/NOAA Layers',
        id: 'WEATHER',
        layers: [snow, lightningIntensity, nexrad],
        visibilityMode: 'independent',
        visible: false
    });

    // USFS layers
    var FSTopo = new MapImageLayer({
        url: "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_FSTopo_01/MapServer",
        id: "FSTopo",
        minScale: 200000
    });
    var admin = new MapImageLayer({
        url: "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer", // AdminBoundary
        id: "admin"
    });
    var USFSgroup = new GroupLayer({
        title: 'US Forest Service Layers',
        id: 'USFS',
        layers: [FSTopo, admin],
        visibilityMode: 'independent'
    });
    // Fire layers
    var activePerimeters = new FeatureLayer({ 
        url: "https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer/2", // fires
        id: "activeFire"
    });
    // tried this to join the tables:
    // https://gis.stackexchange.com/questions/282650/arcgis-js-api-join-arcgis-online-layers
    var inactivePerimeters = new FeatureLayer({ 
        url: "https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer/3", // fires
        id: "inactiveFire",
        popupTemplate: {
            title: '{incidentname} {incomplex:activity}', 
            content: '{active:activity}<br>\
                {gisacres:NumberFormat(places:0)} acres<br>\
                Updated {perimeterdatetime}<br>\
                <a href="https://inciweb.nwcg.gov/incident/{inciwebid}/" target="_blank" >Inciweb Page</a>'
            }
    });
    // function to display fire perimeter popups
    activity = function(value, key, data){
        if (key == 'active') {
            return (value === 'Y' ? '<b>ACTIVE</b>' : '<b>INACTIVE</b>');
        } else if (key == 'incomplex'){
            return (value === 'N' ? 'FIRE' : 'COMPLEX');
        }
    };
    var fireDetect = new FeatureLayer({ 
        url: "https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer/4", // fires
        id: "fireDetect",
        visible: false,
        popupTemplate: {title: '{load_stat}', content: '{date}'}
    });
    var smokeLyr = new KMLLayer({
        url: "https://www.ospo.noaa.gov/data/land/fire/smoke.kml", 
        title: 'NOAA Smoke',
        refreshInterval: 0.5,
        maxScale: 80000,
        opacity: 0.5,
        visible: false,
    });
    // Get the smoke sublayers in the right drawing order
    smokeLyr.when(function() {
        smokeLyr.sublayers = smokeLyr.sublayers.items[0].sublayers.items[0].sublayers.items.reverse().slice(1);
    });
    var FSmodis = new WMSLayer({
        url: "https://fsapps.nwcg.gov/afm/cgi-bin/mapserv.exe?map=conus.map&",
        id: "modisDetect",
        refreshInterval: 60,
        sublayers: [{
            name: 'Last 6 hour fire detections',
            title: '6-hour',
        }, {
            name: 'Last 12 hour fire detections',
            title: '12-hour'
        }, {
            name: 'Last 24 hour fire detections',
            title: '24-hour'
        }]
    });
    var EGPmodis = new MapImageLayer({
        url: "https://utility.arcgis.com/usrsvcs/servers/07b3dbcc163e466a819d18ea329de214/rest/services/FireCOP/FireDetections/MapServer",
        id: "EGPmodis",
    });
    var FIREgroup = new GroupLayer({
        title: 'Fire Layers',
        id: 'FIRE',
        layers: [FSmodis, inactivePerimeters, activePerimeters, smokeLyr],
        visibilityMode: 'independent'
    });
    /*var lightning = new KMLLayer({
        url: "https://ems-team.usda.gov/sites/fs-r05-enfgs/Shared%20Documents/Map%20Gallery/Fire/Lightning2018/lightning20180723.kmz", 
        //minScale: 24000,
        opacity: 1
    });*/
    
    var map = new Map({
//        basemap: "world-imagery",
//        ground: "world-elevation",
        layers: [worldImagery, USFSgroup, FIREgroup, NWSgroup]
    });
    var view = new MapView({
        container: "map",  // Reference to the DOM node that will contain the view
        map: map,               // References the map object created in step 3
        center: [-120.45, 38.85],
        zoom: 9
    });
    var legend, camera;
    var camViewKeeper = {};
    /************************************************
    *               Satellite Data                   *
    ************************************************/
    $(function() {
        //https://github.com/nasa-gibs/gibs-web-examples/blob/master/examples/leaflet/time.js
        // Seven day slider based off today, remember what today is
        var today = new Date();

        // Selected day to show on the map
        var day = new Date(today.getTime());

        // When the day is changed, cache previous layers. This allows already
        // loaded tiles to be used when revisiting a day. Since this is a
        // simple example, layers never "expire" from the cache.
        var cache = {};

        // GIBS needs the day as a string parameter in the form of YYYY-MM-DD.
        // Date.toISOString returns YYYY-MM-DDTHH:MM:SSZ. Split at the "T" and
        // take the date which is the first part.
        var dayParameter = function() {
            return day.toISOString().split("T")[0];
        };

        var update = function() {
            // Using the day as the cache key, see if the layer is already
            // in the cache.
            var key = dayParameter();
            var layer = cache[key];

            // If not, create a new layer and add it to the cache.
            if ( !layer ) {
                layer = create();
                cache[key] = layer;
            }
            // Remove satellite layer
            map.remove(map.findLayerById('modis'));

            // Add the new layer for the selected time
            map.add(layer, 0);

            // Update the day label
            $("#day-label").html("MODIS Imagery Date: {}".format(dayParameter()));
        };

        var create = function() {
            var url = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{}/GoogleMapsCompatible_Level9/{level}/{row}/{col}.jpg".format(dayParameter());
            //var url = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_Bands721/default/{}/GoogleMapsCompatible_Level9/{level}/{row}/{col}.jpg".format(dayParameter());
            var satellite = new WebTileLayer({
                // https://wiki.earthdata.nasa.gov/display/GIBS/GIBS+API+for+Developers
                // https://gis.stackexchange.com/questions/282796/cannot-connect-to-wmts-layer-from-nasa-gibs-api-in-qgis
                //url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best?time=2017-07-25", // url to the service,
                urlTemplate: url, // url to the service,
                title: "MODIS Satellite Imagery",
                id: "modis",
                copyright: "<a target='_top' href='https://earthdata.nasa.gov'>Earthdata</a> by <a target='_top' href='https://www.nasa.gov'>NASA</a>",
                maxScale: 200000
            });
            return satellite;
        };

        update();

        // Slider values are in "days from present".
        $("#day-slider").slider({
            value: 0,
            min: -7,
            max: 0,
            step: 1,
            slide: function(event, ui) {
                // Add the slider value (effectively subracting) to today's date.
                var newDay = new Date(today.getTime());
                newDay.setUTCDate(today.getUTCDate() + ui.value);
                day = newDay;
                update();
            }
        });
    });
    /************************************************
    *                Click Events                   *
    ************************************************/
    view.when(function() {
        var layerList = new LayerList({
            view: view
        });
        view.ui.add(layerList, "bottom-right");
    });
});
