class BubbleChart {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 1000,
            containerHeight: 375,
            margin: { top: 10, right: 50, bottom: 50, left: 10 }
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
            .attr("viewBox", `0 0 ${vis.config.containerWidth} ${vis.config.containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "auto");


        // Append group for zoom
        vis.chartGroup = vis.svg.append("g")
            .attr("transform", `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Click blank space to reset zoom (bubble and map)
        vis.chartGroup.append("rect")
            .attr("class", "background")
            .attr("width", vis.width + 100) // Make it cover the full chart area
            .attr("height", vis.height)
            .attr("fill", "transparent")
            .style("cursor", "default")
            .on("click", (event) => {
                // Only trigger if the click was directly on the background (not a bubble)
                if (event.target.classList.contains("background")) {
                    // Reset both visualizations
                    if (vis.geoMap) {
                        vis.geoMap.resetZoom();
                    }
                    vis.filterByState(null);
                }
            });

        // Define rating ranges (buckets)
        vis.ratingBuckets = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
        vis.bubbleGroup = vis.svg.append("g")
            .attr("class", "bubble-group")
            .attr("transform", `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Group for the x-axis
        vis.xAxisGroupFixed = vis.svg.append("g")
            .attr("class", "x-axis-group")
            // Place the x-axis at the bottom of the drawing area
            .attr("transform", `translate(${vis.config.margin.left},${vis.config.containerHeight - vis.config.margin.bottom})`);

        vis.xAxisLabelGroup = vis.svg.append("g")
            .attr("class", "x-axis-label-group");
        vis.xAxisLabelGroup.append("text")
            .attr("class", "x-axis-label")
            .attr("x", vis.config.containerWidth / 2)
            .attr("y", vis.config.containerHeight - 10)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .text("Company Rating");

        // Define X Scale for clusters
        vis.xScale = d3.scaleLinear()
            .domain([1, 5])
            .range([vis.config.margin.left, vis.width]);

        vis.radiusScale = d3.scaleSqrt()
            .domain([d3.min(vis.data, d => d.avg_salary), d3.max(vis.data, d => d.avg_salary)])
            .range([1, 9]);

        vis.colorScale = d3.scaleQuantize()
            .domain([1, 5])
            .range(["#dd506d", "#ea8a97", "#f1bec3", "#f1f1f1", "#b7cfd2", "#7bafb5", "#368f98"]);


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

        // Append a clip path to limit the x-axis drawing area
        vis.svg.append("defs")
            .append("clipPath")
            .attr("id", "clip-x-axis")
            .append("rect")
            .attr("width", vis.config.containerWidth)
            .attr("height", 60);
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
            d.clusterX = Math.max(
                vis.config.margin.left,
                Math.min(vis.xScale(d.company_score), vis.width)
            );

            // Stagger Y positions to prevent too much overlap initially
            d.clusterY = vis.height / 2 + (Math.random() - 0.5) * 100;

            // Store original position for reset
            d.originalX = d.clusterX;
            d.originalY = vis.height / 2 + (Math.random() - 0.5) * 100;
        });
    }

    /**
     * Creates a color legend
     */
    createLegend() {
        let vis = this;

        const legendWidth = 150,
            legendHeight = 15,
            legendX = vis.config.margin.left + 8, // Move to upper left
            legendY = vis.config.margin.top + 26; // Adjusted Y position

        // Adding the background box for the legend
        const paddingX = 15;
        const totalBoxWidth = legendWidth + paddingX * 2;
        const totalBoxHeight = legendHeight + 45;

        // Background box with border
        vis.svg.append("rect")
            .attr("x", legendX - paddingX)
            .attr("y", legendY - 35)
            .attr("width", totalBoxWidth)
            .attr("height", totalBoxHeight + 15)
            .attr("fill", "#131a2a")
            .attr("stroke", "#6249aa")
            .attr("stroke-width", 2)
            .attr("rx", 6)
            .attr("ry", 6);


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
            .style("fill", "white")
            .text("1.0");

        vis.svg.append("text")
            .attr("x", legendX + legendWidth)
            .attr("y", legendY + legendHeight + 15)
            .attr("text-anchor", "end")
            .style("fill", "white")
            .text("5.0");

        // Title for the legend
        vis.svg.append("text")
            .attr("x", legendX + legendWidth / 2)
            .attr("y", legendY - 10)
            .attr("text-anchor", "middle")
            .text("Company Rating")
            .style("fill", "white");
    }

    /**
     * Setup Zooming and Panning
     */
    createZoom() {
        let vis = this;

        vis.zoom = d3.zoom()
            .scaleExtent([1, 3])
            .translateExtent([[0, 0], [vis.config.containerWidth, vis.config.containerHeight]])
            .on("zoom", (event) => {
                const transform = event.transform;
                // Combine the original translation with the zoom transform
                vis.bubbleGroup.attr("transform", `translate(${vis.config.margin.left + transform.x}, ${vis.config.margin.top + transform.y}) scale(${transform.k})`);
                const newXScale = transform.rescaleX(vis.xScale);
                vis.xAxisGroupFixed.call(vis.xAxis.scale(newXScale));
            });

        vis.svg.call(vis.zoom);
    }

    /**
     * Update visualization
     */
    updateVis() {
        let vis = this;

        // Enter-update-exit
        vis.bubbles = vis.bubbleGroup.selectAll("circle.bubble")
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
            .style("opacity", 0.9)
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
                    Rating: ${d.company_score}<br>
                    Avg Salary: $${d.avg_salary.toLocaleString()}<br>
                    Location: ${d.location}
                `);
            })
            .on("mousemove", (event) => {
                const tooltipWidth = vis.tooltip.node().offsetWidth;
                const pageWidth = window.innerWidth;

                let leftPos = event.pageX + 10;
                if (event.pageX + tooltipWidth + 20 > pageWidth) {
                    leftPos = event.pageX - tooltipWidth - 10;
                }

                vis.tooltip
                    .style("left", leftPos + "px")
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

        // Store original data for reset
        vis.originalData = [...vis.data];

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
            .attr("cx", d => Math.max(vis.config.margin.left, Math.min(d.x, vis.width)))
            .attr("cy", d => d.y)
            .attr("transform", "translate(0,0)"); // Reset any transform

        // Store initial positions
        vis.data.forEach(d => {
            d.initialX = d.x;
            d.initialY = d.y;
        });


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
            // Reset all bubbles to normal state
            vis.bubbles
                .transition()
                .duration(500)
                .style("opacity", 0.9)
                .attr("display", null);

            // Run a reset simulation to redistribute all bubbles
            vis.resetBubblePositions();
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

        // Find which bubbles should be visible vs hidden
        vis.bubbles.each(function (d) {
            const jobState = d.location.split(',').pop().trim();
            const isInState = jobState === stateName ||
                (jobState.length === 2 && vis.geoMap &&
                    vis.geoMap.stateAbbreviations[jobState] === stateName);

            // Store the visibility status directly on the data
            d.isVisible = isInState;
        });

        // Update bubble visibility with better transition
        vis.bubbles
            .transition()
            .duration(500)
            .style("opacity", 0.9)
            .attr("display", d => d.isVisible ? null : "none");

        // Update the force simulation with only the state data
        vis.updateForceSimulation(stateData);
    }

    /**
     * Reset bubble positions to original layout
     */
    resetBubblePositions() {
        let vis = this;

        // Run a new simulation with all data
        vis.simulation = d3.forceSimulation(vis.data)
            .alphaDecay(0.05)
            .velocityDecay(0.3)
            .force("x", d3.forceX(d => d.clusterX).strength(0.8))
            .force("y", d3.forceY(vis.height / 2).strength(0.1))
            .force("collide", d3.forceCollide(d => vis.radiusScale(d.avg_salary) + 1).iterations(2))
            .stop();
        // Run the simulation in controlled steps
        const simulationSteps = 100;
        for (let i = 0; i < simulationSteps; ++i) {
            vis.simulation.tick();
        }

        // Apply the calculated positions with smooth transition
        vis.bubbles
            .transition()
            .duration(750)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
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

        // Apply the calculated positions only to bubbles that should be visible
        vis.bubbles
            .filter(d => d.isVisible !== false) // Only move visible bubbles
            .transition()
            .duration(750)
            .attr("cx", d => {
                const matchedData = data.find(item => item.id === d.id);
                return matchedData ? matchedData.x : d.x;
            })
            .attr("cy", d => {
                const matchedData = data.find(item => item.id === d.id);
                return matchedData ? matchedData.y : d.y;
            });
    }
}