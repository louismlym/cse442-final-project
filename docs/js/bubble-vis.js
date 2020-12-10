var getBubbleVis;
var BUBBLE_WIDTH;
var BUBBLE_HEIGHT;

async function prepareBubbleVis() {
  // initial variables of the chart
  let currentTransform = [BUBBLE_WIDTH / 2, BUBBLE_HEIGHT / 2, BUBBLE_HEIGHT];
  let radius = 6;
  let step = radius * 2;
  let theta = Math.PI * (3 - Math.sqrt(5));

  // load dataset if it hasn't been loaded yet
  await loadDataset();

  let sumTracts = 0;
  for (var i = 0; i < FOOD_ACCESS_DATASET.length; i++) {
    sumTracts += FOOD_ACCESS_DATASET[i].LILATracts_1And10;
  }

  // Map{"<state>,<county>" => #number of food deserts
  let countyFoodDeserts = d3.rollup(FOOD_ACCESS_DATASET,
    v => d3.sum(v, d => +d.LILATracts_1And10),
    d => d.State + ", " + d.County);

  data = Array.from({length: countyFoodDeserts.size / 10}, (_, i) => {
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

  getBubbleVis = function() {
    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, BUBBLE_WIDTH, BUBBLE_HEIGHT])

    const g = svg.append("g");

    let value = 1;

    function update() {
      g.selectAll("circle")
      .data(data)
      .join("circle")
        .attr("cx", ([x]) => x)
        .attr("cy", ([, y]) => y + 15)
        .attr("r", radius)
        .attr("fill", (d, i) => {
          if (i < mapCounts[value] / 10) {
            return "tomato";
          } else {
            return "black";
          }
        })
    }
    
    g.selectAll("circle")
    .data(data)
    .join("circle")
      .attr("cx", ([x]) => x)
      .attr("cy", ([, y]) => y + 35)
      .attr("r", radius)
      .attr("fill", (d, i) => {
        if (i < mapCounts[value] / 10) {
          return "tomato";
        } else {
          return "black";
        }
      })
    
    var slider = d3.sliderHorizontal()
    .min(1)
    .max(10)
    .step(1)
    .width(200)
    .fill("tomato")
    .displayValue(true)
    .displayValue(false)
    .on('onchange', val => {
      value = val;
      d3.select("#value").text(val);
      update();
    });

    g.attr("width", 500)
    .attr("height", 100)
    .append("g")
    .attr("transform", "translate(100,30)")
    .call(slider);

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