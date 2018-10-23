String.prototype.format = function () {
  var i = 0, args = arguments;
  return this.replace(/{}/g, function () {
    return typeof args[i] != 'undefined' ? args[i++] : '';
  });
};
var map, view, FireCams, FireViews, FWFfeature,
    //SelectedCams = getFireDashCookie(),
    SelectedCams = ['Axis-Leek', 'Axis-BaldCA', 'Axis-BigHill'],
    SelectedCams_azimuth = [0, 0, 0];
    generator = CameraGenerator(),
    USGSTopo_url = 'https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSTopo/MapServer',
    WorldImage_url = 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer',
    FSTopo_url = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_FSTopo_01/MapServer',
    FSAdmin_url = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer',
    FSTrail_url = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublishForSync_01/FeatureServer/0',
    FSRoad_url = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RoadBasicForSync_01/FeatureServer/2',
    FSRec_url = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RecreationSitesOpenForSync_01/FeatureServer/0',
    USGSTransport_url = 'https://services.nationalmap.gov/arcgis/rest/services/WFS/transportation/MapServer',
    //USGSTransport_url = 'https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer',
    FSStations_url = 'https://apps.fs.usda.gov/fsgisx02/rest/services/wo_ops_teams/S_WO_OPS_TEAMS_EU_SOI_01/FeatureServer/0',
    FireZone_url = 'https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/forecast_meteoceanhydro_pts_zones_geolinks/MapServer',
    Geomac_url = 'https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer',
    WFAS_url = "https://www.wfas.net/cgi-bin/mapserv?map=/var/www/html/nfdr/mapfiles/ndfd_geog5.map&",
    Nexrad_url = 'https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer',
    SurfaceObservation_url = 'https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/obs_meteocean_insitu_sfc_time/MapServer',
    Smoke_url = 'https://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/ndgd_smoke_sfc_1hr_avg_time/ImageServer/WMSServer?',
    NasaGibs_url = 'https://gibs-{s}.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{time}/{tileMatrixSet}/{z}/{y}/{x}.jpg',
    //FireCam_url = 'http://firecams.seismo.unr.edu/firecams/proxy/getptz?get=1',
    FireCam_url = 'https://firemap.sdsc.edu:5443/stations?selection=boundingBox&minLat=32.5121&minLon=-124.6509&maxLat=49&maxLon=-114.1315',
    FireCamImage = "http://api.nvseismolab.org/vulcan/v0/camera/{}/image",
    USGS_elevationQuery_url = 'https://nationalmap.gov/epqs/pqs.php?x={}&y={}&units=Feet&output=json';
    
