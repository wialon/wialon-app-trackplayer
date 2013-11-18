OpenLayers.Control.GNavigation = OpenLayers.Class(OpenLayers.Control.Navigation, {

	/**
     * Method: wheelChange  
     *
     * Parameters:
     * evt - {Event}
     * deltaZ - {Integer}
     */
    wheelChange: function(evt, deltaZ) {
		var currentZoom = this.map.getZoom();
        var newZoom = this.map.getZoom() + Math.round(deltaZ);
        newZoom = Math.max(newZoom, 0);
        newZoom = Math.min(newZoom, this.map.getNumZoomLevels());
        if (newZoom === currentZoom || !this.map.isValidZoomLevel(newZoom)) {
            return;
        }
		OpenLayers.Control.Navigation.prototype.wheelChange.apply(this, arguments);
	},
	
	CLASS_NAME: "OpenLayers.Control.Navigation"
});
