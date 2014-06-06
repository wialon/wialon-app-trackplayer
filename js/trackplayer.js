/************************************************************************

	JavaScript for Track Player - WEB applications, developed on the basis of SDK for Wialon Hosting and Wialon Kit.

	http://apps.wialon.com

	Copyright:
	2002-2013 Gurtam, http://gurtam.com

	License:
	MIT: https://github.com/wialon/wialon-app-trackplayer/blob/master/LICENSE-MIT

	************************************************************************/

var callbacks = {}; // system variables
var timeoutId;
var layer_temp = {
	"layerName":"",
	"itemId":0,
	"timeFrom":0,
	"timeTo":0,
	"tripDetector":1,
	"trackColor":"",
	"trackWidth":4,
	"arrows":false,
	"points":true,
	"pointColor":"",
	"annotations":false
};

var time_prev, last_graph_click=0;

/* maps variables */
var map;
var markers, events_layer;
var stopIcon;
var infobox, unitinfobox;

// time variables: start of interval, end of interval
var from=0, to=0; 
var state = "STOP"; // state of player ('PLAY' or 'STOP')
var previousPoint = null;
var busy = false;
var paused = false;

var plot;

var DataStorage = {};
var messagesUtils;
var sensorsUtils;

var speed = 100;                // !!!! animation time miliseconds
var msgSize = 500;              // !!!! message load at once
var messagesLoadSpeed = 5000;   // !!!! load ?msgSize+1? every ?messagesLoadSpeed? miliseconds
var minRange = 600;            // !!!! min zoom range in sec
var timezone = 0;               // !!!! timezone offset in seconds
var skipBeetweenTrips = false;

var tz = 0, dst = 0;

var LANG = "";
/** * * * * * * * * * * * * * * *
* WialonSDK and OpenLayers init *
* * * * * * * * * * * * * * * * */

function exec_callback(id) { /// Execute callback
	if (!callbacks[id])
		return;
	callbacks[id].call();
}

function wrap_callback(callback) { /// Wrap callback
	var id = (new Date()).getTime();
	callbacks[id] = callback;
	return id;
}

function ie() { /// IE check
	return (navigator.appVersion.indexOf("MSIE 6") != -1 || navigator.appVersion.indexOf("MSIE 7") != -1 || navigator.appVersion.indexOf("MSIE 8") != -1);
}

function get_html_var(name) { /// Fetch varable from 'GET' request
	if (!name) return null;
	var pairs = decodeURIComponent(document.location.search.substr(1)).split("&");
	for (var i = 0; i < pairs.length; i++) {
		var pair = pairs[i].split("=");
		if (pair[0] == name) {
			pair.splice(0, 1);
			return pair.join("=");
		}
	}
	return null;
}

function load_script(src, callback) { /// Load script
	var script = document.createElement("script");
	script.setAttribute("type","text/javascript");
	script.setAttribute("charset","UTF-8");
	script.setAttribute("src", src);
	if (callback && typeof callback == "function") {
		wrap_callback(callback);
		if(ie())
			script.onreadystatechange = function () {
				if (this.readyState == 'complete' || this.readyState == 'loaded')
					callback();
			};
		else
			script.setAttribute("onLoad", "exec_callback(" + wrap_callback(callback) + ")");
	}
	document.getElementsByTagName("head")[0].appendChild(script);
}

init = function() { // We are ready now
	var url = get_html_var("baseUrl");
	if (!url) url = get_html_var("hostUrl");
	if (!url) return;
	url += "/wsdk/script/wialon.js" ;
	load_script(url, init_sdk);
};

function init_sdk() { /// Init SDK
	var url = get_html_var("baseUrl");
	if (!url) url = get_html_var("hostUrl");
	if (!url) return;
	wialon.core.Session.getInstance().initSession(url);
	wialon.core.Session.getInstance().duplicate(get_html_var("sid"), get_html_var("user") || '', true, login);
	
}

function login(code) { /// Login result
	if (code) { alert($.localise.tr("Login error, restart the application")); return; }
	
	var sess = wialon.core.Session.getInstance(); 
	var user = sess.getCurrUser();
	
	tz = wialon.util.DateTime.getTimezoneOffset();
	dst = wialon.util.DateTime.getDSTOffset(sess.getServerTime());
	
	// preload user dateTime format
	getUserDateTimeFormat(function(){
		changeTime(0);
		setTimeRange();
	});
	
	var flags = wialon.item.Item.dataFlag.base | wialon.item.Unit.dataFlag.sensors | wialon.item.Item.dataFlag.customProps;
	
	sess.loadLibrary("itemIcon");
	sess.loadLibrary("unitTripDetector");
	sess.loadLibrary("unitSensors");
	
	sess.updateDataFlags(
		[{type: "type", data: "avl_unit", flags: flags, mode: 0}],
		function (code) { if (code) return;
			var un = sess.getItems("avl_unit");
			un = wialon.util.Helper.filterItems(un, wialon.item.Item.accessFlag.execReports);
			if (!un || !un.length) return;
			un = wialon.util.Helper.sortItems(un);
			for(var i=0; i<un.length; i++)
				$("#units").append("<option value='"+ un[i].getId() +"'>"+ un[i].getName()+ "</option>");
			
			$("#add_btn").prop("disabled", false);
			
		}
	);

	initMap();
	//if(map) initUI();
}

/* initialize map */
initMap = function(){
	
	var options = {
		maxExtent: new OpenLayers.Bounds(-20037508.3427892,-20037508.3427892,20037508.3427892,20037508.3427892),
		numZoomLevels: 19,
		maxResolution: 156543.0339,
		units: 'm',
		projection: "EPSG:900913",
		displayProjection: new OpenLayers.Projection("EPSG:4326")
	};
	
	options.controls = [
		new OpenLayers.Control.GPanZoomBar(),
		new OpenLayers.Control.MousePosition(),
		new OpenLayers.Control.GNavigation(),
		new OpenLayers.Control.LayerSwitcher(),
		new OpenLayers.Control.ScaleLine()
	];
	
	map = new OpenLayers.GMap("map", options);
// create layer
	var layer = new OpenLayers.Layer.WebGIS("Gurtam Maps", wialon.core.Session.getInstance().getBaseGisUrl(), {isBaseLayer:true});
	var render_layer = new OpenLayers.Layer.WebGIS("Routes", "", {
		isBaseLayer: false,
		res_name: wialon.core.Session.getInstance().getBaseUrl() + "/adfurl" + new Date().getTime() + "/avl_render",
		compress_url: false,
		img_name: "" + wialon.core.Session.getInstance().getId(),
		displayInLayerSwitcher: false
	});
	
	var osm = new OpenLayers.Layer.OSM(null, null, {minZoom:4});
	
	events_layer = new OpenLayers.Layer.Markers("Events", {displayInLayerSwitcher: false});
	markers = new OpenLayers.Layer.Markers("Markers", {displayInLayerSwitcher: false});
	
	map.addLayers([layer, osm, render_layer, events_layer, markers]);
	map.setBaseLayer(layer);
	map.zoomToMaxExtent();
	
	/* common icons */
	stopIcon = new OpenLayers.Icon( "img/stop.png", new OpenLayers.Size(21, 20), new OpenLayers.Pixel(0,0) );
	
	/* popups */
	unitHoverClass = OpenLayers.Class(OpenLayers.Popup.Anchored, {
		"autoSize": true,
		"displayClass": "",
		"contentDisplayClass": "unitinfoBox",
		"keepInMap": false
	});
	
	eventPopupClass = OpenLayers.Class(OpenLayers.Popup.Anchored, {
		"autoSize": true,
		"displayClass": "",
		"contentDisplayClass": "infoBox",
		"keepInMap": false
	});
	
	var offset = {'size':new OpenLayers.Size(0,0),'offset':new OpenLayers.Pixel(30,-30)};
	unitinfobox = new unitHoverClass("unitinfoBox", new OpenLayers.LonLat(0,0), null, "", offset, false);
	unitinfobox.relativePosition = "br";
	unitinfobox.calculateRelativePosition = function () {return 'br'; };
	unitinfobox.hide();
	map.addPopup(unitinfobox);
	
	offset = {'size':new OpenLayers.Size(0,0),'offset':new OpenLayers.Pixel(-330,-20)};
	infobox = new eventPopupClass("infoBox", new OpenLayers.LonLat(0,0), null, "", offset, true, function(){infobox.hide(); $(infobox.div).data("shown", "");});
	infobox.relativePosition = "br";
	infobox.calculateRelativePosition = function () {return 'br'; };
	infobox.setBackgroundColor("");
	infobox.hide();
	map.addPopup(infobox);
	
};

/** * * * * * * * * * *
* track Player logic  *
* * * * * * * * * * * */

freeze = function(){ clearTimeout(timeoutId); };

