/**
 * jQuery, D3.js, Topojson-client, and fullPage were imported in index.html
*/

(function() {

  // on document ready
  $(document).ready(function() {
    $('#fullpage').fullpage({
      licenseKey: '3D15CD6D-C0D24F34-904546ED-D72363A0',
      navigation: true,
      navigationPosition: 'right'
    });
  
    $.fn.fullpage.setAllowScrolling(true);
  });

  $(window).on("load", init);

  async function init() {
    $('.arrow').click(function(e) {
      $.fn.fullpage.moveSectionDown();
    });
    // Start main function here
  }

})();

