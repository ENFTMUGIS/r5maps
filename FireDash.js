String.prototype.format = function () {
  var i = 0, args = arguments;
  return this.replace(/{}/g, function () {
    return typeof args[i] != 'undefined' ? args[i++] : '';
  });
};
var map, FireCams, FireViews, camGeoJSON, viewGeoJSON,
    SelectedCams = getFireDashCookie(),
    SelectedCams = ['Axis-Leek', 'Axis-Melissa', 'Axis-BigHill'],
    SelectedCams_azimuth = [0, 0, 0]
    generator = CameraGenerator(),
    USGSTopo_url = 'https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSTopo/MapServer',
    WorldImage_url = 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer',
    FSTopo_url = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_FSTopo_01/MapServer',
    FSAdmin_url = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer',
    FSTrail_url = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublishForSync_01/FeatureServer/0',
    FSRoad_url = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RoadBasicForSync_01/FeatureServer/2',
    FSRec_url = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RecreationSitesOpenForSync_01/FeatureServer/0',
    FireZone_url = 'https://nowcoast.noaa.gov/arcgis/services/nowcoast/forecast_meteoceanhydro_pts_zones_geolinks/MapServer/WmsServer',
    Geomac_url = 'https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_dyn/MapServer',
    WFAS_url = "https://www.wfas.net/cgi-bin/mapserv?map=/var/www/html/nfdr/mapfiles/ndfd_geog5.map&",
    Nexrad_url = 'https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer',
    SurfaceObservation_url = 'https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/obs_meteocean_insitu_sfc_time/MapServer',
    Smoke_url = 'https://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/ndgd_smoke_sfc_1hr_avg_time/ImageServer/WMSServer?',
    NasaGibs_url = 'https://gibs-{s}.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{time}/{tileMatrixSet}/{z}/{y}/{x}.jpg',
    //FireCam_url = 'http://firecams.seismo.unr.edu/firecams/proxy/getptz?get=1',
    FireCam_url = 'https://firemap.sdsc.edu:5443/stations?selection=boundingBox&minLat=32.5121&minLon=-124.6509&maxLat=49&maxLon=-114.1315',
    FireCamImage = "http://api.nvseismolab.org/vulcan/v0/camera/{}/image",
    USGS_elevationQuery_url = 'https://nationalmap.gov/epqs/pqs.php?x={}&y={}&units=Feet&output=json',
    queryURLs = {
        Name: {
            Road: FSRoad_url + "/query?where=SECURITY_ID = '{}' AND NAME LIKE '%{}%'&outFields=OBJECTID,ID,NAME,OPER_MAINT_LEVEL,SURFACE_TYPE&returnGeometry=false&f=geojson",
            Trail: FSTrail_url + "/query?where=SECURITY_ID = '{}' AND TRAIL_NAME LIKE '%{}%'&outFields=OBJECTID,TRAIL_NO,TRAIL_NAME&returnGeometry=false&f=geojson",
            Recreation: FSRec_url + "/query?where=SECURITY_ID = '{}' AND SITE_NAME LIKE '%{}%'&outFields=OBJECTID,SITE_NAME&returnGeometry=false&f=geojson",
            Waterbody:""},
        ID: {
            Road: FSRoad_url + "/query?where=SECURITY_ID = '{}' AND ID LIKE '%{}%'&outFields=OBJECTID,ID,NAME,OPER_MAINT_LEVEL,SURFACE_TYPE&returnGeometry=false&f=geojson",
            Trail: FSTrail_url + "/query?where=SECURITY_ID = '{}' AND TRAIL_NO LIKE '%{}%'&outFields=OBJECTID,TRAIL_NO,TRAIL_NAME&returnGeometry=false&f=geojson"},
        OID: {
            Road: FSRoad_url + "/query?where=OBJECTID={}&outFields=OBJECTID,ID,NAME,OPER_MAINT_LEVEL,SURFACE_TYPE&returnGeometry=true&f=geojson",
            Trail: FSTrail_url + "/query?where=OBJECTID={}&outFields=OBJECTID,TRAIL_NO,TRAIL_NAME&returnGeometry=true&f=geojson",
            Recreation: FSRec_url + "/query?where=OBJECTID={}&outFields=OBJECTID,SITE_NAME,SITE_TYPE,OWNERSHIP,OPERATOR&returnGeometry=true&f=geojson",
            Waterbody:""}
        };
    