function closeFWF(){FWFfeature.graphic.popupTemplate.content = 'Click on a Fire Weather Zone to get the forecast...'};
function toDDM(coord){
    // Convert coordinates to DDM for map popup    
    this.convert = function(_coord){
        _coord = Math.abs(_coord);
        var degrees = Math.floor(_coord);
        var minutes = (_coord - degrees ) * 60;
        return degrees + '&deg; ' + minutes.toFixed(3) + "'";
    };
    this.lat = this.convert(coord.latitude) + (coord.latitude > 0 ? ' N' : ' S');
    this.lng = this.convert(coord.longitude) + (coord.longitude > 0 ? ' E' : ' W');
}
function refreshCam(){
    // Re-load the camera geoJSON source and refresh the view images
    getStations();
    for (var c=0; c < 3; c++){
        // get the camera element
        var element = document.getElementById('camera' + c);
        // get the inde of the next camera
        var index = generator.next().value;
        var id  = SelectedCams[index];
        if (id === undefined){
            element.title = 'Select cameras from the map';
            element.src = './lib/alert-tahoe-logo.png';
        } else {
            element.title = id;
            element.src = FireCamImage.format(id) + '?' + new Date().getTime();
            // set the compass rotation
            //if (camGeoJSON === undefined){continue;}
            document.getElementById('compass' + c).style.transform = "translate(-50%, -50%) rotateX(65deg) rotateZ(-{}deg)".format(SelectedCams_azimuth[index]);
        }
    }
}
function forestQuery(ForestCode){
    // Fly to forest when it is selected in the drop-down
    var query_url = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundariesForSync_01/FeatureServer/1/query?where=FORESTORGCODE%3D%27{}%27&returnGeometry=true&returnExtentOnly=true&f=geojson';
    $.ajax({
        url: query_url.format(ForestCode),
        dataType: 'JSON',
        jsonpCallback: 'callback',
        type: 'GET',
        success: function(query_result){
            map.flyToBounds([
                [query_result.bbox[1], query_result.bbox[0]],
                [query_result.bbox[3], query_result.bbox[2]],
            ]);
        }
    });
}
function setCameraDiv(id){
    // Puts the camera image in the proper viewer
    var position = SelectedCams.length - 1;
    if (position > 2){return;} // only change the views for the first 3 chosen
    var element = document.getElementById('camera' + position);
    element.src = FireCamImage.format(id);
    element.title = id;
    document.getElementById('compass' + position).style.transform = "translate(-50%, -50%) rotateX(65deg) rotateZ(-{}deg)".format(SelectedCams_azimuth[SelectedCams.indexOf(id)]);
}
function* CameraGenerator(){
    // Generates the index in SelectedCams for the camera ids
    let group = 0;
    let n = 0; // keeps one camera group for 3 iterations
    let i = -1;
    while (true){
        let number_of_groups = Math.ceil(SelectedCams.length / 3) - 1;
        // iterate i: 0, 1, 2...
        if (i == 2) {
            i = -1;
            n++;
        }
        // iterate n: 0, 1, 2...
        if (n == 3){
            n = 0;
            group++; // move to next group of cameras
            if (group > number_of_groups){ // reset the group at the end
                group = 0;
            }
        }
        i++;
        if (i + (group * 3) >= SelectedCams.length){ // if the last group has less than 3,
            yield i + ((group-1) * 3);                // keep the previous group in the other spots
        } else {
            yield i + (group * 3);
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
        return cookie.split('|');
    } else {
        return [];
    }
}

// fullscreen buttons
$(function() {
    $('.ui-icon-arrow-4-diag').click(function(){
        return;
        // if already full screen; exit
        // else go fullscreen
        var clickedCell = this.parentNode.parentNode.parentNode.id === 'mapDiv' ? 'viewer0': this.parentNode.parentNode.parentNode.id;
        document.getElementById(clickedCell).style.width = '100%';
        var table = document.getElementById("table");
        $('#table tr').each(function(){
            $(this).find('td').each(function(){
                if (this.id != clickedCell){
                    console.log(this);
                    this.style.height = '0px';
                    this.children[0].style.height = '0px';
                }
            });
        });       
//        if (
//            document.fullscreenElement ||
//            document.webkitFullscreenElement ||
//            document.mozFullScreenElement ||
//            document.msFullscreenElement
//        ) {
//            if (document.exitFullscreen) {
//                document.exitFullscreen();
//            } else if (document.mozCancelFullScreen) {
//                document.mozCancelFullScreen();
//            } else if (document.webkitExitFullscreen) {
//                document.webkitExitFullscreen();
//            } else if (document.msExitFullscreen) {
//                document.msExitFullscreen();
//            }
//        } else {
//            element = this.parentNode.parentNode;
//            // arcgis api fullscreen
//            if (element.className === 'esri-view-user-storage') {
//                element = element.parentNode;
//            }
//            if (element.requestFullscreen) {
//                element.requestFullscreen();
//            } else if (element.mozRequestFullScreen) {
//                element.mozRequestFullScreen();
//            } else if (element.webkitRequestFullscreen) {
//                element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
//            } else if (element.msRequestFullscreen) {
//                element.msRequestFullscreen();
//            }
//        }
    });
});


// Modeled after this:
// https://developers.arcgis.com/javascript/latest/sample-code/sandbox/index.html?sample=layers-featurelayer-collection
require([
    "esri/Map",
    "esri/views/MapView",
    "esri/Graphic",
    "esri/widgets/LayerList",
    "esri/widgets/Expand",
    "esri/widgets/Search",
    "esri/widgets/Legend",
    "esri/widgets/Feature",
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
    "esri/core/watchUtils",
    'dojo/dom-style',
    "dojo/on",
    "dojo/domReady!"
], function(Map, MapView, Graphic, LayerList, Expand, Search, Legend, Feature, GroupLayer, MapImageLayer, WMSLayer, WebTileLayer, 
        FeatureLayer, Point, Polygon, KMLLayer, Collection, LabelClass, esriRequest, watchUtils, domStyle, on) {
    // Enable CORS for satellite imagery

    var CamGroup = new GroupLayer({
        title: 'UNR Fire Cameras',
        id: 'CamGroup',
        layers: [],
        visibilityMode: 'inherited',
        visible: true
    });
    
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
        opacity: 0.7,
        visible: true,
        sublayers: [
            {
                id: 3,
                title: 'Weather Radar Base Reflectivity Mosaic ',
                visible: true,
                legendEnabled: false
            }]
    });
    var lightningIntensity = new MapImageLayer({
        url: "https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/sat_meteo_emulated_imagery_lightningstrikedensity_goes_time/MapServer",
        id: "lightningIntensity",
        title: 'NOAA Lightning Intensity',
        maxScale: 80000,
        opacity: 0.65,
        visible: false,
        sublayers: [{
                id: 3,
                title: '15-Minute Lightning Strike Density (strikes/km^2/min * 10^3)',
                visible: true,
            }]
    });
    var snow = new MapImageLayer({
        url: "https://idpgis.ncep.noaa.gov/arcgis/rest/services/NWS_Observations/NOHRSC_Snow_Analysis/MapServer",
        id: "snow",
        title: 'NOAA Snow Analysis',
        maxScale: 80000,
        opacity: 0.75,
        visible: false,
        sublayers: [{
                id: 3,
                title: 'Snow Depth',
                visible: true,
            }]
    });
    hazard_popup = {
        title: '{prod_type}',
        content: [{
            type: "fields",
            fieldInfos: [{
                    fieldName: "starttime",
                    label: "Start",
                    visible: true,
                    format: {dateFormat: 'short-date-short-time'}
                },{
                    fieldName: "endtime",
                    label: "End",
                    visible: true,
                    format: {dateFormat: 'short-date-short-time'}
                }]
        }]
    };
    var hazards = new MapImageLayer({
        url: "https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/wwa_meteoceanhydro_longduration_hazards_time/MapServer",
        id: "hazards",
        opacity: 0.60,
        title: 'Weather Watches and Warnings',
        sublayers: [{
                id: 16,
                title: 'Coastal Flood',
                visible: true,
                popupTemplate: hazard_popup,
                legendEnabled: false,
            },{
                id: 19,
                title: 'Inland Flood',
                visible: true,
                popupTemplate: hazard_popup,
                legendEnabled: false,
            },{
                id: 41,
                title: 'Air Quality',
                visible: true,
                popupTemplate: hazard_popup,
                legendEnabled: false,
            },{
                id: 32,
                title: 'Snow and Freezing Precip',
                visible: true,
                popupTemplate: hazard_popup,
                legendEnabled: false,
            },{
                id: 35,
                title: 'Cold and Heat',
                visible: true,
                popupTemplate: hazard_popup,
                legendEnabled: false,
            },{
                id: 38,
                title: 'WildFire',
                visible: true,
                popupTemplate: hazard_popup,
                legendEnabled: false,
            }]
    });
    var FireZone = new FeatureLayer({ 
        url: FireZone_url+'/9',
        outFields: ['*'],
        id: "FireZone",
        title: 'Fire Weather Zones',
        visible: false,
        popupEnabled: false,
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-fill",
                style: "solid",
                color: [255, 255, 255, 0.01],
                outline: {
                    type: "simple-line",
                    style: "simple",
                    color: [0, 0, 0, 1],
                    width: 1
                }
            }
        }
    });
    var NWSgroup = new GroupLayer({
        title: 'NWS/NOAA Layers',
        id: 'WEATHER',
        layers: [snow, lightningIntensity, nexrad, FireZone, hazards],
        visibilityMode: 'independent',
        visible: true
    });

    // USFS layers
    var road_template = {
                    title: '{ID} | {NAME}',
                    content: [{
                        type: "fields",
                        fieldInfos: [{
                                fieldName: "OPER_MAINT_LEVEL",
                                label: "OPER_MAINT_LEVEL",
                                visible: true,
                            },{
                                fieldName: "SURFACE_TYPE",
                                label: "SURFACE_TYPE",
                                visible: true
                            },{
                                fieldName: "JURISDICTION",
                                label: "JURISDICTION",
                                visible: true
                            },{
                                fieldName: "MANAGING_ORG",
                                label: "MANAGING_ORG",
                                visible: true
                            },{
                                fieldName: "OPENFORUSETO",
                                label: "OPENFORUSETO",
                                visible: true
                            },{
                                fieldName: "GIS_MILES",
                                label: "GIS_MILES",
                                visible: true
                            }]
                    }]
                }
    var trail_template = {
                    title: '{TRAIL_NO} | {TRAIL_NAME}',
                    content: [{
                        type: "fields",
                        fieldInfos: [{
                                fieldName: "TRAIL_TYPE",
                                label: "TRAIL_TYPE",
                                visible: true,
                            },{
                                fieldName: "TRAIL_CLASS",
                                label: "TRAIL_CLASS",
                                visible: true
                            },{
                                fieldName: "ALLOWED_TERRA_USE",
                                label: "ALLOWED_TERRA_USE",
                                visible: true
                            },{
                                fieldName: "MANAGING_ORG",
                                label: "MANAGING_ORG",
                                visible: true
                            },{
                                fieldName: "GIS_MILES",
                                label: "GIS_MILES",
                                visible: true
                            }]
                    }]
                }
    var FSCarto = new MapImageLayer({
        url: 'https://apps.fs.usda.gov/arcx/rest/services/wo_nfs_gstc/GSTC_IVMCartography_01/MapServer',
        id: 'FSCarto',
        title: 'Roads and Trails',
        minScale: 400000,
        sublayers: [
            {
				id: 6,
				visible: true,
				popupEnabled: true,
				popupTemplate: road_template
            },{
				id: 5,
				visible: true,
				popupEnabled: true,
				popupTemplate: road_template
            },{
				id: 4,
				visible: true,
				popupEnabled: true,
				popupTemplate: trail_template
            },{
				id: 3,
				visible: true,
				popupEnabled: true,
				popupTemplate: trail_template
            },{
				id: 2,
				visible: true,
				popupEnabled: true,
				popupTemplate: trail_template
            }
        ]
    });

    var FSTopo = new MapImageLayer({
        url: "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_FSTopo_01/MapServer",
        id: "FSTopo",
        minScale: 200000,
        visible: false
    });
    var admin = new MapImageLayer({
        url: "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer", // AdminBoundary
        id: "admin",
        title: 'Administrative Boundary'
    });
    var FSOwner = FeatureLayer({
        url: 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_BasicOwnership_02/MapServer/0',
        id: 'FSOwner',
        title: 'Private Land',
        minScale: 400000,
        definitionExpression: "OWNERCLASSIFICATION IN ('NON-FS', 'UNPARTITIONED RIPARIAN INTEREST')",
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-fill",
                style: "solid",
                color: [100, 100, 100, 1],
                outline: {
                    type: "simple-line",
                    style: "simple",
                    color: [200, 200, 200, 1],
                    width: 0.5
                }
            }
        },
        opacity: 0.3,
    });
    var FSWilderness = FeatureLayer({
        url: 'https://apps.fs.usda.gov/arcx/rest/services/wo_nfs_gstc/GSTC_IVMReference_01/MapServer/6',
        id: 'FSWilderness',
        title: 'Wilderness',
        opacity: 0.6,
        labelsVisible: false
    });
    var USFSgroup = new GroupLayer({
        title: 'US Forest Service Layers',
        id: 'USFS',
        layers: [FSTopo, FSOwner, admin, FSWilderness, FSCarto],
        visibilityMode: 'independent'
    });
    // Fire layers
    var perimeterPopup = {
        title: '<b>{incidentname}</b>  <small>{gisacres} acres</small>', 
        content: [{
            type: "fields",
            fieldInfos: [{
                    fieldName: "active",
                    label: "Active",
                },{
                    fieldName: "gisacres",
                    label: "Acres",
                    format: {digitSeparator: true, places: 0}
                },{
                    fieldName: "agency",
                    label: "Agency",
                },{
                    fieldName: "inciwebid",
                    label: "Inciweb ID",
                },{
                    fieldName: "datecurrent",
                    label: "Last Update",
                },{
                    fieldName: "state",
                    label: "State",
                }]
        }],
        actions: [{
            title: 'Inciweb',
            id: 'inciweb-site',
            image: './lib/inciweb-logo-blue.png'
        }]
    }
    var activePerimeters = new FeatureLayer({ 
        url: "https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer/2", // fires
        id: "activeFire",
        title: 'Active Perimeters',
        popupTemplate: perimeterPopup
    });
    // tried this to join the tables:
    // https://gis.stackexchange.com/questions/282650/arcgis-js-api-join-arcgis-online-layers
    var inactivePerimeters = new FeatureLayer({ 
        url: "https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer/3", // fires
        id: "inactiveFire",
        title: 'Inactive Perimeters',
        popupTemplate: perimeterPopup
    });
    var ICS209 = new FeatureLayer({ 
        url: "https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_perims/MapServer/0", 
        id: "ICS209",
        title: 'ICS-209',
        popupTemplate: {
            title: '<b>{incidentname}</b> {percentcontained}% contained', 
            content: "{*}"}
    });
    var fireDetect = new FeatureLayer({ 
        url: "https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer/4", 
        id: "fireDetect",
        title: 'MODIS Fire Detections',
        visible: false,
        popupTemplate: {title: '{load_stat}', content: '{date}'}
    });
    var PFIRS = new KMLLayer({
        url: "https://ssl.arb.ca.gov/pfirs/firm/kml/rx4.php?s=all", 
        title: 'PFIRS',
        visible: true,
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
        title: 'MODIS Fire Detections',
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
        layers: [FSmodis, inactivePerimeters, activePerimeters, ICS209, PFIRS, smokeLyr],
        visibilityMode: 'independent'
    });
    
    map = new Map({
        basemap: "topo",
//        ground: "world-elevation",
        layers: [worldImagery, USFSgroup, FIREgroup, NWSgroup, CamGroup]
    });
    view = new MapView({
        container: "map",  // Reference to the DOM node that will contain the view
        map: map,               // References the map object created in step 3
        center: [-120.45, 38.85],
        zoom: 9
    });

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

        var update = function(vis) {
            // Using the day as the cache key, see if the layer is already
            // in the cache.
            var key = dayParameter();
            var layer = cache[key];

            // If not, create a new layer and add it to the cache.
            if ( !layer ) {
                layer = create(vis);
                cache[key] = layer;
            }
            // Remove satellite layer
            map.remove(map.findLayerById('modis'));

            // Add the new layer for the selected time
            map.add(layer, 0);

            // Update the day label
            $("#day-label").html("MODIS Imagery Date: {}".format(dayParameter()));
        };

        var create = function(vis) {
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
                maxScale: 200000,
                visible: vis
            });
            satellite.watch("visible", function(event){
              // turn the date control on/off with the layer
              if (event){view.ui.add('day-panel', 'bottom-left');document.getElementById('day-panel').style.visibility = 'visible';}
              else {document.getElementById('day-panel').style.visibility = 'hidden';}
            });
            return satellite;
        };

        update(false);

        // Slider values are in "days from present".
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
                update(true);
            }
        });
    });
    /************************************************
    *                Click Events                   *
    ************************************************/
    // Click on fire cam
    view.on("click", function(event){
        view.hitTest(event)
            .then(function(r){
                if (r.results[0].graphic.layer.id === 'camera') {
                    event.stopPropagation()
                    drawCameraView(r.results[0].graphic);
                    console.log(SelectedCams)
                } else if (r.results[0].graphic.layer.id === 'FireZone'){
                    // Fire Weather Zones
                    var office = r.results[0].graphic.attributes.CWA,
                        zone = r.results[0].graphic.attributes.ZONE,
                        state_zone = r.results[0].graphic.attributes.STATE_ZONE,
                        office_url = 'https://api.weather.gov/products/types/FWF/locations/' + office;
                    FWFfeature.graphic.popupTemplate.content = 'Looking up forecast for {}. Please wait...'.format(state_zone);
                    // Query the office for the forecast url
                    $.get(office_url)
                    .then(function(response){
                        var forecast_url = response["@graph"][0]["@id"];
                        // Get the forecast
                        $.get(forecast_url)
                            .then(function(forecastData) {
                            var NWSText = forecastData.productText;
                            // find the start of fire zone 
                            var beginText = NWSText.lastIndexOf('\n', NWSText.indexOf(zone)) + 1;
                            var endText = NWSText.indexOf("$$", beginText)
                            // I've seen 'Extended', 'EXTENDED', and 'FORECAST DAYS 3 THROUGH 7...'
                            var extendedStart = NWSText.toLowerCase().indexOf("extended", beginText)
                            // Sometimes there is no extended at the very end
                            if (extendedStart > 0 && endText < extendedStart){
                                var extendedEnd = NWSText.indexOf("$$", extendedStart)
                                var FWF = NWSText.slice(beginText, endText) + NWSText.slice(extendedStart, extendedEnd);
                            } else {
                                var extendedEnd = NWSText.indexOf("$$", beginText);
                                var FWF = NWSText.slice(beginText, endText);
                            }
                            FWF = "<div style='position:relative;'><span onClick='closeFWF()' class='esri-icon-close close' aria-label='close icon'></span><p>" + FWF + "</p></div>";
                            FWFfeature.graphic.popupTemplate.content = FWF;
                        });
                    })
                } else {
                    // if you click on a graphic besides the cameras
                    throw 'catch me';
                }
            })
            // Elevation Query
            //.catch(function(error){
            //    // display lat/long/elevation
            //    event.stopPropagation()
            //    $.getJSON(USGS_elevationQuery_url.format(event.mapPoint.longitude, event.mapPoint.latitude), 
            //        function(data){
            //            var ddm = new toDDM(event.mapPoint)
            //            var elevation = data.USGS_Elevation_Point_Query_Service.Elevation_Query;
            //            view.popup.open({
            //                title: '{} {}'.format(elevation.Elevation.toFixed(), elevation.Units),
            //                location: event.mapPoint,
            //                content: '{}<br>{}'.format(ddm.lat, ddm.lng),
            //            });
            //        }
            //    )
            //})
    });
    // Fire cam tooltip
    view.on("pointer-move", function(event){
        view.hitTest(event)
            .then(function(r){
                if (r.results.length > 0 && r.results[0].graphic.layer.id === 'camera') {
                    domStyle.set('ttip', 'display', 'block');
                    domStyle.set('ttip', 'top', event.y - 22 + 'px');
                    domStyle.set('ttip', 'left', event.x + 5 + 'px');
                    document.getElementById('ttip').innerHTML = r.results[0].graphic.attributes.id;
                    domStyle.set('map', 'cursor', 'pointer')
                } else {
                    domStyle.set('ttip', 'display', 'none');
                    domStyle.set('map', 'cursor', 'auto')
                }
        });
    });
    // Event handler that fires each time an action is clicked.
    view.popup.on("trigger-action", function(event) {
        if (event.action.id === "inciweb-site") {
            if (event.target.features[0].attributes.inciwebid.trim().length > 0){
                window.open('https://inciweb.nwcg.gov/incident/'+event.target.features[0].attributes.inciwebid);
            } else {
                window.open('https://inciweb.nwcg.gov/')
            }
        }
    });
    /************************************************
    *        Load the cameras and widgets           *
    ************************************************/
    view.when(function() {
        // LayerList widget
        var layerList = new LayerList({
            container: document.createElement("div"),
            view: view,
            listItemCreatedFunction: function(e){
                if (e.item.title === 'UNR Fire Cameras'){
                    e.item.actionsSections = [[{
                        title: 'Clear all camera selections',
                        className: 'esri-icon-error',
                        id: 'clearCams'
                    }]]
                }
            }
            //listItemCreatedFunction: function (event) {
            //    const item = event.item;
            //    item.panel = {
            //        content: "legend",
            //    };
            //}
        });
        layerList.on('trigger-action', function(e){
            if (e.action.id === 'clearCams'){
                SelectedCams = [];
                SelectedCams_azimuth = [];
                FireViews.definitionExpression = '1=2';
            }
        })
        layerListExpand = new Expand({
            expandIconClass: "esri-icon-layer-list",  // see https://developers.arcgis.com/javascript/latest/guide/esri-icon-font/
            expandTooltip: "LayerList", // optional, defaults to "Expand" for English locale
            view: view,
            content: layerList.domNode
        });
        view.ui.add(layerListExpand, "top-left");
        // Legend widget
        var legend = new Legend({
            container: document.createElement("div"),
            view: view,
            style: 'classic',//{type:'card', layout: 'stack'},
        });
        legendExpand = new Expand({
            expandIconClass: "esri-icon-layers",  // see https://developers.arcgis.com/javascript/latest/guide/esri-icon-font/
            expandTooltip: "Legend", // optional, defaults to "Expand" for English locale
            view: view,
            content: legend.domNode
        });
        view.ui.add(legendExpand, "top-right");
        // Search widget
        var searchWidget = new Search({
            container: document.createElement("div"),
            view: view,
            allPlaceholder: "Search for places or features",
            searchAllEnabled: true,
            locationEnabled: false,
            includeDefaultSources: false,
            goToOverride: function(view, goToParams){
                goToParams.target.zoom = view.zoom;
                goToParams.target.center = view.center;
                return view.goTo(goToParams.target, goToParams.options);
            },
            sources: [/*{
                featureLayer: {
                    url: 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RoadBasic_01/MapServer/0',},
                searchFields: ['ID', 'NAME'],
                displayField: "NAME",
                suggestionsEnabled: true,
                suggestionTemplate : '{ID} <span>&#124;</span> {NAME}',
                exactMatch: false,
                outFields: ["*"],
                name: 'Roads',
                withinViewEnabled: true,
                placeholder: "Road name or ID",
                popupTemplate: road_template
            },{
                featureLayer: {
                    url: 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RoadBasic_01/MapServer/1',},
                searchFields: ['ID', 'NAME'],
                displayField: "NAME",
                suggestionsEnabled: true,
                suggestionTemplate : '{ID} <span>&#124;</span> {NAME}',
                exactMatch: false,
                outFields: ["*"],
                name: 'Closed Roads',
                withinViewEnabled: true,
                placeholder: "Road name or ID",
                popupTemplate: road_template
            },{
                featureLayer: {
                    url: 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublish_01/MapServer/0',},
                searchFields: ['TRAIL_NO', 'TRAIL_NAME'],
                displayField: "TRAIL_NAME",
                exactMatch: false,
                outFields: ["*"],
                name: 'Trails',
                withinViewEnabled: true,
                suggestionsEnabled: true,
                suggestionTemplate : '{TRAIL_NO} <span>&#124;</span> {TRAIL_NAME}',
                placeholder: "Trail name or ID",
                popupTemplate: trail_template
            },{
                featureLayer: {
                    url: 'https://apps.fs.usda.gov/arcx/rest/services/wo_nfs_gstc/GSTC_IVMCartography_01/MapServer/1',},
                searchFields: ['RECAREANAME'],
                displayField: "RECAREANAME",
                suggestionsEnabled: true,
                exactMatch: false,
                outFields: ["*"],
                withinViewEnabled: true,
                name: 'Recreation',
                placeholder: "Rec site name",
                popupTemplate: {
                    title: '{RECAREANAME}', 
                    content: "{*}"
                }
            },*/{
                featureLayer: {
                    url: "https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/1",},
                searchFields: ["gaz_name"],
                displayField: "gaz_name",
                exactMatch: false,
                outFields: ["*"],
                name: "Landforms",
                withinViewEnabled: true,
                placeholder: "Landform",
                popupTemplate: {
                    title: '{gaz_name}', 
                    content: "{*}",
                }
            },{
                featureLayer: {
                    url: "https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/2",},
                    //url: 'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/5',},
                searchFields: ["gaz_name"],
                displayField: "gaz_name",
                exactMatch: false,
                outFields: ["*"],
                name: "Streams/Rivers",
                withinViewEnabled: true,
                placeholder: "Stream/River name",
                popupTemplate: {
                    title: '{gaz_name}', 
                    content: "{*}"
                }
            },{
                featureLayer: {
                    url: "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/9",},
                searchFields: ["GNIS_NAME"],
                displayField: "GNIS_NAME",
                suggestionTemplate: "{GNIS_NAME}",
                exactMatch: false,
                outFields: ["*"],
                name: "Waterbodies",
                withinViewEnabled: true,
                placeholder: "Waterbody name",
                popupTemplate: {
                    title: '{GNIS_NAME}', 
                    content: "{*}"
                }
            },{
                featureLayer: {
                    url: "https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/13",},
                searchFields: ["gaz_name"],
                displayField: "gaz_name",
                exactMatch: false,
                outFields: ["*"],
                name: "Locales",
                withinViewEnabled: true,
                placeholder: "Locale",
                popupTemplate: {
                    title: '{gaz_name}', 
                    content: "{*}"
                }
            },{
                featureLayer: {
                    url: "https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/18",},
                searchFields: ["gaz_name"],
                displayField: "gaz_name",
                exactMatch: false,
                outFields: ["*"],
                name: "Populated Places",
                withinViewEnabled: true,
                placeholder: "Populated Place",
                popupTemplate: {
                    title: '{gaz_name}', 
                    content: "{*}"
                }
            }]
        });
        var SearchExpand = new Expand({
            expandIconClass: "esri-icon-search",  // see https://developers.arcgis.com/javascript/latest/guide/esri-icon-font/
            expandTooltip: "Search", // optional, defaults to "Expand" for English locale
            view: view,
            content: searchWidget.domNode
        });
        view.ui.add(SearchExpand, {position: "top-left", index:2});
        // FWF widget
        FWFfeature = new Feature({
            view: view,
            graphic: {
                popupTemplate: {
                    title: null,
                    content: 'Click on a Fire Weather Zone to get the forecast...'
                }
            }
        });
        FireZone.watch("visible", function(event){
            // turn the date control on/off with the layer
            if (event){
                FWFfeature.graphic.popupTemplate.content = 'Click on a Fire Weather Zone to get the forecast...';
                view.ui.add(FWFfeature, 'bottom-right');
            }
            else {view.ui.remove(FWFfeature);}
        });
    });
    /************************************************
    *               Download Data                   *
    ************************************************/

    getStations = function() {
        // fire cameras also available here:
        // http://firecams.seismo.unr.edu/firecams/proxy/getptz?get=1
        var urlBase = "https://firemap.sdsc.edu:5443/stations?";
        var extent =  'selection=boundingBox&minLat=38.373333&minLon=-121.0145&maxLat=39.3655&maxLon=-119.7843';
        var observe = '&observable=temperature&observable=wind_speed&all=true';
        var url = urlBase + extent + observe;
        $.ajax({
            url: FireCam_url,
            cache: false,
            dataType: 'JSONP',
            jsonpCallback: 'callback',
            type: 'GET',
            success: function(data){ // filter out all non-camera sites
                data.features = data.features.filter(function(i){
                    return i.properties.hasOwnProperty('latest-images');
                });
                // set the azimuth for the compass array
                for (var i in data.features){
                    if (SelectedCams.includes(data.features[i].properties.description.id)){
                        SelectedCams_azimuth[SelectedCams.indexOf(data.features[i].properties.description.id)] = data.features[i].properties.description.az_current;
                    }
                }
            }
        })
        .then(function(data) {
            // parse the data
            return [createCameras(data.features), 
                    createCamview(data.features)];
        })
        .then(function([r1, r2]) {
            // create the layers
            createLayer(r2, cameraFields.slice(0, 3), camviewRenderer, 'polygon', 'Fire Camera View', 'camview');
            createLayer(r1, cameraFields, cameraRenderer, 'point', 'Fire Camera', 'camera');
        })
    };
    function createLayer(graphics, fields, renderer, geom, title, id) {
        var layer = new FeatureLayer({
            title: title,
            id: id,
            source: graphics, // autocast as an array of esri/Graphic
            // create an instance of esri/layers/support/Field for each field object
            fields: fields, // This is required when creating a layer from Graphics
            objectIdField: "ObjectID", // This must be defined when creating a layer from Graphics
            renderer: renderer, // set the visualization on the layer
            spatialReference: {
                wkid: 4326
            },
            geometryType: geom, // Must be set when creating a layer from Graphics
            //popupTemplate: pTemplate,
            definitionExpression: id === 'camview' ? "id IN ({})".format(JSON.stringify(SelectedCams).replace(/\[|\]/g, '').replace(/\"/g, "'")) : ""
        });
        if (map.findLayerById(id) === undefined){
            switch (id){
                case 'camera':
                    FireCams = layer;
                    break;
                case 'camview':
                    FireViews =layer ;
                    break;
            }
            //map.add(layer)
            CamGroup.add(layer)
        } else {
            switch (id){
                case 'camera':
                    FireCams.applyEdits({updateFeatures: graphics});
                    break;
                case 'camview':
                    FireViews.applyEdits({updateFeatures: graphics});
                    break;
            }
        }
        
    }

    /************************************************
    *              Fire Camera Points               *
    ************************************************/
    var cameraFields = [
        {name: "ObjectID", alias: "ObjectID", type: "oid"},
        {name: "name", alias: "name", type: "string"},
        {name: "id", alias: "id", type: "string"},
        {name: "attribution", alias: "attribution", type: "string"},
        {name: "azimuth", alias: "azimuth", type: "double"},
        {name: "tilt", alias: "tilt", type: "double" },
        {name: "zoom", alias: "zoom", type: "double" },
        {name: "fov", alias: "fov", type: "double"},
    ];
    var cameraRenderer = {
        type: "simple", // autocasts as new SimpleRenderer()
        symbol: {
            type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
            path: "M14.5,29 23.5,0 14.5,9 5.5,0z",
            angle: 180,
            size: 12,
            color: [211, 255, 0, 0],
            outline: {
                width: 1,
                color: "#FF0055",
                style: "solid"
            },
            xoffset: '3px',
            yoffset: '-4px',
        },
        visualVariables: [{
            type: "rotation",
            field: "azimuth",
            rotationType: "geographic"
        }]
    };

    function createCameras(data) {
        // Create an array of Graphics from each feature
        var camGraphic = [];
        var i = 0;
        data.forEach(function(feature) {
            var g = {
                geometry: new Point({
                    x: parseFloat(feature.geometry.coordinates[0]),
                    y: parseFloat(feature.geometry.coordinates[1])
                }),
                // select only the attributes you care about
                attributes: {
                    ObjectID: i,
                    name: feature.properties.description.name,
                    id: feature.properties.description.id.toString(),
                    attribution: feature.properties.description.owner,
                    azimuth: isNaN(parseFloat(feature.properties.description.az_current)) ? 0: parseFloat(feature.properties.description.az_current),
                    tilt: isNaN(parseFloat(feature.properties.description.tilt_current)) ? 0: parseFloat(feature.properties.description.tilt_current),
                    zoom: isNaN(parseFloat(feature.properties.description.zoom_current)) ? 0: parseFloat(feature.properties.description.zoom_current),
                    fov: isNaN(parseFloat(feature.properties.description.fov)) ? 0: parseFloat(feature.properties.description.fov),
                }
            };
            if (feature.properties.description.fov_rt === undefined){
                camGraphic.push(g)
            } else {
                camGraphic.unshift(g)
            }
            i++;
        });
        return camGraphic;
    }
    /************************************************
    *              Fire Camera Views                *
    ************************************************/
    var camviewRenderer = {
        type: "simple", 
        symbol: {
            style: 'solid',
            type: 'simple-fill',
            color: [119, 136, 153, 0.25],
            outline: {
                width: 1,
                color: [186, 195, 203, 0.25],
                style: "solid"
            }
        }
    };
    function createCamview(data) {
        // Create an array of Graphics from each feature
        var camviewGraphic = [];
        var i = 0;
        data.forEach(function(feature) {
            if (!feature.properties.description.hasOwnProperty('fov_rt')){return;}
            camviewGraphic.push({
                geometry: new Polygon({
                    type: 'polygon',
                    rings: [[
                        [parseFloat(feature.geometry.coordinates[0]), parseFloat(feature.geometry.coordinates[1])],
                        [parseFloat(feature.properties.description.fov_rt[0]), parseFloat(feature.properties.description.fov_rt[1])],
                        [parseFloat(feature.properties.description.fov_lft[0]), parseFloat(feature.properties.description.fov_lft[1])],
                        [parseFloat(feature.geometry.coordinates[0]), parseFloat(feature.geometry.coordinates[1])],
                    ]]
                }),
                // select only the attributes you care about
                attributes: {
                    ObjectID: i,
                    name: feature.properties.description.name,
                    id: feature.properties.description.id.toString(),
                }
            });
            i++;
        });
        return camviewGraphic;
    }
    function drawCameraView(feature){
        if (SelectedCams.includes(feature.attributes.id)) {
            SelectedCams.splice(SelectedCams.indexOf(feature.attributes.id), 1);
            SelectedCams_azimuth.splice(SelectedCams.indexOf(feature.attributes.id), 1);
            FireViews.definitionExpression = 'id IN ({})'.format(JSON.stringify(SelectedCams).replace(/\[|\]/g, '').replace(/\"/g, "'"));
        } else {
            SelectedCams.push(feature.attributes.id);
            SelectedCams_azimuth.push(feature.attributes.az_current);
            setCameraDiv(feature.attributes.id);
            FireViews.definitionExpression = 'id IN ({})'.format(JSON.stringify(SelectedCams).replace(/\[|\]/g, '').replace(/\"/g, "'"));
        }
    }
});