changeTime = function(value){
	var server_time = wialon.core.Session.getInstance().getServerTime();
	
	var tt = new Date(get_user_time(server_time, tz, dst)*1000);
	var tnow = new Date(tt);
	tt.setHours(0);
	tt.setMinutes(0);
	tt.setSeconds(0);
	tt.setMilliseconds(0);
	
	tnow.setHours(23);
	tnow.setMinutes(59);
	tnow.setSeconds(59);
	tnow.setMilliseconds(999);

	value = parseInt(value, 10);
	
	$("#t_begin").datetimepicker("option", "defaultDate", tt);
	$("#t_end").datetimepicker("option", "defaultDate", tnow);

	switch (value){
		case 0: /* today */
			$("#t_begin").datetimepicker( "setDate", tt);
			$("#t_end").datetimepicker( "setDate",  tnow);
		break;
		case 1: /* yesterday */
			tnow = new Date(tt);
			$("#t_begin").datetimepicker( "setDate", new Date(tt.setDate(tt.getDate()-1)) );
			$("#t_end").datetimepicker( "setDate",  new Date(tnow.setSeconds(-1)) );
		break;
		case 2: /* week */
			var day = tt.getDay();
			tt.setDate(tt.getDate() - day + (day == 0 ? -6:1));
			
			$("#t_begin").datetimepicker( "setDate", new Date(tt) );
			$("#t_end").datetimepicker( "setDate", tnow);
		break;
		case 3: /* month */
			tt.setDate(1);
			$("#t_begin").datetimepicker( "setDate", new Date(tt));
			$("#t_end").datetimepicker( "setDate", tnow);
		break;
		case 4: /* 7 days */
			tt = new Date(tnow);
			$("#t_begin").datetimepicker( "setDate", new Date(tt.setDate(tt.getDate()-7)) );
			$("#t_end").datetimepicker( "setDate", tnow);
		break;
		case 5: /* 30 days */
			tt = new Date(tnow);
			$("#t_begin").datetimepicker( "setDate", new Date(tt.setDate(tt.getDate()-30)) );
			$("#t_end").datetimepicker( "setDate", tnow);
		break;
	}
	
	$(window).resize();
	
	if(value<6){
		$("#timepickers").hide();
		setTimeRange();
	} else
		$("#timepickers").show();
};

setTimeRange = function(){
	pause();
	$("#set_interval_btn").prop("disabled",true);
	var t_from = Math.floor($("#t_begin").datetimepicker("getDate")/1000);
	var t_to = Math.floor($("#t_end").datetimepicker("getDate")/1000);
	
	t_from = get_abs_time(t_from, tz, dst);
	t_to = get_abs_time(t_to, tz, dst);
	
	if(t_to == to && t_from == from){
	} else if(t_to<=t_from){
		alert($.localise.tr("Wrong datetime format")); return;
	} else {
		if(infobox) infobox.hide();
		from = t_from;
		to = t_to;
		
		var val = $("#slider").slider("option", "value");
		val = from;
		
		$("#slider").slider("option",{
			min: from,
			max: to,
			value: val       
		});
		$("#info_block").slider("option",{
			min: from,
			max: to,
			value: val       
		});
		$("#range").slider("option",{
			values: [from,to],
			min: from,
			max: to
		});
		
		$(".photo").remove();
		$("#photos").css({width:"100%",left:"0%"});
		
		drawTimeline();
		
		for(var i in DataStorage){
			clearTimeout(DataStorage[i].getMessagesId);
			updateDataStorage(i);
		}
	}
};

changeSliderRange = function(evt, ui, keepRatio, changeValue ){
	/*
	 * keepRatio - keep same position on selected range (e.g while Drag), not Zoom when true
	 * changeValue - if keepRatio==true { change global current time or not }, set false on DblClick
	*/
	var o = $("#range").slider("option","values");
	var which = null;
	if(ui.handle){
		if(ui.handle.nextSibling == null) which = 0;
		else which = 1;
	}
	
/*== design block */
	var h = $("#range").children(".ui-slider-handle");
	if( ui.values[0]==from ){ h[0].style.opacity = 0.1; h[0].style.width = "2px"; }
	else { h[0].style.opacity = 1; h[0].style.width = "1px"; }
	if( ui.values[1]==to ){ h[1].style.opacity = 0.1; h[1].style.width = "2px"; }
	else { h[1].style.opacity = 1; h[1].style.width = "1px"; }
/* design block ==*/
	
	var val = $( "#slider").slider("option", "value");
	
	if(keepRatio){
		val =  ui.values[0] + (ui.values[1]-ui.values[0])*(val-o[0])/(o[1]-o[0]);
	} else if( changeValue ){
		if(val < ui.values[ 0 ]) val = ui.values[ 0 ];
		if(val > ui.values[ 1 ]) val = ui.values[ 1 ];
	}
	
	var p = (to-from)/(ui.values[1]-ui.values[0])*100;
	$("#photos").width( p+"%" ).css("left", "-"+p*(ui.values[0]-from)/(to-from)+"%" );
	
	if(plot && !keepRatio){
		var axes = plot.getAxes();
		var scale = ((axes.xaxis.options.max-axes.xaxis.options.min)/((ui.values[1]-ui.values[0])*1000));
		p = plot.getXAxes()[0].p2c(which!=null? ui.values[which]*1000 : (from+(from-to)/2)*1000);
		plot.zoom({amount:scale, center:{left:p, top:0}});
	}
	
	$("#slider").slider("option", {"value":val});
	$("#info_block").slider("option", {"min":ui.values[0], "max":ui.values[1]});
};

addDataStorage = function(){
	pause();
	
	var val = $("#units").val();
	if( !val ){ alert($.localise.tr("Select unit")); return;}
	if( DataStorage[val] ){
		alert($.localise.tr("There is a track for this unit already")); return;
	}
	$("#add_btn").prop("disabled", true);
	if(infobox) infobox.hide();

	$("#units [value="+val+"]").prop("disabled",true);
	
	var sess = wialon.core.Session.getInstance();
	var unit = sess.getItem( val );
	var color = $("#color .template.active").data("bckgrnd");
	
	var render = sess.getRenderer();
	var obj = layer_temp; // get template and set values
	obj.layerName = unit.getName();
	obj.itemId = unit.getId();
	obj.timeFrom = from;
	obj.timeTo = to;
	
	obj.trackColor = "c0"+ color;
	obj.pointColor = "c0"+ color;

	render.createMessagesLayer( obj, function(code, layer){
		$("#add_btn").prop("disabled",
			$("#units option:disabled").size() == $("#units option").size()
		);
		if(code || !layer){
			alert($.localise.tr(code==1001?"No messages for the selected interval":"Unable to build a track"));
			$("#units [value="+val+"]").prop("disabled",false);
			$("#add_btn").prop("disabled", false);
			return; 
		}
		initTrack(layer, obj.trackColor);
		unit.getTrips(from, to, layer.getName(), qx.lang.Function.bind(function(id, code, trips){
			if(code){ alert($.localise.tr("Unable to load trips")); return; }
			if(DataStorage[id]){
				DataStorage[id].trips = trips;
				updateTimeline();
			}
		}, this, layer.getUnitId()));
		initMessages(layer.getUnitId());
		activateUI(true);
	});
};

updateDataStorage = function( id ){
	DataStorage[id].photos = false;
	DataStorage[id].version++;
	for(var i=0; i<DataStorage[id].eventsMarkers.length; i++)
		if(DataStorage[id].eventsMarkers[i])
			events_layer.removeMarker(DataStorage[id].eventsMarkers[i]);
	DataStorage[id].eventsMarkers = [];
	
	var sess = wialon.core.Session.getInstance();
	var render = sess.getRenderer();
	if(DataStorage[id].layer && render)
		render.removeLayer(DataStorage[id].layer, function(code){
			updateMessageLayer(id, render);
		});
	else
		updateMessageLayer(id, render);
};

updateMessageLayer = function(id, render){
	var unit = DataStorage[id].unit;
	
	var obj = layer_temp; // get template and set values
	obj.layerName = unit.getName();
	obj.itemId = unit.getId();
	obj.timeFrom = from;
	obj.timeTo = to;
	obj.trackColor = DataStorage[id].color;
	obj.pointColor = DataStorage[id].color;
	
	render.createMessagesLayer( obj, function(code, layer){
		var checkbox = $("#unit_track_"+unit.getId()+" .check_wrapper input");
		if(code){
			if(code!=1001) alert($.localise.tr("Unable to build a track"));
			DataStorage[id].layer = null;
			$("#info_"+id).html(DataStorage[id].unit.getName());
			checkbox.click().prop("disabled",true);
			return; 
		}
		initTrack(layer, obj.trackColor);
		if( checkbox.prop("disabled") )
			checkbox.prop("disabled",false).click();
		unit.getTrips(from, to, layer.getName(), function(code, trips){
			if(code){ alert($.localise.tr("Unable to load trips")); return; }
			DataStorage[layer.getUnitId()].trips = trips;
			updateTimeline();
		});
		initMessages(layer.getUnitId());
	});
};

