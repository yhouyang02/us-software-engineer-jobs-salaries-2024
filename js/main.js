d3.csv('data/salaries_clean.csv').then(data => {
    // Data preprocessing
    data.forEach((d, i) => {
        d.company = d.company || "Unknown"; // Ensure company name is valid
        d.company_score = +d.company_score || 0; // Convert to number

        // Clean salary by removing $ and commas before converting to number
        d.avg_salary = parseFloat(d.avg_salary.replace(/[$,]/g, "")) || 0;

        d.location = d.location || "Unknown";
        d.primary_title = d.primary_title || "Unknown";
        d.secondary_title = d.secondary_title || "";

        d.id = i;
    });

    // Initialize visualizations
    const bubbleChart = new BubbleChart({
        parentElement: '#bubble-svg',
    }, data);

    const geoMap = new GeoMap({
        parentElement: '#map-svg',
    }, data);

    bubbleChart.setGeoMap(geoMap);
    geoMap.setBubbleChart(bubbleChart);

});