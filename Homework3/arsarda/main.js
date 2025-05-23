const svg1 = d3.select("#svg1");
const svg2 = d3.select("#svg2");
const svg3 = d3.select("#svg3");

// --- View Toggle Setup: Switches between visualizations ---
// View toggling setup
const views = ["view1", "view2", "view3"];
const svgs = [svg1, svg2, svg3];
let currentViewIndex = 0;
let globalData = null;

// Updates the displayed chart based on the current index
function updateView(index) {
  views.forEach((id, i) => {
    document.getElementById(id).style.display = i === index ? "flex" : "none";
    document.getElementById(id).style.justifyContent = i === index ? "center" : "none";
  });

  // Clear and re-render current view
  svgs[index].selectAll("*").remove();
  if (index === 0) drawDonutChart(globalData);
  if (index === 1) drawChordDiagram(globalData);
  if (index === 2) drawStackedBar(globalData);
}

// Next button cycles to the next view
document.getElementById("nextBtn").addEventListener("click", () => {
  currentViewIndex = (currentViewIndex + 1) % views.length;
  updateView(currentViewIndex);
});

// Previous button cycles to the previous view
document.getElementById("prevBtn").addEventListener("click", () => {
  currentViewIndex = (currentViewIndex - 1 + views.length) % views.length;
  updateView(currentViewIndex);
});

// --- Tooltip Setup: Creates styled hover tooltips for charts ---
// Tooltip setup
const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("position", "absolute").style("padding", "8px").style("background", "rgba(0,0,0,0.7)").style("color", "#fff").style("border-radius", "4px").style("pointer-events", "none").style("font-size", "12px").style("opacity", 0);

const chordTooltip = d3
  .select("body")
  .append("div")
  .attr("class", "chord-tooltip")
  .style("position", "absolute")
  .style("padding", "8px")
  .style("background", "rgba(0,0,0,0.75)")
  .style("color", "#fff")
  .style("border-radius", "4px")
  .style("pointer-events", "none")
  .style("font-size", "12px")
  .style("opacity", 0);

// --- Data Loading: Read CSV once and initialize first chart ---
// Load data once and trigger first chart
d3.csv("student_mental_health.csv")
  .then(function (data) {
    globalData = data;
    updateView(currentViewIndex); // draw initial view (donut chart)
  })
  .catch(console.error);

// === Chart Drawing Functions: Renders different visualizations ===
// ==== Chart Drawing Functions ====