deleteDataStorage = function(val){
	pause();
	
	var sess = wialon.core.Session.getInstance();
	var rend = sess.getRenderer();
	if( !rend ){ alert($.localise.tr("Session error, restart the application")); }
	
	if( DataStorage[val] ){
		clearTimeout(DataStorage[val].getMessagesId);
		
		if(DataStorage[val].layer)
			rend.removeLayer(DataStorage[val].layer, function(){
				refreshMap();
				updateTimeline();
				
				var c = 0;
				for(var i in DataStorage) c++;
				if(c==0) activateUI(false);
			});
		
		markers.removeMarker(DataStorage[val].marker);
		markers.removeMarker(DataStorage[val].stopMarker);
		for(var i=0; i<DataStorage[val].eventsMarkers.length; i++)
			if(DataStorage[val].eventsMarkers[i])
				events_layer.removeMarker(DataStorage[val].eventsMarkers[i]);
		
		DataStorage[val] = null;
		delete DataStorage[val];
		
		refreshMap();
		
		$("#photos .ph_"+val).remove();
		$("#units [value="+val+"]").prop("disabled", false);
		$("#add_btn").prop("disabled",
			$("#units option:disabled").size() == $("#units option").size()
		);
	} else {
		alert($.localise.tr("Nothing to delete, no tracks for the given unit"));
	}
};

getUserDateTimeFormat = (function(){
	var format = false;

	var getAdaptedDateFormat = function(wialonDateFormat){
		var s = wialonDateFormat.replace(/(%\w)|_|%%/g, function(str){
			switch (str) {
				case "%Y": return 'yy';
				case "%y": return 'y';
				// month
				case "%B": return 'MM';   // MM - month name long
				case "%b": return 'M';    // M - month name short
				case "%m": return 'mm';   // mm - month of year (two digit)
				case "%l": return 'm';    // m - month of year (no leading zero)
				// day
				case "%A": return 'DD';   // DD - day name long
				case "%a": return 'D';    // D - day name short
				case "%E": return 'dd';   // dd - (two digit)
				case "%e": return 'd';    // d - (no leading zero)
				// for time format:
				case "%H": return 'HH';   // 24h
				case "%I": return 'hh';   // 12h
				case "%p": return 'TT';   // AM/PM
				case "%M": return 'mm';
				default: return '';
			}
		});

		return s;
	};

	/**
	 * getUserDateTimeFormat for current user
	 * @param  {boolean} timeOnly get timeOnly format (without date)
	 * @return {string}          format to use in wialon.util.DateTime.formatDate or wialon.util.DateTime.formatDate
	 */
	var getUserDateTimeFormat = function getUserDateTimeFormat(callback){
		if (!format) {
			wialon.core.Session.getInstance().getCurrUser().getLocale(function(code, locale){
				var t;

				!locale && (locale = {});
				locale.def = '%Y-%m-%E_%H:%M:%S';
				!locale.fd && (locale.fd = locale.def);
				typeof locale.wd === 'undefined' && (locale.wd = 1);

				t = wialon.util.DateTime.convertFormat(locale.fd, true);
				t = t.split('_');

				format = {
					fd: locale.fd,
					firstDay: locale.wd,
					date: t[0],
					time: t[1],
					dateTime: t[0] + '_' + t[1],
					dateTimeToPrint: t[0] + ' ' + t[1]
				};

				// Set settings for datepicker
				var tr_month =[
					$.localise.tr("January"),$.localise.tr("February"),$.localise.tr("March"),$.localise.tr("April"),
					$.localise.tr("May"),$.localise.tr("June"),$.localise.tr("July"),$.localise.tr("August"),
					$.localise.tr("September"),$.localise.tr("October"),$.localise.tr("November"),$.localise.tr("December")
				];
				var tr_month_short =[$.localise.tr("Jan"), $.localise.tr("Feb"), $.localise.tr("Mar"), $.localise.tr("Apr"),
					$.localise.tr("May"), $.localise.tr("Jun"), $.localise.tr("Jul"), $.localise.tr("Aug"),
					$.localise.tr("Sep"), $.localise.tr("Oct"), $.localise.tr("Nov"), $.localise.tr("Dec")];

				var tr_days =[
					$.localise.tr("Sunday"),$.localise.tr("Monday"),$.localise.tr("Tuesday"),$.localise.tr("Wednesday"),
					$.localise.tr("Thursday"),$.localise.tr("Friday"),$.localise.tr("Saturday")
				];

				var tr_days_short =[
					$.localise.tr("Sun"),$.localise.tr("Mon"),$.localise.tr("Tue"),$.localise.tr("Wed"),
					$.localise.tr("Thu"),$.localise.tr("Fri"),$.localise.tr("Sat")
				];

				var tr_days_min =[
					$.localise.tr("Su"),$.localise.tr("Mo"),$.localise.tr("Tu"),$.localise.tr("We"),
					$.localise.tr("Th"),$.localise.tr("Fr"),$.localise.tr("Sa")
				];

				// Update locale days & month names
				wialon.util.DateTime.setLocale(
					tr_days,
					tr_month,
					tr_days_short,
					tr_month_short
				);

				if (LANG !== 'en') {
					$.datepicker.regional[LANG] = {
						monthNames: tr_month,
						monthNamesShort: tr_month_short,
						dayNames: tr_days,
						dayNamesShort: tr_days_short,
						dayNamesMin: tr_days_min,
						isRTL: false,
						showMonthAfterYear: false,
						yearSuffix: ''};

					$.datepicker.setDefaults($.datepicker.regional[LANG]);
				}

				var settings = {
					showSecond: true,
					dateFormat: getAdaptedDateFormat( locale.fd.split('_')[0] ),
					timeFormat: format.time,
					// maxDate: maxDate,
					firstDay: format.firstDay,
					showButtonPanel:false,
					prevText: $.localise.tr("Prev"),
					nextText: $.localise.tr("Next"),
					monthNames: tr_month,
					dayNames: tr_days,
					dayNamesShort: tr_days_short,
					dayNamesMin: tr_days_min,
					timeText: $.localise.tr("Time"),
					hourText: $.localise.tr("Hours"),
					minuteText: $.localise.tr("Minutes"),
					secondText: $.localise.tr("Seconds"),
					controlType: "select"
				};

				// Test time format
				var tDate = new Date();
				tDate.setHours(0);
				tDate.setMinutes(0);
				tDate.setSeconds(0);
				tDate.setMilliseconds(0);
				var tMs = (tDate.getTime() / 1000 - 7 * 24 * 60 * 60) * 1000; // a week ago
				var tDate = new Date(tMs);
				var $testInput = $('<input>');
				$testInput.datetimepicker(settings);
				$testInput.datetimepicker('setDate', tDate);
				if ( $testInput.datetimepicker('getDate').getTime() !== tMs ) {
					settings.dateFormat = getAdaptedDateFormat( locale.def.split('_')[0] );
					settings.timeFormat = 'HH:mm:ss';
				}
				
				$("#t_begin").datetimepicker(settings);
				$("#t_end").datetimepicker(settings);
				
				$("#t_begin").change( function(){
					var t_from = Math.floor($("#t_begin").datetimepicker("getDate")/1000);
					t_from = get_abs_time(t_from, tz, dst);
					$("#set_interval_btn").prop("disabled",t_from==from);
				});
				$("#t_end").change( function(){
					var t_to = Math.floor($("#t_end").datetimepicker("getDate")/1000);
					t_to = get_abs_time(t_to, tz, dst);
					$("#set_interval_btn").prop("disabled",t_to==to);
				});

				callback();
			});
		}

		return format;
	};

	return getUserDateTimeFormat;
}());

tickFormat = function(v, axis){
	var wialonTimeFormat = getUserDateTimeFormat().fd.split('_')[1].replace('H', 'h');
	var timeUnitSize = {
		"second": 1000,
		"minute": 60 * 1000,
		"hour": 60 * 60 * 1000,
		"day": 24 * 60 * 60 * 1000,
		"month": 30 * 24 * 60 * 60 * 1000,
		"quarter": 3 * 30 * 24 * 60 * 60 * 1000,
		"year": 365.2425 * 24 * 60 * 60 * 1000
	};
	var opts = axis.options;
	var d = new Date(v);
	if(opts.timeOffset)
		d = new Date(d.setSeconds(axis.options.timeOffset));
	var t = axis.tickSize[0] * timeUnitSize[axis.tickSize[1]];
	var span = axis.max - axis.min;
	var suffix = (opts.twelveHourClock) ? " %p" : "";
	
	if (t < timeUnitSize.minute)
		fmt = wialonTimeFormat + suffix;
	else if (t < timeUnitSize.day) {
		if (span < 2 * timeUnitSize.day)
			fmt = wialonTimeFormat + suffix;
		else
			fmt = "%b %d " + wialonTimeFormat + suffix;
	}
	else if (t < timeUnitSize.month)
		fmt = "%b %d";
	else if (t < timeUnitSize.year) {
		if (span < timeUnitSize.year)
			fmt = "%b";
		else
			fmt = "%b %y";
	}
	else
		fmt = "%y";
	
	return $.plot.formatDate(d, fmt, opts.monthNames);
}

