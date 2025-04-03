class BubbleChart {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 900,
            containerHeight: 375,
            margin: { top: 50, right: 50, bottom: 50, left: 50 }
        };

        this.data = _data;
        this.geoMap;
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
            .range([1, 13]);

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
        vis.preprocessData();
        vis.updateVis();
    }

    /**
     * Preprocess data to optimize simulation
     */
    preprocessData() {
        let vis = this;

        // Group data by rating buckets for better visualization
        vis.groupedData = d3.group(vis.data, d => Math.round(d.company_score * 2) / 2); // Round to nearest 0.5

        // Pre-calculate node positions for optimization
        vis.data.forEach(d => {
            d.clusterX = vis.xScale(d.company_score);
            // Stagger Y positions to prevent too much overlap initially
            d.clusterY = vis.height / 2 + (Math.random() - 0.5) * 100;
        });
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
            .text("Company Rating");
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

        // Enter-update-exit (performance enhance)
        vis.bubbles = vis.chartGroup.selectAll("circle.bubble")
            .data(vis.data, d => d.id);

        // Remove old elements
        vis.bubbles.exit().remove();

        // Add new elements
        const bubblesEnter = vis.bubbles.enter()
            .append("circle")
            .attr("class", "bubble")
            .attr("r", d => vis.radiusScale(d.avg_salary))
            .attr("cx", d => d.clusterX)
            .attr("cy", d => d.clusterY || vis.height / 2)
            .attr("fill", d => vis.colorScale(d.company_score))
            .style("opacity", 0.8)
            .attr("stroke", "black")
            .attr("stroke-width", 0.5)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) => {
                // Highlight the bubble
                d3.select(event.target)
                    .attr("stroke-width", 2)
                    .attr("stroke", "#333");

                vis.tooltip.style("opacity", 1);
                vis.tooltip.html(`
                    <strong>${d.company}</strong><br>
                    Avg Salary: $${d.avg_salary.toLocaleString()}<br>
                    Rating: ${d.company_score}<br>
                    Location: ${d.location}
                `);
            })
            .on("mousemove", (event) => {
                vis.tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseleave", (event) => {
                // Reset highlight
                d3.select(event.target)
                    .attr("stroke-width", 0.5)
                    .attr("stroke", "black");

                vis.tooltip.style("opacity", 0);
            })
            .on("click", (event, d) => {
                if (vis.geoMap) {
                    const state = d.location.split(',').pop().trim();
                    vis.geoMap.zoomToState(state);
                }
            });

        // Merge selections
        vis.bubbles = bubblesEnter.merge(vis.bubbles);

        // Optimize the force simulation
        vis.simulation = d3.forceSimulation(vis.data)
            .alphaDecay(0.05) // Faster settle for initial load
            .velocityDecay(0.3) // Less bouncy motion
            .force("x", d3.forceX(d => d.clusterX).strength(0.8))
            .force("y", d3.forceY(vis.height / 2).strength(0.1))
            .force("collide", d3.forceCollide(d => vis.radiusScale(d.avg_salary) + 1).iterations(2))
            .stop(); // Don't start automatically

        // Run the simulation in controlled steps
        const simulationSteps = 100;
        for (let i = 0; i < simulationSteps; ++i) {
            vis.simulation.tick();
        }

        // Apply the calculated positions
        vis.bubbles
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("transform", "translate(0,0)"); // Reset any transform
    }

    // used for bidirectional linking
    setGeoMap(geoMap) {
        this.geoMap = geoMap;
    }

    /**
     * Filter bubbles by state
     * @param {string} stateName - State name to filter by, or null to show all
     */
    filterByState(stateName) {
        let vis = this;

        // Store the current state filter
        vis.filteredState = stateName;

        // If no state is selected, show all bubbles
        if (!stateName) {
            vis.bubbles
                .transition()
                .duration(500)
                .style("opacity", 0.8)
                .attr("display", null);

            // Reset the force simulation with all data
            vis.updateForceSimulation(vis.data);
            return;
        }

        // Filter bubbles to only show those in the selected state
        const stateData = vis.data.filter(d => {
            if (!d.location) return false;
            const jobState = d.location.split(',').pop().trim();

            // Check if the state matches directly, or if it's an abbreviation
            return jobState === stateName ||
                (jobState.length === 2 && vis.geoMap &&
                    vis.geoMap.stateAbbreviations[jobState] === stateName);
        });

        // Update bubble visibility
        vis.bubbles
            .transition()
            .duration(500)
            .style("opacity", d => {
                const jobState = d.location.split(',').pop().trim();
                const isInState = jobState === stateName ||
                    (jobState.length === 2 && vis.geoMap &&
                        vis.geoMap.stateAbbreviations[jobState] === stateName);
                return isInState ? 0.9 : 0.15;
            })
            .attr("display", d => {
                const jobState = d.location.split(',').pop().trim();
                const isInState = jobState === stateName ||
                    (jobState.length === 2 && vis.geoMap &&
                        vis.geoMap.stateAbbreviations[jobState] === stateName);
                return isInState ? null : "none"; // Hide bubbles not in the state
            });

        // Update the force simulation with only the state data
        vis.updateForceSimulation(stateData);
    }

    /**
     * Update force simulation with new data
     * @param {Array} data - Data to use for force simulation
     */
    updateForceSimulation(data) {
        let vis = this;

        // Stop any existing simulation
        if (vis.simulation) {
            vis.simulation.stop();
        }

        // Run a new simulation with the filtered data
        vis.simulation = d3.forceSimulation(data)
            .alphaDecay(0.05)
            .velocityDecay(0.3)
            .force("x", d3.forceX(d => d.clusterX).strength(0.8))
            .force("y", d3.forceY(vis.height / 2).strength(0.1))
            .force("collide", d3.forceCollide(d => vis.radiusScale(d.avg_salary) + 1).iterations(2))
            .stop();

        // Run the simulation in controlled steps
        const simulationSteps = 50; // Fewer steps for better performance
        for (let i = 0; i < simulationSteps; ++i) {
            vis.simulation.tick();
        }

        // Apply the calculated positions to all bubbles that match the current data
        data.forEach(d => {
            const bubble = vis.bubbles.filter(b => b.id === d.id);
            if (!bubble.empty()) {
                bubble
                    .transition()
                    .duration(750)
                    .attr("cx", d.x)
                    .attr("cy", d.y);
            }
        });
    }
}