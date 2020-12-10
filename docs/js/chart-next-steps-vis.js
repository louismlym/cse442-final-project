var getChartNextStepsVis;
var CHART_NEXT_STEPS_WIDTH;
var CHART_NEXT_STEPS_HEIGHT;

async function prepareChartNextStepsVis() {
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

  const countyTotalPop = d3.rollup(FOOD_ACCESS_DATASET,
    v => Object.fromEntries(columnsToSum.map(col => [col, d3.sum(v, d => {
      return +d[col];
    })])),
    d => d.State + "," + d.County);

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
  let data = [];
  // for (const [key, value] of stateTotalPop.entries()) {
  //     data.push({"state": key, "percentage": statePopShare.get(key).lapop10share });
  // }
  for (const state of statePopShare.keys()) {
    let element = {"location": state};
    for (const entry of Object.entries(statePopShare.get(state))){
      element[entry[0]] = entry[1];
    }
    data.push(element);
  }  

  for (const county of countyPopShare.keys()) {
    let element = {"location": county};
    for (const entry of Object.entries(countyPopShare.get(county))){
      element[entry[0]] = entry[1];
    }
    data.push(element);
  }  
  
  let stateData = data.filter(d => !d.location.includes(","));
  stateData.sort((a, b) => b.lapop10share - a.lapop10share);

  // -------------------------- Main Function To Build Chart --------------------------
  getChartNextStepsVis = function() {
    const margin = ({top: 50, right: 20, bottom: 10, left: 80})
    const numToShow = 15;
    let topStates = [];
    for (const state of stateData.slice(0, numToShow)) {
      topStates.push(state.location);
    }

    let x = d3.scaleLinear()
        .domain([0, Math.ceil(d3.max(stateData, d => d.lapop10share) * 100) / 100])
        .range([margin.left, CHART_NEXT_STEPS_WIDTH - margin.right]);   
    let y = d3.scaleBand()
        .domain(topStates)
        .rangeRound([margin.top, CHART_NEXT_STEPS_HEIGHT - margin.bottom])
        .padding(0.1);
    const xAxis =  g => g
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${margin.top})`)
        .call(d3.axisTop(x).tickFormat(d => (d * 100).toFixed(2)+"%"));   
    const yAxis = g => g
        .attr("class", "y-axis")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickSizeOuter(0));

    //create the chart
    const svg = d3.create("svg")
      .attr("height", CHART_NEXT_STEPS_HEIGHT)
      .attr("width", CHART_NEXT_STEPS_WIDTH);
  
    const bars = svg.append("g")
        .attr("fill", "#ce4e55")
      .selectAll("rect")
      .data(stateData.slice(0, numToShow))
      .join("rect")
        .attr("class", "bar")
        .attr("x", x(0))
        .attr("y", d => y(d.location))
        .attr("width", d => x(d.lapop10share) - x(0))
        .attr("height", y.bandwidth());
  
    const barLabels = svg.append("g")
        .attr("fill", "white")
        .attr("text-anchor", "end")
        .attr("font-family", "sans-serif")
        .attr("font-size", 12)
      .selectAll("text")
      .data(stateData.slice(0, numToShow))
      .join("text")
        .attr("class", "bar-label")
        .attr("x", d => x(d.lapop10share))
        .attr("y", d => y(d.location) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("dx", -4)
        .text(d => (d.lapop10share * 100).toFixed(2) + "%")
      .call(text => text.filter(d => x(d.lapop10share) - x(0) < 20) // short bars
        .attr("dx", +4)
        .attr("fill", "black")
        .attr("text-anchor", "start"));
    
    const xLabel = svg.append("text")
      .attr("class", "x-label")
      .text("Percentage of Population 10+ Miles From Supermarket in the United States")
      .attr("font-size", "12px")
      .attr("y", margin.top / 2 - 10)
      .attr("x", 110)
      .attr("font-weight", "bold")
      .attr("fill", "black");

    svg.append("g")
      .call(xAxis);

    svg.append("g")
      .call(yAxis);
    
    const idToDataColumn = {
      "all-btn": "lapop10share",
      "aian-btn": "laaian10share",
      "asian-btn": "laasian10share",
      "black-btn": "lablack10share",
      "hisp-btn": "lahisp10share",
      "nhopi-btn": "lanhopi10share",
      "white-btn": "lawhite10share",
      "omultir-btn": "laomultir10share"
    };

    let timeOutId = null;

    const buttonClickEvent = function(event) {
      // Stop previous timeout
      clearTimeout(timeOutId);
      timeOutId = null;

      // Change button appearance
      $("#filter-btns button.active").removeClass("active");
      this.classList.add("active");

      const column = idToDataColumn[event.target.id];
      let newData = data.filter(d => !d.location.includes(","));
      newData.sort((a, b) => b[column] - a[column]);
      let topLocations = [];
      for (const d of newData.slice(0, numToShow)) {
        topLocations.push(d.location);
      }

      // Remove locations not included in the chart
      svg.selectAll(".bar").filter(d => !topLocations.includes(d.location))
        .transition().duration(TRANSITION_DURATION)
        .attr("width", 0);

      svg.selectAll(".bar-label").filter(d => !topLocations.includes(d.location))
        .text("");

      timeOutId = setTimeout(function() {
        let oldLocations = y.domain();
        // Update y-axis domain
        let newY = y.copy().domain(topLocations);
        svg.select(".y-axis")
          .transition().duration(TRANSITION_DURATION).ease(d3.easeSinInOut)
          .call(d3.axisLeft(newY).tickSizeOuter(0));
        
        // Update x-axis domain
        let newX = x.copy().domain([0, Math.ceil(d3.max(newData, d => d[column]) * 100) / 100])
        svg.select(".x-axis")
          .transition().duration(TRANSITION_DURATION).ease(d3.easeSinInOut)
          .call(d3.axisTop(newX).tickFormat(d => (d * 100).toFixed(2)+"%"));  
        
        // Update already-included bars
        svg.selectAll(".bar").filter(d => topLocations.includes(d.location))
          .transition().duration(TRANSITION_DURATION).ease(d3.easeSinInOut)
            .attr("y", d => newY(d.location))
            .attr("width", d => newX(d[column]) - newX(0));
        
        // Update already-included bar labels
        svg.selectAll(".bar-label").filter(d => topLocations.includes(d.location))
          .transition().duration(TRANSITION_DURATION).ease(d3.easeSinInOut)
            .text(d => (d[column] * 100).toFixed(2) + "%")
            .attr("x", d => newX(d[column]))
            .attr("y", d => newY(d.location) + newY.bandwidth() / 2);

        timeOutId = setTimeout(function() { 
          // move not-currently-shown bars to their y location
          svg.selectAll(".bar").filter(d => !topLocations.includes(d.location))
            .data(newData.filter(d => !oldLocations.includes(d.location)))
              .attr("y", d => newY(d.location));
          
          svg.selectAll(".bar-label").filter(d => !topLocations.includes(d.location))
            .data(newData.filter(d => !oldLocations.includes(d.location)))
              .attr("x", newX(0))  
              .attr("y", d => newY(d.location) + newY.bandwidth() / 2);
          
          // gradually extend the bar out (this will be perceived as new)
          svg.selectAll(".bar").filter(d => !oldLocations.includes(d.location))
            .transition().duration(TRANSITION_DURATION).ease(d3.easeSinInOut)
              .attr("y", d => newY(d.location))
              .attr("width", d => newX(d[column]) - newX(0));
          
          svg.selectAll(".bar-label").filter(d => !oldLocations.includes(d.location))
            .transition().duration(TRANSITION_DURATION).ease(d3.easeSinInOut)
              .text(d => (d[column] * 100).toFixed(2) + "%")
              .attr("x", d => newX(d[column]));
          
          // Update yScale and xScale
          y = newY;
          x = newX;
        }, TRANSITION_DURATION);
      }, TRANSITION_DURATION);
    }

    $("#filter-btns button").on("click", buttonClickEvent);

    return svg.node();
  }
}