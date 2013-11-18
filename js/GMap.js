OpenLayers.GMap = OpenLayers.Class(OpenLayers.Map, {
	/**
     * Method: isValidZoomLevel
     * 
     * Parameters:
     * zoomLevel - {Integer}
     * 
     * Returns:
     * {Boolean} Whether or not the zoom level passed in is non-null and 
     *           within the min/max range of zoom levels.
     */
    isValidZoomLevel: function(zoomLevel) {
		var isvalid = OpenLayers.Map.prototype.isValidZoomLevel.apply(this, arguments);
		if (isvalid && this.baseLayer) {
			var minZoomLevel = this.baseLayer.minZoom ? this.baseLayer.minZoom : 0;		
			isvalid = (zoomLevel >= minZoomLevel);
		}
		return isvalid;
    },

	/**
     * APIMethod: setCenter
     * Set the map center (and optionally, the zoom level).
     * 
     * Parameters:
     * lonlat - {<OpenLayers.LonLat>|Array} The new center location.
     *     If provided as array, the first value is the x coordinate,
     *     and the 2nd value is the y coordinate.
     * zoom - {Integer} Optional zoom level.
     * dragging - {Boolean} Specifies whether or not to trigger 
     *                      movestart/end events
     * forceZoomChange - {Boolean} Specifies whether or not to trigger zoom 
     *                             change events (needed on baseLayer change)
     *
     * TBD: reconsider forceZoomChange in 3.0
     */
    setCenter: function(lonlat, zoom, dragging, forceZoomChange) {
		var minZoomLevel = 0;
		if (this.baseLayer)
			minZoomLevel = this.baseLayer.minZoom ? this.baseLayer.minZoom : 0;	
		if (zoom !== undefined && zoom !== null)
			var zoom = (zoom > minZoomLevel) ? zoom : minZoomLevel;
		OpenLayers.Map.prototype.setCenter.apply(this, [lonlat, zoom, dragging, forceZoomChange]);
	},

	CLASS_NAME: "OpenLayers.Map"
});
