// Variables to export to main.js
var getMapVis;
var MAP_WIDTH;
var MAP_HEIGHT;

async function prepareMapVis() {
  // initial variables of the map
  let currentTransform = {"k": 1, "x": 0, "y": 0};

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
  
  // -------------------------- Find Range of Each State/Data --------------------------
  const addRangeValue = function(value, key, map) {
    let min = 1;
    let max = 0;
    for (let col in value) {
      if (racialShareColumns.includes(col)) {
        min = Math.min(min, value[col]);
        max = Math.max(max, value[col])
      }
    }
    map.get(key)["range"] = max - min;
  }

  statePopShare.forEach(addRangeValue);
  countyPopShare.forEach(addRangeValue);
    
  // -------------------------- Define getMapVis function --------------------------
  getMapVis = function() {
    const path = d3.geoPath();
    const color = d3.scaleSequential([0, 0.4], d3.interpolateReds).nice();
    const countyColor = d3.scaleSequential([0, 1], d3.interpolateOranges).nice();
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on("zoom", zoomed);

    // This svg is the main container of the visualization
    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, MAP_WIDTH, MAP_HEIGHT])
      .on("click", reset);

    const g = svg.append("g");

    // -------------------------- Build Maps --------------------------
    // We layer two maps by having counties map below and states map on top
    // Once a state is clicked, it will be hidden to show counties
    // The idea is retrieved from http://bl.ocks.org/ElefHead/ebff082d41ef8b9658059c408096f782
    const counties = g.append("g")
        .attr("id", "counties")
        .attr("stroke", "black");
    
    const countyPath = counties.selectAll("path")
        .data(topojson.feature(US, US.objects.counties).features)
        .enter().append("path")
          .attr("id", d  => getStateFromID(d.id) + "," + d.properties.name)
          .attr("fill", d => {
            const state = getStateFromID(d.id);
            const key = state + "," + d.properties.name;
            const value = countyPopShare.get(key);
            if (value) {
              return countyColor(value.range);
            }
            return "#444";
          })
          .attr("d", path)
          .attr("class", "county-boundary")
          .on("click", reset)
          .on("mouseover", locationHovered);

    const states = g.append("g")
      .attr("id", "states")
      .attr("cursor", "pointer")
      .attr("stroke", "black")
    
    const statePath = states.selectAll("path")
      .data(topojson.feature(US, US.objects.states).features)
      .join("path")
        .attr("id", d => STATE_INFORMATION.find(s => (s.name === d.properties.name)).state)
        .attr("fill", d => color(statePopShare.get(d.properties.name).range))
        .attr("class", "state")
        .on("click", stateClicked)
        .on("mouseover", locationHovered)
        .attr("d", path);

    // -------------------------- State Name ---------------------------
    const names = states.selectAll("text")
      .data(topojson.feature(US, US.objects.states).features)
      .join("text")
        .attr("id", d => STATE_INFORMATION.find(s => (s.name === d.properties.name)).state + "-text")
        .attr("x", function(d) {
          let x = path.centroid(d)[0];
          if (d.properties.name === "Louisiana") {
            x -= 10;
          } else if (d.properties.name === "Florida") {
            x += 10;
          } else if (d.properties.name === "Michigan") {
            x += 10;
          } else if (d.properties.name === "Rhode Island") {
            x += 20;
          } else if (d.properties.name === "District of Columbia") {
            x += 40;
          } else if (d.properties.name === "Hawaii") {
            x -= 30;
          } else if (d.properties.name === "Delaware") {
            x += 25;
          } else if (d.properties.name === "Maryland") {
            x += 40;
          } else if (d.properties.name === "New Jersey") {
            x += 5;
          } else if (d.properties.name === "California") {
            x -= 10;
          }
          return x;
        })
        .attr("y", function(d) {
          let y = path.centroid(d)[1];
          if (d.properties.name === "Rhode Island") {
            y += 30;
          } else if (d.properties.name === "Delaware") {
            y += 30;
          } else if (d.properties.name === "Maryland") {
            y += 45;
          } else if (d.properties.name === "New Jersey") {
            y += 5;
          } else if (d.properties.name === "Connecticut") {
            y += 5;
          } else if (d.properties.name === "Michigan") {
            y += 15;
          }
          return y;
        })
        .attr("text-anchor", "middle")
        .on("click", stateClicked)
        .text(d => STATE_INFORMATION.find(s => (s.name === d.properties.name)).state);
  
    const stateJson = topojson.feature(US, US.objects.states).features;
    const rhodeIslandLines = states.append('line')
        .style("stroke", "black")
        .style("stroke-width", 2)
        .attr("x1", path.centroid(stateJson.find(d => d.properties.name === "Rhode Island"))[0])
        .attr("y1", path.centroid(stateJson.find(d => d.properties.name === "Rhode Island"))[1])
        .attr("x2", path.centroid(stateJson.find(d => d.properties.name === "Rhode Island"))[0] + 10)
        .attr("y2", path.centroid(stateJson.find(d => d.properties.name === "Rhode Island"))[1] + 20)
        .attr("id", "RI-line");
    
    const delawareLines = states.append('line')
        .style("stroke", "black")
        .style("stroke-width", 2)
        .attr("x1", path.centroid(stateJson.find(d => d.properties.name === "Delaware"))[0])
        .attr("y1", path.centroid(stateJson.find(d => d.properties.name === "Delaware"))[1])
        .attr("x2", path.centroid(stateJson.find(d => d.properties.name === "Delaware"))[0] + 20)
        .attr("y2", path.centroid(stateJson.find(d => d.properties.name === "Delaware"))[1] + 20)
        .attr("id", "DE-line");
    
    const marylandLines = states.append('line')
        .style("stroke", "black")
        .style("stroke-width", 2)
        .attr("x1", path.centroid(stateJson.find(d => d.properties.name === "Maryland"))[0] + 20)
        .attr("y1", path.centroid(stateJson.find(d => d.properties.name === "Maryland"))[1] + 12)
        .attr("x2", path.centroid(stateJson.find(d => d.properties.name === "Maryland"))[0] + 35)
        .attr("y2", path.centroid(stateJson.find(d => d.properties.name === "Maryland"))[1] + 35)
        .attr("id", "MD-line");
    // -------------------------- Draw Borders --------------------------
    // svg.select("#counties")
    //   .append("path")
    //   .attr("fill", "none")
    //   .attr("stroke", "white")
    //   .attr("stroke-linejoin", "round")
    //   .attr("d", path(topojson.mesh(US, US.objects.counties, (a, b) => a !== b)));

    // svg.select("#states")
    //   .append("path")
    //   .attr("fill", "none")
    //   .attr("stroke-linejoin", "round")
    //   .attr("d", path(topojson.mesh(US, US.objects.states, (a, b) => a !== b)));
    
    // -------------------------- Color Legend --------------------------
    svg.append("g")
      .attr("id", "color-legend-state")
      .attr("transform", "translate(" + MAP_HEIGHT + ",20)")
      .append(() => legend({ color, title: "Range of low food access pop. (%) among racial groups", width: 260, tickFormat: '%' }));
  
    svg.append("g")
      .attr("id", "color-legend-county")
      .attr("transform", "translate(" + MAP_HEIGHT + ",20)")
      .attr("class", "hidden")
      .append(() => legend({ color: countyColor, title: "Range of low food access pop. (%) among racial groups", width: 260, tickFormat: '%' }));

    // -------------------------- States Tooltip Events --------------------------
    const tooltip = svg.append("g");

    const mouseMoveEvent = function(event, d) {
      tooltip.call(
        callout,
        `${d.properties.name}
Range: ${(statePopShare.get(d.properties.name).range * 100).toFixed(2)}%`
      );
      let cursor = d3.pointer(event, this);
      cursor[0] = cursor[0] * currentTransform["k"] + currentTransform["x"];
      cursor[1] = cursor[1] * currentTransform["k"] + currentTransform["y"];
      tooltip.attr("transform", `translate(${cursor[0]}, ${cursor[1]})`);
      d3.select(this)
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .raise();
      d3.select("#" + this.id + "-text").raise();
    };
    const mouseLeaveEvent = function() {
      tooltip.call(callout, null);
      d3.select(this)
        .attr("stroke", null)
        .lower();
    }

    // -------------------------- Counties Tooltip Events --------------------------
    const tooltipCounty = svg.append("g");

    const mouseMoveEventCounty = function(event, d) {
      const county = d.properties.name;
      const key = STATE_INFORMATION.find(s => s.state === active.node().id).name + "," + county;
      const value = countyPopShare.get(key);
      let text = `${county}
Data Unavailable`;
      if (value) {
        text = `${county}
Range: ${(value.range * 100).toFixed(2)}%`
      }
      tooltipCounty.call(callout, text);
      let cursor = d3.pointer(event, this);
      cursor[0] = cursor[0] * currentTransform["k"] + currentTransform["x"];
      cursor[1] = cursor[1] * currentTransform["k"] + currentTransform["y"];
      tooltipCounty.attr("transform", `translate(${cursor[0]}, ${cursor[1]})`);
      d3.select(this)
        .classed("mouse-on", true)
        .attr("stroke", "red !important")
        .attr("stroke-width", 1)
        .raise();
    };
    const mouseLeaveEventCounty = function() {
      tooltipCounty.call(callout, null);
      d3.select(this)
        .classed("mouse-on", false)
        .attr("stroke", null)
        .lower();
    }

    // -------------------------- Bind Tooltips --------------------------
    // Add tooltip event listeners to states and counties
    statePath.on("touchmove mousemove", mouseMoveEvent)
      .on("touchend mouseleave", mouseLeaveEvent);
    countyPath.on("touchmove mousemove", mouseMoveEventCounty)
      .on("touchend mouseleave", mouseLeaveEventCounty);

    // -------------------------- Others --------------------------
    svg.call(zoom);
    var active = d3.select(null);

    // -------------------------- Event Functions --------------------------
    function reset() {
      let colorLegend = d3.select("#color-legend-state");
      let colorLegendCounty = d3.select("#color-legend-county");
      colorLegend.classed("hidden", false);
      colorLegendCounty.classed("hidden", true);
      active.classed("active", false);
      d3.select("#" + active.node().id + "-text").classed("hidden", false);
      d3.select("#" + active.node().id + "-line").classed("hidden", false);
      active = d3.select(null);
      statePath.transition().style("fill", null);
      svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity,
        d3.zoomTransform(svg.node()).invert([MAP_WIDTH / 2, MAP_HEIGHT / 2])
      );

      updateScaleOnMapReset();
    }
  
    function zoomed(event) {
      const {transform} = event;
      currentTransform = transform;
      g.attr("transform", transform);
      g.attr("stroke-width", 1 / transform.k);
    }
  
    function stateClicked(event, d) {
      let id = this.id;
      if (id.endsWith("-text")) {
        id = id.substring(0, 2);
      }
      let colorLegend = d3.select("#color-legend-state");
      let colorLegendCounty = d3.select("#color-legend-county");
      if (active.node()) {
        d3.select("#" + active.node().id + "-text").classed("hidden", false);
        d3.select("#" + active.node().id + "-line").classed("hidden", false);
      }
      if (active.node() && active.node().id === id) {
        d3.select("#" + id).classed("active", false);
        d3.select("#" + id + "-text").classed("hidden", false);
        d3.select("#" + id + "-line").classed("hidden", false);
        colorLegend.classed("hidden", false);
        colorLegendCounty.classed("hidden", true);
        return reset(id);
      }
  
      colorLegend.classed("hidden", true);
      colorLegendCounty.classed("hidden", false);
      active.classed("active", false);
      active = d3.select("#" + id).classed("active", true);
      d3.select("#" + id + "-text").classed("hidden", true);
      d3.select("#" + id + "-line").classed("hidden", true);
      const [[x0, y0], [x1, y1]] = path.bounds(d);
      event.stopPropagation();
      svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity
          .translate(MAP_WIDTH / 2, MAP_HEIGHT / 2)
          .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / MAP_WIDTH, (y1 - y0) / MAP_HEIGHT)))
          .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
        d3.pointer(event, svg.node())
      );

      updateScaleOnStateClicked();
    }

    function locationHovered(event) {
      var currentHoveredLocation;
      if (event.target.id.length === 2) { // if this is state
        currentHoveredLocation = getStateNameFromAbbrv(event.target.id);
      } else {  // if this is county
        currentHoveredLocation = event.target.id;
      }
      updateChartOnLocationChange(currentHoveredLocation);  // this one is in chart-for-map-vis.js
    }

    return svg.node();
  }
}