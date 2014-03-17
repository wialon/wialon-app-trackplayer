/************************************************************************

	JavaScript for Track Player - WEB applications, developed on the basis of SDK for Wialon Hosting and Wialon Kit.

	http://apps.wialon.com

	Copyright:
	2002-2013 Gurtam, http://gurtam.com

	License:
	MIT: https://github.com/wialon/wialon-app-trackplayer/blob/master/LICENSE-MIT

	************************************************************************/

$(window).resize(function(){
	$("#dialog").hide();
	
	var h = $(window).height();
	var w = $(window).width();
	if(h<200) h = 200;
	if(w<400) w = 400;
	
	if(plot){
		plot.resize();
		plot.draw();
	}
	
	var add_h = 5;
	if($("#control").css("display") == "block")
		$("#control").height( $("#playline_block").height() + $("#info_block").height());
	else{
		$("#control").height(0);
		add_h = 2;
	}
	
	$(".timeline_wrapper").width( $("#control").width() - $("#playline_block .b1").width() - $("#playline_block .b2").width() - 45 );
	
	$("#layout").height(h - 72);
	var menu_h  = h - 72 - $("#control").height();
	$("#menu").height( menu_h );
	$("#tracks_list").height(menu_h - $("#menu .header").height() - $("#menu .tracks").height() - 34);
	
	$(".map_wrapper").width(w - $("#menu").width() - 3);
	$(".map_wrapper").height($("#layout").height() - $("#control").height() - add_h);
	
	if(map)
		map.updateSize();
});