drawTimeline = function(){
	var count = getDataStorageCount();
	var photo = needPhoto();
	
	if(count){
		$("#graph").height(14+(photo?76:0)+count*18);
		$("#info_block").show();
	} else {
		$("#graph").height(1);
		$("#info_block").hide();
	}
	
	var t_from = (from + timezone)*1000;
	var t_to = (to + timezone)*1000;
	
	plot = $.plot("#graph", [], {
		series: {shadowSize: 0},
		xaxis: {
			mode: "time", show:true, min:t_from, max:t_to, color:"#FFF", tickColor:"#3e454d", timeOffset:-get_local_timezone() + tz + dst,
			tickFormatter: tickFormat,
			monthNames: [$.localise.tr("Jan"), $.localise.tr("Feb"), $.localise.tr("Mar"), $.localise.tr("Apr"),
						$.localise.tr("May"), $.localise.tr("Jun"), $.localise.tr("Jul"), $.localise.tr("Aug"),
						$.localise.tr("Sep"), $.localise.tr("Oct"), $.localise.tr("Nov"), $.localise.tr("Dec")],
			panRange: [t_from, t_to]
		},
		yaxis: {
			show:true, reserveSpace:false, autoscaleMargin:0, panRange:false, zoomRange:false, ticks:[0], labelWidth:0, labelHeight:0, tickColor:"#3e454d", min:0
		},
		pan: { interactive:true },
		grid: {borderWidth:0, labelMargin:0, axisMargin:0, minBorderMargin:0, hoverable:true, clickable: true, autoHighlight:false, mouseActiveRadius:20},
		legend: {show:false}
	});
	
	var canvas = plot.getCanvas();
	canvas.setAttribute("width", 10);
	canvas.setAttribute("height", 10);
	
	$("#graph").bind("plothover", function (event, pos, item) {
		showHoverInfo(item);
	});
	
	$("#graph").bind("plotclick", function (event, pos, item) {
		if(event.timeStamp-last_graph_click>10)
			last_graph_click = event.timeStamp;
		else return;
		if(item)
			eventMarkerClicked(item.series.label, item.dataIndex, null);
	});
	
	$("#graph").bind("plotpan", function (event, plot, delta) {
		pause();
		var axes = plot.getAxes();
		var min = Math.ceil(axes.xaxis.min/1000), max =Math.floor(axes.xaxis.max/1000);
		changeSliderRange(null, {values:[min, max]}, true, false);
		$("#range").slider("option","values",[min,max]);
	});
	
	$(window).resize();
};

updateTimeline = function(){
	var count = getDataStorageCount();
	var photo = needPhoto();
	
	if(count){
		$("#graph").height((photo?89:14)+count*18);
		$("#info_block").show();
	} else {
		$("#graph").height(1);
		$("#info_block").hide();
		$(window).resize();
		return;
	}
	plot.resize();
	
	var index = count;
	var data = []; 
	for(var id in DataStorage){
		if(!DataStorage[id].enable) continue;
		index--;
		
		var c = DataStorage[id].color;
		var d = [];
		var msg = [];
		var i;
		
		var l = DataStorage[id].trips.length;
		for(i=0; i< l; i++){
			d.push( [DataStorage[id].trips[i].from.t*1000, 10+18*index, 8, 0, 0] );
			d.push( [DataStorage[id].trips[i].to.t*1000, 0, 0, 0, 0] );
		}
		
		l = DataStorage[id].events.length;
		for(i=0; i< l; i++){
			msg.push( [DataStorage[id].events[i].t*1000, 10+18*index] );
		}
		if(d.length)
			data.push({
				data:d,
				fillArea:[{color:"#"+c.substr(2), representation:"symmetric", opacity:1}],
				lines: { show: false, steps: true}
			});
		if(msg.length)
			data.push({
				label:id,
				data:msg,
				points: {show:true, fillColor:"#00FFFF", radius: 3, lineWidth: 2},
				color:"#FFFFFF"
			});
	}
	plot.getOptions().yaxes[0].max = 18*count+(photo?78:2);    
	plot.setData(data);
	plot.setupGrid();
	
	$(window).resize();
};

resizeTimeline = function(){
	var count = getDataStorageCount();
	var photo = needPhoto();
	
	if(count){
		$("#graph").height((photo?89:14)+count*18);
		$("#info_block").show();
	} else {
		$("#graph").height(1);
		$("#info_block").hide();
		$(window).resize();
		return;
	}
	plot.resize();
	plot.getOptions().yaxes[0].max = 18*count+(photo?78:2);    
	plot.setupGrid();
	$(window).resize();
};

showHoverInfo = function(item) {
	if (item) {
		if (previousPoint != item.dataIndex) {
			previousPoint = item.dataIndex;
			
			if($("#graph_hover"))$("#graph_hover").remove();
			var msg_text = messagesUtils.getMessageText(DataStorage[item.series.label].events[item.dataIndex]);
			$('<div id="graph_hover"><div class="text">'+msg_text+'</div><div class="tick"></div></div>')
				.css({ display: "none" })
				.appendTo("body").fadeIn(100);
			
			$("#graph_hover").offset({top: item.pageY-18, left: item.pageX-310}).show();
		}
	} else {
		$("#graph_hover").remove();
		previousPoint = null;            
	}
};