function FlyTo(latlng, number){map.flyTo(latlng, number)}
function toDDM(coord){
    // Convert coordinates to DDM for map popup    
    this.convert = function(_coord){
        _coord = Math.abs(_coord)
        var degrees = Math.floor(_coord)
        var minutes = (_coord - degrees ) * 60
        return degrees + '&deg; ' + minutes.toFixed(3) + "'";
    }
    this.lat = this.convert(coord.lat) + (coord.lat > 0 ? ' N' : ' S');
    this.lng = this.convert(coord.lng) + (coord.lng > 0 ? ' E' : ' W');
}
function refreshCam(){
    // Re-load the camera geoJSON source and refresh the view images
    loadGeoJSON()
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
            if (camGeoJSON === undefined){continue}
            document.getElementById('compass' + c).style.transform = "translate(-50%, -50%) rotateX(65deg) rotateZ(-{}deg)".format(SelectedCams_azimuth[index]);
        }
    }
}
var getField = {
    ID: {Road:'ID', Trail:'TRAIL_NO', Recreation:'SITE_NAME'},
    Name: {Road:'NAME', Trail:'TRAIL_NAME', Recreation:'SITE_NAME'},
    geometry: {Road:'polyline', Trail:'polyline', Recreation:'point'}
}
function ajaxQuery(url, layer, field){
    // Query feature services
    return $.ajax({
        url: encodeURI(url),
        dataType: 'JSON',
        jsonpCallback: 'callback',
        type: 'GET',
        success: function(prelimQuery){
            var table = document.getElementById('search-table');
            $.each(prelimQuery.features, function(index, value){
                var row = table.insertRow(-1);
                var a = row.insertCell(0);
                a.innerHTML = value.properties[getField[field][layer]];
                a.setAttribute('onclick', "featureQuery('{}', {})".format(layer, value.properties.OBJECTID))
                a.setAttribute('style','width:85%')
                var b = row.insertCell(1);
                b.innerHTML = layer;
                b.setAttribute('onclick', "featureQuery('{}', {})".format(layer, value.properties.OBJECTID))
                b.setAttribute('style', 'font-size:70%;font-style:italic;width:15%')
                b.setAttribute('align', 'right')
            })
            $('#search-status').html(function(index, currentHTML){
                var count = isNaN(currentHTML[0]) ? prelimQuery.features.length : parseInt(currentHTML) + prelimQuery.features.length;
                return count + ' features found';
            })

        }
    });
}
function layerQuery(security_id, text){
    $('#search-status').html('Searching...');
    $("#search-table tr").remove(); 
    var field = isNaN(text[0]) ? 'Name': 'ID';
    for (var q in queryURLs[field]){
        ajaxQuery(queryURLs[field][q].format(security_id, text.toUpperCase(), 'false'), q, field)
    }
}
function featureQuery(layer, OID){
    $("#search-table tr").remove(); 
    // get the feature that is clicked, highlight, and zoom to
    var url = queryURLs.OID[layer].format(OID)
    $.ajax({
        url: encodeURI(url),
        dataType: 'JSON',
        jsonpCallback: 'callback',
        type: 'GET',
        success: function(query_result){
            // remove the last query
            map.eachLayer(function (lyr) {
                if (lyr.options.id === 'QueryLayer'){
                    lyr.remove();
                }
            });
            switch(layer){
                case 'Road':
                    var style =  {
                            weight: 5,
                            color: '#00FFFF',
                            opacity: 1,
                        };
                    var popup = function(layer){
                        return '<b>'+ layer.feature.properties.ID +' | '+ layer.feature.properties.NAME +'</b><br>'+ 
                        layer.feature.properties.OPER_MAINT_LEVEL +'<br>'+ layer.feature.properties.SURFACE_TYPE;
                    }
                    break;
                    var pointToLayer = undefined;
                case 'Trail':
                    var style =  {
                            weight: 5,
                            color: '#00FFFF',
                            opacity: 1,
                        };
                    var popup = function(layer){
                        return '<b>'+ layer.feature.properties.TRAIL_NO +' | '+ layer.feature.properties.TRAIL_NAME+'</b>';
                    }
                    break;
                    var pointToLayer = undefined;
                case 'Recreation':
                    var style =  undefined;
                    var pointToLayer = function(geoJsonPoint, latlng){
                        return L.circleMarker(latlng, {radius:10, color:'#00FFFF', fill:false});
                    }
                    var popup = function(layer){
                        return '<b>'+ layer.feature.properties.SITE_NAME +'</b><br>'+ layer.feature.properties.SITE_TYPE +
                        '<br>'+ layer.feature.properties.OPERATOR;
                    }
                    break;
            }
            var QueryLayer = L.geoJSON(query_result, {
                id: 'QueryLayer',
                style: style,
                pointToLayer: pointToLayer,
                zIndex: 6,
            }).bindPopup(popup);
            map.flyToBounds(QueryLayer.getBounds());
            QueryLayer.addTo(map);
            QueryLayer.openPopup();
        }
    })
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
    })
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
                    console.log(this)
                    this.style.height = '0px';
                    this.children[0].style.height = '0px';
                }
            })
        })       
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
// Map
$(function() {
    refreshCam(); // refresh off the start
    
    var ESRITopo = L.esri.basemapLayer("Topographic");
    var USGSTopo = L.esri.tiledMapLayer({
        url: USGSTopo_url,
        id: 'USGSTopo',
        //maxZoom: 15,
        zIndex: 1
    });
    var WorldImage = L.esri.dynamicMapLayer({
        url: WorldImage_url,
        id: 'WorldImage',
        minZoom: 15,
        zIndex: 1
    });
    var FSAdmin = L.esri.dynamicMapLayer({
        url: FSAdmin_url,
        id: 'FSAdmin',
        //maxZoom: 12,
        zIndex: 2
    });
    var FSWilderness = L.esri.dynamicMapLayer({
        url: 'https://apps.fs.usda.gov/arcx/rest/services/wo_nfs_gstc/GSTC_IVMReference_01/MapServer',
        id: 'FSWilderness',
        //minZoom: 11,
        layers: [6],
        zIndex: 2,
        opacity: 0.6,
    });
    var FSCarto = L.esri.dynamicMapLayer({
        url: 'https://apps.fs.usda.gov/arcx/rest/services/wo_nfs_gstc/GSTC_IVMCartography_01/MapServer',
        id: 'FSCarto',
        minZoom: 12,
        layers: [2, 3, 4, 5, 6],
        zIndex: 2,
    });
    var FSOwner = L.esri.dynamicMapLayer({
        url: 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_BasicOwnership_02/MapServer',
        id: 'FSOwner',
        minZoom: 11,
        dynamicLayers: [{
            "id": 1,
            "source": {
                "type": "mapLayer",
                "mapLayerId": 0
            },
            "definitionExpression": "OWNERCLASSIFICATION IN ('NON-FS', 'UNPARTITIONED RIPARIAN INTEREST')",
            "transparent": true,
            "drawingInfo": {
                "renderer": {
                    "type": "simple",
                    "symbol": {
                        "type": "esriSFS",
                        "style": "esriSFSSolid",
                        "color": [100, 100, 100, 255],
                        "outline": {
                            "type": "esriSLS",
                            "style": "esriSLSSolid",
                            "color": [200, 200, 200, 200],
                            "width": 0.5
                        }
                    }
                },
                "transparency": 70,
                "scaleSymbols": true,
                "showLabels": false,
                // get road labels from here:
                // https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RoadBasic_01/MapServer/0
            }
        }],
        layers: [1],
        opacity: 0.5,
        zIndex: 2
    });
    var FSTrails = L.esri.featureLayer({
        url: FSTrail_url,
        id: 'FSTrails',
        minZoom: 12,
        zIndex: 2,
        ignoreRenderer: true,
    })
    .setStyle({opacity: 0, weight: 2})
    .bindPopup(function(layer){
        return '<b>'+ layer.feature.properties.TRAIL_NO +' | '+ layer.feature.properties.TRAIL_NAME+'</b>';
    });
    var FSRoads = L.esri.featureLayer({
        url: FSRoad_url,
        id: 'FSRoads',
        minZoom: 12,
        zIndex: 2,
        ignoreRenderer: true,
    })
    .setStyle({opacity: 0, weight: 4})
    .bindPopup(function(layer){
        if (['ADMIN', null].includes(layer.feature.properties.OPENFORUSETO)){
            return '<b>'+ layer.feature.properties.ID +' | '+ layer.feature.properties.NAME +'</b><i> (closed)</i>'; 
        } else{
            return '<b>'+ layer.feature.properties.ID +' | '+ layer.feature.properties.NAME +'</b>';}
    });
    var FSRec = L.esri.featureLayer({
        url: FSRec_url,
        id: 'FSRec',
        minZoom: 12,
        zIndex: 3
    })
    .bindPopup(function(layer){
        return '<b>'+ layer.feature.properties.SITE_NAME +'</b><br>'+ layer.feature.properties.SITE_TYPE +
                        '<br>'+ layer.feature.properties.OPERATOR;
    });
    var Custom_FSTopo = L.layerGroup([FSWilderness, FSOwner, FSAdmin, FSCarto, FSRec, FSTrails, FSRoads])
    var FSTopo = L.esri.dynamicMapLayer({
        url: FSTopo_url,
        id: 'FSTopo',
        transparent: true,
        zIndex: 2
    });
    var USGSContour = L.tileLayer.wms(
        'https://elevation.nationalmap.gov/arcgis/services/3DEPElevation/ImageServer/WMSServer?',
        {id: 'USGSContour',
        layers: ['Contour 25'],
        format: 'image/png',
        transparent: true,
        zIndex: 2
    })
    var TFRs = L.tileLayer.wms(
        'https://sua.faa.gov/geoserver/wms?',{     
        id: 'TFRs',
        layers: 'SUA:schedule',
        format:'image/png', 
        CQL_FILTER: "type_class='TFR'", 
        transparent: true,
        zIndex: 3
    });
    var FireZone = L.tileLayer.wms(
        FireZone_url,{
        id: 'FireZone',
        layers: [8],
        format:'image/png', 
        transparent: true,
        zIndex: 3
    });
    var DPA = L.esri.dynamicMapLayer({
        url: 'http://egis.fire.ca.gov/arcgis/rest/services/FRAP/DPA/MapServer',
        id: 'DPA',
        layers: [0],
        opacity: 0.6,
        zIndex: 4
    })
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
        zIndex: 100
    });
    // Leaflet initialize map
    map = L.map('map', {
        center: [38.85, -120.45,],
        zoom: 9,
        crs: L.CRS.EPSG3857,
        maxBounds: [
            [-120, -220],
            [120, 220]
        ],
        fadeAnimation: false,
        layers: [ESRITopo, WorldImage, Custom_FSTopo, GeoMac],
        maxZoom: 20
    });
    // Map popup
    map.on('click', function(e){
        console.log(e.latlng)
        $.getJSON(USGS_elevationQuery_url.format(e.latlng.lng, e.latlng.lat), 
            function(data){
                var ddm = new toDDM(e.latlng)
                var elevation = data.USGS_Elevation_Point_Query_Service.Elevation_Query;
                map.openPopup('{}<br>{}<br>{} {}'.format(ddm.lat, 
                                                         ddm.lng, 
                                                         elevation.Elevation.toFixed(), 
                                                         elevation.Units), e.latlng);
            }
        )
    })
    // Layer controls
    var basemaps = {
        'ESRI Topo': ESRITopo,
        'USGS Topo': USGSTopo,
        'FS Topo': FSTopo,
    };
    var overlays = {
        'World Imagery': WorldImage,
        'FS Layers': Custom_FSTopo,
        'Fuel Type': FuelType,
        'Fire Zones': FireZone,
        'DPA': DPA,
        'Surface Smoke': Smoke,
        'Nexrad Radar': Nexrad,
        'Fire Incidents': GeoMac,
        'NWS Stations': SurfaceObservation,
        'TFRs': TFRs
    };
    var LayerControl = L.control.layers(basemaps, overlays, {
        position: 'topleft',
        sortLayers: false
    }).addTo(map);
    // Custom control
    L.Control.Forest = L.Control.extend({
        options: {
            position: 'topleft',
        },
        initialize: function(options) {
            L.Util.setOptions(this, options);
        },
        onAdd: function (map) {
            var div = L.DomUtil.create('div');
            var select = L.DomUtil.create('select', 'custom-control', div);
            select.id = 'forest';
            select.title = 'Forest';
            for (var code in this._forestCodes){
                var option = L.DomUtil.create('option', null, select);
                option.value = code;
                option.title = this._forestCodes[code][0];
                option.innerHTML = this._forestCodes[code][1];
                if (code === '0503'){ option.selected = 'selected'};
            }
            // make sure map doesn't register click event
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            // event to fly to forest
            L.DomEvent.on(select, 'change', function(e){
                var query_url = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundariesForSync_01/FeatureServer/1/query?where=FORESTORGCODE%3D%27{}%27&returnGeometry=true&returnExtentOnly=true&f=geojson';
                $.ajax({
                    url: query_url.format(select.value),
                    dataType: 'JSON',
                    jsonpCallback: 'callback',
                    type: 'GET',
                    success: function(query_result){
                        map.flyToBounds([
                            [query_result.bbox[1], query_result.bbox[0]],
                            [query_result.bbox[3], query_result.bbox[2]],
                        ]);
                    }
                })
            })

            return div;
        },
        _forestCodes: {
            '0501': ['Angeles', 'ANF'],
            '0502': ['Cleveland', 'CNF'],
            '0503': ['Eldorado', 'ENF'],
            '0504': ['Inyo', 'INF'],
            '0505': ['Klamath', 'KNF'],
            '0506': ['Lassen', 'LNF'],
            '0507': ['Los Padres', 'LPF'],
            '0508': ['Mendocino', 'MNF'],
            '0509': ['Modoc', 'MDF'],
            '0510': ['Six Rivers', 'SRF'],
            '0511': ['Plumas', 'PNF'],
            '0512': ['San Bernardino', 'BDF'],
            '0513': ['Sequoia', 'SQF'],
            '0514': ['Shasta-Trinity', 'SHF'],
            '0515': ['Sierra', 'SNF'],
            '0516': ['Stanislaus', 'STF'],
            '0517': ['Tahoe', 'TNF'],
            '0519': ['Lake Tahoe Basin Mgmt Unit', 'TMU']
        }
    });
    L.Control.forest = function(options) {
        return new L.Control.Forest(options);
    };
    L.Control.forest().addTo(map);      // Layer Search
    var searchControl = L.esri.Geocoding.geosearch({
        title: 'Location Search',
        placeholder: 'Search FS locations within map bounds',
        position: 'topleft',
        expanded: false,
        zoomToResult: false,
        useMapBounds: true,
        providers: [
            L.esri.Geocoding.featureLayerProvider({
                url: FSRoad_url,
                searchFields: ['ID', 'NAME'],
                label: 'Roads',
                formatSuggestion: function(feature){
                    return feature.properties.ID + ' | ' + feature.properties.NAME;
                }
            }),//.orderBy('NAME', 'ASC'),
            L.esri.Geocoding.featureLayerProvider({
                url: FSTrail_url,
                searchFields: ['TRAIL_NO', 'TRAIL_NAME'],
                label: 'Trails',
                formatSuggestion: function(feature){
                    return feature.properties.TRAIL_NO + ' | ' + feature.properties.TRAIL_NAME;
                }
            }),
            L.esri.Geocoding.featureLayerProvider({
                url: FSRec_url,
                searchFields: ['SITE_NAME'],
                label: 'Recreation',
            }),
            L.esri.Geocoding.featureLayerProvider({
                url: 'https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/1',
                searchFields: ['gaz_name'],
                label: 'Landforms',
            }),
            L.esri.Geocoding.featureLayerProvider({
                url: 'https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/2',
                searchFields: ['gaz_name'],
                label: 'Streams',
            }),
            L.esri.Geocoding.featureLayerProvider({
                url: 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_NHDForSync_01/MapServer/9',
                searchFields: ['GNIS_NAME'],
                label: 'Waterbodies',
            }),
            L.esri.Geocoding.featureLayerProvider({
                url: 'https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/13',
                searchFields: ['gaz_name'],
                label: 'Locales',
            }),
            L.esri.Geocoding.featureLayerProvider({
                url: 'https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/18',
                searchFields: ['gaz_name'],
                label: 'Populated Places',
            }),
        ]
    }).addTo(map);
    searchControl.on('results', function(e){
        var latlng = [e.latlng.lat, e.latlng.lng]
        L.popup()
            .setLatLng(e.latlng)
            .setContent("<a title= 'Zoom To' style='cursor:pointer;' onClick='FlyTo([{}], 15)'>{}</a>".format(latlng, e.text))
            .openOn(map);
    });
  
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
            pane: 'mapPane',
            maxNativeZoom: 9,
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