// Draws the Donut Chart showing CGPA distribution
function drawDonutChart(data) {
  const svg = svg1;
  const { width, height } = svg.node().getBoundingClientRect();
  //svg.attr("width", width).attr("height", height);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .attr("font-size", "40px")
    .text("CGPA Distribution (Donut Chart)");

  const donutGroup = svg.append("g").attr("transform", `translate(${width / 2}, ${height / 2 + 20})`);

  const radius = Math.min(width, height) / 4;
  const donutColor = d3.scaleOrdinal(d3.schemeCategory10);
  const cgpaCounts = {};

  data.forEach((d) => {
    const cgpa = d["What is your CGPA?"].trim();
    if (cgpa) cgpaCounts[cgpa] = (cgpaCounts[cgpa] || 0) + 1;
  });

  const cgpaArray = Object.entries(cgpaCounts);
  donutColor.domain(cgpaArray.map((d) => d[0]));

  const pie = d3.pie().value((d) => d[1]);
  const arc = d3
    .arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius);
  const arcs = pie(cgpaArray);

  const paths = donutGroup
    .selectAll("path")
    .data(arcs)
    .enter()
    .append("path")
    .attr("fill", (d) => donutColor(d.data[0]))
    .attr("stroke", "white")
    .style("stroke-width", "2px");

  paths
    .transition()
    .duration(1000)
    .attrTween("d", function (d) {
      //first animation for donuts rendering
      const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
      return function (t) {
        return arc(i(t));
      };
    });
  //.attr("d", arc)

  paths
    .on("mouseover", function (d) {
      d3.select(this).attr("fill", d3.rgb(donutColor(d.data[0])).darker(1));
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`<strong>CGPA:</strong> ${d.data[0]}<br><strong>Count:</strong> ${d.data[1]}`);
    })
    .on("mousemove", () => {
      tooltip.style("left", d3.event.pageX + 10 + "px").style("top", d3.event.pageY - 20 + "px");
    })
    .on("mouseout", function (d) {
      d3.select(this).attr("fill", donutColor(d.data[0]));
      tooltip.transition().duration(200).style("opacity", 0);
    });

  const donutLegend = svg.append("g").attr("transform", `translate(${width - 150}, 50)`);
  const legendItems = donutLegend
    .selectAll(".legend-item")
    .data(cgpaArray)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 30})`);

  legendItems
    .append("rect")
    .attr("width", 20)
    .attr("height", 20)
    .attr("fill", (d) => donutColor(d[0]))
    .style("opacity", 0)
    .transition()
    .delay((d, i) => i * 100)
    .duration(500)
    .style("opacity", 1);

  legendItems
    .append("text")
    .attr("x", 25) // Adjusted spacing for bigger boxes
    .attr("y", 15)
    .text((d) => d[0])
    .attr("font-size", "20px")
    .style("opacity", 0)
    .transition()
    .delay((d, i) => i * 100 + 100)
    .duration(500)
    .style("opacity", 1);
}

// Draws the Chord Diagram visualizing co-occurrence of mental health conditions
function drawChordDiagram(data) {
  const svg = svg2;
  const { width, height } = svg.node().getBoundingClientRect();
  let animationFinished = false;
  //svg.attr("width", width).attr("height", height);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .attr("font-size", "40px")
    .text("Mental Health Relationships (Chord Diagram)");

  const group = svg.append("g").attr("transform", `translate(${width / 2}, ${height / 2 + 20})`);
  const radius = Math.min(width, height) / 4;
  const labels = ["Marital status", "Do you have Depression?", "Do you have Anxiety?", "Do you have Panic attack?", "Did you seek any specialist for a treatment?"];

  const matrix = Array(labels.length)
    .fill(0)
    .map(() => Array(labels.length).fill(0));
  const indexMap = Object.fromEntries(labels.map((label, i) => [label, i]));

  data.forEach((d) => {
    const yesLabels = labels.filter((label) => d[label] && d[label].trim().toLowerCase() === "yes");
    yesLabels.forEach((a) => {
      yesLabels.forEach((b) => {
        matrix[indexMap[a]][indexMap[b]] += 1;
      });
    });
  });

  const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending);
  const arc = d3
    .arc()
    .innerRadius(radius - 20)
    .outerRadius(radius);
  const ribbon = d3.ribbon().radius(radius - 20);
  const color = d3.scaleOrdinal().domain(labels).range(d3.schemeSet2);
  const chords = chord(matrix);

  group
    .selectAll("path.group")
    .data(chords.groups)
    .enter()
    .append("path")
    .attr("fill", (d) => color(labels[d.index]))
    .attr("stroke", (d) => d3.rgb(color(labels[d.index])).darker())
    .transition()
    .duration(1000)
    .attrTween("d", function (d) {
      const i = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d);
      return function (t) {
        return arc(i(t));
      };
    });

  const ribbons = group
    .selectAll("path.ribbon")
    .data(chords)
    .enter()
    .append("path")
    .attr("class", "ribbon")
    .style("fill", (d) => color(labels[d.target.index]))
    .style("stroke", "#ccc")
    .style("opacity", 0)
    .on("mouseover", function (d) {
      if (!animationFinished) return;
      group
        .selectAll(".ribbon")
        .transition()
        .duration(200)
        .style("opacity", (x) => (x === d ? 0.9 : 0.1));
      chordTooltip.transition().duration(200).style("opacity", 0.9);
      chordTooltip
        .html(
          `
                <strong>${labels[d.source.index]}</strong> ⇌ <strong>${labels[d.target.index]}</strong><br>
                <strong>Count:</strong> ${matrix[d.source.index][d.target.index]}
            `
        )
        .style("left", d3.event.pageX + 10 + "px")
        .style("top", d3.event.pageY - 20 + "px");
    })
    .on("mousemove", () => {
      if (!animationFinished) return;
      chordTooltip.style("left", d3.event.pageX + 10 + "px").style("top", d3.event.pageY - 20 + "px");
    })
    .on("mouseout", () => {
      if (!animationFinished) return;
      group.selectAll(".ribbon").transition().duration(200).style("opacity", 0.9);
      chordTooltip.transition().duration(200).style("opacity", 0);
    });

  ribbons
    .transition()
    .duration(1000)
    .attrTween("d", function (d) {
      const interpolateSource = d3.interpolate({ startAngle: d.source.startAngle, endAngle: d.source.startAngle }, d.source);
      const interpolateTarget = d3.interpolate({ startAngle: d.target.startAngle, endAngle: d.target.startAngle }, d.target);
      return function (t) {
        return d3.ribbon().radius(radius - 20)({
          source: interpolateSource(t),
          target: interpolateTarget(t),
        });
      };
    })
    .style("opacity", 0.8)
    .on("end", function (_, i, nodes) {
      // only trigger once after the last ribbon finishes
      if (i === chords.length - 1) {
        animationFinished = true;
      }
    });

  const legend = svg.append("g").attr("transform", `translate(${width - 400}, 50)`);
  const legendItems = legend
    .selectAll(".legend-item")
    .data(labels)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 30})`);

  legendItems
    .append("rect")
    .attr("width", 20)
    .attr("height", 20)
    .attr("fill", (d) => color(d))
    .style("opacity", 0)
    .transition()
    .delay((d, i) => i * 100)
    .duration(500)
    .style("opacity", 1);

  legendItems
    .append("text")
    .attr("x", 25)
    .attr("y", 15)
    .text((d) => d)
    .attr("font-size", "20px")
    .style("opacity", 0)
    .transition()
    .delay((d, i) => i * 100 + 100)
    .duration(500)
    .style("opacity", 1);
}