initTrack = function(layer, color){
	if(!layer) return;
	
	var unitId = layer.getUnitId();
	var sess = wialon.core.Session.getInstance();
	var unit =sess.getItem( unitId );
	var unitMetrics = unit.getMeasureUnits();
	var n = unit.getName();
	var first = layer.getFirstPoint();
	var last = layer.getLastPoint();
	
	if( DataStorage[unitId] ){ // update
		
		DataStorage[unitId].hover = false;
		DataStorage[unitId].layer = layer;
		DataStorage[unitId].first = first;
		DataStorage[unitId].last  = last;
		DataStorage[unitId].msgIntervals = [];
		DataStorage[unitId].messages = [];
		DataStorage[unitId].trips = [];
		DataStorage[unitId].events = [];
		
		for(var i=0; i<DataStorage[unitId].eventsMarkers.length; i++)
			if(DataStorage[unitId].eventsMarkers[i])
				events_layer.removeMarker(DataStorage[unitId].eventsMarkers[i]);
		DataStorage[unitId].eventsMarkers = [];
		
		$("#toggle_photo_"+unitId).hide();
	} else { // create
		
		var eventIcon = new OpenLayers.Icon( "img/marker-"+$("#color .template.active").data("marker")+".png", new OpenLayers.Size(17, 21), new OpenLayers.Pixel(0, -21));
		var markerIcon = new OpenLayers.Icon( unit.getIconUrl(32), new OpenLayers.Size(32, 32));
		
		var lonlat = new OpenLayers.LonLat( first.lon, first.lat );
		lonlat.transform(map.displayProjection, map.getProjectionObject());
		var marker = new OpenLayers.Marker( lonlat, markerIcon );
		
		marker.events.register('mouseover', marker, qx.lang.Function.bind(unitHover , this, unitId, true) );
		marker.events.register('mouseout', marker, qx.lang.Function.bind(unitHover , this, unitId, false) );
		
		markers.addMarker(marker);
		
		var stopMarker = new OpenLayers.Marker( lonlat, stopIcon.clone() );
		markers.addMarker(stopMarker);
		
		var rotate = parseInt( unit.getCustomProperty("img_rot","0"), 10) ? true: false;

		DataStorage[unitId] = {
			"unit": unit,
			"layer": layer,
			"marker": marker,
			"stopMarker": stopMarker,
			"eventIcon": eventIcon,
			"first": first,
			"last": last,
			"msgIntervals": [],
			"messages": [],
			"trips": [],
			"events": [],
			"eventsMarkers": [],
			"color": color,
			"enable": true,
			"rotate": rotate,
			"follow": false,
			"photos": false,
			"showPhoto": true,
			"commons": {},
			"sensors": {},
			"hover": false,
			"version": 0
		};
		
		$("<div id='unit_track_"+unitId+"' class='unit_track' data-unitid='"+unitId+"' style='border-left:5px solid #"+color.substr(2)+"'>"+
			"<div class='check_wrapper' style='background:#"+color.substr(2)+"'>"+
				"<input style='margin-top:12px;' type='checkbox' data-color='"+color.substr(2)+"' checked onchange='enableTrackLayer(this);' title='"+$.localise.tr("Hide/show track")+"'/>"+
			"</div>"+
			"<img class='unit_icon' src='"+unit.getIconUrl(24)+"' alt='"+n+"' onclick='showUnitOnMap(this)' title='"+$.localise.tr("Focus on unit")+"'/>"+
			"<div class='info' id='info_"+unitId+"'></div>"+
			"<div class='unit_buttons'>"+
				"<a href='#' class='delete_btn' onclick='return deleteTrackClick(this);'><img src='img/del.png' alt='Delete' title='"+$.localise.tr("Delete track")+"'/></a>"+
				"<a href='#' class='unit_options_btn' onclick='return optionsUnit(this);'><img src='img/parametr.png' alt='Settings' title='"+$.localise.tr("Settings")+"'/></a>"+
				"<a href='#' class='unit_follow_btn' id='toggle_follow_"+unitId+"' onclick='return followUnit(this);'><img src='img/watch-on-map-dis.png' alt='Follow' title='"+$.localise.tr("Follow the unit on map")+"'/></a>"+
				"<a href='#' class='unit_photo_btn' id='toggle_photo_"+unitId+"' onclick='return photoUnit(this);'><img src='img/img-tr.png' alt='Toggle photo' title='"+$.localise.tr("Show/hide pictures")+"'/></a>"+
			"</div>"+
			"<div class='wrapper'><a href='#' onclick='toggleWatch(this);return false;' title='"+$.localise.tr("Show/hide parameters")+"'><img src='img/show.png'/></a>"+
				"<div class='settings'>"+
					"<div id='commons_"+unitId+"_speed' class='unit_speed' style='color:#"+color.substr(2)+"'>"+
						"<img class='icon' id='unit_speed_icon_"+unitId+"' alt='Speed' src='img/0.png'/>"+
						"<span id='unit_speed_"+unitId+"' title='"+$.localise.tr("Speed")+"'>0</span>"+
						"<span class='km'>"+$.localise.tr(unitMetrics ? "mph" : "kph")+"</span>"+
					"</div>"+
				"</div>"+
			"</div>"+
		"</div><pre/>").appendTo("#tracks_list");
		
		DataStorage[unitId].commons = { speed:{show:true, name:$.localise.tr("Speed"), value:0, metrics: $.localise.tr(unitMetrics ? "mph" : "kph")} };
		var sens = unit.getSensors();
		for(i in sens)
			DataStorage[unitId].sensors[sens[i].id]={show:false, name:sens[i].n, value:"-"};
	}
	
	/* common part for add and update */
	/* head info - unitName, mileage and first-last points */
	var mileage = layer.getMileage();
	if (typeof mileage != 'undefined') {
		mileage /= 1000;
		unitMetrics && (mileage *= 0.621);
	} else mileage = "0";
	
	$("#info_"+unitId).html(
		n+" /"+wialon.util.String.sprintf("%.2f&nbsp;%s ",mileage, $.localise.tr(unitMetrics ? "miles" : "km"))+"/<br/>"+
		"<a href='#' class='first' onclick='slideToTime("+first.time+");return false;' title='"+$.localise.tr("Go to the first message")+"'><img src='img/first.png' alt='Beginning'/></a>"+
		"<span>"+ wialon.util.DateTime.formatTime(first.time, 2, getUserDateTimeFormat().dateTimeToPrint) +" - "+ wialon.util.DateTime.formatTime(last.time, 0, getUserDateTimeFormat().dateTimeToPrint) +"</span>"+
		"<a href='#' class='last' onclick='slideToTime("+last.time+");return false;' title='"+$.localise.tr("Go to the last message")+"'><img src='img/last.png' alt='End'/></a>"
	);
	
	loadEvents(unitId);
	
	fitBoundsToMap();
};

unitHover = function(id, show, evt){
	if(!unitinfobox) return;
	
	if(show){
		var content = getUnitHoverContent(id ,$("#slider").slider("option", "value"), null);
		
		DataStorage[id].hover = true;
		unitinfobox.lonlat = DataStorage[id].marker.lonlat;
		unitinfobox.show();
		unitinfobox.setContentHTML(content);
		$(unitinfobox.div).css("border", "1px solid #"+DataStorage[id].color.substr(2));
	}else{
		DataStorage[id].hover = false;
		unitinfobox.hide();
	}
};

getUnitHoverContent = function(id, time, content){
	if(content == null){
		content = "";
		if(DataStorage[id].commons.speed.show)
			content += "<div class='row'>"+DataStorage[id].commons.speed.name+"<span>"+DataStorage[id].commons.speed.value+" "+DataStorage[id].commons.speed.metrics+"</span></div>";
		for(var s in DataStorage[id].sensors)
			if(DataStorage[id].sensors[s].show)
				content += "<div class='row'>"+DataStorage[id].sensors[s].name+"<span>"+DataStorage[id].sensors[s].value+"</span></div>";
	}
	
	var datetime = wialon.util.DateTime.formatTime(time, 0, getUserDateTimeFormat().dateTime).split('_');
	
	content = "<div class='text'><div class='header'>"+
		"<div class='row'>"+DataStorage[id].unit.getName()+"</div>"+
		"<div class='row'><span style='margin:0px; margin-right:5px;'>"+datetime[0]+"</span>"+datetime[1]+"</div></div>"+
		content+"</div>";
	return content;
}

loadEvents = function(unitId){
	if(busy){
		setTimeout(function(){ loadEvents(unitId); },1000);
		return;
	}
	if(!DataStorage[unitId]) return;
	if(DataStorage[unitId].events.length) return;
	busy=true;
	var ml = wialon.core.Session.getInstance().getMessagesLoader();
	ml.unload(function(){
		ml.loadInterval(unitId, from, to, 1536, 65280, 1, 
			function(code, data){
				if(code){
					busy = false;
					alert($.localise.tr("Unable to load events"));
					return;
				}
				if(!DataStorage[unitId]) return;
				
				var count = data.count;
				
				if(count>1000){
					alert(wialon.util.String.sprintf($.localise.tr("%d events have been found for %s. First 1000 of them will be shown.\nTo see other events, change time interval.") ,count, DataStorage[unitId].unit.getName()));
					count=1000;
				}
				ml.getMessages(0, count, function(code, data){
					busy = false;
					if(code){ alert($.localise.tr("Unable to load events")); return; }
					if(DataStorage[unitId]){
						DataStorage[unitId].events = data;
						showEventsOnMap(unitId);
						updateTimeline();
					}
				});
			}
		);
	});
};

showEventsOnMap = function(id){
	if(!DataStorage[id]) return;
	var lonlat, marker, evt, len = DataStorage[id].events.length, index;
	for(var i=0; i<len; i++){
		evt = DataStorage[id].events[i];
		if(evt.x==0 && evt.y==0){
			DataStorage[id].eventsMarkers.push(null);
			continue;
		}
		
		lonlat = new OpenLayers.LonLat( evt.x, evt.y );
		lonlat.transform(map.displayProjection, map.getProjectionObject());
		
		marker = new OpenLayers.Marker(lonlat, DataStorage[id].eventIcon.clone());
		
		events_layer.addMarker(marker);
		index = DataStorage[id].eventsMarkers.push(marker)-1;
		marker.events.register('click', marker, qx.lang.Function.bind(eventMarkerClicked, this, id, index) );
	}
	refreshMap();
};

eventMarkerClicked = function(id, i, evt){
	if(!infobox) return;
	if($(infobox.div).data("shown") == id+"_"+i){ //already shown
		infobox.hide();
		$(infobox.div).data("shown", "");
	} else {
		var content = messagesUtils.getMessageText(DataStorage[id].events[i]);
		content = '<div ><div class="text">'+content+'</div><div class="tick"></div></div>';
		
		var marker = DataStorage[id].eventsMarkers[i];
		if(marker){
			infobox.lonlat = marker.lonlat;
			infobox.setContentHTML(content);
			infobox.updatePosition();
			infobox.show();
			
			$(infobox.div).data("shown", id+"_"+i);
		}
	}
};

