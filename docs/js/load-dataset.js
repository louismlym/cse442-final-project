// Variables (dataset) to export to other js files
var US;
var STATE_INFORMATION;
var FOOD_ACCESS_DATASET;

async function loadDataset() {
  if (FOOD_ACCESS_DATASET && US && STATE_INFORMATION) {
    return;
  }
  // load food access dataset
  await d3.csv("data/final-project-data.csv", d3.autoType).then(function(data) {
    FOOD_ACCESS_DATASET = data;
  });

  // load US data (for maps)
  await d3.json("data/counties-albers-10m.json", d3.autoType).then(function(data) {
    US = data;
  });

  // load state information (for abbreviation of state names)
  await d3.csv("data/states.csv", d3.autoType).then(function(data) {
    STATE_INFORMATION = data;
  });
};