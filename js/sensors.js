/************************************************************************

	Sensors help object for Track Player App

	http://apps.wialon.com

	 Copyright:
     2002-2015 Gurtam, http://gurtam.com

	 License:
     MIT: https://github.com/wialon/wialon-app-trackplayer/blob/master/LICENSE-MIT

	************************************************************************/

function Sensors (){ this.init(); };
Sensors.prototype.sensors = {};

Sensors.prototype.init = function() {
	this.register_sensor_type("impulse fuel consumption", this.translation.impulse_fuel_consumption_type, "", "", true);
	this.register_sensor_type("absolute fuel consumption", this.translation.absolute_fuel_consumption_type, this.translation.litres, "litres", true);
	this.register_sensor_type("instant fuel consumption", this.translation.instant_fuel_consumption_type, "", "", true);
	this.register_sensor_type("fuel level", this.translation.fuel_type, this.translation.litres, "litres");
	this.register_sensor_type("fuel level impulse sensor", this.translation.impulse_fuel_level_type, this.translation.litres, "litres", true);
	this.register_sensor_type("temperature", this.translation.temperature_type, "°C", "°C");
	this.register_sensor_type("temperature coefficient", this.translation.temperature_coefficient, "", "");
	this.register_sensor_type("engine rpm", this.translation.engine_rpm_type, this.translation.rpm, "rpm");
	this.register_sensor_type("engine operation", this.translation.engine_operation_type, this.translation.on_off, "On/Off");
	this.register_sensor_type("voltage", this.translation.voltage_type, this.translation.voltage, "V");
	this.register_sensor_type("digital", this.translation.digital, this.translation.on_off, "On/Off");
	this.register_sensor_type("custom", this.translation.custom, "", "");
	this.register_sensor_type("mileage", this.translation.mileage, this.translation.km, "km");
	this.register_sensor_type("odometer", this.translation.odometer, this.translation.km, "кm");
	this.register_sensor_type("engine efficiency", this.translation.engine_efficiency, this.translation.on_off, "On/Off");
	this.register_sensor_type("engine hours", this.translation.absolute_engine_hours, this.translation.hr, "hours");
	this.register_sensor_type("relative engine hours", this.translation.relative_engine_hours, this.translation.hr, "hours");
	this.register_sensor_type("counter", this.translation.counter, "", "");
	this.register_sensor_type("accelerometer", this.translation.accelerometer, "G", "G");
	this.register_sensor_type("driver", this.translation.driver_assignment, "", "");
	this.register_sensor_type("trailer", this.translation.trailer_assignment, "", "");
};
Sensors.prototype.register_sensor_type = function (sensor_type, sensor_type_name, measurement_view, measurement_store, remove_from_tooltip) {
	this.sensors[sensor_type] = {type: sensor_type, type_name: sensor_type_name, measurement_view: measurement_view, measurement_store: measurement_store, remove_from_tooltip: remove_from_tooltip};
};
Sensors.prototype.get_measurement = function (sensor_type) {
	var sens = this.sensors[sensor_type];
	if (typeof sens == "undefined")
		return "";
	return sens.measurement_view;
};

Sensors.prototype.get_real_measurement = function (sensor_type) {
	var sens = this.sensors[sensor_type];
	if (typeof sens == "undefined")
		return "";
	if (sens.measurement_store)
		return sens.measurement_store;
	else
		return sens.measurement_view;
};

Sensors.prototype.is_on_off_sensor = function(measurement) {
	if (measurement == "On/Off")
		return true;
	return false;
}

Sensors.prototype.get_formatted_value = function(sensor, value) {
	var real_measure, sens_meas;
	real_measure = this.get_real_measurement(sensor.t);
	
	if (this.is_on_off_sensor(real_measure)) {
		var on_val = this.translation.on;
		var off_val = this.translation.off;
		sens_meas = sensor.m;
		if (this.get_real_measurement(sensor.t) != sens_meas) {
			var arrs = sens_meas.split("/");
			if (arrs.length == 2) {
				on_val = arrs[0];
				off_val = arrs[1];
			}
		}
		if (parseFloat(value))
			value = on_val;
		else
			value = off_val;
	} else {
		sens_meas = sensor.m;
		if (this.get_real_measurement(sensor.t) == sens_meas)
			value = wialon.util.String.sprintf("%.2f %s", value, this.get_measurement(sensor.t));
		else
			value = wialon.util.String.sprintf("%.2f %s", value, sensor.m);
	}
	return value;
}
