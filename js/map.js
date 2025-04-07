class GeoMap {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 900,
            containerHeight: 450,
            margin: { top: 10, right: 40, bottom: 10, left: -50 },
            tooltipPadding: 10,
            legendTop: 20,
            legendRight: 20,
            legendRectHeight: 12,
            legendRectWidth: 100
        };
        this.stateAbbreviations = {
            'AL': 'Alabama',
            'AK': 'Alaska',
            'AZ': 'Arizona',
            'AR': 'Arkansas',
            'CA': 'California',
            'CO': 'Colorado',
            'CT': 'Connecticut',
            'DE': 'Delaware',
            'FL': 'Florida',
            'GA': 'Georgia',
            'HI': 'Hawaii',
            'ID': 'Idaho',
            'IL': 'Illinois',
            'IN': 'Indiana',
            'IA': 'Iowa',
            'KS': 'Kansas',
            'KY': 'Kentucky',
            'LA': 'Louisiana',
            'ME': 'Maine',
            'MD': 'Maryland',
            'MA': 'Massachusetts',
            'MI': 'Michigan',
            'MN': 'Minnesota',
            'MS': 'Mississippi',
            'MO': 'Missouri',
            'MT': 'Montana',
            'NE': 'Nebraska',
            'NV': 'Nevada',
            'NH': 'New Hampshire',
            'NJ': 'New Jersey',
            'NM': 'New Mexico',
            'NY': 'New York',
            'NC': 'North Carolina',
            'ND': 'North Dakota',
            'OH': 'Ohio',
            'OK': 'Oklahoma',
            'OR': 'Oregon',
            'PA': 'Pennsylvania',
            'RI': 'Rhode Island',
            'SC': 'South Carolina',
            'SD': 'South Dakota',
            'TN': 'Tennessee',
            'TX': 'Texas',
            'UT': 'Utah',
            'VT': 'Vermont',
            'VA': 'Virginia',
            'WA': 'Washington',
            'WV': 'West Virginia',
            'WI': 'Wisconsin',
            'WY': 'Wyoming',
            'DC': 'District of Columbia'
        };
        this.data = _data;
        this.selectedState = null;
        this.bubbleChart;
        this.initVis();
    }

    /**
     * Initialize visualization
     */
    initVis() {
        let vis = this;

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Initialize SVG
        vis.svg = d3.select(vis.config.parentElement)
            .attr("viewBox", `0 0 ${vis.config.containerWidth} ${vis.config.containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Click blank space to reset zoom (bubble and map)
        vis.chart.append("rect")
            .attr("class", "background")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .attr("fill", "transparent")
            .style("cursor", "default")
            .on("click", (event) => {
                // Only trigger if the click was directly on the background (not a state)
                if (event.target.classList.contains("background")) {
                    vis.selectedState = null;
                    vis.resetZoom();

                    // Update the selected state label to show "All"
                    d3.select("#selected-state")
                        .html("Selected State: All")
                        .append("p")
                        .style("margin-block-start", "0em")
                        .style("margin-block-end", "0em")
                        .html("<br>");

                    // Reset bubble chart as well
                    if (vis.bubbleChart) {
                        vis.bubbleChart.filterByState(null);
                    }
                }
            });

        vis.projection = d3.geoAlbersUsa()
            .translate([vis.width / 2, vis.height / 2])
            .scale(vis.width);

        vis.currentTransform = d3.zoomIdentity;

        vis.zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on('zoom', (event) => {
                vis.currentTransform = event.transform;
                vis.chart.attr('transform', event.transform);
            });

        vis.svg.call(vis.zoom);

        vis.geoPath = d3.geoPath()
            .projection(vis.projection);

        vis.tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background', 'white')
            .style('border', '1px solid #ddd')
            .style('padding', '10px')
            .style('border-radius', '4px')
            .style('pointer-events', 'none');

        vis.colorScale = d3.scaleSequential()
            .domain([0, 100]) // lowest to highest
            .interpolator(d3.piecewise(d3.interpolateRgb, [
                "#ffffff",
                "#dfeced",
                "#c0d9dc",
                "#a0c6ca",
                "#80b3b9",
                "#5ea1a8",
                "#368f98"
            ]));


        Promise.all([
            d3.json('data/us-states.json')
        ]).then(data => {
            vis.us = data[0];

            vis.processData();
            vis.updateVis();
            vis.createLegend();
        });
    }


    resetZoom() {
        let vis = this;
        vis.selectedState = null;

        // Update the selected state label to show "All"
        d3.select("#selected-state")
            .html("Selected state: All")
            .append("p")
            .style("margin-block-start", "0em")
            .style("margin-block-end", "0em")
            .html("<br>");

        vis.chart.selectAll('.job-circle').remove();

        vis.svg.transition().duration(750)
            .call(vis.zoom.transform, d3.zoomIdentity);

        vis.chart.selectAll('.state')
            .attr('stroke-width', 1)
            .attr('stroke', 'black')
            .attr('filter', null)
            .attr('fill', d => {
                const stateName = d.properties.name;
                const count = vis.stateJobCounts.get(stateName) || 0;
                return vis.colorScale(count);
            });

        if (vis.bubbleChart && vis.selectedState) {
            vis.bubbleChart.filterByState(null);
        }
    }


    /**
     * Create legend for job counts
     */
    createLegend() {
        let vis = this;

        const legendX = vis.width - vis.config.legendRight - vis.config.legendRectWidth - 9;
        const legendY = vis.config.legendTop + 13;

        const legendGroup = vis.svg.append("g")
            .attr("class", "legend-group")
            .attr("transform", `translate(${legendX},${legendY})`);


        // css colors
        // border: 2px solid #6249aa;
        // border-radius: 10px;
        // background-color: #131a2a;
        // Added background
        legendGroup.append("rect")
            .attr("class", "legend-background")
            .attr("x", -15)
            .attr("y", -30)
            .attr("width", vis.config.legendRectWidth + 30)
            .attr("height", vis.config.legendRectHeight + 60)
            .attr("fill", "#131a2a")
            .attr("stroke", "#6249aa")
            .attr("stroke-width", 2)
            .attr("rx", 6)
            .attr("ry", 6);

        // Add legend title
        legendGroup.append("text")
            .attr("class", "legend-title")
            .attr("x", vis.config.legendRectWidth / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .text("Number of Jobs");

        const legendGradient = vis.svg.append("defs")
            .append("linearGradient")
            .attr("id", "legend-gradient")
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("y1", "0%")
            .attr("y2", "0%");

        legendGradient.selectAll("stop")
            .data(d3.range(0, 101, 10).map(d => ({ offset: `${d}%`, color: vis.colorScale(d) })))
            .enter().append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);

        legendGroup.append("rect")
            .attr("class", "legend-gradient-rect")
            .attr("width", vis.config.legendRectWidth)
            .attr("height", vis.config.legendRectHeight)
            .style("fill", "url(#legend-gradient)");

        // Legend axis
        const legendScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, vis.config.legendRectWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .tickValues(d3.range(0, 101, 20))
            .tickSize(4)
            .tickFormat(d3.format("d"));

        legendGroup.append("g")
            .attr("class", "legend-axis")
            .attr("transform", `translate(0, ${vis.config.legendRectHeight})`)
            .call(legendAxis);
    }



    /**
     * Process data and aggregate job counts by state
     */
    processData() {
        let vis = this;

        vis.stateJobCounts = new Map();
        vis.jobTitlesByState = new Map();
        vis.stateJobsMap = {}; // Cache jobs by state for quicker access

        vis.data.forEach(d => {
            if (!d.location) return;
            let state = d.location.split(',').pop().trim();

            if (state.length === 2 && vis.stateAbbreviations[state]) {
                state = vis.stateAbbreviations[state];
            }

            const jobTitle = d.primary_title || "Unknown";

            if (!vis.stateJobCounts.has(state)) {
                vis.stateJobCounts.set(state, 0);
                vis.jobTitlesByState.set(state, {});
                vis.stateJobsMap[state] = [];
            }

            vis.stateJobCounts.set(state, vis.stateJobCounts.get(state) + 1);
            vis.stateJobsMap[state].push(d);

            const titleCounts = vis.jobTitlesByState.get(state);
            titleCounts[jobTitle] = (titleCounts[jobTitle] || 0) + 1;
        });

        console.log("State job counts:", Array.from(vis.stateJobCounts.entries()));

        const maxJobs = Math.max(...vis.stateJobCounts.values(), 1); // Ensure non-zero
        vis.colorScale.domain([0, maxJobs]);
    }

    /**
     * Update visualization
     */
    updateVis() {
        let vis = this;

        vis.states = vis.chart.selectAll('.state')
            .data(topojson.feature(vis.us, vis.us.objects.states).features)
            .join('path')
            .attr('class', 'state')
            .attr('d', vis.geoPath)
            .attr('fill', d => {
                const stateName = d.properties.name;
                const count = vis.stateJobCounts.get(stateName) || 0;
                return vis.colorScale(count);
            })
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                const stateName = d.properties.name;
                const jobCount = vis.stateJobCounts.get(stateName) || 0;

                d3.select(this)
                    .attr('stroke-width', 2)
                    .attr('stroke', '#4D4D4D');

                vis.tooltip
                    .style('opacity', 1)
                    .html(`
                <div style="text-align: center; font-weight: bold; margin-bottom: 5px; color: black;">
                  ${stateName}
                </div>
                <div>Total Jobs: ${jobCount}</div>
              `)
                    .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
                    .style('top', (event.pageY + vis.config.tooltipPadding) + 'px');
            })
            .on('mousemove', function (event) {
                vis.tooltip
                    .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
                    .style('top', (event.pageY + vis.config.tooltipPadding) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this)
                    .attr('stroke-width', 1)
                    .attr('stroke', 'black');

                vis.tooltip.style('opacity', 0);
            })
            .attr('pointer-events', 'all')
            .on('click', function (event, d) {
                vis.handleStateClick(event, d);
            })
        // hacky wheel zoom in and out functionality
        // if you want proper zoom, copy the one from bubble_chart.js



    }

    // Click on state to zoom in & display city jobs
    handleStateClick(event, d) {
        let vis = this;
        const clickedState = d.properties.name;

        if (vis.selectedState === clickedState) {
            // Clicking the same state again - reset everything
            vis.selectedState = null;
            vis.resetZoom();

            d3.select("#selected-state")
                .html("Selected State: All")
                .append("p")
                .style("margin-block-start", "0em")
                .style("margin-block-end", "0em")
                .html("<br>");

            // Reset bubble chart to show all bubbles
            if (vis.bubbleChart) {
                vis.bubbleChart.filterByState(null);
            }

            return;
        } else {

            vis.selectedState = clickedState;
            d3.select("#selected-state").html("Selected state: " + clickedState + "<br>Click " + clickedState + " again to view all states.");
            vis.chart.selectAll('.state')
                .transition()
                .duration(300)
                .attr('fill', d => {
                    const stateName = d.properties.name;
                    const count = vis.stateJobCounts.get(stateName) || 0;

                    if (stateName === clickedState) {
                        return vis.colorScale(count); // normal color for selected
                    } else {
                        return "#d3d3d3"; // light gray for others
                    }
                });

            const bounds = vis.geoPath.bounds(d);
            const dx = bounds[1][0] - bounds[0][0];
            const dy = bounds[1][1] - bounds[0][1];
            const x = (bounds[0][0] + bounds[1][0]) / 2;
            const y = (bounds[0][1] + bounds[1][1]) / 2;
            const scale = 0.9 / Math.max(dx / vis.width, dy / vis.height);
            const translate = [vis.width / 2 - scale * x, vis.height / 2 - scale * y];

            // Filter bubble chart to show only bubbles in this state
            if (vis.bubbleChart) {
                vis.bubbleChart.filterByState(clickedState);
            }

            vis.svg.transition()
                .duration(900)
                .call(vis.zoom.transform, d3.zoomIdentity
                    .translate(translate[0], translate[1])
                    .scale(scale))
                .on("end", () => {
                    vis.displayCityJobs(clickedState);
                });

        }
    }

    displayCityJobs(stateName) {
        let vis = this;

        // Clear any previous job circles
        vis.chart.selectAll('.job-circle').remove();

        const experienceLevels = ["Entry", "Intermediate", "Senior"];
        const colorScale = d3.scaleOrdinal()
            .domain(experienceLevels)
            .range(["#68ff68", "#65c1ff", "#c88bff"]);  // colors are based on experience levels from scatterplot

        d3.json('data/us-cities.json').then(cityData => {
            // Use cached state jobs if available
            const stateJobs = vis.stateJobsMap[stateName] || [];

            const jobCircles = vis.chart.selectAll('.job-circle')
                .data(stateJobs)
                .join('circle')
                .attr('class', 'job-circle')
                .attr('cx', d => {
                    const location = d.location.trim();
                    const coords = cityData[location] ? vis.projection([cityData[location].lng, cityData[location].lat]) : null;
                    return coords ? coords[0] : 0;
                })
                .attr('cy', d => {
                    const location = d.location.trim();
                    return cityData[location] ? vis.projection([cityData[location].lng, cityData[location].lat])[1] : 0;
                })
                .attr('r', d => Math.sqrt(d.avg_salary) / 100)
                .attr('fill', d => colorScale(d.experience_level))
                .attr('fill-opacity', 0.65)
                .attr('stroke', 'black')
                .attr('stroke-width', 0.1)
                .style('cursor', 'pointer');

            jobCircles
                .on('mouseover', (event, d) => {
                    vis.tooltip
                        .style('opacity', 1)
                        .html(`
                            <div style="text-align: center; font-weight: bold; margin-bottom: 5px; color: black;">
                                ${d.company}
                            </div>
                            <div>Title: ${d.primary_title}</div>
                            <div>Salary: ${d.avg_salary.toLocaleString()}</div>
                            <div>Location: ${d.location}</div>
                        `)
                        .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
                        .style('top', (event.pageY + vis.config.tooltipPadding) + 'px');
                })
                .on('mousemove', (event) => {
                    vis.tooltip
                        .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
                        .style('top', (event.pageY + vis.config.tooltipPadding) + 'px');
                })
                .on('mouseout', () => {
                    vis.tooltip.style('opacity', 0);
                });
        }).catch(error => {
            console.error("Error loading city data:", error);
        });
    }

    // used for bidirectional linking
    setBubbleChart(bubbleChart) {
        this.bubbleChart = bubbleChart;
    }

    zoomToState(state) {
        let vis = this;

        // If state is an abbreviation, convert it to full name
        const stateName = vis.stateAbbreviations[state] || state;

        // Find the state feature
        const stateFeature = topojson.feature(vis.us, vis.us.objects.states).features
            .find(d => d.properties.name === stateName);

        if (stateFeature) {
            if (vis.selectedState === stateName) {
                // If already selected, reset zoom
                vis.selectedState = null;
                //vis.resetZoom();
            } else {
                // Otherwise zoom to state
                vis.handleStateClick(null, stateFeature);
            }
        }
    }
}