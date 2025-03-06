class BubbleChart {
    constructor(_config, _data) {
        this.config = {
    parentElement: _config.parentElement,
    containerWidth: 900,
    containerHeight: 375,
    margin: { top: 50, right: 20, bottom: 50, left: 50 }
};

        this.data = _data;
        this.initVis();
    }

    /**
     * Initialize the visualization
     */
    initVis() {
        let vis = this;

        vis.width = vis.config.containerWidth;
        vis.height = vis.config.containerHeight + 50; 

        // Create SVG container
        vis.svg = d3.select(vis.config.parentElement).append('svg')
            .attr('width', vis.width)
            .attr('height', vis.height)
            .style("background", "#f8f8f8");
        vis.background = vis.svg.append("rect")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .attr("fill", "white"); 

        // Create a group for zooming & panning
        vis.chartArea = vis.svg.append("g");

        // Define zoom behavior
        vis.zoom = d3.zoom()
            .scaleExtent([0.07, 3])
            .on("zoom", (event) => {
                vis.chartArea.attr("transform", event.transform);
            });

        vis.svg.call(vis.zoom); // Attach zoom behavior

        // Create tooltip
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "#fff")
            .style("padding", "8px")
            .style("border-radius", "5px")
            .style("box-shadow", "0px 0px 8px rgba(0, 0, 0, 0.2)")
            .style("pointer-events", "none")
            .style("opacity", 0);

        // Define radius scale
        const minSalary = d3.min(vis.data, d => d.avg_salary);
        const maxSalary = d3.max(vis.data, d => d.avg_salary);
        vis.radiusScale = d3.scaleSqrt()
            .domain([minSalary, maxSalary])
            .range([5, 150]);

        // Define color scale (1.0 = Red, 5.0 = Blue)
        vis.colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
            .domain([1, 5]); // Reverse range so 5 = Blue, 1 = Red

        vis.createLegend(); // Add legend
        vis.updateVis();
    }



    /**
     * Creates a color legend
     */
createLegend() {
    let vis = this;

    const legendWidth = 300,
          legendHeight = 15,
          legendX = vis.width / 2 - legendWidth / 2, // Center legend
          legendY = vis.config.containerHeight - 60; // Move legend inside the SVG

    // Append legend gradient
    const defs = vis.svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    // Define gradient color stops (matching our scale)
    linearGradient.selectAll("stop")
        .data([
            { offset: "0%", color: vis.colorScale(1) },  // Red (Low Rating)
            { offset: "50%", color: vis.colorScale(3) }, // Yellow (Mid Rating)
            { offset: "100%", color: vis.colorScale(5) } // Blue (High Rating)
        ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    // Draw legend bar
    vis.svg.append("rect")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)")
        .style("stroke", "#000")
        .style("stroke-width", 0.5);

    // Add legend labels (Rating 1.0 → 5.0)
    vis.svg.selectAll(".legend-label")
        .data([1, 3, 5]) // Key rating points
        .enter().append("text")
        .attr("class", "legend-label")
        .attr("x", (d, i) => legendX + (i * (legendWidth / 2))) // Space out labels
        .attr("y", legendY + 30) // Below legend bar
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#333")
        .text(d => `⭐ ${d}.0`);

    // **NEW: Add "Company Rating" Label Under Legend**
    vis.svg.append("text")
        .attr("x", legendX + legendWidth / 2) // Centered under the legend
        .attr("y", legendY + 50) // Slightly below the rating labels
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#333")
        .style("font-weight", "bold")
        .text("Company Rating");
}



    /**
     * Update the visualization with circles and tooltips
     */
    updateVis() {
        let vis = this;

        // Force simulation for positioning
        // const simulation = d3.forceSimulation(vis.data)
        //     .force("center", d3.forceCenter(vis.width / 2, vis.height / 2)) // Reduce centering strength
        //     .force("collision", d3.forceCollide().radius(d => vis.radiusScale(d.avg_salary) + 15)) // Increase spacing
        //     .force("x", d3.forceX(vis.width / 2).strength(0.02)) // Even weaker pull to center
        //     .force("y", d3.forceY(vis.height / 2).strength(0.02)) // Even weaker vertical pull
        //     .on("tick", ticked);

        const simulation = d3.forceSimulation(vis.data)
                    .force("charge", d3.forceManyBody().strength(5))
                    .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
                    .force("collision", d3.forceCollide().radius(d => vis.radiusScale(d.avg_salary) + 2))
                    .on("tick", ticked);


        // Bind data to circles
        let bubbles = vis.chartArea.selectAll("circle")
            .data(vis.data, d => d.company);

        // Enter selection
        bubbles.enter()
            .append("circle")
            .merge(bubbles)
            .attr("r", d => vis.radiusScale(d.avg_salary))
            .attr("fill", d => vis.colorScale(d.company_score)) // Assign color based on rating
            .attr("stroke", "black") // Black outline
            .attr("stroke-width", 1.5)
            .attr("opacity", 1.0)
            .on("mouseover", (event, d) => {
                vis.tooltip.style("opacity", 1);
                vis.tooltip.html(`
                    <strong>${d.company}</strong><br>
                    Avg Salary: $${d.avg_salary.toLocaleString()}<br>
                    Rating: ${d.company_score}
                `);
            })
            .on("mousemove", (event) => {
                vis.tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseleave", () => {
                vis.tooltip.style("opacity", 0);
            })
            .call(drag(simulation));

        bubbles.exit().remove();

        function ticked() {
            vis.chartArea.selectAll("circle")
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        }

        function drag(simulation) {
            return d3.drag()
                .on("start", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on("drag", (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on("end", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                });
        }
    }
}
