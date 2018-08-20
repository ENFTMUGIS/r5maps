// we create an object to be the 
var mywidget = {
    // 
    divname: "mywidgetdiv",
    default_station: "COKC1,TS445",
    tkn: "3d9b69473d3b4520b9c81ed029ba65f9",
    load:function()
    {
        console.log('loading MesoWest')
        // called when the page is loaded
        if (!window.jQuery) {
            //load jquery, we like it here
            var script = document.createElement("script");
            script.src = 'https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js';
            script.type = 'text/javascript';
            document.getElementsByTagName("head")[0].appendChild(script);
            setTimeout(mywidget.pollJQuery, 100)
            return
        }
        // Getting to this point means that jquery is loaded properly. 
        // so now we can get on with using it. First to get the reference to the 
        // element we created when we started. 
        this.div = $("#"+this.divname);
        // make an API request - using the default station to start. 
        this.request(mywidget.default_station);
    },
    pollJQuery:function()
    {
        /*
        * So, if jquery isn't already there, we need to wait for it to load. There
        * are smarter ways to do this, but with this function we just check, every 100 ms 
        * and see if jQuery is present or not. If not, we try again, if it is, we break out and 
        * call the load function again.
        */
        if (!window.jQuery) {
            setTimeout(mywidget.pollJQuery,100);
        } else {
            mywidget.load();
        }
    },
    request:function(stn) {
        /*
          Here we use the jQuery getJSON method to request data from the API via JSONP. 

          We are able to make a JSONP call because we added the string "callback=?" to the API url.
          After that, we can add the actual API variables on using the object passed as the second input
          to the getJSON function. 

          at the end, we define the funciton "receive" to get called once the data are loaded.
        */
        $.getJSON('http://api.mesowest.net/v2/stations/latest?callback=?',
        {
            // specify the request parameters here
            stid:stn,
            within:1440,
            units:'english',
            token:mywidget.tkn,
            obtimezone:'local'
        }, this.receive);
    },
    receive:function (data) 
    {
        /*
        *  This is called once the data have come back from the API and the data are loaded. 
        *    The data are passed to this function as as JS object. We can now use the object
        *   and jQuery to build the contents of our widget!
        */
        stn1 = data.STATION[0]
        dat1 = stn1.OBSERVATIONS
        stn2 = data.STATION[1]
        dat2 = stn2.OBSERVATIONS
        var weather = document.getElementById("weather")
        var table = document.createElement("table");
        table.setAttribute("id", "weatherTable");
        var tbody = document.createElement("tbody");
        
        var tr = document.createElement("tr"); // creates row
        var th = document.createElement("th"); // creates header cell
        th.innerHTML = "";
        tr.appendChild(th);
        var th = document.createElement("th");
        var a = document.createElement("a");
        a.setAttribute("href", "http://mesowest.utah.edu/cgi-bin/droman/meso_base_dyn.cgi?stn=COKC1");
        a.setAttribute("target", "_blank");
        a.innerHTML = stn1.NAME;
        th.appendChild(a);
        tr.appendChild(th);
        var th = document.createElement("th");
        var th = document.createElement("th");
        var a = document.createElement("a");
        a.setAttribute("href", "http://mesowest.utah.edu/cgi-bin/droman/meso_base_dyn.cgi?stn=TS445");
        a.setAttribute("target", "_blank");
        a.innerHTML = stn2.NAME;
        th.appendChild(a);
        tr.appendChild(th);
        tbody.appendChild(tr);
        
        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.innerHTML = "Air Temp";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat1.air_temp_value_1.value + "&deg;F";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat2.air_temp_value_1.value + "&deg;F";
        tr.appendChild(td);
        tbody.appendChild(tr);

        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.innerHTML = "Wind Speed";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat1.wind_speed_value_1.value + " mph";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat2.wind_speed_value_1.value + " mph";
        tr.appendChild(td);
        tbody.appendChild(tr);

        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.innerHTML = "Wind Direction";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat1.wind_cardinal_direction_value_1d.value;
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat2.wind_cardinal_direction_value_1d.value;
        tr.appendChild(td);
        tbody.appendChild(tr);

        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.innerHTML = "Wind Gust";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat1.wind_gust_value_1.value + " mph";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat2.wind_gust_value_1.value + " mph";
        tr.appendChild(td);
        tbody.appendChild(tr);
        
        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.innerHTML = "Dew Point";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat1.dew_point_temperature_value_1d.value + "&deg;F";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat2.dew_point_temperature_value_1d.value + "&deg;F";
        tr.appendChild(td);
        tbody.appendChild(tr);
        
        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.innerHTML = "Relative Humidity";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat1.relative_humidity_value_1.value + "%";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat2.relative_humidity_value_1.value + "%";
        tr.appendChild(td);
        tbody.appendChild(tr);

        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.appendChild(document.createTextNode("Solar Radiation"));
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat1.solar_radiation_value_1.value + " W/m<sup>2</sup>";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat2.solar_radiation_value_1.value + " W/m<sup>2</sup>";
        tr.appendChild(td);
        tbody.appendChild(tr);

        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.innerHTML = "Fuel Temp";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = "--";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat2.fuel_temp_value_1.value + "&deg;F";
        tr.appendChild(td);
        tbody.appendChild(tr);

        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.innerHTML = "Fuel Moisture";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = "--";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat2.fuel_moisture_value_1.value + " gm";
        tr.appendChild(td);
        tbody.appendChild(tr);

        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.innerHTML = "Precip Accumulation";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat1.precip_accum_value_1.value + " in";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.innerHTML = dat2.precip_accum_value_1.value + " in";
        tr.appendChild(td);
        tbody.appendChild(tr);

        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.innerHTML = "Time";
        tr.appendChild(td);
        var td = document.createElement("td");
        td.setAttribute("id", "date_time1")
        var time_slice = dat1.air_temp_value_1.date_time.indexOf('T') + 1 // parse datetime
        td.innerHTML = dat1.air_temp_value_1.date_time.slice(time_slice, time_slice + 8);
        tr.appendChild(td);
        var td = document.createElement("td");
        td.setAttribute("id", "date_time2")
        var time_slice = dat2.air_temp_value_1.date_time.indexOf('T') + 1 // parse datetime
        td.innerHTML = dat2.air_temp_value_1.date_time.slice(time_slice, time_slice + 8);
        tr.appendChild(td);
        tbody.appendChild(tr);
        table.appendChild(tbody)
        weather.appendChild(table);


    },
}

// and this is how we place the widget at the location that this script is placed. 
//document.write('<div id="'+mywidget.divname+'" class="table" style="width:auto;padding:10px;"></div>');

window.onload = mywidget.load();