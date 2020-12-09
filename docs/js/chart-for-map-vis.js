var getChartForMapVis;
var CHART_FOR_MAP_WIDTH;
var CHART_FOR_MAP_HEIGHT;
var updateChartOnLocationChange;
var updateScaleOnStateClicked;
var updateScaleOnMapReset;

async function prepareChartForMapVis() {
  const TRANSITION_DURATION = 800;

  // load dataset if it hasn't been loaded yet
  await loadDataset();

  // ========================== Prepare Data ==========================
  // -------------------------- Group and Find Total Pop. --------------------------
  const racialCountColumns = ["TractWhite",
    "TractBlack",
    "TractAsian",
    "TractNHOPI",
    "TractAIAN",
    "TractOMultir",
    "TractHispanic"
  ];

  let columnsToSum = ["POP2010"].concat(racialCountColumns);

  /* 
  This is only used to calculate weighted average of share in each county
  Map{"<state>,<county>" => {
     "POP2010": #populationInCounty,
     "TractWhite": #whitePopulationInCounty,
     "TractBlack": #blackPopulationInCounty,
     ...
  }}
  */
  const countyTotalPop = d3.rollup(FOOD_ACCESS_DATASET,
    v => Object.fromEntries(columnsToSum.map(col => [col, d3.sum(v, d => {
      return +d[col];
    })])),
    d => d.State + "," + d.County);

  /*
  Map{state => {
     "POP2010": #populationInState,
     "TractWhite": #whitePopulationInState,
     "TractBlack": #blackPopulationInState,
     ...
  }}
  */
  const stateTotalPop = d3.rollup(FOOD_ACCESS_DATASET,
    v => Object.fromEntries(columnsToSum.map(col => [col, d3.sum(v, d => {
      return +d[col];
    })])),
    d => d.State);
  
  // -------------------------- Aggregate Data --------------------------
  // These columns of data will be sum over
  // Code example is retrieved and modified from https://observablehq.com/@danielkerrigan/sum-multiple-columns
  const racialShareColumns = ["lawhite10share",
    "lablack10share",
    "laasian10share",
    "lanhopi10share",
    "laaian10share",
    "laomultir10share",
    "lahisp10share"];

  columnsToSum = ["lapop10share"].concat(racialShareColumns);

  const columnToDivide = {
    "lapop10share": "POP2010",
    "lawhite10share": "TractWhite",
    "lablack10share": "TractBlack",
    "laasian10share": "TractAsian",
    "lanhopi10share": "TractNHOPI",
    "laaian10share": "TractAIAN",
    "laomultir10share": "TractOMultir",
    "lahisp10share": "TractHispanic"
  }

  const statePopShare = d3.rollup(FOOD_ACCESS_DATASET,
    v => Object.fromEntries(columnsToSum.map(col => [col, d3.sum(v, d => {
      // Find weighted average of share
      return d[col] * d.POP2010 / stateTotalPop.get(d.State)[columnToDivide[col]];
    })])),
    d => d.State);

  const countyPopShare = d3.rollup(FOOD_ACCESS_DATASET,
    v => Object.fromEntries(columnsToSum.map(col => [col, d3.sum(v, d => {
      // Find weighted average of share (because a county is listed in lots of rows in FOOD_ACCESS_DATASET)
      return d[col] * d.POP2010 / countyTotalPop.get(d.State + "," + d.County)[columnToDivide[col]];
    })])),
    // Name each county as "<state>,<county>" because counties' names can be duplicated across states!
    d => d.State + "," + d.County);
  
  // -------------------------- Format Data For Bar Chart --------------------------
  const xToDataColumn = {
    "American Indian & Alaska Native": "laaian10share",
    "Asian": "laasian10share",
    "Black or African American": "lablack10share",
    "Hispanic or Latino": "lahisp10share",
    "Native Hawaiian & Other Pacific Islander": "lanhopi10share",
    "White": "lawhite10share",
    "Other/Multiple Race": "laomultir10share"
  };

  const columnToXLabel = {
    "laaian10share": "American Indian & Alaska Native",
    "laasian10share": "Asian",
    "lablack10share": "Black or African American",
    "lahisp10share": "Hispanic or Latino",
    "lanhopi10share": "Native Hawaiian & Other Pacific Islander",
    "lawhite10share": "White",
    "laomultir10share": "Other/Multiple Race"
  };

  let data = [];
  for (const state of statePopShare.keys()) {
    for (const entry of Object.entries(statePopShare.get(state))){
      const column = entry[0];
      const percentage = entry[1];
      if (racialShareColumns.includes(column)) {
        data.push({
          "location": state,
          "x": columnToXLabel[column], 
          "y": percentage
        });
      }
    }
  }
  for (const county of countyPopShare.keys()) {
    for (const entry of Object.entries(countyPopShare.get(county))){
      const column = entry[0];
      const percentage = entry[1];
      if (racialShareColumns.includes(column)) {
        data.push({
          "location": county,
          "x": columnToXLabel[column], 
          "y": percentage
        });
      }
    }
  }

  // -------------------------- Main Function To Build Chart --------------------------
  getChartForMapVis = function() {
    const container = d3.create("svg")
      .attr('width', CHART_FOR_MAP_WIDTH)
      .attr('height', CHART_FOR_MAP_HEIGHT);
    
    const margin = {top: 50, right: 80, bottom: 120, left: 50};
    const width = container.attr("width") - margin.left - margin.right;
    const height = container.attr("height") - margin.top - margin.bottom;

    const graph = container.append("g")
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const xScale = d3.scaleBand()
      .domain(Object.keys(xToDataColumn))
      .rangeRound([0, width])
      .padding(0.1);
    const yScale = d3.scaleLinear()
      .domain([0, 0.4])
      .range([height, 0]);
    const color = d3.scaleOrdinal(d3.schemeTableau10).domain(Object.keys(xToDataColumn));
    
    const xAxis = graph.append('g')
      .attr("class", "x-axis")
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
        .attr("dy", '13px')
        .attr("transform", "rotate(25)")
        .style("text-anchor", "start");
    
    const yAxis = graph.append('g')
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale).tickFormat(function(d){
        return (d * 100).toFixed(0) + "%";
      }));
    
    // TODO: need to use the whole US for initial data
    const bars = graph.selectAll(".bar")
      .data(data.filter(d => d.location === "Washington"))
      .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return xScale(d.x); })
        .attr("y", function(d) { return yScale(d.y); })
        .attr("fill", function(d) {return color(d.x); })
        .attr("width", xScale.bandwidth())
        .attr("height", function(d) { return height - yScale(d.y); });
    
    updateChartOnLocationChange = function(newLocation) {
      var newData = data.filter(d => d.location === newLocation);

      d3.selectAll(".bar")
        .data(newData)
        .transition().duration(TRANSITION_DURATION)
        .attr("x", function(d) { return xScale(d.x); })
        .attr("y", function(d) { return yScale(d.y); })
        .attr("height", function(d) { return height - yScale(d.y); });
    }

    updateScaleOnStateClicked = function() {
      yScale.domain([0, 1])
      graph.select(".y-axis")
        .transition().duration(TRANSITION_DURATION).ease(d3.easeSinInOut)
        .call(d3.axisLeft(yScale).tickFormat(function(d){
          return (d * 100).toFixed(0) + "%";
        }));
    }

    updateScaleOnMapReset = function() {
      yScale.domain([0, 0.4])
      graph.select(".y-axis")
        .transition().duration(TRANSITION_DURATION).ease(d3.easeSinInOut)
        .call(d3.axisLeft(yScale).tickFormat(function(d){
          return (d * 100).toFixed(0) + "%";
        }));
    }
    
    return container.node();
  }
}