(function($) {
  $.fn.rotate = function(angle) {
    var nav = navigator.userAgent.toLowerCase();
    if(nav.indexOf('chrome') > -1 || nav.indexOf('safari') > -1) {
      return this.css("-webkit-transform", "rotate(" + angle + "deg)");
    } else if (nav.indexOf('opera') > -1) {
      return this.css("-o-transform", "rotate(" + angle + "deg)");
    } else if (nav.indexOf('gecko') > -1) {
      return this.css("-moz-transform", "rotate(" + angle + "deg)");
    } else if (nav.indexOf('msie') > -1) {
      if (nav.indexOf('msie9.0') > -1)
        return this.css("-ms-transform", "rotate(" + angle + "deg)");
      if (nav.indexOf('msie 10.0') > -1)
        return this.css("transform", "rotate(" + angle + "deg)");
       
      var deg2radians = Math.PI * 2 / 360;
      var rad = angle * deg2radians;
      var cos_ = Math.cos(rad);
      var sin_ = Math.sin(rad);
      return this.css("filter", "").css("filter", "progid:DXImageTransform.Microsoft.Matrix(M11=" + cos_ + ", M12=" + ( -1 * sin_) + ", M21=" + sin_ + ", M22=" + cos_ + ", sizingMethod='auto expand')");
    }
    return this.css("transform", "rotate(" + angle + "deg)");
  };
})(jQuery);