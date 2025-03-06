d3.csv('data/salaries_clean.csv').then(data => {
  data.forEach((d, i) => {
    d.company = d.company || "Unknown"; // Ensure company name is valid
    d.company_score = +d.company_score || 0; // Convert to number
    
    // Clean salary by removing $ and commas before converting to number
    d.avg_salary = parseFloat(d.avg_salary.replace(/[$,]/g, "")) || 0;

    d.id = i;
  });

  const bubbleChart = new BubbleChart({
    parentElement: '#bubble-svg',
  }, data);
});