enableTrackLayer = function(obj){
	if(infobox) infobox.hide();
	var p = $(obj).parent();
	var enable = obj.checked;
	
	p.css("background",(enable?"#"+$(obj).data("color"):""));
	p = p.parent();
	var unitId = p.data("unitid");
	DataStorage[unitId].enable = enable;
	p.find(".info").css("color",(enable?"#FFF":"#9198a0"));
	p.find(".unit_options_btn").css("display",(enable?"block":"none"));
	p.find(".unit_follow_btn").css("display",(enable?"block":"none"));
	p.find(".unit_photo_btn").css("display",(enable && DataStorage[unitId].photos?"block":"none"));
	p.find(".wrapper").css("display",(enable?"block":"none"));
	$("#photos .ph_"+unitId).css("display",(enable && DataStorage[unitId].showPhoto ?"block":"none"));
	
	if(DataStorage[unitId].layer){
		var sess = wialon.core.Session.getInstance();
		var rend = sess.getRenderer();
		rend.enableLayer(DataStorage[unitId].layer, enable, function(){
			refreshMap();
			if(enable) moveCar($("#slider").slider("option","value"));
			else DataStorage[unitId].stopMarker.display(0);
			DataStorage[unitId].marker.display(enable);
			for(var i=0; i<DataStorage[unitId].eventsMarkers.length; i++)
				if(DataStorage[unitId].eventsMarkers[i])
					DataStorage[unitId].eventsMarkers[i].display(enable);
		});
	} else {
		refreshMap();
		DataStorage[unitId].stopMarker.display(0);
		DataStorage[unitId].marker.display(0);
	}
	
	updateTimeline();
};

deleteTrackClick = function(obj){
	if(infobox) infobox.hide();
	var p = $(obj).parent().parent();
	var unitId = p.data("unitid");
	p.animate({height: 'toggle'}, 600, function(){$(this).next().remove();$(this).remove();});
	deleteDataStorage(unitId);
	return false;
};

showUnitOnMap = function(obj){
	if(state == 'PLAY') // do not change map center in FOLLOW mode while PLAY
		for(var i in DataStorage)
			if( DataStorage[i].follow && DataStorage[i].enable ) return;
		
		var unitId = $(obj).parent().data("unitid");
		if(DataStorage[unitId].enable)
			map.setCenter(DataStorage[unitId].marker.lonlat);
};

followUnit = function(obj){
	var unitId = $(obj).parent().parent().data("unitid");
	var follow = !DataStorage[unitId].follow;
	
	for(var i in DataStorage)
		if(DataStorage[i].follow && unitId!=i){
			DataStorage[i].follow = false;
			$("#toggle_follow_"+i).children("img").attr("src","img/watch-on-map-dis.png");
		}
	
	DataStorage[unitId].follow = follow;
	$(obj).children("img").attr("src",follow?"img/watch-on-map.png":"img/watch-on-map-dis.png");
	if( state=="STOP" )
		followUnits();
	return false;
};

photoUnit = function(obj){
	var unitId = $(obj).parent().parent().data("unitid");
	var show = !DataStorage[unitId].showPhoto;
	DataStorage[unitId].showPhoto = show;
	
	$(obj).children("img").attr("src", show?"img/img-tr.png":"img/img-tr-dis.png");
	$("#photos .ph_"+unitId).css("display",(show?"block":"none"));
	
	$("#photos").css("display",(needPhoto()?"block":"none"));
	resizeTimeline();
	
	return false;
};

optionsUnit = function(obj){
	var unitId = $(obj).parent().parent().data("unitid");
	if( $("#dialog").css("display") == "none" || $("#dialog").data("unit")!=unitId ){
		$("#dialog").data("unit", unitId);
		/* clean old data */
		$("#dialog .all_params").html("");
		
		$("#rotate_icon").prop("checked", DataStorage[unitId].rotate);
		
		var i, show, count = 0;
		/* Speed, position */
		for(i in DataStorage[unitId].commons){
			count++;
			show = DataStorage[unitId].commons[i].show;
			
			$("<div class='row' id='list_commons_"+i+"' data-unit='"+unitId+"' data-commons='"+i+"' "+(show?"style='display:none;'":"")+">"+DataStorage[unitId].commons[i].name +"</div>")
				.dblclick(function(){ addWatch($(this), "commons"); })
				.appendTo("#commons");
			
			if( show ){
				count--;
				$("<div class='row shown' id='commons_"+i+"' data-unit='"+unitId+"' data-commons='"+i+"'>" + DataStorage[unitId].commons[i].name +"</div>")
				.dblclick( function(){ removeWatch( $(this), "commons"); } )
				.appendTo("#selected_options");
			}
		}
		if(!count) $("#commons").prev().addClass("grey");
		else $("#commons").prev().removeClass("grey");
		
		count = 0;
		/* Fill dialog with sensors */
		for(i in DataStorage[unitId].sensors){
			count++;
			show = DataStorage[unitId].sensors[i].show;
			
			$("<div class='row' id='list_sensors_"+i+"' data-unit='"+unitId+"' data-sensors='"+i+"' "+(show?"style='display:none;'":"")+">"+DataStorage[unitId].sensors[i].name +"</div>")
				.dblclick(function(){ addWatch($(this), "sensors"); })
				.appendTo("#sensors");
			
			if( show ){
				count--;
				$("<div class='row shown' id='sensors_"+i+"' data-unit='"+unitId+"' data-sensors='"+i+"'>" + DataStorage[unitId].sensors[i].name +"</div>")
					.dblclick(function(){ removeWatch($(this), "sensors"); })
					.appendTo("#selected_options");
			}
		}
		if(!count) $("#sensors").prev().addClass("grey");
		else $("#sensors").prev().removeClass("grey");
		
		var off = $(obj).offset();
		$("#dialog .header").css("border-left","5px solid #"+DataStorage[unitId].color.substr(2));
		$("#dialog .label").css("border-left","5px solid #"+DataStorage[unitId].color.substr(2));
		$("#dialog").css("left", off.left+50).css("top",150).show();
	} else
		$("#dialog").hide();
	return false;
};

changeUnitIconRotation = function(){
	var id = $("#dialog").data("unit");
	if(id && DataStorage[id]){
		var rot = !DataStorage[id].rotate;
		DataStorage[id].rotate = rot;
		$("#rotate_icon").prop("checked", rot);
		rotateIcon(id, rot?null:0);
	}
};

needDisable = function(id, type){
	var need = false;
	for( var i in DataStorage[id][type])
		if(DataStorage[id][type][i].show){
			need = true; break;
		}
	return need;
};

addWatch = function(obj, type){
	var unitId = obj.data("unit");
	var i = obj.data(type);
	obj.css("display","none");
	DataStorage[unitId][type][i].show = true;
	
	$("<div class='row shown' id='"+type+"_"+i+"' data-unit='"+unitId+"' data-"+type+"='"+i+"'>" + DataStorage[unitId][type][i].name +"</div>")
		.dblclick(function(){ removeWatch($(this), type); })
		.appendTo("#selected_options");
	
	if(needDisable(unitId, type))
		$("#"+type).prev().addClass("grey");
	else
		$("#"+type).prev().removeClass("grey");
	
	if(type=="commons") // speed
		$("#commons_"+unitId+"_"+i).show();
	else // sensors
		$("<div class='watch' id='"+type+"_"+unitId+"_"+i+"'>" + DataStorage[unitId].sensors[i].name +"<span>"+DataStorage[unitId].sensors[i].value+"</span></div>")
			.appendTo("#unit_track_"+unitId+" .settings");
};

removeWatch = function(obj, type){
	var unitId = obj.data("unit");
	var i = obj.data(type);
	$("#list_"+type+"_"+i).css("display","block");
	DataStorage[unitId][type][i].show = false;
	
	if(needDisable(unitId, type))
		$("#"+type).prev().addClass("grey");
	else
		$("#"+type).prev().removeClass("grey");
	
	obj.remove();
	if(type=="commons") // speed
		$("#commons_"+unitId+"_"+i).hide();
	else // params & sensors
		$("#"+type+"_"+unitId+"_"+i).remove();
};

toggleWatch = function(btn){
	var obj = $(btn).next();
	if(obj.css("display")=="inline-block"){
		$(btn).children("img").prop("src","img/hide.png");
		obj.slideUp(200);
	} else {
		$(btn).children("img").prop("src","img/show.png");
		obj.slideDown(200);
	}
};

initMessages = function(id){ // get messages for item
	var intCount =  Math.ceil(DataStorage[id].layer.getMessagesCount()/msgSize); // number of messages intervals
	DataStorage[id].msgIntervals[0] = DataStorage[id].first.time;
	DataStorage[id].msgIntervals[intCount] = DataStorage[id].last.time;
	
	wialon.core.Remote.getInstance().startBatch();
	for(var i=1; i<=intCount-1; i++){
		if(!DataStorage[id]) break;
		DataStorage[id].layer.getMessages(0, i*msgSize, i*msgSize, qx.lang.Function.bind(function(j, code, data){
			if(code || !DataStorage[id]){ return; }
			DataStorage[id].msgIntervals[j] = data[0].t;
		}, this, i));
	}
	wialon.core.Remote.getInstance().finishBatch( function(code){ if(code){ alert("Init messages error"); return;} });
	loadMessages(id, 0);
	if (intCount > 1) {
		loadMessages(id, intCount - 1);
	}
};

