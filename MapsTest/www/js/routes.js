// Google JavaScript-API, service to request routes
var directionsService = new google.maps.DirectionsService;

	// ROUTES
			// Start & End Locations
				var startLoc = [];
				var endLoc = [];
			// Polylines
				var Polylines = [];
				var PolylinesData = [];
				var PolylineCluster = [];
				var PolylineClusterMarkers = [];
				var Starts = [];
				var Ends = [];
				var TimerHandle = [];
				var ActiveHandle = [];
				
				startLoc[0] = "Kiel";
				endLoc[0] = "Laboe";

				var redicon = {
								url: "img/red.png"
							};
				var blueicon = {
								url: "img/blue.png"
							};

function setRoutes() {
	for (var index=0; index< startLoc.length; index++){		
		if(Polylines[index] == null && endLoc[index] !== null && typeof endLoc[index] !== 'undefined') {
			// Request for routes
			var travelMode = google.maps.DirectionsTravelMode.WALKING;
			var request = {
				origin: startLoc[index],
				destination: endLoc[index],
				travelMode: travelMode,
				avoidFerries: true
			};
			directionsService.route(request,makeRouteCallback(index));
		}
    }

    function makeRouteCallback(index) {
        directionsService.route(
            request,
            function (response, status) {
                if (status == google.maps.DirectionsStatus.OK) {
                    // Encode & decode:	js-api(encode) & plugin(decode)
                    var encodedPath = google.maps.geometry.encoding.encodePath(response.routes[0].overview_path);
                    var precision = 5; //option
                    var decodedPath = plugin.google.maps.geometry.encoding.decodePath(encodedPath, precision);
                    // Create Polyline
                    createPolyline(index, decodedPath);
                }
                else if (status !== "OVER_QUERY_LIMIT") { alert("Unable to retrieve route, Status: " + status); }
            }
        );
    }
}

