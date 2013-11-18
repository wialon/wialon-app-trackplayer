/**
 * @requires OpenLayers/Control/PanZoom.js
 */

/**
 * Class: OpenLayers.Control.PanZoomBar
 *
 * Inherits from:
 *  - <OpenLayers.Control.PanZoom>
 */

OpenLayers.ImgPath = "./img/control/";

OpenLayers.Control.GPanZoomBar = OpenLayers.Class(OpenLayers.Control.PanZoomBar, {
	/**
     * APIProperty: minZoom
     * {integer} Allows to set the minimal zoom level.
     */
    minZoom: 0,

	/**
    * Method: draw 
    *
    * Parameters:
    * px - {<OpenLayers.Pixel>} 
    */
    draw: function(px) {
        // initialize our internal div
        OpenLayers.Control.prototype.draw.apply(this, arguments);
        px = this.position.clone();

        // place the controls
        this.buttons = [];

		var sz = new OpenLayers.Size(27,27);
        var centered = new OpenLayers.Pixel(px.x+sz.w/2, px.y);
        var wposition = sz.w;

        this._addButton("panup", "north-mini.png", centered, sz);
        px.y = centered.y+sz.h;
        this._addButton("panleft", "west-mini.png", px, sz);
        this._addButton("panright", "east-mini.png", px.add(wposition, 0), sz);
        this._addButton("pandown", "south-mini.png", centered.add(0, sz.h*2), sz);
        this._addButton("zoomin", "zoom-plus-mini.png", centered.add(0, sz.h*3+5), sz);
        centered = this._addZoomBar(centered.add(0, sz.h*4 + 4));
        this._addButton("zoomout", "zoom-minus-mini.png", centered, sz);
        return this.div;
    },

	/** 
     * Method: redraw
     * clear the div and start over.
     */
    redraw: function() {			
		if (this.map && this.map.baseLayer)
			this.minZoom = this.map.baseLayer.minZoom ? this.map.baseLayer.minZoom : 0;
		OpenLayers.Control.PanZoomBar.prototype.redraw.apply(this, arguments);
    },

	/** 
    * Method: _addZoomBar
    * 
    * Parameters:
    * location - {<OpenLayers.Pixel>} where zoombar drawing is to start.
    */
	_addZoomBar:function(centered) {
        var imgLocation = OpenLayers.ImgPath;

        var id = "OpenLayers_Control_PanZoomBar_Slider" + this.map.id;
        var zoomsToEnd = this.map.getNumZoomLevels() - 1 - this.map.getZoom() - (this.map.getZoom() < this.minZoom ? (this.minZoom - this.map.getZoom()) : 0);
        var slider = OpenLayers.Util.createAlphaImageDiv(id,
                       centered.add(-2, zoomsToEnd * this.zoomStopHeight), 
                       new OpenLayers.Size(24, 10), 
                       imgLocation+"slider.png",
                       "absolute");
		/////////// hack new style /////////////////////////
		slider.style.left = (parseInt(slider.style.left)) + 4 + 'px';
		/////////////////////////////////////////////////
		
        this.slider = slider;
		this.slider.style.cursor = 'pointer';
        
        this.sliderEvents = new OpenLayers.Events(this, slider, null, true, {includeXY: true});
        this.sliderEvents.on({
            "mousedown": this.zoomBarDown,
            "mousemove": this.zoomBarDrag,
            "mouseup": this.zoomBarUp
        });
        
        var sz = new OpenLayers.Size();
        sz.h = this.zoomStopHeight * (this.map.getNumZoomLevels()-this.minZoom);
        sz.w = this.zoomStopWidth;
        var div = null;

        if (OpenLayers.Util.alphaHack()) {
            var id = "OpenLayers_Control_PanZoomBar" + this.map.id;
            div = OpenLayers.Util.createAlphaImageDiv(id, centered,
                                      new OpenLayers.Size(sz.w, this.zoomStopHeight),
                                      imgLocation + "zoombar.png", 
                                      "absolute", null, "crop");
            div.style.height = sz.h + "px";
        } else {
            div = OpenLayers.Util.createDiv(
                        'OpenLayers_Control_PanZoomBar_Zoombar' + this.map.id,
                        centered,
                        sz,
                        imgLocation+"zoombar.png");
        }
        div.style.cursor = "pointer";
		div.className = "olButton";
		/////////// hack new style /////////////////////////
		div.style.left = (parseInt(div.style.left)) + 6 + 'px';
		/////////////////////////////////////////////////
		
        this.zoombarDiv = div;
        
        this.div.appendChild(div);
		this.div.style.top = (parseInt(this.div.style.top)) + 20 + 'px';
		this.div.style.left = parseInt(this.div.style.left) +  10 + 'px';

        this.startTop = parseInt(div.style.top);
        this.div.appendChild(slider);

        this.map.events.register("zoomend", this, this.moveZoomBar);

        centered = centered.add(0, 
				this.zoomStopHeight * Math.max(this.map.getNumZoomLevels()-this.minZoom, 0));
        return centered; 
	},
	
	/*
     * Method: zoomBarUp
     * Perform cleanup when a mouseup event is received -- discover new zoom
     * level and switch to it.
     *
     * Parameters:
     * evt - {<OpenLayers.Event>} 
     */
    zoomBarUp:function(evt) {
        if (!OpenLayers.Event.isLeftClick(evt)) {
            return;
        }

        if (this.zoomStart) {
            this.div.style.cursor="";
            this.map.events.un({
                "mouseup": this.passEventToSlider,
                "mousemove": this.passEventToSlider,
                scope: this
            });
            var deltaY = this.zoomStart.y - evt.xy.y;
            var zoomLevel = this.map.zoom;
            if (this.map.fractionalZoom) {
                zoomLevel += deltaY/this.zoomStopHeight;
                zoomLevel = Math.min(Math.max(zoomLevel, 0), 
                                     this.map.getNumZoomLevels() - 1);
            } else {
                zoomLevel += Math.round(deltaY/this.zoomStopHeight);
            }
			this.map.zoomTo(Math.max(zoomLevel, this.minZoom));
            this.moveZoomBar();
            this.mouseDragStart = null;
            OpenLayers.Event.stop(evt);
        }
    },

	/*
     * Method: zoomBarDown
     * event listener for clicks on the slider
     *
     * Parameters:
     * evt - {<OpenLayers.Event>} 
     */
    zoomBarDown:function(evt) {
		if (this.map.getZoom() >= this.minZoom)
			OpenLayers.Control.PanZoomBar.prototype.zoomBarDown.apply(this, arguments);
		OpenLayers.Event.stop(evt);
	},

	/**
     * Method: onButtonClick
     *
     * Parameters:
     * evt - {Event}
     */
    onButtonClick: function(evt) {
        var btn = evt.buttonElement;
        switch (btn.action) {
        case "zoomout": 
			if (this.map.getZoom() > this.minZoom)
				this.map.zoomOut(); 
            break;
		default:
			OpenLayers.Control.PanZoomBar.prototype.onButtonClick.apply(this, arguments);
        }
    },

	/*
    * Method: moveZoomBar
    * Change the location of the slider to match the current zoom level.
    */
    moveZoomBar:function() {
        var newTop =
            ((this.map.getNumZoomLevels()-1) - Math.max(this.map.getZoom(),this.minZoom)) *
            this.zoomStopHeight + this.startTop + 1;
        this.slider.style.top = newTop + "px";
    },

	CLASS_NAME: "OpenLayers.Control.PanZoomBar"
});
