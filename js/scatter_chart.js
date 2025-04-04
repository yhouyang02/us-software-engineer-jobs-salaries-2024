// loading the salaries, then putting everything in a .then.catch structure
d3.csv("./data/salaries.csv").then(data => {
    console.log("data:", data);

    // preprocessing data to numbers
    data.forEach(d => {
        d["Avg Salary"] = +d["Avg Salary"];
    });

    console.log("HERE1")
    // using primary titles as the key
    const jobTitles = [...new Set(data.map(d => d["Primary Title"]))].sort();
    const dropdown = d3.select("#job-title");

    // adding to dropdown
    jobTitles.forEach(title => {
        dropdown.append("option")
            .attr("value", title)
            .text(title);
    });

    console.log("HERE2")
    // creating the scale for entry, intermediate, and senior levels
    const experienceLevels = ["Entry", "Intermediate", "Senior"];
    const colorScale = d3.scaleOrdinal()
        .domain(experienceLevels)
        .range(["#68ff68", "#65c1ff", "#c88bff"]);

    // dimensions of the graph
    const width = 900,
        margin = { top: 20, right: 140, bottom: 60, left: 180 };

    const svg = d3.select("#chart")
        .attr("width", width)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // x and y axis groups
    const xAxisGroup = svg.append("g").attr("class", "x-axis");
    const yAxisGroup = svg.append("g").attr("class", "y-axis");
    const gridGroup = svg.append("g").attr("class", "grid");

    // Creating a separate tooltip element (avoiding conflicts)
    const customTooltip = d3.select("body")
        .append("div")
        .attr("class", "custom-tooltip")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ddd")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("font-size", "14px")
        .style("visibility", "hidden")
        .style("pointer-events", "none");

    console.log("HERE3")
    // updateChart function
    function updateChart(selectedTitle) {
        const filteredData = selectedTitle === "All" ? data : data.filter(d => d["Primary Title"] === selectedTitle);

        // Get unique companies for the filtered data
        const companies = [...new Set(filteredData.map(d => d["Company"]))].sort();
        const rowSpacing = 25;
        const height = companies.length * rowSpacing + margin.top + margin.bottom;
        d3.select("#chart").attr("height", height);

        // xscale and yscale
        const yScale = d3.scaleBand()
            .domain(companies)
            .range([0, height - margin.top - margin.bottom])
            .padding(0.3);

        const xScale = d3.scaleLinear()
            .domain([0, d3.max(filteredData, d => d["Avg Salary"]) + 5000])
            .range([0, width - margin.left - margin.right]);

        // update gridlines
        gridGroup.transition().duration(500)
            .call(d3.axisLeft(yScale)
                .tickSize(-width + margin.left + margin.right)
                .tickFormat("")
            );

        // updating x y axis. Adding transitions
        yAxisGroup.transition().duration(500)
            .call(d3.axisLeft(yScale));

        // Update X-axis
        xAxisGroup.transition().duration(500)
            .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
            .call(d3.axisBottom(xScale));

        console.log("successfully set axis group animations")

        // end transition

        // labels
        svg.selectAll(".x-label").remove();
        svg.append("text")
            .attr("class", "x-label")
            .attr("text-anchor", "middle")
            .attr("x", (width - margin.left - margin.right) / 2)
            .attr("y", height - margin.top - margin.bottom + 40)
            .text("Average Salary ($)");

        // binding
        const circles = svg.selectAll(".dot")
            .data(filteredData, d => d["Company"] + d["Primary Title"]);

        // enter section: adding new circles
        const enterCircles = circles.enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => xScale(d["Avg Salary"]))
            .attr("cy", d => yScale(d["Company"]) + yScale.bandwidth() / 2)
            .attr("r", 8)
            .attr("fill", d => colorScale(d["Experience Level"]))
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .on("mouseover", (event, d) => {
                let tooltipContent = `
                    <strong>Company:</strong> ${d["Company"]} <br>
                    
                `;

                if (d["Secondary Title"] && d["Secondary Title"] !== "n/a") {
                    tooltipContent += `<strong>Title:</strong> ${d["Primary Title"]} (${d["Secondary Title"]})<br>`;
                } else {
                    tooltipContent += `<strong>Title:</strong> ${d["Primary Title"]} <br>`;
                }

                tooltipContent += `
                    <strong>Experience:</strong> ${d["Experience Level"]} <br>
                    <strong>Avg Salary:</strong> $${d["Avg Salary"]}
                `;

                customTooltip.style("visibility", "visible")
                    .html(tooltipContent)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", () => {
                customTooltip.style("visibility", "hidden");
            });



        enterCircles.merge(circles).transition().duration(500)
            .attr("cx", d => xScale(d["Avg Salary"]))
            .attr("cy", d => yScale(d["Company"]) + yScale.bandwidth() / 2);

        circles.exit().transition().duration(500).attr("r", 0).remove();
    }

    updateChart("All");
    console.log("HERE - updated chart")
    dropdown.on("change", function () { updateChart(this.value); });

}).catch(error => console.log("Error: Data is not loading correctly:", error));
