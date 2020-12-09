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

    let graphDataSet = [];
    for (const [key, value] of stateTotalPop.entries()) {
        graphDataSet.push({"State": key, "Percentage": statePopShare.get(key).lapop10share });
    }

    graphDataset.sort(function(a, b) {return b.Percentage - a.Percentage});
  

  // -------------------------- Main Function To Build Chart --------------------------
  getChartForMapVis = function() {

    const format = x.tickFormat(5, graphDataSet.format);
    const margin = ({top: 20, right: 0, bottom: 10, left: 100})
    const height = Math.ceil((graphDataset.slice(0, 10).length + 0.1) * barHeight) + margin.top + margin.bottom
    const barHeight = 25;
    const x = d3.scaleLinear()
        .domain([0, d3.max(graphDataset, d => d.Percentage)])
        .range([margin.left, width - margin.right]);   
    const y = y = d3.scaleBand()
        .domain(d3.range(graphDataset.slice(0, 10).length))
        .rangeRound([margin.top, height - margin.bottom])
        .padding(0.1);
    const xAxis =  g => g
        .attr("transform", `translate(0,${margin.top})`)
        .call(d3.axisTop(x).tickFormat(d => (d * 100).toFixed(2)+"%"));   
    const yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickFormat(i => graphDataset[i].State).tickSizeOuter(0));

    //create the chart
    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height]);
  
    svg.append("g")
      .attr("fill", "#ce4e55")
    .selectAll("rect")
    .data(graphDataset.slice(0, 10))
    .join("rect")
      .attr("x", d => x(0))
      .attr("y", (d, i) => y(i))
      .attr("width", d => x(d.Percentage) - x(0))
      .attr("height", y.bandwidth());
  
    svg.append("g")
      .attr("fill", "white")
      .attr("text-anchor", "end")
      .attr("font-family", "sans-serif")
      .attr("font-size", 12)
    .selectAll("text")
    .data(graphDataset.slice(0, 10))
    .join("text")
      .attr("x", d => x(d.Percentage))
      .attr("y", (d, i) => y(i) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("dx", -4)
      .text(d => (d.Percentage * 100).toFixed(2) + "%")
    .call(text => text.filter(d => x(d.Percentage) - x(0) < 20) // short bars
      .attr("dx", +4)
      .attr("fill", "black")
      .attr("text-anchor", "start"));

    svg.append("g")
      .call(xAxis);

    svg.append("g")
      .call(yAxis);

  return svg.node();
    // updateChartOnLocationChange = function(newLocation) {
    //   var newData = data.filter(d => d.location === newLocation);

    //   d3.selectAll(".bar")
    //     .data(newData)
    //     .transition().duration(TRANSITION_DURATION)
    //     .attr("x", function(d) { return xScale(d.x); })
    //     .attr("y", function(d) { return yScale(d.y); })
    //     .attr("height", function(d) { return height - yScale(d.y); });
    // }

    // updateScaleOnStateClicked = function() {
    //   yScale.domain([0, 1])
    //   graph.select(".y-axis")
    //     .transition().duration(TRANSITION_DURATION).ease(d3.easeSinInOut)
    //     .call(d3.axisLeft(yScale).tickFormat(function(d){
    //       return (d * 100).toFixed(0) + "%";
    //     }));
    // }

    // updateScaleOnMapReset = function() {
    //   yScale.domain([0, 0.4])
    //   graph.select(".y-axis")
    //     .transition().duration(TRANSITION_DURATION).ease(d3.easeSinInOut)
    //     .call(d3.axisLeft(yScale).tickFormat(function(d){
    //       return (d * 100).toFixed(0) + "%";
    //     }));
    // }
    
    return container.node();
  }
}