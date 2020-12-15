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
    MAP_HEIGHT = 630;
    MAP_WIDTH = 1000;
    BUBBLE_HEIGHT = 500;
    BUBBLE_WIDTH = 550;
    CHART_FOR_MAP_HEIGHT = 550;
    CHART_FOR_MAP_WIDTH = 600;
    CHART_NEXT_STEPS_HEIGHT = 500;
    CHART_NEXT_STEPS_WIDTH = 550;
  }

  async function prepareVis() {
    await prepareMapVis();
    await prepareBubbleVis();
    await prepareChartForMapVis();
    await prepareChartNextStepsVis();
  }

  function showVisualizations() {
    $("#map-vis").append(getMapVis());
    $("#bubble-vis").append(getBubbleVis());
    $("#chart-for-map-vis").append(getChartForMapVis());
    $("#chart-next-steps-vis").append(getChartNextStepsVis());
  }

})();