loadMessages = function(id, l){
	if (!DataStorage[id]) {
		return;
	}
	// check if already loaded
	if( DataStorage[id] && DataStorage[id].messages[l] && DataStorage[id].messages[l].length !==0){
		return;
	} else if( DataStorage[id].layer && l < DataStorage[id].msgIntervals.length-1 ){ // there are nonloaded intervals
		var to_msg = msgSize*(l+1)>DataStorage[id].layer.getMessagesCount() ? DataStorage[id].layer.getMessagesCount() : msgSize*(l+1);
		
		DataStorage[id].messages[l] = []; // indicate that LoadMessages already run
		DataStorage[id].layer.getMessages(0, msgSize*l, to_msg , qx.lang.Function.bind(function(l, version, code, data){  
			if(DataStorage[id] && DataStorage[id].version!=version)
				return;
			
			// First message speed
			if (!l && DataStorage[id].first.time === data[0].t) {
				DataStorage[id].first.speed = data[0].pos.s;
			}

			// Last message speed
			if ( to_msg == DataStorage[id].layer.getMessagesCount() && DataStorage[id].last.time === data[data.length-1].t ) {
				DataStorage[id].last.speed = data[data.length-1].pos.s;
			}

			if(code || !DataStorage[id] || !DataStorage[id].messages[l] || DataStorage[id].messages[l].length) return;
			DataStorage[id].messages[l] = data; // save messages
			
			for(var i=0; i< data.length; i++){
				if(data[i].p.image){
					var image = document.createElement('img');
					image.className = "photo";
					image.src = DataStorage[id].layer.getMessageImageUrl(0, msgSize*l+i, true);
					image.style.marginLeft = (data[i].t-from)/(to-from)*100+"%";
					image.onload = function(){
						
						var w = this.width, h = this.height;
						this.width = w * 70/h;
						this.height = 70;
						this.style.border = "1px solid #"+ DataStorage[id].color.substr(2);
						$(this).addClass("ph_"+id);
						$(this).hover(
							function(){
								var win = $(window).width();
								var pos = $(this).offset();
								var left = pos.left;
								var obj = $("#photo_hover");
								obj.prop("src",this.src).css("border","5px solid #"+ DataStorage[id].color.substr(2));
								
								var wi = obj.width();
								if( pos.left+wi > win) left = win - wi - 20;
								if( pos.left < 0) left = 10;
								obj.css("top",pos.top-85-obj.height()).css("left", left).show();
								
							},
							function(){ $("#photo_hover").hide(); } 
						);
						$("#photos").append(this);
					};
					
					if(!DataStorage[id].photos){
						DataStorage[id].photos = true;
						$("#toggle_photo_"+id).css("display","block");
						$("#photos").css("display",(needPhoto()?"block":"none"));
						updateTimeline();
					}
				}
			}
			
			DataStorage[id].getMessagesId = setTimeout(function(){loadMessages(id, l+1);}, messagesLoadSpeed);
			if(!l) activateUI( true ); //activate 
		}, this, l, DataStorage[id].version));
	}
};

activateUI = function( enable ){
	$("#control").css("display", (enable?"block":"none"));
	$("#slider").slider("option", "disabled", !enable);
	$("#range").slider("option", "disabled", !enable);
	$("#tostart_btn").prop("disabled", !enable);
	$("#stepleft_btn").prop("disabled", !enable);
	$("#play_btn").prop("disabled", !enable);
	$("#toend_btn").prop("disabled", !enable);
	$("#stepright_btn").prop("disabled", !enable);
	$("#settings_btn").prop("disabled", !enable);
	if(!enable){
		$("#layout .step_wrapper").hide();
		$("#settings_dialog").hide();
	}
	$(window).resize();
};

fitBoundsToMap = function(){
	
	var llb = new OpenLayers.Bounds();
	for(var i in DataStorage){
		if(DataStorage[i].follow){ refreshMap(); return; }
		if(!DataStorage[i].layer) continue;
		var b = DataStorage[i].layer.getBounds(); 
		
		llb.extend( new OpenLayers.LonLat(b[1],b[0]).transform(map.displayProjection, map.getProjectionObject()) );
		llb.extend( new OpenLayers.LonLat(b[3],b[2]).transform(map.displayProjection, map.getProjectionObject()) );
	}
	
	refreshMap();  
	
	map.zoomToExtent(llb);
	
};

refreshMap = function(){ // redraw Routes layer
	if(map){
		var l = map.getLayersByName("Routes")[0];
		if(l){
			l.res_name = wialon.core.Session.getInstance().getBaseUrl() + "/adfurl" + new Date().getTime() + "/avl_render";
			l.redraw();
		}
	}
};

pause = function(){
	if(state == "PLAY"){
		freeze();
		state = "STOP";
		$("#play_btn").css("background","url('img/play.png') no-repeat");
	}
};

slideToTime = function(time, play){
	var range = $("#range").slider("option","values");
	
	if(time < range[0]){ time = range[0]; pause(); }
	if(time > range[1]){ time = range[1]; pause(); }
	
	$("#slider").slider("option","value",time);
	
	if(play){
		freeze();
		// wait 3*speed after skip
		setTimeout( function(){ state = "PLAY"; slide(); }, 3*speed);
	}
};

showTime = function(time){
	if(typeof(wialon)=="undefined") return;
	var str = (wialon.util.DateTime.formatTime(time, 0, getUserDateTimeFormat().dateTime)).split('_');
	$("#t_curr .d").html(str[0]);
	$("#t_curr .t").html(str[1]);
	
};

slide = function(){
	var range = $("#range").slider("option","values");
	var slide_start = new Date();
	var time = $("#slider").slider("option","value");
	var step = $("#step").slider("option","value");
	
	time_prev = time;
	time += step;
	
	slideToTime(time);
	
	if( state=="PLAY" && (time+step <= range[1]) ){
		var slide_end = new Date();
		if(slide_end - slide_start < speed)
			idTimeout = setTimeout(slide, speed - (slide_end - slide_start));
		else slide();
	} else {
		pause();
	}
};

rotateIcon = function(id, degree){
	if(DataStorage[id]){
		if(degree==null){
			if(!DataStorage[id].lastPos) return;
			if(DataStorage[id].lastPos.course)
				degree = DataStorage[id].lastPos.course;
			else{
				var msg = DataStorage[id].lastPos.message;
				if(msg && msg.pos && msg.pos.c)
					degree = msg.pos.c % 360;
			}
		}
		if(degree != null)
			$("#"+ DataStorage[id].marker.icon.imageDiv.id +"_innerImage").rotate(degree);
	}
};

moveCar = function(time){
	var LatLngList = [];
	
	var isAnyMove = false;
	var nextTripTime = null;
	
	for(var i in DataStorage){
		if(!DataStorage[i].enable) continue;
		
		var pos = findPos(time, i);
		if( pos.ok ){
			var hoverContent = "";
			DataStorage[i].lastPos = pos;
			
			showStopInfo( pos, i );
			var latlng = new OpenLayers.LonLat(pos.x, pos.y);
			latlng.transform(map.displayProjection, map.getProjectionObject());
			
			var px = map.getLayerPxFromLonLat(latlng);
			if (px)
				DataStorage[i].marker.moveTo(px);
			
			/* rotate */
			if(DataStorage[i].rotate)
				rotateIcon(i, null);
			
			/* follow */
			if(DataStorage[i].follow) LatLngList.push(latlng);
			
			/* speed */
			var sp = pos.speed || 0;
			DataStorage[i].unit.getMeasureUnits() && (sp *= 0.621);
			
			if(DataStorage[i].commons.speed.show)
				hoverContent += "<div class='row'>"+$.localise.tr("Speed")+"<span>"+sp.toFixed(2)+" "+DataStorage[i].commons.speed.metrics+"</span></div>";
			
			DataStorage[i].commons.speed.value = Math.round(sp);
			$("#unit_speed_"+i).html( DataStorage[i].commons.speed.value );
			sp = sp - sp%10 + (sp>0?10:0);
			$("#unit_speed_icon_"+i).attr("src","img/"+(sp<180?(sp<60?sp:sp-(sp-60)%20):180)+".png");
			
			/* sensors */
			for(var s in DataStorage[i].sensors){
				var u = DataStorage[i].unit;
				var sens = u.getSensor(s);
				var sens_val = u.calculateSensorValue(sens, pos.message);
				var value;
				
				if (typeof sens_val == "string")
					value = sens_val;
				else
					value = sensorsUtils.get_formatted_value( sens, sens_val );
				
				DataStorage[i].sensors[s].value = (sens_val!=-348201.3876 && value!=undefined? value : "-");
				if(DataStorage[i].sensors[s].show){
					$("#sensors_"+i+"_"+s).children("span").html( DataStorage[i].sensors[s].value );
					hoverContent += "<div class='row'>"+DataStorage[i].sensors[s].name+"<span>"+DataStorage[i].sensors[s].value+"</span></div>";
				}
			}
			/* hover */
			if(DataStorage[i].hover){
				var content = getUnitHoverContent(i, time, hoverContent);
				unitinfobox.lonlat = latlng;
				unitinfobox.setContentHTML(content);
			}
			
			if(pos.trip){
				isAnyMove = isAnyMove || pos.trip.move;
				if( pos.trip.tripIndex!=undefined && pos.trip.tripIndex+1<DataStorage[i].trips.length){
					var trip_time = DataStorage[i].trips[pos.trip.tripIndex+1].from.t;
					if( trip_time<nextTripTime || nextTripTime==null )
						nextTripTime = trip_time;
				}
			}
		} else {
			isAnyMove = true;
			if(DataStorage[i].follow) LatLngList.push(DataStorage[i].marker.lonlat);
		}
	}
	if(!isAnyMove && nextTripTime!=null && skipBeetweenTrips && state=="PLAY"){
		freeze();
		state="STOP";
		slideToTime(nextTripTime, true);
		return;
	}
	
	followUnits(LatLngList);
};

