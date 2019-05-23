// JavaScript Document


// The Map
var map;

// Google JavaScript-API, service to request routes
var directionsService = new google.maps.DirectionsService;

// Start & End Locations
var startLoc = [];
var endLoc = [];
startLoc[0] = "Kiel";
endLoc[0] = "Laboe";
startLoc[1] = "Laboe";
endLoc[1] = "Kiel Gaarden";
startLoc[2] = "Kiel Gaarden";
endLoc[2] = "Flintbek";

joggingRoute = [];
joggingRoute[0] = 0;
joggingRoute[1] = 1;
joggingRoute[2] = 2;

// Polylines
var Polylines = [];
var PolylinesData = [];
var PolylineCluster = [];
var PolylineClusterMarkers = [];
var Starts = [];
var Ends = [];
var TimerHandle = [];
var ActiveHandle = [];

// ClusterMarkers
var InteractableClusterMarkers = [];
var ActiveMarker;
var ActiveMarkerName;
var redicon = {
    url: "img/red.png"
};
var blueicon = {
    url: "img/blue.png"
};



/**** Device Ready (Start) ****************************************************************************************************/

document.addEventListener("deviceready", function() {


    /**** InteractableClusterMarker ***********************************************************************************************/

    // Constructor
    function InteractableClusterMarker(marker, mvcArray, index) {
        plugin.google.maps.BaseClass.apply(this);
        this.set('mvcArray', mvcArray);
        this.set('index', index);
        this.set('marker', marker);
        marker.set('parent', this);
        marker.setDraggable(true);
        // marker.setDisableAutoPan(true);
        this.set('LenghtBeforePoint', 0);
        this.set('LenghtBehindPoint', 0);
        this.set('pointsaround', new InteractableClusterMarkerPointsToAdd(marker));
		this.set('infowindow', new InteractableClusterMarkerInfoWindow(this));
        this.addEvents();
    }
    InteractableClusterMarker.prototype = new plugin.google.maps.BaseClass();

    // Add Events
    InteractableClusterMarker.prototype.addEvents = function () {
        var marker = this.get('marker');
        marker.addEventListener("isactive_changed", this.isActiveChanged);
        marker.addEventListener(plugin.google.maps.event.MARKER_CLICK, this.onMarkerClick);
        marker.addEventListener(plugin.google.maps.event.removeEventListener, this.onRemove);
    };
    // Marker Click (position)
    InteractableClusterMarker.prototype.onMarkerClick = function () {
        this.get("parent").setMarkerActive();
    };
    // Remove Event
    InteractableClusterMarker.prototype.onRemove = function () {
        console.log("---- !!! WARNING !!! --- Marker Is Removed ----");
    };
    // Set as Active Marker
    InteractableClusterMarker.prototype.setMarkerActive = function() {
		var marker = this.get('marker');
        if (marker != null && marker.getMap() != null && marker.isVisible())
        {
            if (ActiveMarker != null && ActiveMarker != marker) {
                ActiveMarker.set("isactive", false);
            }

            ActiveMarker = marker;
            ActiveMarkerName = marker.get("name");
            if (!marker.get("isactive")) { marker.set("isactive", true); }
        }
        else console.log("could not set marker active");
    };
    // Activ Change Listener
    InteractableClusterMarker.prototype.isActiveChanged = function () {
        console.log("Active Changed...");
        if (this != null && this.getMap() != null && this.isVisible) {
            console.log("changing markers active state...");
            var isactive = this.get("isactive");
            var parent = this.get("parent");
            if (isactive) {
                //parent.setPolysAtPoint();
                this.set("loopfading", true);
                parent.fadeOut(parent);
                this.setDraggable(true);
                this.setZIndex(2);
                this.setIcon(redicon);
                this.addEventListener(plugin.google.maps.event.MARKER_CLICK, parent.openInfoWindow);
                this.addEventListener(plugin.google.maps.event.MARKER_DRAG_START, parent.onMarkerDragStart);
                this.addEventListener(plugin.google.maps.event.MARKER_DRAG_END, parent.onMarkerDragEnd);
                this.addEventListener(plugin.google.maps.event.MARKER_DRAG, parent.onMarkerDrag);
                console.log("activated marker");
            } else {
                this.setDraggable(false);
                this.setZIndex(1);
                this.setIcon(blueicon);
                this.removeEventListener(plugin.google.maps.event.MARKER_CLICK, parent.openInfoWindow);
                this.removeEventListener(plugin.google.maps.event.MARKER_DRAG_START, parent.onMarkerDragStart);
                this.removeEventListener(plugin.google.maps.event.MARKER_DRAG_END, parent.onMarkerDragEnd);
                this.removeEventListener(plugin.google.maps.event.MARKER_DRAG, parent.onMarkerDrag);
                console.log("marker is deactivated");
            }
        }
    };
    // Drag Start
    InteractableClusterMarker.prototype.onMarkerDragStart = function(position) {
        this.get("parent").get("mvcArray").setAt(this.get("name"), position);
    };
    // Drag End
    InteractableClusterMarker.prototype.onMarkerDragEnd = function(position) {
        var parent = this.get("parent");
        var index = parent.get("index");
        var name = this.get("name");
        parent.get("mvcArray").setAt(name, position);
        // this.set("isactive", false);
        this.setPosition(position);
        Polylines[index].points[name] = position; // evtl unnötig wegen mvc array?
        PolylinesData[index].points[name] = position;

        setTimeout(function () {
            var leng = CalculateRoutesLength();
            ShowRoutesLength(leng);
        }, 25);
    };
    // Dragging
    InteractableClusterMarker.prototype.onMarkerDrag = function(position) {
        var name = this.get("name");
        var parent = this.get("parent");
        //var index = parent.get("index");		
        parent.get("mvcArray").setAt(name, position);
        // PolylinesData[index].points[name] = position;
        // UpdatePolylineLength(index, name)
        // parent.updatePolylength();
    };
    // Update Polylength
    InteractableClusterMarker.prototype.updatePolylength = function() {
        var index = this.get("index");
        var name = this.get('marker').get("name");
        var PolyAtPoint = PolylinesData[index].points.slice(name - 1, name + 2);
        var LengthAtPoint = plugin.google.maps.geometry.spherical.computeLength(PolyAtPoint);
        var length = this.get("LenghtBeforePoint") + LengthAtPoint + this.get("LenghtBehindPoint");
        var km = Math.floor(length / 1000);
        var m = Math.floor(length - km * 1000);
        //document.getElementById("Length").innerHTML = "<input type=\"text\" size=\"7\" value=\"" + km + " km - " + m + " m\">";
    };
    // Get PolyLengths of parts before/after Point
    InteractableClusterMarker.prototype.setPolysAtPoint = function() {
        var index = this.get("index");
        var name = this.get('marker').get("name");
        var PolyBeforePoint = PolylinesData[index].points.slice(0, name);
        var LengthPolyBeforePoint = plugin.google.maps.geometry.spherical.computeLength(PolyBeforePoint);
        this.set("LenghtBeforePoint", LengthPolyBeforePoint);
        var PolyBehindPoint = PolylinesData[index].points.slice(name + 1);
        var LengthPolyBehindPoint = plugin.google.maps.geometry.spherical.computeLength(PolyBehindPoint);
        this.set("LenghtBehindPoint", LengthPolyBehindPoint);
        // alert(LengthPolyBeforePoint + " - " + LengthPolyBehindPoint);
    };
    // Open InfoWindow
    InteractableClusterMarker.prototype.openInfoWindow = function() {
        this.get("htmlinfowindow").open(this);
    };
	
    InteractableClusterMarker.prototype.fadeOut = function (parent) {
        var marker = parent.get('marker');
        if (MarkerIsInCameraBounds(marker))
        {
            //console.log("marker is in camera bounds");  
            if (marker != null && marker.getMap() != null && marker.isVisible() && PolylineCluster[marker.get("parent").get("index")].get("zoom").toFixed(0) >= 15) {
                if (marker.get("isactive")) {
                    opa = marker.getOpacity() - 0.1;
                    if (opa > 0.1) { marker.setOpacity(opa); parent.set("fadefunction", setTimeout(function () { parent.fadeOut(parent); }, 100)); }
                    else if (marker.get("loopfading")) {
                        parent.set("fadefunction", setTimeout(function () { parent.fadeIn(parent); }, 100));
                    }
                }
                else if (marker.getOpacity() < 1) {
                    marker.setOpacity(1);
                }
            }
            //else console.log("InteractableClusterMarker fadeOut error");
        }
        //else console.log("marker is NOT in camera bounds");
    };
    InteractableClusterMarker.prototype.fadeIn = function (parent) {
        //console.log("marker trys fade in...");
        var marker = parent.get('marker');
        if (MarkerIsInCameraBounds(marker))   
        {
            //console.log("marker is in camera bounds");   
            if (marker != null && marker.getMap() != null && marker.isVisible() && PolylineCluster[marker.get("parent").get("index")] != null && PolylineCluster[marker.get("parent").get("index")].get("zoom").toFixed(0) >= 15) {
                if (marker.get("isactive")) {
                    opa = marker.getOpacity() + 0.1;
                    if (opa < 1) { marker.setOpacity(opa); parent.set("fadefunction", setTimeout(function () { parent.fadeIn(parent); }, 100)); }
                    else if (marker.get("loopfading")) {
                        parent.set("fadefunction", setTimeout(function () { parent.fadeOut(parent); }, 100));
                        //console.log("marker faded in... waiting for next step");
                    }
                }
                else if (marker.getOpacity() < 1) {
                    marker.setOpacity(1);
                }
            }
            //else console.log("InteractableClusterMarker fadeIn error");
        }
        //else console.log("marker is NOT in camera bounds");
    };   
	/******************************************************************************************************************************/


    /**** InfoWindow of InteractableClusterMarker *********************************************************************************/

    // Constructor
    function InteractableClusterMarkerInfoWindow(InteractableClusterMarker) {

        var htmlmarker = InteractableClusterMarker.get("marker");
        var htmlInfoWindow = new plugin.google.maps.HtmlInfoWindow();

        var contents = document.createElement("div");
        contents.setAttribute("style", "text-align:center; margin-right:-10px;");
        /*
        var CloseWindow = document.createElement("button");
        CloseWindow.appendChild(document.createTextNode("x"));
        contents.appendChild(CloseWindow);
        contents.appendChild(document.createElement("br"));
        CloseWindow.addEventListener("click", function() {
            htmlInfoWindow.close();
        });

        contents.appendChild(document.createTextNode("Route: " + InteractableClusterMarker.get("index")));
        contents.appendChild(document.createElement("br"));
        contents.appendChild(document.createTextNode("Point: " + htmlmarker.get("name")));
        contents.appendChild(document.createElement("br"));

        var AddPoint = document.createElement("button");
        AddPoint.appendChild(document.createTextNode("+"));
        contents.appendChild(AddPoint);
        AddPoint.addEventListener("click", function() {
            //htmlInfoWindow.setBackgroundColor("#aaffaa");
            htmlInfoWindow.close();
            //AddPointBehindMarker(InteractableClusterMarker.get("index"), htmlmarker.get("name"));

            AddRoute(InteractableClusterMarker.get('index'), startLoc[InteractableClusterMarker.get('index')], InteractableClusterMarker.get('marker').getPosition().lat + "," + InteractableClusterMarker.get('marker').getPosition().lng);
        });

        var RemovePoint = document.createElement("button");
        RemovePoint.appendChild(document.createTextNode("-"));
        contents.appendChild(RemovePoint);
        RemovePoint.addEventListener("click", function() {
            //htmlInfoWindow.setBackgroundColor("#ffaaaa");
			htmlInfoWindow.close();
			//RemovePointFromPoly(InteractableClusterMarker.get("index"), htmlmarker.get("name"));

            RemoveRoute(InteractableClusterMarker.get('index'));
        });
        */

        var RemoveMarker = document.createElement("img");
        RemoveMarker.setAttribute("src", "img/delete.png");
        RemoveMarker.setAttribute("height", "15");
        RemoveMarker.setAttribute("width", "15");
        RemoveMarker.setAttribute("alt", "Remove");
        RemoveMarker.setAttribute("style", "margin:5px;");
        contents.appendChild(RemoveMarker);
        RemoveMarker.addEventListener("click", function () {
            htmlInfoWindow.close();
            RemovePointFromPoly(InteractableClusterMarker.get("index"), htmlmarker.get("name"));
        });

        hr1 = document.createElement("hr");
        contents.appendChild(hr1);

        var ShrinkMarker = document.createElement("img");
        ShrinkMarker.setAttribute("src", "img/smallpin.png");
        ShrinkMarker.setAttribute("height", "20");
        ShrinkMarker.setAttribute("width", "20");
        ShrinkMarker.setAttribute("alt", "Shrink");
        ShrinkMarker.setAttribute("style", "margin:5px;");
        contents.appendChild(ShrinkMarker);
        ShrinkMarker.addEventListener("click", function () {
            htmlInfoWindow.close();
            RemoveRoute(InteractableClusterMarker.get('index'));
        });

        hr2 = document.createElement("hr");
        contents.appendChild(hr2);

        var GrowMarker = document.createElement("img");
        GrowMarker.setAttribute("src", "img/pin2.png");
        GrowMarker.setAttribute("height", "35");
        GrowMarker.setAttribute("width", "35");
        GrowMarker.setAttribute("alt", "Grow");
        GrowMarker.setAttribute("style", "margin:5px;");
        contents.appendChild(GrowMarker);
        GrowMarker.addEventListener("click", function () {
            htmlInfoWindow.close();
            AddRoute(InteractableClusterMarker.get('index'), startLoc[InteractableClusterMarker.get('index')], InteractableClusterMarker.get('marker').getPosition().lat + "," + InteractableClusterMarker.get('marker').getPosition().lng);
        });

        htmlInfoWindow.setContent(contents);
        htmlmarker.set('htmlinfowindow', htmlInfoWindow);
        // htmlInfoWindow.open(htmlmarker);
        /*
        htmlmarker.on(plugin.google.maps.event.MARKER_CLICK, function() {
          htmlInfoWindow.open(htmlmarker);
        });
         htmlmarker.trigger(plugin.google.maps.event.MARKER_CLICK);
        */
    }
    InteractableClusterMarkerInfoWindow.prototype = new plugin.google.maps.BaseClass();

    /******************************************************************************************************************************/


    /**** PointsToAdd Markers of InteractableClusterMarker ***************************************************************************/

    // Constructor
    function InteractableClusterMarkerPointsToAdd(ClusterMarker) {

        this.set('cmark', ClusterMarker);

        var posbehind = this.getPointBehindMarker(ClusterMarker);
        var PointBehind = map.addMarker({
            icon: {
                url: "img/addpoint.png",
                size: {
                    width: 20,
                    height: 20
                }
            },
            direction: "behind",
            position: posbehind,
            parent: this,
            marker: ClusterMarker
        }, function(ptbehind) {
            ClusterMarker.set("PointBehind", ptbehind);
            ptbehind.addEventListener(plugin.google.maps.event.MARKER_CLICK, function() {
				// this.get("marker").get("PointBefore").remove();				
				AddPointBehindMarker(this.get("marker").get("parent").get("index"), this.get("marker").get("name"));
            });
        });
		this.set("pointbehind",PointBehind );
		
        var posbefore = this.getPointBeforeMarker(ClusterMarker);
        var PointBefore = map.addMarker({
            icon: {
                url: "img/addpoint.png",
                size: {
                    width: 20,
                    height: 20
                }
            },
            direction: "before",
            position: posbefore,
            parent: this,
            marker: ClusterMarker
        }, function(ptbefore) {
            ClusterMarker.set("PointBefore", ptbefore);
            ptbefore.addEventListener(plugin.google.maps.event.MARKER_CLICK, function() {
				//this.get("marker").get("PointBehind").remove();
				// this.setVisible(false);
				AddPointBehindMarker(this.get("marker").get("parent").get("index"), this.get("marker").get("name")-1);
            });
        });
		this.set("pointbefore",PointBefore );

        var label = document.getElementById("label");
        if (InteractableClusterMarkers[ClusterMarker.get("parent").get("index")].length < 1) {
            PolylineCluster[ClusterMarker.get("parent").get("index")].on("resolution_changed", function (prev, newResolution) {

                // label.innerHTML = "<b>zoom = " + this.get("zoom").toFixed(0) + ", resolution = " + this.get("resolution") + "</b>";
                if (ActiveMarker != null) {
                    if (ActiveMarker.getMap() != null) {
                        if (parseInt(this.get("resolution").toFixed(0).toString()) >= 40) {
                            console.log("res is higher than 40");
                            if (ActiveMarker.get("isactive") && ActiveMarker.isVisible) {
                                console.log("res changed, active marker is active...");
                                if (ActiveMarker.get("PointBehind") != null) ActiveMarker.get("PointBehind").setVisible(true);
                                if (ActiveMarker.get("PointBefore") != null) ActiveMarker.get("PointBefore").setVisible(true);
                                if (ActiveMarker.get("fadefunction") != null) { clearTimeout(ActiveMarker.get("fadefunction")); }
                                setTimeout(ActiveMarker.get("parent").fadeIn(ActiveMarker.get("parent")), 400);
                                console.log("active marker should fade in...");
                                //else { ActiveMarker.get("parent").fadeIn(ActiveMarker.get("parent")); }
                            }
                            else {
                                console.log("res changed, active marker is NOT active...");
                                if (ActiveMarker.get("PointBehind") != null) ActiveMarker.get("PointBehind").setVisible(false);
                                if (ActiveMarker.get("PointBefore") != null) ActiveMarker.get("PointBefore").setVisible(false);
                            }
                        } else {
                            console.log("res is lower than 40");
                            if (ActiveMarker != null && ActiveMarker.isVisible) {
                                if (ActiveMarker.get("PointBehind") != null) ActiveMarker.get("PointBehind").setVisible(false);
                                if (ActiveMarker.get("PointBefore") != null) ActiveMarker.get("PointBefore").setVisible(false);
                            }
                        }
                    }
                } else console.log("res changed, no active marker...");
            });
        }

        ClusterMarker.addEventListener("isactive_changed", function() {
            if(this.get("PointBehind") == null || this.get("PointBefore") == null) return;
            var isactive = this.get("isactive");
            if (isactive) {
                this.get("PointBehind").setPosition(this.get("PointBehind").get("parent").getPointBehindMarker(this.get("PointBehind").get("marker")));
                this.get("PointBefore").setPosition(this.get("PointBefore").get("parent").getPointBeforeMarker(this.get("PointBehind").get("marker")));
            }
            this.get("PointBehind").setVisible(isactive);
            this.get("PointBefore").setVisible(isactive);
        });

        ClusterMarker.addEventListener(plugin.google.maps.event.MARKER_DRAG_START, function() {
            this.get("PointBehind").setVisible(false);
            this.get("PointBefore").setVisible(false);
        });

        ClusterMarker.addEventListener(plugin.google.maps.event.MARKER_DRAG_END, function() {
            this.get("PointBehind").setPosition(this.get("PointBehind").get("parent").getPointBehindMarker(this.get("PointBehind").get("marker")));
            this.get("PointBefore").setPosition(this.get("PointBefore").get("parent").getPointBeforeMarker(this.get("PointBehind").get("marker")));
            this.get("PointBehind").setVisible(true);
            this.get("PointBefore").setVisible(true);
        });
    }
    InteractableClusterMarkerPointsToAdd.prototype = new plugin.google.maps.BaseClass();

    // Get a Point 50% behind the Marker
    InteractableClusterMarkerPointsToAdd.prototype.getPointBehindMarker = function(marker) {
        var name = marker.get("name");
        var index = marker.get("parent").get("index");

        // Poly bis Wegpunkt (inklusive)
        var PolyUntilPoint = PolylinesData[index].points.slice(0, name + 1);
        // Poly inklusive dem nächsten Wegpunkt
        var PolyUntilNextPoint = PolylinesData[index].points.slice(0, name + 2);

        // 50% der Strecke zum nächsten Punkt zurücklegen
        var dist = (plugin.google.maps.geometry.spherical.computeLength(PolyUntilPoint) + plugin.google.maps.geometry.spherical.computeLength(PolyUntilNextPoint)) / 2;
        // Neuen Punkt anhand der Distanz ermitteln
        return GetPointAtDistance(dist, PolylinesData[index].points);
    };
    // Get a Point 50% behind the Marker
    InteractableClusterMarkerPointsToAdd.prototype.getPointBeforeMarker = function(marker) {
        var name = marker.get("name");
        var index = marker.get("parent").get("index");

        // Poly bis vor Wegpunkt (exklusive)
        var PolyBeforePoint = PolylinesData[index].points.slice(0, name);
        // Poly inklusive Wegpunkt
        var PolyUntilPoint = PolylinesData[index].points.slice(0, name + 1);

        // 50% der Strecke zum nächsten Punkt zurücklegen
        var dist = (plugin.google.maps.geometry.spherical.computeLength(PolyBeforePoint) + plugin.google.maps.geometry.spherical.computeLength(PolyUntilPoint)) / 2;
        // Neuen Punkt anhand der Distanz ermitteln
        return GetPointAtDistance(dist, PolylinesData[index].points);
    };

    /******************************************************************************************************************************/


    /**** Initialize Map **********************************************************************************************************/

    // Get the map <div>
    var mapDiv = document.getElementById("map_canvas");

    // Create a map with specified camera bounds
    var Kiel = {
        lat: 54.32133,
        lng: 10.13489
    };
    map = plugin.google.maps.Map.getMap(mapDiv, {
        camera: {
            target: Kiel,
            zoom: 13
        }
    });

    // On Map Ready
    map.addEventListener(plugin.google.maps.event.MAP_READY, function () {

        set_map_options();
        console.log("MAP_IS_READY :) :) :)");

        document.getElementById("Company").innerHTML = "<img id=\"Logo\" src=\"img/shadow-clipart-leaf-8.png\" /><div id=\"Logotext\">Nature<br>Routes</div>";

        map.on(plugin.google.maps.event.MAP_CLICK, function (latLng) {
            if (ActiveMarker != null)
            {
                ActiveMarker.set("isactive", false);
            }
        });
		
		map.on(plugin.google.maps.event.POI_CLICK, function(placeId, name, latLng) {
            map.addMarker({
            'position': latLng,
            'title': [
              "placeId = " + placeId,
              "name = " + name,
              "position = " + latLng.toUrlValue()
            ].join("\n")
            }, function(marker) {
            marker.showInfoWindow();
            });
		});
		
        // Set Routes
        setRoutes();
    });

    // Button
    //var button = document.getElementById("button");
    //button.addEventListener("click", ShowPolylineLength);

    /******************************************************************************************************************************/


    /**** Polyline & MarkerCluster Functions **************************************************************************************/

    function setRoutes() {
        function makeRouteCallback(index) {
            directionsService.route(
                request,
                function (response, status) {
                    if (status == google.maps.DirectionsStatus.OK) {
                        // Encode & decode:	js-api(encode) & plugin(decode)
                        var encodedPath = google.maps.geometry.encoding.encodePath(response.routes[0].overview_path);
                        var precision = 5; //option
                        var decodedPath = plugin.google.maps.geometry.encoding.decodePath(encodedPath, precision);
                        var optimizedPath = [];
                        var calcPoints = [];
                        for (var i = 0; i < decodedPath.length; i++)
                        {
                            if (optimizedPath.length > 0) {
                                if (i + 1 < decodedPath.length) {
                                    calcPoints = [];
                                    calcPoints[0] = decodedPath[i];
                                    calcPoints[1] = decodedPath[i + 1];
                                    var length = plugin.google.maps.geometry.spherical.computeLength(calcPoints);
                                    if (length > 50) {
                                        optimizedPath[optimizedPath.length] = decodedPath[i];
                                    }
                                }
                                else
                                {
                                    optimizedPath[optimizedPath.length] = decodedPath[i];
                                }
                            }
                            else
                            {
                                optimizedPath[0] = decodedPath[0];
                            }
                        }
                        // Create Polyline
                        createPolyline(index, optimizedPath);
                    } else if (status !== "OVER_QUERY_LIMIT") {
                        alert("Unable to retrieve route, Status: " + status);
                    }
                }
            );
        }
        for (var index = 0; index < startLoc.length; index++) {
            if (Polylines[index] == null && endLoc[index] !== null && typeof endLoc[index] !== 'undefined') {
                // Request for routes
                var travelMode = google.maps.DirectionsTravelMode.WALKING;
                var request = {
                    origin: startLoc[index],
                    destination: endLoc[index],
                    travelMode: travelMode,
                    avoidFerries: true
                };
                directionsService.route(request, makeRouteCallback(index));
            }
            else console.log("Invalid Routes Request:  endLoc: " + endLoc[index] + " | Polyline " + Polylines[index]);
        }
    }


    function createPolyline(index, polypoints) {
        map.addPolyline({
            'points': polypoints,
            //'color': '#AA55CC',
            'color': '#AA00FF',
            'width': 6,
            'clickable': true
        }, function (thepolyline) {
            Polylines[index] = thepolyline;
            PolylinesData[index] = {
                points: polypoints
            };

            // Catch the POLYLINE_CLICK event
            thepolyline.on(plugin.google.maps.event.POLYLINE_CLICK, function (latLng) {
                if (ActiveMarker != null) {
                    ActiveMarker.set("isactive", false);
                }
                var snippet = latLng.toUrlValue();
                map.addMarker({
                    position: latLng,
                    title: "You clicked on the polyline",
                    snippet: snippet,
                    disableAutoPan: true
                }, function (marker) {
                    //var pos = marker.getPosition();				
                    marker.showInfoWindow();
                    var points = NearestPoints(index, latLng, 10);
                    alert(JSON.stringify(points));
                    for (i = 0; i < points.length; i++) {
                        map.addMarker({
                            position: points[i],
                            title: "Near Point" + i.toString(),
                            disableAutoPan: true
                        }, function (nearmarker) {
                            nearmarker.showInfoWindow();

                            function RemoveNearMarker() {
                                nearmarker.remove();
                            }
                            setTimeout(RemoveNearMarker, 3000);
                        });
                    }
                });
            });

            var PolylineMarkerCluster = [];
            for (i = 0; i < polypoints.length; i++) {
                PolylineMarkerCluster[i] = NewPolylineMarkerClusterData(i, polypoints[i].lat, polypoints[i].lng);
            }
            // alert(polypoints.length + " Punkte");

            // polyline.getPoints() returns an instance of BaseArrayClass.
            var mvcArray = thepolyline.getPoints();

            // Available options
            var labelOptions = {
                bold: false,
                fontSize: 10,
                color: "white",
                italic: false
            };

            // Marker Cluster
            var markerCluster = map.addMarkerCluster({
                boundsDraw: false,
                markers: PolylineMarkerCluster,
                icons: [{
                    min: 2,
                    max: 100,
                    url: "img/smallpin.png",
                    anchor: {
                        x: 16,
                        y: 16
                    },
                    label: labelOptions
                },
                {
                    min: 100,
                    max: 1000,
                    url: "img/smallpin.png",
                    anchor: {
                        x: 16,
                        y: 16
                    },
                    label: labelOptions
                },
                {
                    min: 1000,
                    max: 2000,
                    url: "img/purple.png",
                    anchor: {
                        x: 24,
                        y: 24
                    },
                    label: labelOptions
                },
                {
                    min: 2000,
                    url: "img/blue.png",
                    anchor: {
                        x: 32,
                        y: 32
                    },
                    label: labelOptions
                }
                ]
            }, function (cluster) {
                PolylineCluster[index] = cluster;
                PolylineClusterMarkers[index] = [];
                InteractableClusterMarkers[index] = [];
                // Start
                map.addMarker({
                    position: polypoints[0],
                    draggable: true,
                    icon: {
                        url: "img/pin2.png",
                        size: {
                            width: 70,
                            height: 60
                        }
                    },
                    anchor: {
                        x: 32,
                        y: 32
                    }
                }, function (marker) {
                    Starts[index] = marker;

                    marker.on(plugin.google.maps.event.MARKER_DRAG_END, function (position) {
                        startLoc[index] = position.lat + "," + position.lng;
                        UpdateRouteRequest(index, startLoc[index], endLoc[index]);
                        if (index > 0) {
                            endLoc[index - 1] = startLoc[index];
                            UpdateRouteRequest(index - 1, startLoc[index - 1], endLoc[index - 1]);
                        }
                        
                        setRoutes();
                    });
                    });
                if (index === startLoc.length - 1 || startLoc[index + 1] === null || startLoc[index + 1] === 'undefined') {
                    // End
                    map.addMarker({
                        position: polypoints[polypoints.length - 1],
                        draggable: true,
                        icon: {
                            url: "img/pin2.png",
                            size: {
                                width: 70,
                                height: 60
                            }
                        },
                        anchor: {
                            x: 32,
                            y: 32
                        }
                    }, function (marker) {
                        Ends[index] = marker;
                        marker.on(plugin.google.maps.event.MARKER_DRAG_END, function (position) {
                            endLoc[index] = position.lat + "," + position.lng;
                            UpdateRouteRequest(index, startLoc[index], endLoc[index]);
                            setRoutes();
                        });
                    });
                }
            });

            markerCluster.on(plugin.google.maps.event.MARKER_CLICK, function (position, marker) {
                var exists = false;
                InteractableClusterMarkers[index].forEach(function (element) {
                    var elementmarker = element.get("marker");
                    if (marker.get("name") == elementmarker.get("name")) {
                        exists = true;
                    }
                });
                
                if (!exists) {
                    var newInteractableClusterMarker = new InteractableClusterMarker(marker, mvcArray, index);
                    InteractableClusterMarkers[index][InteractableClusterMarkers[index].length] = newInteractableClusterMarker;
                }
                
                
                /*
                                        var Timer = 5000;
                                        var Interval = 50;
                                        var MarkerPosition = position;
                                        var name = marker.get("name");
                                    	
                                        // Registrate this Marker
                                        PolylineClusterMarkers[index][name] = marker;
                                        // Set Status of all registrated Markers to inactive
                                        PolylineClusterMarkers[index].forEach(function(element) {
                                            if(element.get("active")) element.set("active", false);
                                        })
                                    	
                                        // Activate Marker
                                        marker.set("isactive", true);
                                        marker.setIcon(redicon);
                                        marker.setDraggable(true);					
                                    	
                                        // Activity TimeOut				
                                        function TimeOut() {
                                            marker.set("isactive", false);
                                        }
                                        if(TimerHandle[name] != null) clearTimeout(TimerHandle[name]);
                                        TimerHandle[name] = setTimeout(TimeOut,Timer);									
                                    	
                                        // Activity Update
                                        function IsMarkerActive() {
                                            if(!marker.get("isactive")) {
                                                if(ActiveHandle[name] != null) clearTimeout(ActiveHandle[name]);
                                                if(TimerHandle[name] != null) clearTimeout(TimerHandle[name]);
                                                NewMarkerPosition(index, marker, MarkerPosition);							
                                            }
                                            else {ActiveHandle[name] = setTimeout(IsMarkerActive,Interval);}
                                        }
                                        if(ActiveHandle[name] != null) clearTimeout(ActiveHandle[name]);
                	
                                        ActiveHandle[name] = setTimeout(IsMarkerActive,Interval);
                                    	
                                        // Drag Events
                                        marker.on(plugin.google.maps.event.MARKER_DRAG_START, function(position) {
                                            if(TimerHandle[name]) clearTimeout(TimerHandle[name]);
                                            mvcArray.setAt(name, position);
                                        });						
                                        marker.on(plugin.google.maps.event.MARKER_DRAG_END, function(position) {
                                            MarkerPosition = position;
                                            NewMarkerPosition(index, marker, position);	
                                        });
                                        marker.on(plugin.google.maps.event.MARKER_DRAG, function(position) {
                                            mvcArray.setAt(name, position);						
                                        });
                */                
            });

            });

        setTimeout(function () {
            var leng = CalculateRoutesLength();
            ShowRoutesLength(leng);
        }, 25);

        /*
        var intervalTimings = 1;
        //AnimateRouteLength();
        function AnimateRouteLength()
        {
            setTimeout(function () {
                if (intervalTimings < 150) {
                    // Randomized Animation (Calculation Process)
                    var timer = 45;
                    intervalTimings += timer;
                    var random = getRandomInt(CalculateRoutesLength());
                    ShowRoutesLength(random);
                    AnimateRouteLength();
                }
                else // Show the correct length
                {
                    ShowRoutesLength(0);
                    setTimeout(function () {
                        var leng = CalculateRoutesLength();
                        ShowRoutesLength(leng);
                    }, 50);
                }
            }, intervalTimings);
        }
        */
    }

    function NewPolylineMarkerClusterData(i, lat, lng) {
        // var active = false;
        // if(ActiveMarkerName != null && ActiveMarkerName == i) { active = true; }
        return {
            "position": {
                "lat": lat,
                "lng": lng
            },
            "zIndex": 1,
            "name": i,
            "address": "Adress",
            "phone": "Phone",
            "icon": "img/blue.png",
            "draggable": false,
            "isactive": false,
            "disableAutoPan": true
        };
    }

    /*	
    	function NewMarkerPosition(index, marker, position) {
    		var name = marker.get("name");
    		marker.setDraggable(false);
    		marker.set("isactive", false);	
    		marker.setIcon(blueicon);
    		marker.setPosition(position);
    		Polylines[index].points[name] = position; // evtl unnötig wegen mvc array?
    		PolylinesData[index].points[name] = position;
    		ShowPolylineLength(index);
    		marker.removeEventListener(plugin.google.maps.event.MARKER_DRAG);
    		marker.removeEventListener(plugin.google.maps.event.MARKER_DRAG_END);
    	}
    */

    function UpdateRouteRequest(index, start, end) {
        if (startLoc[index] != null) {
            console.log("Updaterouterequest: New Route " + index + " | from " + start + " to " + end);
            deleteRoute(index, function () {
                startLoc[index] = start;
                endLoc[index] = end;
            }
            );
        }
    }

    function UpdatePolylineLength(index, pidx) {
        var PolyBeforePoint = PolylinesData[index].points.slice(0, pidx);
        var LenghtBeforePoint = plugin.google.maps.geometry.spherical.computeLength(PolyBeforePoint);
        // alert("LenghtBeforePoint: " + LenghtBeforePoint);
        var PolyBehindPoint = PolylinesData[index].points.slice(pidx + 1);
        var LenghtBehindPoint = plugin.google.maps.geometry.spherical.computeLength(PolyBehindPoint);
        var PolyAtPoint = PolylinesData[index].points.slice(pidx - 1, pidx + 2);
        var LengthAtPoint = plugin.google.maps.geometry.spherical.computeLength(PolyAtPoint);
        var length = LenghtBeforePoint + LenghtBehindPoint + LengthAtPoint;
        var km = Math.floor(length / 1000);
        var m = Math.floor(length - km * 1000);
        document.getElementById("Length").innerHTML = "<input type=\"text\" size=\"7\" value=\"" + km + " km - " + m + " m\">";
    }

    function AddPointBehindMarker(index, name) {
        // Poly bis Wegpunkt (inklusive)
        var PolyUntilPoint = PolylinesData[index].points.slice(0, name + 1);
        // Poly inklusive dem nächsten Wegpunkt
        var PolyUntilNextPoint = PolylinesData[index].points.slice(0, name + 2);

        // 50% der Strecke zum nächsten Punkt zurücklegen
        var dist = (plugin.google.maps.geometry.spherical.computeLength(PolyUntilPoint) + plugin.google.maps.geometry.spherical.computeLength(PolyUntilNextPoint)) / 2;
        // Neuen Punkt anhand der Distanz ermitteln
        var newPointToAdd = GetPointAtDistance(dist, PolylinesData[index].points);
        // Neuen Punkt hinter aktuellen Wegpunkt hinzufügen (50% Distanz auf nächstem Abschnitt)
        PolyUntilPoint[PolyUntilPoint.length] = newPointToAdd;

        // Poly nach Wegpunkt (exklusive)
        var PolyBehindPoint = PolylinesData[index].points.slice(name + 1);

        var newPoints = PolyUntilPoint.concat(PolyBehindPoint);
        ReCreateRoute(index, newPoints);
    }

    function RemovePointFromPoly(index, name) {
        // Poly bis Wegpunkt (exklusive)
        var PolyUntilPoint = PolylinesData[index].points.slice(0, name);
        // Poly nach Wegpunkt (exklusive)
        var PolyBehindPoint = PolylinesData[index].points.slice(name + 1);

        var newPoints = PolyUntilPoint.concat(PolyBehindPoint);
        ReCreateRoute(index, newPoints);
    }

    function ReCreateRoute(index, newPoints) {
        PolylinesData[index] = null;
        PolylinesData[index] = {
            points: newPoints
        };

        ActiveMarker = null;
        ActiveMarkerName = null;
        var start = startLoc[index];
        var end = endLoc[index];
        deleteRoute(index, function () {
            setTimeout(function () {
                startLoc[index] = start;
                endLoc[index] = end;
                createPolyline(index, newPoints);
            }, 1000);
        }
        );
    }

    function deleteRoute(index, cb) {
        if (InteractableClusterMarkers[index] != null) {
            if (ActiveMarker != null) {
                if (!ActiveMarker.get("isactive")) {
                    ActiveMarker.set("isactive", false);
                }
            }
            for (i = 0; i < InteractableClusterMarkers[index].length; i++) {
                if (InteractableClusterMarkers[index] != null) {
                    if (InteractableClusterMarkers[index][i].get("fadefunction") != null) { clearTimeout(InteractableClusterMarkers[index][i].get("fadefunction")); }
                    var PtBehind = InteractableClusterMarkers[index][i].get("marker").get("PointBehind");
                    if (PtBehind != null) {
                        PtBehind.removeEventListener();
                        PtBehind.remove();
                    }
                    var PtBefore = InteractableClusterMarkers[index][i].get("marker").get("PointBefore");
                    if (PtBefore != null) {
                        PtBefore.removeEventListener();
                        PtBefore.remove();
                    }
                    InteractableClusterMarkers[index][i].removeEventListener();
                }
            }
        }
        if (Polylines[index] != null) {
            Polylines[index].removeEventListener();
            Polylines[index].remove();
        }
        Polylines[index] = null;
        if (PolylineCluster[index] != null) {
            PolylineCluster[index].removeEventListener();
            PolylineCluster[index].remove();
            PolylineCluster[index] = null;
        }
        PolylineClusterMarkers[index] = null;
        InteractableClusterMarkers[index] = null;
        if (Starts[index] != null) Starts[index].remove();
        Starts[index] = null;
        if (Ends[index] != null) Ends[index].remove();
        Ends[index] = null;
        startLoc[index] = null;
        endLoc[index] = null;
        cb();
    }

    function NearestPoints(index, latlng, count) {
        var points = PolylinesData[index].points.slice(0);
        points.sort(function (a, b) {
            return plugin.google.maps.geometry.spherical.computeDistanceBetween(latlng, a) - plugin.google.maps.geometry.spherical.computeDistanceBetween(latlng, b);
        });

        function findPoint(element) {
            return element == points[i];
        }

        var NearPoints = [];
        for (i = 0; i < count - 1; i++) {
            var idx = PolylinesData[index].points.findIndex(findPoint);
            var PATH = [{
                lat: PolylinesData[index].points[idx].lat,
                lng: PolylinesData[index].points[idx].lng
            },
            {
                lat: PolylinesData[index].points[idx + 1].lat,
                lng: PolylinesData[index].points[idx + 1].lng
            }
            ];
            if (plugin.google.maps.geometry.poly.isLocationOnEdge(latlng, PATH)) {
                NearPoints[NearPoints.length] = PolylinesData[index].points[idx];
            }
        }
        return NearPoints;
    }

    function CalculateRoutesLength() {
        if (PolylinesData != null && PolylinesData.length > 0) {
            var length = 0;
            for (var i = 0; i < PolylinesData.length; i++) {
                if (PolylinesData[i] != null) {
                    length += plugin.google.maps.geometry.spherical.computeLength(PolylinesData[i].points);
                }
            }
            return length;
        }
        return 0;
    }

    function ShowRoutesLength(length) {
        var km = Math.floor(length / 1000);
        var m = Math.floor(length - km * 1000);
        document.getElementById("Length").innerHTML = "<div><p>Distance</p><img src=\"img/shoes.png\" style=\"float:left; height: 20px;\" /><div style=\"float:right;\">" + km + " km<br>" + m +" m </div></div>";
        ShowTimes(length);
    }

    function GetHoursMinutesString(time)
    {
        if (time != null)
        {
            var hours = 0;
            var minutes = 0;
            hours = Math.floor(time);
            minutes = Math.ceil(60 * (time - hours));
            h = "";
            min = "";
            if (hours < 10) h = "0" + hours.toString();
            else h = hours.toString();
            if (minutes < 10) min = "0" + minutes.toString();
            else min = minutes.toString();
            return h + ":" + min;
        }
        return "";
    }

    function ShowTimes(length)
    {
        // speed = length / m/h
        var speed_walk = length / 3600;
        var speed_jogslow = length / 5000;
        var speed_jogfast = length / 10000;
        var speed_run = length / 20000;

        //  Time
        document.getElementById("Times").innerHTML = "<div class=\"Time\"><p>Time</p><img class=\"speedimg\" src=\"img/Walking.jpg\" /><div class= \"Timehmin\">" + GetHoursMinutesString(speed_walk) + "</div></div>" +
            "<div class=\"Time\"><img class=\"speedimg\" src=\"img/Jogging1.jpg\" /><div class= \"Timehmin\">" + GetHoursMinutesString(speed_jogslow) + "</div></div>" +
            "<div class=\"Time\"><img class=\"speedimg\" src=\"img/Jogging2.jpg\" /><div class= \"Timehmin\">" + GetHoursMinutesString(speed_jogfast) + "</div></div>" +
            "<div class=\"Time\"><img class=\"speedimg\" src=\"img/Running.jpg\" /><div class= \"Timehmin\">" + GetHoursMinutesString(speed_run) + "</div></div>";
    }




    // MODIEFIED PART OF epolys.js --- REWRITTEN FOR CORDOVA MAPS PLUGIN v2.0.0-beta3
    /*******************************************************************************\
    * 	epolys.js                                          		by Mike Williams 	*
    * 	updated to API v3                                  		by Larry Ross    	*
    *																				*
    * 	A Google Maps API Extension													*
    * 	Adds various Methods to google.maps.Polygon and google.maps.Polyline		*
    *   This Javascript is provided by Mike Williams                      			*
    *   Blackpool Community Church Javascript Team                        			*
    *   http://www.blackpoolchurch.org/                                   			*
    *   http://econym.org.uk/gmap/                                        			*
    *                                                                     			*
    *   This work is licenced under a Creative Commons Licence            			*
    *   http://creativecommons.org/licenses/by/2.0/uk/								*
    \*******************************************************************************/
    // === A method which returns a GLatLng of a point a given distance along the path ===
    // === Returns null if the path is shorter than the specified distance ===
    function GetPointAtDistance(metres, thisPolyPoints) {
        // some awkward special cases
        if (metres == 0) return thisPolyPoints[0];
        if (metres < 0) return null;
        if (Object.keys(thisPolyPoints).length < 2) return null;
        var dist = 0;
        var olddist = 0;
        for (var i = 1; i < Object.keys(thisPolyPoints).length && dist < metres; i++) {
            olddist = dist;
            dist += plugin.google.maps.geometry.spherical.computeDistanceBetween(thisPolyPoints[i], thisPolyPoints[i - 1]);
        }
        if (dist < metres) {
            return null;
        }
        var p1 = thisPolyPoints[i - 2];
        var p2 = thisPolyPoints[i - 1];
        var m = (metres - olddist) / (dist - olddist);
        return new plugin.google.maps.LatLng(p1.lat + (p2.lat - p1.lat) * m, p1.lng + (p2.lng - p1.lng) * m);
    }

    function MarkerIsInCameraBounds(marker)
    {
        if (marker != null && marker.getMap() != null)
        {
            var cambounds = GetCameraBounds();
            if (cambounds.contains(marker.get("position"))) {
                //console.log("marker is in camera bounds");
                return true;
            }
        }
        return false;
    }

    function GetCameraBounds()
    {
        // Get the visible region
        var visibleRegion = map.getVisibleRegion();
        var points = [
            visibleRegion.nearLeft,
            visibleRegion.nearRight,
            visibleRegion.farRight,
            visibleRegion.farLeft
        ];
        var latLngBounds = new plugin.google.maps.LatLngBounds(points);

        return latLngBounds;
    }

    function getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    function RemoveRoute(index)
    {
        console.log("Removing Route: " + index);
        if (index !== null && index > 0) {
            UpdateRouteRequest(index - 1, startLoc[index - 1], endLoc[index]);
            for (var i = index; i < startLoc.length; i++) {
                if (i == startLoc.length - 1) {
                    deleteRoute(i, function () {
                        setTimeout(function () {
                            setRoutes();
                        }, 500);
                    });
                }
                else UpdateRouteRequest(i, startLoc[i + 1], endLoc[i + 1]);
            }
        }
    }

    function AddRoute(index, start, end) {
        console.log("AddRoute: " + index + " | " + start + " | " + end);
        if (index != null) {
            var saveStartLoc = [];
            var saveEndLoc = [];
            for (var i = index; i < startLoc.length; i++) {
                saveStartLoc[i] = startLoc[i];
                saveEndLoc[i] = endLoc[i];
            }
            //startLoc[index] = start;
            //endLoc[index] = end;
            UpdateRouteRequest(index, start, end); 
            index++;
            UpdateRouteRequest(index, end, startLoc[index]);
            
            for (var j = index; j < startLoc.length;) {
                //startLoc[j] = saveStartLoc[j];
                //endLoc[j] = saveEndLoc[j]; 
                j++;                    
                UpdateRouteRequest(j, saveStartLoc[j-1], saveEndLoc[j-1]);                
            }

            startLoc[startLoc.length] = saveStartLoc[saveStartLoc.length - 1];
            endLoc[endLoc.length] = saveEndLoc[saveEndLoc.length - 1];

            setTimeout(function () {
                setRoutes();
            }, 250);

        }
        /*
        else {
            //startLoc[startLoc.length] = start;
            //endLoc[endLoc.length] = end;
            UpdateRouteRequest(startLoc.length + 1, start, end, function () {
                setTimeout(function () {
                    setRoutes();
                }, 250);
            });
        }
        */
    }


}, false);


function set_map_options() {
    var maptype = plugin.google.maps.MapTypeId.ROADMAP;
    if (document.getElementById('maptype').value == "ROADMAP") maptype = plugin.google.maps.MapTypeId.ROADMAP;
    else if (document.getElementById('maptype').value == "SATELLITE") maptype = plugin.google.maps.MapTypeId.SATELLITE;
    else if (document.getElementById('maptype').value == "HYBRID") maptype = plugin.google.maps.MapTypeId.HYBRID;
    else if (document.getElementById('maptype').value == "TERRAIN") maptype = plugin.google.maps.MapTypeId.TERRAIN;
    else if (document.getElementById('maptype').value == "NONE") maptype = plugin.google.maps.MapTypeId.NONE;

    map.setOptions({
        'mapType': maptype,
        'controls': {
            'compass': document.getElementById("Compass").checked,
            'myLocationButton': document.getElementById("MyLocation").checked,
            'indoorPicker': true,
            'zoom': document.getElementById("Zoom").checked,
            'mapToolbar': false   // currently Android only
        }
    });
}


