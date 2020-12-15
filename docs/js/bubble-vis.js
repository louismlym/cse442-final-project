var getBubbleVis;
var BUBBLE_WIDTH;
var BUBBLE_HEIGHT;

async function prepareBubbleVis() {
  // initial variables of the chart
  let currentTransform = [BUBBLE_WIDTH / 2, BUBBLE_HEIGHT / 2, BUBBLE_HEIGHT];
  let radius = 1.6;
  let step = radius * 2;
  let theta = Math.PI * (3 - Math.sqrt(5));

  // load dataset if it hasn't been loaded yet
  await loadDataset();

  // Map{"<state>,<county>" => #number of food deserts
  let countyFoodDeserts = d3.rollup(FOOD_ACCESS_DATASET,
    v => d3.sum(v, d => +d.LILATracts_1And10),
    d => d.State + ", " + d.County);

  data = Array.from({length: countyFoodDeserts.size}, (_, i) => {
    const r = step * Math.sqrt(i += 0.5), a = theta * i;
    return [
      BUBBLE_WIDTH / 2 + r * Math.cos(a),
      BUBBLE_HEIGHT / 2 + r * Math.sin(a)
    ];
  });

  // get counts of counties that have at least 1-10 food deserts
  var mapCounts = new Map();
  let values = Array.from(countyFoodDeserts.values());
  for (var i = 1; i <= 10; i++) {
    const result = values.filter(j => j >= i).length;
    mapCounts[i] = result;
  }

  var simulation = d3.forceSimulation(data)
                            .force("charge", d3.forceManyBody().strength([-5]))
                            .force("x", d3.forceX())
                            .force("y", d3.forceY())
                            //.on("tick", getBubbleVis)
                            //.stop();
  
  simulation.stop();

  getBubbleVis = function() {
    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, BUBBLE_WIDTH, BUBBLE_HEIGHT])

    const g = svg.append("g");

    let value = 1;
    let numCounties = mapCounts[value];
    let desert = "desert";   

    function update() {
      g.selectAll("circle")
      .data(data)
    .join("circle")
      .attr("cx", ([x]) => x)
      .attr("cy", ([, y]) => y + 35)
      .attr("r", radius)
      .transition()
      .duration(500)
      .style("fill", (d, i) => {
        if (i < numCounties) {
          return "tomato";
        } else {
          return "black";
        }
      })
    }
    
    g.selectAll("circle")
    .data(data)
    .join("circle")
      .attr("cx", ([x]) => Math.random() * BUBBLE_WIDTH)
      .attr("cy", ([, y]) => Math.random() * BUBBLE_HEIGHT)
      .attr("r", radius)
      .transition()
      //.each("circle")
      .duration(2500)
      .attr("cx", ([x]) => x)
      .attr("cy", ([, y]) => y + 35)
      .transition()
      .duration(500)
      .style("fill", (d, i) => {
        if (i < numCounties) {
          return "tomato";
        } else {
          return "black";
        }
      })
    
    var slider = d3.sliderHorizontal()
    .min(1)
    .max(10)
    .step(1)
    .width(250)
    .fill("tomato")
    .displayValue(true)
    .displayValue(false)
    .on('onchange', val => {
      value = val;
      numCounties = mapCounts[value];
      if (value !== 1) {
        desert = "deserts";
      } else {
        desert = "desert";
      }
      svg.select('#stat-update').remove();
      svg.append("text")
      .attr('x', 90)
      .attr('y', 42)
      .attr('id', 'stat-update')
      .style("font-size", "13px")
      .attr("font-weight", "bold")
      .text(numCounties + " out of 3141 counties in " +
          "the United States that have at least " + value + " food " + desert +
          ".");
      //d3.select("#value").text(val);
      update();
    });

    g.attr("width", 200)
    .attr("height", 50)
    .append("g")
    .attr("transform", "translate(150,65)")
    .call(slider);

    // Title
    // svg.append("text")
    // .attr('x', 94)
    // .attr('y', 42)
    // .style("font-size", "12px")
    // .attr("font-weight", "bold")
    // .text("Number of Counties in the United States with 1-10 Food Deserts");

    // // Legend for a bubble
    // svg.append("text")
    // .attr('x', 460)
    // .attr('y', 250)
    // .style("font-size", "10px")
    // .attr("font-weight", "bold")
    // .text("1 county");

    // svg.append("circle")
    // .attr("cx", 455)
    // .attr("cy", 247)
    // .attr("r", radius)
    // .attr("fill", "black");
    
    // // Legend for a bubble
     svg.append("text")
    .attr('x', BUBBLE_WIDTH / 2)
    .attr('y', BUBBLE_HEIGHT - 10)
    .style("font-size", "13px")
    .text("1 country");

    svg.append("circle")
    .attr("cx", BUBBLE_WIDTH / 2 - 10)
    .attr("cy", BUBBLE_HEIGHT - 13)
    .attr("r", radius)
    .attr("fill", "black");

    svg.append("text")
    .attr('x', 90)
    .attr('y', 42)
    .attr('id', 'stat-update')
    .style("font-size", "13px")
    .attr("font-weight", "bold")
    .text(numCounties + " out of 3141 counties in " +
          "the United States have at least " + value + " food desert.");

    function transition() {
      const d = data[Math.floor(Math.random() * data.length)];
      const i = d3.interpolateZoom(currentTransform, [...d, radius * 2 + 1]);

      /*g.transition()
          .delay(250)
          .duration(i.duration)
          .attrTween("transform", () => t => transform(currentTransform = i(t)))
          .on("end", transition); */
    }

    function transform([x, y, r]) {
      return `
        translate(${BUBBLE_WIDTH / 2}, ${BUBBLE_HEIGHT / 2})
        scale(${BUBBLE_HEIGHT / r})
        translate(${-x}, ${-y})
      `;
    }

    return svg.call(transition).node();
  }
}