function ltranslate(){
	$("#tr_interval").html($.localise.tr("Interval"));
	$("#tr_unit").html($.localise.tr("Unit"));
	$("#tr_tracks").html($.localise.tr("Tracks"));
	$("#tr_monitoring_info").html($.localise.tr("Monitoring info"));
	$("#tr_rotate_icon").html($.localise.tr("Rotate icon"));
	$("#dialog .plain_text").html($.localise.tr("Double-click on necessary sensors below to track them."));
	$("#tr_common").html($.localise.tr("General information"));
	$("#tr_sensors").html($.localise.tr("Sensors"));
	$("#tr_skip_trips").html($.localise.tr("Skip intervals between trips"));

	$("#set_interval_btn").val($.localise.tr("Change interval"));
	$("#add_btn").val($.localise.tr("Show track"));

	$("#step_val").prop("title", $.localise.tr("Playback speed"));
	$("#tr_hide_dialog").prop("title", $.localise.tr("Hide settings"));

	var intervals = "<option value='0'>" + $.localise.tr("Today") + "</option>";
	intervals += "<option value='1'>" + $.localise.tr("Yesterday") + "</option>";
	intervals += "<option value='2'>" + $.localise.tr("Current week") + "</option>";
	intervals += "<option value='3'>" + $.localise.tr("Current month") + "</option>";
	intervals += "<option value='4'>" + $.localise.tr("7 days") + "</option>";
	intervals += "<option value='5'>" + $.localise.tr("30 days") + "</option>";
	intervals += "<option value='6'>" + $.localise.tr("Custom interval") + "</option>";
	$("#time_interval").html(intervals);

	Messages.prototype.translation = {
		bytes_counter_is: $.localise.tr("GPRS traffic counter value: %d KB."),
		bytes_counter_reset: $.localise.tr("GPRS traffic counter reset. %d KB consumed."),
		engine_hours_counter_is: $.localise.tr("Engine hours counter value is %d h."),
		engine_hours_counter_reset: $.localise.tr("Engine hours counter value was changed from %d h to %d h."),
		mileage_counter_is: $.localise.tr("Mileage counter value is %d km."),
		mileage_counter_reset: $.localise.tr("Mileage counter value was changed from %d km to %d km."),
		rt_aborted: $.localise.tr("Route '%s': round aborted."),
		rt_arrived: $.localise.tr("Route '%s': arrival at point '%s'."),
		rt_departured: $.localise.tr("Route '%s': departure from point '%s'."),
		rt_finished: $.localise.tr("Route '%s': round finished."),
		rt_in_time: $.localise.tr("Route '%s': unit returned to schedule."),
		rt_skipped: $.localise.tr("Route '%s': point '%s' skipped."),
		rt_started: $.localise.tr("Route '%s': round by schedule '%s' started."),
		rt_too_early: $.localise.tr("Route '%s': unit is ahead of schedule."),
		rt_too_late: $.localise.tr("Route '%s': unit is late."),
		zone_in: $.localise.tr("Route %s: entered %s"),
		zone_out: $.localise.tr("Route %s: left %s"),
		route_event: $.localise.tr("Route"),
		event: $.localise.tr("Event"),
		maintenance: $.localise.tr("Filling"),
		reg_filling: $.localise.tr("Maintenance"),
		violation: $.localise.tr("Violation")
	};

	Sensors.prototype.translation = {
		absolute_engine_hours: $.localise.tr("Absolute engine hours"),
		absolute_fuel_consumption_type: $.localise.tr("Absolute fuel consumption sensor"),
		accelerometer: $.localise.tr("Accelerometer"),
		counter: $.localise.tr("Counter sensor"),
		custom: $.localise.tr("Custom sensor"),
		device_states: $.localise.tr("State sensor"),
		digital: $.localise.tr("Custom digital sensor"),
		driver_assignment: $.localise.tr("Driver binding"),
		engine_efficiency: $.localise.tr("Engine efficiency sensor"),
		engine_operation_type: $.localise.tr("Engine ignition sensor"),
		engine_rpm_type: $.localise.tr("Engine revs sensor"),
		equipment_assignment: $.localise.tr("Equipment binding"),
		fuel_type: $.localise.tr("Fuel level sensor"),
		hr: $.localise.tr("hours"),
		impulse_fuel_consumption_type: $.localise.tr("Impulse fuel consumption sensor"),
		impulse_fuel_level_type: $.localise.tr("Fuel level impulse sensor"),
		instant_fuel_consumption_type: $.localise.tr("Instant fuel consumption sensor"),
		km: $.localise.tr("km"),
		litres: $.localise.tr("litres"),
		m: $.localise.tr("m"),
		mileage: $.localise.tr("Mileage sensor"),
		odometer: $.localise.tr("Relative odometer"),
		on_off: $.localise.tr("On/Off"),
		relative_engine_hours: $.localise.tr("Relative engine hours"),
		rpm: $.localise.tr("rpm"),
		search_by_sensors_comment: $.localise.tr("Enter sensor name, type, description or parameter."),
		sensors: $.localise.tr("Sensors"),
		temperature_coefficient: $.localise.tr("Temperature coefficient"),
		temperature_type: $.localise.tr("Temperature sensor"),
		trailer_assignment: $.localise.tr("Trailer binding"),
		voltage: $.localise.tr("V"),
		voltage_type: $.localise.tr("Voltage sensor"),
		on: $.localise.tr("on"),
		off: $.localise.tr("off")
	};

	messagesUtils = new Messages();
	sensorsUtils = new Sensors();
	sensorsUtils.init();
}

