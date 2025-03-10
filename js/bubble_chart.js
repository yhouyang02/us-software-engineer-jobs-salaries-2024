class BubbleChart {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 900,
            containerHeight: 375,
            margin: { top: 50, right: 50, bottom: 50, left: 50 }
        };

        this.data = _data;
        this.initVis();
    }

    /**
     * Initialize the visualization
     */
    initVis() {
        let vis = this;

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.svg = d3.select(vis.config.parentElement)
            .attr("width", vis.config.containerWidth)
            .attr("height", vis.config.containerHeight);

        // Append group for zoom
        vis.chartGroup = vis.svg.append("g")
            .attr("transform", `translate(${vis.config.margin.left - 50},${vis.config.margin.top})`);

        // Define rating ranges (buckets)
        vis.ratingBuckets = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

         vis.xAxisGroupFixed = vis.svg.append("g")
            .attr("transform", `translate(${vis.config.margin.left - 50},${vis.config.margin.top + vis.height + 60})`);
          vis.svg.append("text")
            .attr("class", "x-axis-label")
            .attr("x", vis.config.containerWidth / 2)
            .attr("y", vis.config.containerHeight + 50)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Company Rating");

        // Define X Scale for clusters
        vis.xScale = d3.scaleLinear()
            .domain([1, 5])
            .range([vis.config.margin.left, vis.width]);
            
        vis.radiusScale = d3.scaleSqrt()
            .domain([d3.min(vis.data, d => d.avg_salary), d3.max(vis.data, d => d.avg_salary)])
            .range([1, 10]);

         vis.colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
            .domain([1, 5]); 

        // X-Axis
        vis.xAxis = d3.axisBottom(vis.xScale);
        vis.xAxisGroupFixed.call(vis.xAxis);

        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "#fff")
            .style("padding", "8px")
            .style("border-radius", "5px")
            .style("box-shadow", "0px 0px 8px rgba(0, 0, 0, 0.2)")
            .style("pointer-events", "none")
            .style("opacity", 0);

        vis.createLegend();
        vis.createZoom();
        vis.updateVis();
    }

    /**
     * Creates a color legend
     */
    createLegend() {
    let vis = this;

    const legendWidth = 150,
        legendHeight = 15,
        legendX = vis.config.margin.left + 20, // Move to upper left
        legendY = vis.config.margin.top + 10; // Adjusted Y position

    // Append legend gradient inside the main SVG 
    const defs = vis.svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "legend-gradient-bubblechart")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    // Define gradient color 
    linearGradient.selectAll("stop")
        .data([
            { offset: "0%", color: vis.colorScale(1) },   // Low rating
            { offset: "50%", color: vis.colorScale(3) },  // Medium rating
            { offset: "100%", color: vis.colorScale(5) }  // High rating
        ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    // Append the gradient rectangle
    vis.svg.append("rect")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient-bubblechart)")

    // Append legend labels
    vis.svg.append("text")
        .attr("x", legendX)
        .attr("y", legendY + legendHeight + 15)
        .attr("text-anchor", "start")
        .style("font-size", "12px")
        .text("1.0");

    vis.svg.append("text")
        .attr("x", legendX + legendWidth)
        .attr("y", legendY + legendHeight + 15)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .text("5.0");

    // Title for the legend
    vis.svg.append("text")
        .attr("x", legendX + legendWidth / 2)
        .attr("y", legendY - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#333")
        .style("font-weight", "bold")
        .text("Company Rating Scale");
}

    /**
     * Setup Zooming and Panning
     */
    createZoom() {
        let vis = this;

        vis.zoom = d3.zoom()
            .scaleExtent([0.9, 3]) // Set zoom limits
            .translateExtent([[0, 0], [vis.width, vis.height]])
            .on("zoom", (event) => {
                // Zoom the chart group (bubbles)
                vis.chartGroup.attr("transform", event.transform);

                let newXScale = event.transform.rescaleX(vis.xScale);
                vis.xAxisGroupFixed.call(vis.xAxis.scale(newXScale));
            });

        vis.svg.call(vis.zoom);
    }

    /**
     * Update visualization
     */
   updateVis() {
    let vis = this;

    // Assign each company a cluster position based on rating bucket
   vis.data.forEach(d => {
            d.clusterX = vis.xScale(d.company_score); // Direct mapping
        });

    vis.bubbles = vis.chartGroup.selectAll("circle")
        .data(vis.data)
        .enter()
        .append("circle")
        .attr("r", d => vis.radiusScale(d.avg_salary))
        .attr("fill", d => vis.colorScale(d.company_score))
        .style("opacity", 0.95)
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
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

    // Force Simulation
    vis.simulation = d3.forceSimulation(vis.data)
        .force("x", d3.forceX(d => d.clusterX).strength(5.0)) 
        .force("y", d3.forceY(vis.height / 2))
        .force("collide", d3.forceCollide(d => vis.radiusScale(d.avg_salary) + 1))
        .on("tick", () => {
            vis.bubbles
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });
}

    /**
     * Returns the closest rating bucket for a given score
     */
    getRatingBucket(score) {
        let vis = this;
        return vis.ratingBuckets.reduce((prev, curr) => 
            Math.abs(curr - score) < Math.abs(prev - score) ? curr : prev
        );
    }
}
