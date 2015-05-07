/************************************************************************

	Messages help object for Track Player App

	http://apps.wialon.com

	 Copyright:
     2002-2015 Gurtam, http://gurtam.com

	 License:
     MIT: https://github.com/wialon/wialon-app-trackplayer/blob/master/LICENSE-MIT

	************************************************************************/

function Messages(){}

Messages.prototype.getMessageText = function(msg) {
	if (!msg) return "-";
	// route message
	if (msg.p && typeof msg.p == "object" && typeof msg.p.rt_code != "undefined") {
		if (msg.p.rt_code == 1)
			return wialon.util.String.sprintf(this.translation.rt_started, msg.p.rt_name, msg.p.rt_zone);
		else if (msg.p.rt_code == 2)
			return wialon.util.String.sprintf(this.translation.rt_finished, msg.p.rt_name, msg.p.rt_zone);
		else if (msg.p.rt_code == 4)
			return wialon.util.String.sprintf(this.translation.rt_aborted, msg.p.rt_name, msg.p.rt_zone);
		else if (msg.p.rt_code == 8)
			return wialon.util.String.sprintf(this.translation.rt_arrived, msg.p.rt_name, msg.p.rt_pt_name);
		else if (msg.p.rt_code == 0x10)
			return wialon.util.String.sprintf(this.translation.rt_skipped, msg.p.rt_name, msg.p.rt_pt_name);
		else if (msg.p.rt_code == 0x20)
			return wialon.util.String.sprintf(this.translation.rt_departured, msg.p.rt_name, msg.p.rt_pt_name);
		else if (msg.p.rt_code == 0x40)
			return wialon.util.String.sprintf(this.translation.rt_too_late, msg.p.rt_name);
		else if (msg.p.rt_code == 0x80)
			return wialon.util.String.sprintf(this.translation.rt_too_early, msg.p.rt_name);
		else if (msg.p.rt_code == 0x100)
			return wialon.util.String.sprintf(this.translation.rt_in_time, msg.p.rt_name);
		else if (msg.p.rt_code == 21)
			return wialon.util.String.sprintf(this.translation.zone_in, msg.p.rt_name, msg.p.rt_zone);
		else if (msg.p.rt_code == 22)
			return wialon.util.String.sprintf(this.translation.zone_out, msg.p.rt_name, msg.p.rt_zone);
		else
			return this.translation.route_event;
	} else if (msg.p && typeof msg.p == "object") {
		if (typeof msg.p.prev_bytes_counter != "undefined") {
			if (parseInt(msg.p.reset_bytes_counter,10))
				return wialon.util.String.sprintf(this.translation.bytes_counter_reset, parseInt(msg.p.prev_bytes_counter / 1024,10));
			else
				return wialon.util.String.sprintf(this.translation.bytes_counter_is, parseInt(msg.p.prev_bytes_counter / 1024,10));
		}
		else if (typeof msg.p.engine_hours != "undefined") {
			if (parseInt(msg.p.reset_engine_hours,10)) {
				if (typeof msg.p.new_engine_hours != "undefined")
					return wialon.util.String.sprintf(this.translation.engine_hours_counter_reset, parseInt(msg.p.engine_hours / 3600,10), parseInt(msg.p.new_engine_hours / 3600,10));
			} else
				return wialon.util.String.sprintf(this.translation.engine_hours_counter_is, parseInt(msg.p.engine_hours / 3600,10));
		}
		else if (typeof msg.p.mileage != "undefined") {
			if (parseInt(msg.p.reset_mileage,10)) {
				if (typeof msg.p.new_mileage != "undefined")
					return wialon.util.String.sprintf(this.translation.mileage_counter_reset, parseInt(msg.p.mileage / 1000,10), parseInt(msg.p.new_mileage / 1000,10));
			} else
				return wialon.util.String.sprintf(this.translation.mileage_counter_is, parseInt(msg.p.mileage / 1000,10));
		}
	}
	return msg.et;
};

Messages.prototype.getMessageType = function(msg) {
	if(!msg) return "-";
	var type = this.translation.event;
	if (msg.f & 0x10)
		type = this.translation.maintenance;
	else if (msg.f & 0x20)
		type = this.translation.reg_filling;
	else if (msg.f & 0x1)
		type = this.translation.violation;
	return type;
};