const svg = d3.select("svg");
const width = window.innerWidth;
const height = window.innerHeight;
svg.attr("width", width).attr("height", height);

// Tooltip setup
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("padding", "8px")
    .style("background", "rgba(0,0,0,0.7)")
    .style("color", "#fff")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("opacity", 0);

const chordTooltip = d3.select("body").append("div")
    .attr("class", "chord-tooltip")
    .style("position", "absolute")
    .style("padding", "8px")
    .style("background", "rgba(0,0,0,0.75)")
    .style("color", "#fff")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("opacity", 0);

d3.csv("student_mental_health.csv").then(function(data) {
    // -------------------- DONUT CHART --------------------
    const donutGroup = svg.append("g")
        .attr("transform", `translate(${width / 6}, ${height / 2 + 40})`);

    const radius = Math.min(width, height) / 6;
    const donutColor = d3.scaleOrdinal().range(d3.schemeCategory10);

    const cgpaCounts = {};
    data.forEach(function(d) {
        const cgpa = d["What is your CGPA?"].trim();
        if (cgpa) {
            cgpaCounts[cgpa] = (cgpaCounts[cgpa] || 0) + 1;
        }
    });

    const cgpaArray = Object.entries(cgpaCounts);
    donutColor.domain(cgpaArray.map(d => d[0]));

    const pie = d3.pie().value(d => d[1]);
    const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius);
    const arcs = pie(cgpaArray);

    donutGroup.selectAll("path")
        .data(arcs)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => donutColor(d.data[0]))
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .on("mouseover", function(d) {
            d3.select(this).attr("fill", d3.rgb(donutColor(d.data[0])).darker(1));
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`<strong>CGPA:</strong> ${d.data[0]}<br><strong>Count:</strong> ${d.data[1]}`);
        })
        .on("mousemove", function() {
            tooltip.style("left", (d3.event.pageX + 10) + "px")
                   .style("top", (d3.event.pageY - 20) + "px");
        })
        .on("mouseout", function(d) {
            d3.select(this).attr("fill", donutColor(d.data[0]));
            tooltip.transition().duration(200).style("opacity", 0);
        });

    const donutLegend = svg.append("g")
        .attr("transform", `translate(${width / 6 - 80}, ${height / 2 - radius - 70})`);
    cgpaArray.forEach((d, i) => {
        donutLegend.append("rect").attr("x", 0).attr("y", i * 20).attr("width", 12).attr("height", 12).attr("fill", donutColor(d[0]));
        donutLegend.append("text").attr("x", 20).attr("y", i * 20 + 10).text(d[0]).attr("font-size", "12px");
    });

    svg.append("text")
        .attr("x", width / 6)
        .attr("y", height / 2 - radius - 90)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("CGPA Range Legend");

    // -------------------- CHORD DIAGRAM --------------------
    const middleGroup = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2 + 40})`);

    const chordRadius = Math.min(width, height) / 4;
    const chordLabels = [
        "Marital status",
        "Do you have Depression?",
        "Do you have Anxiety?",
        "Do you have Panic attack?",
        "Did you seek any specialist for a treatment?"
    ];

    const chordMatrix = Array(chordLabels.length).fill(0).map(() => Array(chordLabels.length).fill(0));
    const indexMap = {};
    chordLabels.forEach((label, i) => indexMap[label] = i);

    data.forEach(d => {
        const yesLabels = chordLabels.filter(label => d[label] && d[label].trim().toLowerCase() === "yes");
        yesLabels.forEach(a => {
            yesLabels.forEach(b => {
                chordMatrix[indexMap[a]][indexMap[b]] += 1;
            });
        });
    });

    const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending);
    const arcChord = d3.arc().innerRadius(chordRadius - 20).outerRadius(chordRadius);
    const ribbon = d3.ribbon().radius(chordRadius - 20);
    const chordColor = d3.scaleOrdinal().domain(chordLabels).range(d3.schemeSet2);
    const chords = chord(chordMatrix);

    middleGroup.selectAll("path.group")
        .data(chords.groups)
        .enter().append("path")
        .attr("class", "group")
        .attr("d", arcChord)
        .style("fill", d => chordColor(chordLabels[d.index]))
        .style("stroke", d => d3.rgb(chordColor(chordLabels[d.index])).darker());

    middleGroup.selectAll("path.ribbon")
        .data(chords)
        .enter().append("path")
        .attr("class", "ribbon")
        .attr("d", ribbon)
        .style("fill", d => chordColor(chordLabels[d.target.index]))
        .style("stroke", "#ccc")
        .style("opacity", 0.8)
        .on("mouseover", function(d) {
            middleGroup.selectAll(".ribbon")
                .transition().duration(200)
                .style("opacity", x => x === d ? 0.9 : 0.1);
            chordTooltip.transition().duration(200).style("opacity", 1);
            chordTooltip.html(`
                <strong>${chordLabels[d.source.index]}</strong> ⇌ <strong>${chordLabels[d.target.index]}</strong><br>
                <strong>Count:</strong> ${chordMatrix[d.source.index][d.target.index]}
            `)
            .style("left", (d3.event.pageX + 10) + "px")
            .style("top", (d3.event.pageY - 20) + "px");
        })
        .on("mousemove", function() {
            chordTooltip
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            middleGroup.selectAll(".ribbon").transition().duration(200).style("opacity", 0.8);
            chordTooltip.transition().duration(200).style("opacity", 0);
        });

    const chordLegend = svg.append("g")
        .attr("transform", `translate(${width / 2 - 120}, ${height / 2 - chordRadius - 90})`);
    chordLabels.forEach((label, i) => {
        chordLegend.append("rect").attr("x", 0).attr("y", i * 20).attr("width", 12).attr("height", 12).attr("fill", chordColor(label));
        chordLegend.append("text").attr("x", 20).attr("y", i * 20 + 10).text(label).attr("font-size", "12px");
    });

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2 - chordRadius - 110)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Column to Color Legend");

    // -------------------- STACKED BAR CHART --------------------
    const barGroup = svg.append("g")
        .attr("transform", `translate(${(width * 5) / 6 - 150}, ${height / 2 + 40})`);

    const barWidth = 300;
    const barHeight = 300;
    const sortedCgpa = ["2.00 - 2.49", "2.50 - 2.99", "3.00 - 3.49", "3.50 - 4.00"];
    const grouped = {};
    sortedCgpa.forEach(cgpa => grouped[cgpa] = { Yes: 0, No: 0 });

    data.forEach(d => {
        const cgpa = d["What is your CGPA?"].trim();
        const response = d["Did you seek any specialist for a treatment?"]?.trim();
        if (sortedCgpa.includes(cgpa) && (response === "Yes" || response === "No")) {
            grouped[cgpa][response]++;
        }
    });

    const stackedData = sortedCgpa.map(cgpa => ({
        CGPA: cgpa,
        Yes: grouped[cgpa].Yes,
        No: grouped[cgpa].No
    }));

    const keys = ["Yes", "No"];
    const stack = d3.stack().keys(keys);
    const series = stack(stackedData);

    const x = d3.scaleBand().domain(sortedCgpa).range([0, barWidth]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(stackedData, d => d.Yes + d.No)]).range([barHeight, 0]);
    const barColor = d3.scaleOrdinal().domain(keys).range(d3.schemeSet1);

    barGroup.selectAll("g")
        .data(series)
        .enter()
        .append("g")
        .attr("fill", d => barColor(d.key))
        .selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("x", d => x(d.data.CGPA))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .on("mouseover", function(d, i) {
            const key = d3.select(this.parentNode).datum().key;
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`<strong>CGPA:</strong> ${d.data.CGPA}<br><strong>${key}:</strong> ${d.data[key]}`)
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 20) + "px");
        })
        .on("mousemove", function() {
            tooltip.style("left", (d3.event.pageX + 10) + "px").style("top", (d3.event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(200).style("opacity", 0);
        });

    barGroup.append("g")
        .attr("transform", `translate(0, ${barHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text").attr("text-anchor", "end").attr("transform", "rotate(-35)");

    barGroup.append("g").call(d3.axisLeft(y).ticks(5));

    svg.append("text")
        .attr("x", (width * 5) / 6)
        .attr("y", height / 2 - barHeight / 2 - 70)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Treatment Seeking by CGPA");

    const barLegend = svg.append("g")
        .attr("transform", `translate(${(width * 5) / 6 - 80}, ${height / 2 - barHeight / 2 - 50})`);
    keys.forEach((key, i) => {
        barLegend.append("rect").attr("x", 0).attr("y", i * 20).attr("width", 12).attr("height", 12).attr("fill", barColor(key));
        barLegend.append("text").attr("x", 20).attr("y", i * 20 + 10).text(key).attr("font-size", "12px");
    });

}).catch(function(error) {
    console.error(error);
});
