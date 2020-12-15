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
  
  /*
  Map{state => {
     "POP2010": #populationInUS,
     "TractWhite": #whitePopulationInUS,
     "TractBlack": #blackPopulationInUS,
     ...
  }}
  */
 const USTotalPop = d3.rollup(FOOD_ACCESS_DATASET,
  v => Object.fromEntries(columnsToSum.map(col => [col, d3.sum(v, d => {
    return +d[col];
  })])));
  
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

  const USPopShare = d3.rollup(FOOD_ACCESS_DATASET,
    v => Object.fromEntries(columnsToSum.map(col => [col, d3.sum(v, d => {
      return d[col] * d.POP2010 / USTotalPop[columnToDivide[col]];
    })])));

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
  for (const entry of Object.entries(USPopShare)) {
    const column = entry[0];
      const percentage = entry[1];
      if (racialShareColumns.includes(column)) {
        data.push({
          "location": "the United States",
          "x": columnToXLabel[column], 
          "y": percentage
        });
      }
  }
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
    
    const margin = {top: 85, right: 80, bottom: 135, left: 50};
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
    //const color = d3.scaleOrdinal(d3.schemeTableau10).domain(Object.keys(xToDataColumn));
    
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
    
    const bars = graph.selectAll(".bar")
      .data(data.filter(d => d.location === "the United States"))
      .attr("fill", "#ce4e55")
      .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return xScale(d.x); })
        .attr("y", function(d) { return yScale(d.y); })
        //.attr("fill", function(d) {return color(d.x); })
        .attr("fill", "#ce4e55")
        .attr("width", xScale.bandwidth())
        .attr("height", function(d) { return height - yScale(d.y); })
    
    const barLabels = graph.selectAll(".bar-label")
      .data(data.filter(d => d.location === "the United States"))
      .enter().append("text")
        .attr("class", "bar-label")
        .text(function(d) { return `${(d.y * 100).toFixed(2)}%`; })
        .attr("text-anchor", "middle")
        .attr("x", function(d) { return xScale(d.x) + xScale.bandwidth() / 2; })
        .attr("y", function(d) { return yScale(d.y) - 37; })
        .attr("font-size", "11px")
        .attr("fill", "gray")
    
    const barLabels2 = graph.selectAll(".bar-label2")
      .data(data.filter(d => d.location === "the United States"))
      .enter().append("text")
        .attr("class", "bar-label2")
        .text("out of")
        .attr("text-anchor", "middle")
        .attr("x", function(d) { return xScale(d.x) + xScale.bandwidth() / 2; })
        .attr("y", function(d) { return yScale(d.y) - 23; })
        .attr("font-size", "11px")
        .attr("fill", "gray");
    
    const barLabels3 = graph.selectAll(".bar-label3")
      .data(data.filter(d => d.location === "the United States"))
      .enter().append("text")
        .attr("class", "bar-label3")
        .text(function(d) { return `${(USTotalPop[columnToDivide[xToDataColumn[d.x]]] / USTotalPop.POP2010 * 100).toFixed(2)}%`; })
        .attr("text-anchor", "middle")
        .attr("x", function(d) { return xScale(d.x) + xScale.bandwidth() / 2; })
        .attr("y", function(d) { return yScale(d.y) - 10; })
        .attr("font-size", "11px")
        .attr("fill", "gray");
    
    const title = graph.append("text")
      .attr("class", "title")
      .text("Percentage of Population 10+ Miles From Supermarket, by Race, in the United States")
      .attr("font-size", "12px")
      .attr("y", -margin.top * 0.1)
      .attr("x", "39px")
      .attr("font-weight", "bold")
      .attr("fill", "black");
    
    let minValue = d3.min(data.filter(d => d.location === "the United States" && d.y > 0), d => d.y);
    let maxValue = d3.max(data.filter(d => d.location === "the United States" && d.y > 0), d => d.y);

    const minLine = graph.append("line")
      .attr("class", "min-line")
      .attr("x1", xScale("American Indian & Alaska Native") - 5)
      .attr("y1", yScale(minValue))
      .attr("x2", xScale("Other/Multiple Race") + xScale.bandwidth() + 10)
      .attr("y2", yScale(minValue))
      .attr("stroke", "rgb(128, 128, 128, 0.8)")
      .attr("stroke-width", "1px");
    
    const maxLine = graph.append("line")
      .attr("class", "max-line")
      .attr("x1", xScale("American Indian & Alaska Native") - 5)
      .attr("y1", yScale(maxValue))
      .attr("x2", xScale("Other/Multiple Race") + xScale.bandwidth() + 10)
      .attr("y2", yScale(maxValue))
      .attr("stroke", "rgb(128, 128, 128, 0.8)")
      .attr("stroke-width", "1px");
    
    const minLineLabel = graph.append("text")
      .attr("class", "min-line-label")
      .text("min: " + (minValue * 100).toFixed(2) + "%")
      .attr("font-size", "12px")
      .attr("y", yScale(minValue))
      .attr("x", xScale("Other/Multiple Race") + xScale.bandwidth() + 13)
      .attr("fill", "gray");

    const maxLineLabel = graph.append("text")
      .attr("class", "max-line-label")
      .text("max: " + (maxValue * 100).toFixed(2) + "%")
      .attr("font-size", "12px")
      .attr("y", yScale(maxValue))
      .attr("x", xScale("Other/Multiple Race") + xScale.bandwidth() + 13)
      .attr("fill", "gray");
    
    updateChartOnLocationChange = function(newLocation) {
      let newData = data.filter(d => d.location === newLocation);

      // Update bars
      graph.selectAll(".bar")
        .data(newData)
        .transition().duration(TRANSITION_DURATION)
        .attr("x", function(d) { return xScale(d.x); })
        .attr("y", function(d) { return yScale(d.y); })
        .attr("height", function(d) { return height - yScale(d.y); });
      
      // Update bar labels
      graph.selectAll(".bar-label")
        .data(newData)
        .transition().duration(TRANSITION_DURATION)
          .text(function(d) { return (d.y * 100).toFixed(2) + "%"; })
          .attr("y", function(d) { return yScale(d.y) - 37; });
      
      graph.selectAll(".bar-label2")
        .data(newData)
        .transition().duration(TRANSITION_DURATION)
          .attr("y", function(d) { return yScale(d.y) - 23; });
      
      let objectToUse;
      if (newLocation === "the United States") {
        objectToUse = USTotalPop;
      } else if (newLocation.includes(",")) {
        objectToUse = countyTotalPop.get(newLocation);
      } else {
        objectToUse = stateTotalPop.get(newLocation);
      }

      graph.selectAll(".bar-label3")
        .data(newData)
        .transition().duration(TRANSITION_DURATION)
          .text(function(d) { return `${(objectToUse[columnToDivide[xToDataColumn[d.x]]] / objectToUse.POP2010 * 100).toFixed(2)}%`; })
          .attr("y", function(d) { return yScale(d.y) - 10; });
      
      // Update chart title
      if (newLocation.includes(",")) {
        newLocation = newLocation.split(",");
        newLocation = newLocation[1] + ", " + getStateAbbrvFromName(newLocation[0]);
      }
      graph.select(".title")
        .text("Percentage of Population 10+ Miles From Supermarket, by Race, in " + newLocation);

      // Update min/max lines
      let minValue = d3.min(newData.filter(d => d.y > 0), d => d.y);
      let maxValue = d3.max(newData.filter(d => d.y > 0), d => d.y);
      if (!minValue) {
        minValue = 0;
      }
      if (!maxValue) {
        maxValue = 0;
      }
      
      graph.select(".min-line")
        .transition().duration(TRANSITION_DURATION)
        .attr("y1", yScale(minValue))
        .attr("y2", yScale(minValue));

      graph.select(".max-line")
        .transition().duration(TRANSITION_DURATION)
        .attr("y1", yScale(maxValue))
        .attr("y2", yScale(maxValue));
      
      graph.select(".min-line-label")
        .transition().duration(TRANSITION_DURATION)
        .text("min: " + (minValue * 100).toFixed(2) + "%")
        .attr("y", yScale(minValue));
      
      graph.select(".max-line-label")
        .transition().duration(TRANSITION_DURATION)
        .text("max: " + (maxValue * 100).toFixed(2) + "%")
        .attr("y", yScale(maxValue));
    }

    updateScaleOnStateClicked = function() {
      // Update y-axis domain
      yScale.domain([0, 1])
      graph.select(".y-axis")
        .transition().duration(TRANSITION_DURATION).ease(d3.easeSinInOut)
        .call(d3.axisLeft(yScale).tickFormat(function(d){
          return (d * 100).toFixed(0) + "%";
        }));
    }

    updateScaleOnMapReset = function() {
      // Update y-axis domain
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