// Get the Fire Cams
function loadGeoJSON(){
    $.ajax({
        url: FireCam_url,
        cache: false,
        dataType: 'JSONP',
        jsonpCallback: 'callback',
        type: 'GET',
        success: function(data){ // filter out all non-camera sites
            data.features = data.features.filter(function(i){
                return i.properties.hasOwnProperty('latest-images')
            })
            // set the azimuth for the compass array
            for (var i in data.features){
                if (SelectedCams.includes(data.features[i].properties.description.id)){
                    SelectedCams_azimuth[SelectedCams.indexOf(data.features[i].properties.description.id)] = data.features[i].properties.description.az_current
                }
            }
        }
    })
    .then(function(GeoJSON) {
        var GeoJSON_view = $.extend(true, {}, GeoJSON)
        GeoJSON_view.features.map(function(feature, i){
                if (!feature.properties.description.hasOwnProperty('fov_rt')){
                    return
                }
                var coords = [[
                    [parseFloat(feature.geometry.coordinates[0]), parseFloat(feature.geometry.coordinates[1])],
                    [parseFloat(feature.properties.description.fov_rt[0]), parseFloat(feature.properties.description.fov_rt[1])],
                    [parseFloat(feature.properties.description.fov_lft[0]), parseFloat(feature.properties.description.fov_lft[1])],
                    [parseFloat(feature.geometry.coordinates[0]), parseFloat(feature.geometry.coordinates[1])],
                ]];
                feature.geometry = {
                    'type': 'Polygon',
                    'coordinates': coords
                };
            return feature
        });
        return [GeoJSON, GeoJSON_view]
    })
    .then(function([GeoJSON_cam, GeoJSON_view]) {
        camGeoJSON = GeoJSON_cam; // moidfy the global
        viewGeoJSON = GeoJSON_view; // modify the global
        if (FireViews) {map.removeLayer(FireViews)};
        FireViews = L.geoJSON(GeoJSON_view, {
            id: 'FireViews',
            style:  {
                weight: 2,
                color: '#bac3cb',
                opacity: 1,
                fillColor: "#778899",
                fillOpacity: 0.3
            },
            pane: 'mapPane',
            zIndex: 3,
            filter: function(feature, layer){
                return SelectedCams.includes(feature.properties.description.id)
            }
        }).addTo(map);
        if (FireCams) {map.removeLayer(FireCams)}
        FireCams = L.geoJSON(GeoJSON_cam, {
            id: 'FireCams',
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, {
                    icon: new L.Icon({
                        iconUrl: './lib/if_arrow-circle-up_1608521.svg',
                        iconSize: 15
                    }),
                    rotationAngle: parseFloat(feature.properties.description.az_current),
                    rotationOrigin: 'center',
                });
            },
            zIndex: 6
        }).bindTooltip(function(e){return e.feature.properties.description.id}).addTo(map);
        FireCams.on('click', function(f){
            var id = f.layer.feature.properties.description.id;
            map.removeLayer(FireViews);
            if (SelectedCams.includes(id)) {
                SelectedCams.splice(SelectedCams.indexOf(id), 1);
                SelectedCams_azimuth.splice(SelectedCams.indexOf(id), 1)
            } else {
                SelectedCams.push(id);
                SelectedCams_azimuth.push(f.layer.feature.properties.description.az_current)
                setCameraDiv(id);
            }
            reloadCamViews();
            console.log(JSON.stringify(SelectedCams));
            document.cookie = 'FireDash='+SelectedCams.join('|');
        });
        return camGeoJSON;
    })
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
            pane: 'mapPane',
            zIndex: 3,
            filter: function(feature, layer){
                return SelectedCams.includes(feature.properties.description.id)
            }
        });
        map.addLayer(FireViews);
        map.removeLayer(FireCams);
        map.addLayer(FireCams);
    };
}   
