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

  // Map{"<state>,<county>" => #populationInCounty}
  let countyTotalPop = d3.rollup(FOOD_ACCESS_DATASET,
    v => d3.sum(v, d => +d.LILATracts_1And10),
    d => d.State + ", " + d.County);

  data = Array.from({length: countyTotalPop.size / 10}, (_, i) => {
    const r = step * Math.sqrt(i += 0.5), a = theta * i;
    return [
      BUBBLE_WIDTH / 2 + r * Math.cos(a),
      BUBBLE_HEIGHT / 2 + r * Math.sin(a)
    ];
  });

  let numCounties = 0
  for (const [key, value] of countyTotalPop.entries()) {
    if (value !== 0) {
      numCounties += 1;
    }
  }

  getBubbleVis = function() {
    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, BUBBLE_WIDTH, BUBBLE_HEIGHT])

    const g = svg.append("g");

    g.selectAll("circle")
      .data(data)
      .join("circle")
        .attr("cx", ([x]) => x)
        .attr("cy", ([, y]) => y)
        .attr("r", radius)
        .attr("fill", (d, i) => {
          if (i < (numCounties / 10)) {
            return "tomato";
          } else {
            return "gray";
          }
        })

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