// Draws the Stacked Bar Chart showing treatment seeking behavior by CGPA
function drawStackedBar(data) {
  const svg = svg3;
  const { width, height } = svg.node().getBoundingClientRect();
  //svg.attr("width", width).attr("height", height);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .attr("font-size", "40px")
    .text("Treatment Seeking by CGPA (Stacked Bar)");

  const group = svg.append("g").attr("transform", `translate(100, 80)`);
  const barWidth = width * 0.9,
    barHeight = height * 0.8;
  const bins = ["2.00 - 2.49", "2.50 - 2.99", "3.00 - 3.49", "3.50 - 4.00"];
  const grouped = {};
  bins.forEach((cgpa) => (grouped[cgpa] = { Yes: 0, No: 0 }));

  data.forEach((d) => {
    const cgpa = d["What is your CGPA?"]?.trim();
    const response = d["Did you seek any specialist for a treatment?"]?.trim();
    if (bins.includes(cgpa) && (response === "Yes" || response === "No")) {
      grouped[cgpa][response]++;
    }
  });

  const stackedData = bins.map((cgpa) => ({ CGPA: cgpa, ...grouped[cgpa] }));
  const keys = ["Yes", "No"];
  const stack = d3.stack().keys(keys);
  const series = stack(stackedData);

  const x = d3.scaleBand().domain(bins).range([0, barWidth]).padding(0.3);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(stackedData, (d) => d.Yes + d.No)])
    .range([barHeight, 0]);
  const color = d3.scaleOrdinal().domain(keys).range(d3.schemeSet1);

  const bars = group
    .selectAll("g")
    .data(series)
    .enter()
    .append("g")
    .attr("fill", (d) => color(d.key))
    .selectAll("rect")
    .data((d) => d)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.data.CGPA))
    .attr("y", y(0)) // Start at baseline
    .attr("height", 0) // Start with 0 height
    .attr("width", x.bandwidth());

  bars
    .transition()
    .duration(800)
    .delay((_, i) => i * 100) // optional: staggered effect
    .attr("y", (d) => y(d[1])) // Animate to real position
    .attr("height", (d) => y(d[0]) - y(d[1])); // Animate to real height

  bars
    .on("mouseover", function (d, i) {
      const key = d3.select(this.parentNode).datum().key;
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(`<strong>CGPA:</strong> ${d.data.CGPA}<br><strong>${key}:</strong> ${d.data[key]}`)
        .style("left", d3.event.pageX + 10 + "px")
        .style("top", d3.event.pageY - 20 + "px");
    })
    .on("mousemove", () => {
      tooltip.style("left", d3.event.pageX + 10 + "px").style("top", d3.event.pageY - 20 + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(200).style("opacity", 0);
    });

  group.append("g").attr("transform", `translate(0, ${barHeight})`).call(d3.axisBottom(x));
  group.append("g").call(d3.axisLeft(y).ticks(5));

  const legend = svg.append("g").attr("transform", `translate(${width - 220}, 10)`);
  const legendItems = legend
    .selectAll(".legend-item")
    .data(keys)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 30})`);

  legendItems
    .append("rect")
    .attr("width", 20)
    .attr("height", 20)
    .attr("fill", (d) => color(d))
    .style("opacity", 0)
    .transition()
    .delay((d, i) => i * 100)
    .duration(500)
    .style("opacity", 1);

  legendItems
    .append("text")
    .attr("x", 25)
    .attr("y", 15)
    .text((d) => d)
    .attr("font-size", "20px")
    .style("opacity", 0)
    .transition()
    .delay((d, i) => i * 100 + 100)
    .duration(500)
    .style("opacity", 1);
}