$(document).ready(function(){
	$(window).resize();

	LANG = get_html_var("lang");
	if ((!LANG) || ($.inArray(LANG, ["en", "ru", "sk"]) == -1))
		LANG = "en";

	$.localise('lang/', {language: LANG});
	ltranslate();

	$("#color .template").click( function(){
		$("#color .template").removeClass("active").children("div").hide();
		$(this).addClass("active").children("div").show();
		setCookie("app_trpl_color", $(this).data("bckgrnd"));
	});

	var playbackSpeed = null;
	var cookies = document.cookie.split("; ");
	for (var i = 0; i < cookies.length; i++) {
		cookies[i] = cookies[i].split("=");
		if (cookies[i].length == 1)
			cookies[i].push("");
		if (cookies[i][0] == "app_trpl_color"){
			var color = unescape(wrapString(cookies[i][1]));
			$("#color .template").each(function(){
				if($(this).data("bckgrnd")==color){
					$(this).click();
				}
			});
		} else if (cookies[i][0] == "app_trpl_speed")
			playbackSpeed = parseInt(cookies[i][1],10);
		else if (cookies[i][0] == "app_trpl_skip"){
			skipBeetweenTrips = parseInt(cookies[i][1],10) ? true : false;
			$("#skip_trips_ch").prop("checked", skipBeetweenTrips);
		}
	}

	if (!playbackSpeed || playbackSpeed<1)
		playbackSpeed = 1;
	else if (playbackSpeed>9)
		playbackSpeed = 9;

	init();

	var tr_month =[
		$.localise.tr("January"),$.localise.tr("February"),$.localise.tr("March"),$.localise.tr("April"),
		$.localise.tr("May"),$.localise.tr("June"),$.localise.tr("July"),$.localise.tr("August"),
		$.localise.tr("September"),$.localise.tr("October"),$.localise.tr("November"),$.localise.tr("December")
	];

	var tr_days =[
		$.localise.tr("sunday"),$.localise.tr("monday"),$.localise.tr("tuesday"),$.localise.tr("wednesday"),
		$.localise.tr("thursday"),$.localise.tr("friday"),$.localise.tr("saturday")
	];

	var tr_days_short =[
		$.localise.tr("sun"),$.localise.tr("mon"),$.localise.tr("tue"),$.localise.tr("wed"),
		$.localise.tr("thu"),$.localise.tr("fri"),$.localise.tr("sat")
	];

	var tr_days_min =[
		$.localise.tr("Su"),$.localise.tr("Mo"),$.localise.tr("Tu"),$.localise.tr("We"),
		$.localise.tr("Th"),$.localise.tr("Fr"),$.localise.tr("Sa")
	];

	$("#t_begin").datetimepicker({
		showSecond: true,
		dateFormat: "yy-mm-dd",
		timeFormat: "HH:mm:ss",
		maxDate: new Date(),
		firstDay: 1,
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
	});
	
	$("#t_end").datetimepicker({
		showSecond: true,
		dateFormat: "yy-mm-dd",
		timeFormat: "HH:mm:ss",
		maxDate: new Date(),
		firstDay: 1,
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
	});
	
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
	
	$("#slider").slider({
		range: "min",
		step: 1,
		disabled:true,
		change: function(evt, ui){
			$("#info_block").slider("option", "value", ui.value);
		},
		slide: function(evt, ui){
			var values = $("#range").slider("option","values");    
			if(ui.value < values[ 0 ]){
				$(this).slider("option", {value: values[0]});
				return false;
			}
			if(ui.value > values[ 1 ]){
				$(this).slider("option", {value: values[1]});
				return false;
			}
			
			$("#info_block").slider("option",{value:ui.value});
			return true;
		},
		start: function(evt, ui){
			if(state=="PLAY"){
				freeze();
				state = "STOP";
				paused = true;
			}
		},
		stop: function(){
			if (paused) {
				paused = false;
				state = "PLAY";
				slide();
			}
		}
	});
	$("#info_block").slider({
		step: 1,
		disabled:true,
		change:function(evt, ui){
			showTime(ui.value);
			moveCar(ui.value);
		}
	});
	
	$("#range").slider({
		range: true,
		step: 1,
		disabled:true,
		slide: function(evt,ui){
			if(ui.values[1]-ui.values[0] < minRange){
				return false;
			}
			changeSliderRange(evt, ui, false, true);
			return true;
		},
		start: function(){ $("body").css("cursor","move"); },
		stop: function(){ $("body").css("cursor","auto"); }
	});
	
	$("#range .ui-slider-handle").dblclick(function(){
		var opt = $("#range").slider("option","values");
		changeSliderRange(null, {handle:true, values:[opt[0], to]}, false, false);
		changeSliderRange(null, {handle:{nextSibling:true}, values:[from, to]}, false, false);
		$("#range").slider("option","values",[from, to]);
	});
	
	$("#set_interval_btn").click( setTimeRange );
	
	$("#play_btn").click( function(){
		if(state=="STOP"){
			$("#play_btn").css("background","url('img/pause.png') no-repeat");
			state = "PLAY";
			slide();
		} else {
			pause();
		}
	});
	
	$("#tostart_btn").click( function(){ slideToTime(from); });
	$("#toend_btn").click( function(){ slideToTime(to); });
	
	$("#stepleft_btn").click( function(){ 
		pause();
		var time = $("#slider").slider("option","value");
		var step = $("#step").slider("option","value");
		slideToTime(time-step);
	});
	$("#stepright_btn").click( function(){
		pause();
		var time = $("#slider").slider("option","value");
		var step = $("#step").slider("option","value");
		slideToTime(time+step);
	});
	
	$("#add_btn").click( addDataStorage );
	
	$("#settings_btn").click(function(evt){
		var obj = $("#settings_dialog");
		obj.toggle();
	});
	
	$("#step_val").click(function(evt){
		var obj = $("#layout .step_wrapper");
		if( obj.css("display") == "none"){
			obj.show().focus();
		} else {
			obj.hide();
		}
	});
	
	$("#step").slider({
		orientation:"vertical",
		min:1,
		max:9,
		step:1,
		value:playbackSpeed,
		slide: function(evt,obj){
			$("#step_val").html(obj.value/speed*1000+"x");
			setCookie("app_trpl_speed", obj.value);
		},
		change: function(evt,obj){
			$("#step_val").html(obj.value/speed*1000+"x");
			setCookie("app_trpl_speed", obj.value);
		}
	});
	$("#step_val").html(playbackSpeed/speed*1000+"x");
	
	$("#dialog .label").click(function(){
		if($(this).hasClass("grey")) return;
		var obj = $(this).next();
		if(obj.css("display")=="block"){
			$(this).children("img").prop("src","img/hide.png");
			obj.slideUp(200);
		} else {
			$(this).children("img").prop("src","img/show.png");
			obj.slideDown(200);
		}
	});
	
	$("#time_interval").change( function(){ changeTime(this.value); } );
	
	$(".ui-slider-handle").removeAttr("href");
	
});