function createPolyline(index,polypoints) {						
    map.addPolyline({
                'points': polypoints,
                'color': '#AA00FF',
                'width': 10,
                'clickable': true
			}, function(thepolyline) {				
				Polylines[index] = thepolyline;
				PolylinesData[index] = { points: polypoints };
				//ShowPolylineLength(index);
				
				// Catch the POLYLINE_CLICK event
				thepolyline.on(plugin.google.maps.event.POLYLINE_CLICK, function(latLng) {
                    var snippet = latLng.toUrlValue();
                    map.addMarker({
                        position: latLng,
                        title: "You clicked on the polyline",
                        snippet: snippet,
                        disableAutoPan: true
                    }, function (marker) {
                        // var pos = marker.getPosition();
                        marker.showInfoWindow();
                        var points = NearestPoints(index, latLng, 10);
                        alert(JSON.stringify(points));
                        for(i=0; i<points.length; i++) {
                            map.addMarker({
                                position: points[i],
                                title: "Near Point" + i.toString(),
                                disableAutoPan: true
                                }, function(nearmarker) {
                                    nearmarker.showInfoWindow();
                                    
                                    function RemoveNearMarker()
                                    {
                                        nearmarker.remove();
                                    }
                                    setTimeout(RemoveNearMarker, 3000);
                                }
                            );
                        }
                    });				
                });
				
				var PolylineMarkerCluster = [];			
				for(i=0; i<polypoints.length; i++)
				{
					PolylineMarkerCluster[i] = NewPolylineMarkerClusterData(i, polypoints[i].lat, polypoints[i].lng);
				}
				// alert(polypoints.length + " Punkte");
				
                // polyline.getPoints() returns an instance of BaseArrayClass.
                var mvcArray = thepolyline.getPoints();

				// Available options
				var labelOptions = {
                    bold: true,
                    fontSize: 15,
                    color: "white",
                    italic: true
				};
				
				var markerCluster = map.addMarkerCluster({
					boundsDraw: false,
					markers: PolylineMarkerCluster,
					icons: [
						{min: 2, max: 100, url: "img/blue.png", anchor: {x: 16, y: 16}, label: labelOptions},
						{min: 100, max: 1000, url: "img/yellow.png", anchor: {x: 16, y: 16}, label: labelOptions},
						{min: 1000, max: 2000, url: "img/purple.png", anchor: {x: 24, y: 24}, label: labelOptions},
						{min: 2000, url: "img/red.png",anchor: {x: 32,y: 32}, label: labelOptions}
					]
				}, function(cluster) {					
						PolylineCluster[index] = cluster;
						PolylineClusterMarkers[index] = [];
						// Start
						map.addMarker({
                            position: polypoints[0],
                            draggable: true,
                            icon: {
                                url: 'img/shoes.png',
                                size: {
                                    width: 20,
                                    height: 20
                                }
                            }

						}, function (marker) {
							Starts[index] = marker;
							
							var newCar = new Car(marker);
							alert("NewCar..." + newCar.get("hello"));
							
                            marker.on(plugin.google.maps.event.MARKER_DRAG_END, function (position) {
                                startLoc[index] = position.lat + "," + position.lng;
                                UpdateRouteRequest(index, startLoc[index], endLoc[index]);
                            });
						});
						// End
						map.addMarker({
                            position: polypoints[polypoints.length - 1],
                            draggable: true
						}, function (marker) {
							Ends[index] = marker;
                            marker.on(plugin.google.maps.event.MARKER_DRAG_END, function (position) {
                                endLoc[index] = position.lat + "," + position.lng;
                                UpdateRouteRequest(index, startLoc[index], endLoc[index]);
                            });
						});
					}					
				);
				
				markerCluster.on(plugin.google.maps.event.MARKER_CLICK, function (position, marker) {					
					var Timer = 5000;
					var Interval = 50;
					var MarkerPosition = position;
					var name = marker.get("name");
					
					// Registrate this Marker
					PolylineClusterMarkers[index][name] = marker;
					// Set Status of all registrated Markers to inactive
                    PolylineClusterMarkers[index].forEach(function (element) {
                        if (element.get("active")) element.set("active", false);
                    });
					
					// Activate Marker
					marker.set("active", true);
					marker.setIcon(redicon);
					marker.setDraggable(true);					
					
					// Activity TimeOut				
					function TimeOut() {
						marker.set("active", false);
					}
					if(TimerHandle[name] != null) clearTimeout(TimerHandle[name]);
					TimerHandle[name] = setTimeout(TimeOut,Timer);									
					
					// Activity Update
					function IsMarkerActive() {
						if(!marker.get("active")) {
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
				});
		});	
}

function NewPolylineMarkerClusterData(i, lat, lng) {
  return {
            "position": {
            "lat": lat,
            "lng": lng
            },
            "name": i.toString(),
            "address": "Adress",
            "phone": "Phone",
            "icon": "img/blue.png", 
            "draggable": false,
            "active": false
		};
}

			function ClusterMarker(i, lat, lng) {
                plugin.google.maps.BaseClass.apply(this);
                this.set("position", { "lat": lat, "lng": lng });			  
                this.set('icon', 'img/blue.png');
                this.set('draggable', false);
                this.set('name', i.toString());
                this.set('active', false);
                //marker.addEventListener(plugin.google.maps.event.MARKER_CLICK, this.setActive);			  
			}
			ClusterMarker.prototype = new plugin.google.maps.BaseClass();
			/*
			ClusterMarker.prototype.setActive = function() {
			  alert("ClusterMarker...");
			  this.get('icon').setIcon('img/red.png');
			  alert(this.get("name"));			
			};
			*/

function NewMarkerPosition(index, marker, position) {
	var name = marker.get("name");
	marker.setDraggable(false);
	marker.set("active", false);	
	marker.setIcon(blueicon);
	marker.setPosition(position);
	Polylines[index].points[name] = position; // evtl unnötig wegen mvc array?
	PolylinesData[index].points[name] = position;
	ShowPolylineLength(index);
	marker.removeEventListener(plugin.google.maps.event.MARKER_DRAG);
	marker.removeEventListener(plugin.google.maps.event.MARKER_DRAG_END);
}

function UpdateRouteRequest(index, start, end) {
	deleteRoute(index);
	startLoc[index] = start;
	endLoc[index] = end;	
	setRoutes();
}

function ShowPolylineLength(index) {
	var length = plugin.google.maps.geometry.spherical.computeLength(Polylines[index].points);
	var km = Math.floor(length / 1000);
	var m = Math.floor(length - km * 1000);
	document.getElementById("Length").innerHTML = "<input type=\"text\" size=\"7\" value=\"" + km + " km - " + m + " m\">";
}

function deleteRoute(index) {
	Polylines[index].remove();
	Polylines[index] = null;
	PolylineCluster[index].remove();
	Starts[index].remove();
	Ends[index].remove();
	startLoc[index] = null;
	endLoc[index] = null;	
}

function NearestPoints(index,latlng,count) {
	var points = PolylinesData[index].points;
    points.sort(function (a, b) { return plugin.google.maps.geometry.spherical.computeDistanceBetween(latlng, a) - plugin.google.maps.geometry.spherical.computeDistanceBetween(latlng, b);});
    var NearPoints = [];
    function findPoint(element) {
        return element == points[i];
    }
	for(i=0; i<count - 1; i++) {
		var idx = PolylinesData[index].points.findIndex(findPoint);
        var PATH = [
            { lat: PolylinesData[index].points[idx].lat, lng: PolylinesData[index].points[idx].lng },
            { lat: PolylinesData[index].points[idx + 1].lat, lng: PolylinesData[index].points[idx + 1].lng }
		];
		if(plugin.google.maps.geometry.poly.isLocationOnEdge(latlng, PATH)) {
			NearPoints[NearPoints.length] = PolylinesData[index].points[idx];
		}
	}
	return NearPoints;
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
function GetPointAtDistance(metres,thisPolyPoints) {
	// some awkward special cases
	if (metres == 0) return thisPolyPoints[0];
	if (metres < 0) return null;
	if (Object.keys(thisPolyPoints).length < 2) return null;
	var dist=0;
	var olddist=0;
	for (var i=1; i < Object.keys(thisPolyPoints).length && dist < metres; i++) {
        olddist = dist;
        dist += plugin.google.maps.geometry.spherical.computeDistanceBetween(thisPolyPoints[i],thisPolyPoints[i-1]);
	}
	if (dist < metres) {
        return null;
	}
	var p1= thisPolyPoints[i-2];
	var p2= thisPolyPoints[i-1];
	var m = (metres-olddist)/(dist-olddist);
	return new plugin.google.maps.LatLng( p1.lat + (p2.lat-p1.lat)*m, p1.lng + (p2.lng-p1.lng)*m);
}