followUnits = function(LatLngList){
	if(!LatLngList){
		LatLngList = [];
		for(var i in DataStorage){
			if(!DataStorage[i].enable) continue;
			if(DataStorage[i].follow) LatLngList.push(DataStorage[i].marker.lonlat);
		}
	}
	var lll = LatLngList.length;
	if(lll == 1){
		map.setCenter(LatLngList[0]);
	}
};

/* DO NOT TOUGHT IF DONT KNOW WHAT YOU ARE DOING */
findPos = function(time, i){
	var obj = { "ok":true, "move":true, "time":time, "speed":0 };
	var first = DataStorage[i].first;
	var last = DataStorage[i].last;
	
	if (time === first.time) {
		obj.speed = first.speed || 0;
	}
	else if (time === last.time) {
		obj.speed = last.speed || 0;
	}

	if( time <= first.time ){// before first
		obj.x = first.lon;
		obj.y = first.lat;
		obj.move = false;
		obj.trip = {move:false, tripIndex:-1};
	} else if (time >= last.time ){// after last
		obj.x = last.lon;
		obj.y = last.lat;
		obj.move = false;
	} else {
		
		var msgInt; 
		// check previous
		var lp = DataStorage[i].lastPos;
		// if stil in same interval    
		if( lp && DataStorage[i].msgIntervals[lp.msgInt]<=time && DataStorage[i].msgIntervals[lp.msgInt+1]>time){
			msgInt = lp.msgInt;
		} else { // else - have to find interval
			msgInt = findMsgInterval(DataStorage[i].msgIntervals, time);
			if(!DataStorage[i].messages[msgInt]){ // messages not loaded
				clearTimeout(DataStorage[i].getMessagesId); // stop load
				freeze();
				loadMessages(i, msgInt);
				obj.ok = false;
				return obj;
			}
		}
		// if messages not loaded yet
		if(!DataStorage[i].messages[msgInt] || !DataStorage[i].messages[msgInt].length){
			obj.ok = false;
			return obj;
		}
		
		obj.msgInt = msgInt; // save interval index for next time
		
		var index; // index of message in message[] array
		// check previous
		if(lp && lp.ind>0 && lp.ind < DataStorage[i].messages[msgInt].length &&
			DataStorage[i].messages[msgInt][lp.ind].t<time && DataStorage[i].messages[msgInt][lp.ind+1].t>=time)
			{   // if still between same points (messages)
				index = lp.ind;
			} else { // else - need to find //OPTIMIZATION - check next message
				index = findRightPlace( DataStorage[i].messages[msgInt], 0, DataStorage[i].messages[msgInt].length-1, time);
			}

		if(index == -1) { obj.ok = false; return obj; }
			
		if(!DataStorage[i].trips || ! DataStorage[i].trips.length) {
			obj.ok = false;
			return obj;
		}
		var trip = isMove( DataStorage[i].trips, 0, DataStorage[i].trips.length-1, time);
		
		// get "begin" and "end" of line where unit in cur time
		var m1 = DataStorage[i].messages[msgInt][index], m2 = DataStorage[i].messages[msgInt][index+1];
		
		// save message index for next time
		obj.ind = index;
		obj.message = m1;
		obj.trip = trip;
		
		var move = trip.move;  
		if(!move && trip.pos){ // not move (not in trip) and position was found in trip info
			obj.x = trip.pos.to.p.x;
			obj.y = trip.pos.to.p.y;
			obj.move = false;
		} else {  // msgInt - index of interval of messages where unit in time
			
			var t = index, tt = msgInt;
			while( !m1.pos ){
				if(t>=0) m1 = DataStorage[i].messages[tt][t--];
				else if(tt>0) {
					tt--; 
					if(DataStorage[i].messages[tt] && DataStorage[i].messages[tt].length)
						t=DataStorage[i].messages[tt].length-1;
					else break;
				} else break;
			}
			
			t = index+1, tt = msgInt;
			while( !m2.pos ){
				if(t<DataStorage[i].messages[tt].length) m2 = DataStorage[i].messages[tt][t++];
				else if(tt<DataStorage[i].messages.length-2) {
					tt++;
					if(DataStorage[i].messages[tt] && DataStorage[i].messages[tt].length)
						t=0;
					else break;
				} else break;
			}
			
			if( !m1.pos || !m2.pos ){ // if position unknown - leave...
				obj.ok = false;
			} else if(move){ // if unit moves - calculate point on line
				var ko = (time-m1.t)/(m2.t-m1.t);
				obj.x = m1.pos.x + (m2.pos.x-m1.pos.x)*ko;
				obj.y = m1.pos.y + (m2.pos.y-m1.pos.y)*ko;    
				obj.speed = m1.pos.s + (m2.pos.s-m1.pos.s)*ko;
				
				if(Math.abs(m2.pos.y-m1.pos.y)<0.00001 && Math.abs(m2.pos.x-m1.pos.x)<0.00001)
					obj.course = m1.pos.c;
				else{
					var p1 = getMeters(obj.x, obj.y);
					var p2 = getMeters(m2.pos.x, m2.pos.y);
					var angle = Math.atan2(p2.x-p1.x, p2.y-p1.y);
					var degrees = (angle*180/Math.PI);
					
					obj.course = degrees;
				}
			} else { // unit doesnt move
				obj.x = m1.pos.x;
				obj.y = m1.pos.y;
				obj.move = false;
			}
		}
	}
	return obj;
};

showStopInfo = function( pos, id ){ // show stop marker when unit doesnt move
	var latlng = new OpenLayers.LonLat(pos.x, pos.y);
	latlng.transform(map.displayProjection, map.getProjectionObject());
	if(pos.move){
		DataStorage[id].stopMarker.display(0);
	} else {
		DataStorage[id].stopMarker.display(1);
		var px = map.getLayerPxFromLonLat(latlng);
		if (px)
			DataStorage[id].stopMarker.moveTo(px);
	}
};

getDataStorageCount = function(){ // get count of shown tracks
	var count = 0;
	for(var i in DataStorage) if(DataStorage[i].enable) count++;
	return count;
};

needPhoto = function(){
	for(var i in DataStorage){
		if(DataStorage[i].enable && DataStorage[i].photos && DataStorage[i].showPhoto)
			return true;
	}
	return false;
};

/* binary search */
findRightPlace = function( arr, imin, imax, time ){
	if( imax-imin==1){ 
		if(arr[imin].t<time && arr[imax].t>=time) return imin;
		else return -1;    
	}
	var imid = parseInt((imax+imin)/2, 10);
	if(arr[imid].t>=time)
		return findRightPlace( arr, imin, imid, time);
	else if (arr[imid].t<=time)
		return findRightPlace( arr, imid, imax, time);
	else return -1;
};

isMove = function( arr, imin, imax, time ){
	var obj = {"move":false};
	if( imin>imax){
		if(imax >-1)
		obj.pos = arr[imax];
		obj.tripIndex = imax;
		return obj;
	} 
	var imid = parseInt((imax+imin)/2, 10);
	if(arr[imid].from.t>time)
		return isMove( arr, imin, imid-1, time);
	else if (arr[imid].to.t<time)
		return isMove( arr, imid+1, imax, time);
	else if(arr[imid].from.t<=time && arr[imid].to.t>=time){
		obj.tripIndex = imid;
		obj.move = true;
		return obj;
	}else{
		return obj;
	}
};

findMsgInterval = function( arr, time ){
	var res = -1;
	for(var i=0; i<arr.length-1; i++)
	if(arr[i]<=time && arr[i+1]>time){
		res = i; break;
	}
	return res;
};
