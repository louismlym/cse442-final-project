var getChartForMapVis;
var CHART_FOR_MAP_WIDTH;
var CHART_FOR_MAP_HEIGHT;

async function prepareChartForMapVis() {
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
  
  console.log(statePopShare);
  console.log(countyPopShare);

  getChartForMapVis = function() {
    const xToDataColumn = {
      "White": "lawhite10share",
      "Black or African American": "lablack10share",
      "Asian": "laasian10share",
      "Native Hawaiian & Other Pacific Islander": "lanhopi10share",
      "American Indian & Alaska Native": "laaian10share",
      "Other/Multiple Race": "laomultir10share",
      "Hispanic or Latino": "lahisp10share"
    };

    const container = d3.create("svg")
      .attr('width', CHART_FOR_MAP_WIDTH)
      .attr('height', CHART_FOR_MAP_HEIGHT);
    
    const margin = {top: 50, right: 50, bottom: 70, left: 50};
    const width = container.attr("width") - margin.left - margin.right;
    const height = container.attr("height") - margin.top - margin.bottom;

    const xScale = d3.scaleBand()
      .domain(Object.keys(xToDataColumn))
      .rangeRound([0, width])
      .padding(0.1);
    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([height, margin.top]);
    
    const xAxis = container.append('g')
      .attr('transform', `translate(${margin.left}, ${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
        .attr("dy", '13px')
        .attr("transform", "rotate(25)")
        .style("text-anchor", "start");
    
    const yAxis = container.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale).tickFormat(function(d){
        return (d * 100).toFixed(0) + "%";
      }));

    
    return container.node();
  }
}