/* functions for vork with time */
function get_local_timezone() {
	var rightNow = new Date();
	var jan1 = new Date(rightNow.getFullYear(), 0, 1, 0, 0, 0, 0);  // jan 1st
	var june1 = new Date(rightNow.getFullYear(), 6, 1, 0, 0, 0, 0); // june 1st
	var temp = jan1.toGMTString();
	var jan2 = new Date(temp.substring(0, temp.lastIndexOf(" ")-1));
	temp = june1.toGMTString();
	var june2 = new Date(temp.substring(0, temp.lastIndexOf(" ")-1));
	var std_time_offset = ((jan1 - jan2) / (1000 * 60 * 60));
	var daylight_time_offset = ((june1 - june2) / (1000 * 60 * 60));
	var dst;
	if (std_time_offset == daylight_time_offset) {
			dst = "0"; // daylight savings time is NOT observed
	} else {
			// positive is southern, negative is northern hemisphere
			var hemisphere = std_time_offset - daylight_time_offset;
			if (hemisphere >= 0)
				std_time_offset = daylight_time_offset;
			dst = "1"; // daylight savings time is observed
	}

	return parseInt(std_time_offset*3600,10);
}

function get_user_time(abs_time, tz, dst) { /// Format abs time to local time
	if(typeof wialon == "undefined")
		return abs_time;
	var t = abs_time - get_local_timezone() + tz + dst;
	return t;
}

function get_abs_time(date_time, tz, dst) { /// Get absolute time from Date returned time
	return date_time + get_local_timezone() - tz - dst;
}

/* reproject lon/lat to meters */
function getMeters(x, y){
	var Rad = y * Math.PI/180;
	var FSin = Math.sin(Rad);
	return {
		x: x * 0.017453292519943 * 6378137,
		y: 6378137 / 2.0 * Math.log((1.0 + FSin) / (1.0 - FSin))
	};
}

/* store data to cookie */
function setCookie(name, val) {
	document.cookie = name + "=" + escape(val) + ";expires=" + (new Date(2020, 1)).toGMTString();
}

/* ie */
function wrapString(str) {
	if (typeof str == "undefined" || !str.length)
		str = "";
	return str;
}
