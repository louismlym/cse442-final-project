/**
 * jQuery, D3.js, Topojson-client, fullPage, and other customed js were imported in index.html
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
    $('.arrow').click(function(e) {
      $.fn.fullpage.moveSectionDown();
    });
  });

  $(window).on("load", init);

  async function init() {
    await loadDataset();  // from load-dataset.js
    setVisSize();
    await prepareVis();
    showVisualizations();
  }

  function setVisSize() {
    MAP_HEIGHT = 600;
    MAP_WIDTH = 1000;
    BUBBLE_HEIGHT = 450;
    BUBBLE_WIDTH = 500;
  }

  async function prepareVis() {
    await prepareMapVis();
    await prepareBubbleVis();
  }

  function showVisualizations() {
    $("#map-vis").append(getMapVis());
    $("#bubble-vis").append(getBubbleVis());
  }

})();

