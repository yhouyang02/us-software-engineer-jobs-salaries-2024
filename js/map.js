class GeoMap {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 900,
            containerHeight: 500,
            margin: { top: 10, right: 10, bottom: 10, left: 10 },
            tooltipPadding: 10,
            legendBottom: 50,
            legendLeft: 50,
            legendRectHeight: 12,
            legendRectWidth: 150
        };
        this.data = _data;
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
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        vis.projection = d3.geoAlbersUsa()
            .translate([vis.width / 2, vis.height / 2])
            .scale(vis.width);

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

        vis.colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, 100]);


        Promise.all([
            d3.json('data/us-states.json')
        ]).then(data => {
            vis.us = data[0];

            vis.processData();
            vis.updateVis();
        });
    }

    /**
     * Process data and aggregate job counts by state
     */
    processData() {
        let vis = this;

        vis.stateJobCounts = new Map();
        vis.jobTitlesByState = new Map();

        const stateAbbreviations = {
            'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
            'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
            'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
            'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
            'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
            'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
            'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
            'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
            'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
            'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
            'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
            'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
            'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
        };

        vis.data.forEach(d => {
            if (!d.location) return;
            let state = d.location.split(',').pop().trim();

            if (state.length === 2 && stateAbbreviations[state]) {
                state = stateAbbreviations[state];
            }

            const jobTitle = d.primary_title || "Unknown";

            if (!vis.stateJobCounts.has(state)) {
                vis.stateJobCounts.set(state, 0);
                vis.jobTitlesByState.set(state, {});
            }

            vis.stateJobCounts.set(state, vis.stateJobCounts.get(state) + 1);

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
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5)
            .on('mouseover', function (event, d) {
                const stateName = d.properties.name;
                const jobCount = vis.stateJobCounts.get(stateName) || 0;

                d3.select(this)
                    .attr('stroke-width', 2)
                    .attr('stroke', '#333');

                vis.tooltip
                    .style('opacity', 1)
                    .html(`
                <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">
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
                    .attr('stroke-width', 0.5)
                    .attr('stroke', '#fff');

                vis.tooltip.style('opacity', 0);
            });
    }

}