// Load and process data
let employees = [];

d3.csv('data-oracle.csv').then(data => {
    // Process the data to ensure proper parent-child relationships
    employees = data.map(d => ({
        ...d,
        // Convert empty string parentId to null
        parentId: d.parentId || null,
        // Ensure id is a string
        id: d.id.toString()
    }));
    initializeFilters();
    updateDashboard();
}).catch(error => {
    console.error('Error loading the CSV file:', error);
});

// Initialize filters
function initializeFilters() {
    const departments = [...new Set(employees.map(emp => emp.department_name))].filter(Boolean);
    const locations = [...new Set(employees.map(emp => emp.department_location_country_name))].filter(Boolean);
    const positions = [...new Set(employees.map(emp => emp.position))].filter(Boolean);

    const departmentFilter = document.getElementById('departmentFilter');
    const locationFilter = document.getElementById('locationFilter');
    const jobFilter = document.getElementById('jobFilter');

    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        departmentFilter.appendChild(option);
    });

    locations.forEach(loc => {
        const option = document.createElement('option');
        option.value = loc;
        option.textContent = loc;
        locationFilter.appendChild(option);
    });

    positions.forEach(pos => {
        const option = document.createElement('option');
        option.value = pos;
        option.textContent = pos;
        jobFilter.appendChild(option);
    });

    // Add event listeners to filters
    departmentFilter.addEventListener('change', updateDashboard);
    locationFilter.addEventListener('change', updateDashboard);
    jobFilter.addEventListener('change', updateDashboard);
}

// Update metrics
function updateMetrics(filteredData) {
    // Total Employees
    document.getElementById('totalEmployees').textContent = filteredData.length;

    // Average Salary
    const avgSalary = filteredData.reduce((sum, emp) => sum + Number(emp.salary || 0), 0) / filteredData.length;
    document.getElementById('avgSalary').textContent = '$' + Math.round(avgSalary).toLocaleString();

    // Departments
    const departments = new Set(filteredData.map(emp => emp.department_name));
    document.getElementById('totalDepartments').textContent = departments.size;

    // Department sizes
    const deptSizes = {};
    filteredData.forEach(emp => {
        if (emp.department_name) {
            deptSizes[emp.department_name] = (deptSizes[emp.department_name] || 0) + 1;
        }
    });
    
    // Find largest department
    const largestDept = Object.entries(deptSizes)
        .sort(([,a], [,b]) => b - a)[0];
    document.getElementById('largestDept').textContent = 
        `Largest: ${largestDept[0]} (${largestDept[1]})`;

    // Countries
    const countries = new Set(filteredData.map(emp => emp.department_location_country_name));
    document.getElementById('totalCountries').textContent = countries.size;

    // Top location
    const locationCounts = {};
    filteredData.forEach(emp => {
        if (emp.department_location_country_name) {
            locationCounts[emp.department_location_country_name] = 
                (locationCounts[emp.department_location_country_name] || 0) + 1;
        }
    });
    const topLocation = Object.entries(locationCounts)
        .sort(([,a], [,b]) => b - a)[0];
    document.getElementById('topLocation').textContent = 
        `Most: ${topLocation[0]} (${topLocation[1]})`;

    // Average Tenure and Most Senior
    const now = new Date();
    const tenures = filteredData.map(emp => {
        const hireDate = new Date(emp.hire_date);
        return {
            years: (now - hireDate) / (1000 * 60 * 60 * 24 * 365),
            name: `${emp.name} ${emp.lastName}`
        };
    });
    const avgTenure = tenures.reduce((sum, emp) => sum + emp.years, 0) / tenures.length;
    const mostSenior = tenures.sort((a, b) => b.years - a.years)[0];
    
    document.getElementById('avgTenure').textContent = 
        `${Math.round(avgTenure * 10) / 10} years`;
    document.getElementById('seniorEmployee').textContent = 
        `Senior: ${mostSenior.name}`;

    // Sales Commission
    const salesEmployees = filteredData.filter(emp => emp.commission_pct);
    if (salesEmployees.length > 0) {
        const avgCommission = salesEmployees.reduce((sum, emp) => 
            sum + Number(emp.commission_pct), 0) / salesEmployees.length;
        const topPerformer = salesEmployees.sort((a, b) => 
            Number(b.commission_pct) - Number(a.commission_pct))[0];
        
        document.getElementById('avgCommission').textContent = 
            `${(avgCommission * 100).toFixed(1)}%`;
        document.getElementById('topPerformer').textContent = 
            `Top: ${topPerformer.name} (${(Number(topPerformer.commission_pct) * 100).toFixed(1)}%)`;
    } else {
        document.getElementById('avgCommission').textContent = 'N/A';
        document.getElementById('topPerformer').textContent = 'No sales employees';
    }

    // Job Levels
    const jobCounts = {};
    filteredData.forEach(emp => {
        jobCounts[emp.job_id] = (jobCounts[emp.job_id] || 0) + 1;
    });
    const totalJobs = Object.keys(jobCounts).length;
    const mostCommonJob = Object.entries(jobCounts)
        .sort(([,a], [,b]) => b - a)[0];
    
    document.getElementById('jobLevels').textContent = totalJobs;
    document.getElementById('commonJob').textContent = 
        `Common: ${mostCommonJob[0]}`;

    // Hiring Trends
    const thisYear = now.getFullYear();
    const recentHires = filteredData.filter(emp => 
        new Date(emp.hire_date).getFullYear() === thisYear).length;
    
    // Group hires by year
    const hiresByYear = {};
    filteredData.forEach(emp => {
        const year = new Date(emp.hire_date).getFullYear();
        hiresByYear[year] = (hiresByYear[year] || 0) + 1;
    });
    const peakYear = Object.entries(hiresByYear)
        .sort(([,a], [,b]) => b - a)[0];
    
    document.getElementById('recentHires').textContent = 
        `${recentHires} this year`;
    document.getElementById('peakHiring').textContent = 
        `Peak: ${peakYear[0]} (${peakYear[1]})`;
}

// Create salary distribution chart
function createSalaryChart(data, container = document.getElementById('salaryChart')) {
    const deptSalaries = {};
    data.forEach(emp => {
        if (emp.department_name && emp.salary) {
            if (!deptSalaries[emp.department_name]) {
                deptSalaries[emp.department_name] = [];
            }
            deptSalaries[emp.department_name].push(Number(emp.salary));
        }
    });

    const seriesData = Object.entries(deptSalaries).map(([dept, salaries]) => ({
        name: dept,
        data: salaries
    }));

    return Highcharts.chart(container, {
        chart: {
            type: 'boxplot',
            animation: false,
            width: container.offsetWidth,
            height: 400
        },
        title: {
            text: null
        },
        xAxis: {
            categories: Object.keys(deptSalaries)
        },
        yAxis: {
            title: {
                text: 'Salary ($)'
            }
        },
        series: [{
            name: 'Salary Distribution',
            data: seriesData.map(series => {
                const values = series.data.sort((a, b) => a - b);
                const q1 = values[Math.floor(values.length * 0.25)];
                const median = values[Math.floor(values.length * 0.5)];
                const q3 = values[Math.floor(values.length * 0.75)];
                const min = values[0];
                const max = values[values.length - 1];
                return {
                    low: min,
                    q1: q1,
                    median: median,
                    q3: q3,
                    high: max
                };
            })
        }]
    });
}

// Create location map
function createLocationMap(data, container = document.getElementById('locationMap')) {
    const locationCounts = {};
    data.forEach(emp => {
        const country = emp.department_location_country_name;
        if (country) {
            locationCounts[country] = (locationCounts[country] || 0) + 1;
        }
    });

    return Highcharts.mapChart(container, {
        chart: {
            map: 'custom/world',
            animation: false,
            width: container.offsetWidth,
            height: 400
        },
        title: {
            text: null
        },
        colorAxis: {
            min: 0,
            stops: [
                [0, '#EEEEFF'],
                [0.5, '#4444FF'],
                [1, '#000088']
            ]
        },
        series: [{
            data: Object.entries(locationCounts).map(([country, count]) => ({
                name: country,
                value: count
            })),
            joinBy: ['name', 'name'],
            states: {
                hover: {
                    color: '#a4edba'
                }
            }
        }]
    });
}

// Create department distribution chart
function createDeptChart(data, container = document.getElementById('deptChart')) {
    const deptCounts = {};
    data.forEach(emp => {
        if (emp.department_name) {
            deptCounts[emp.department_name] = (deptCounts[emp.department_name] || 0) + 1;
        }
    });

    return Highcharts.chart(container, {
        chart: {
            type: 'pie',
            animation: false,
            width: container.offsetWidth,
            height: 400
        },
        title: {
            text: null
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.percentage:.1f}%'
                }
            }
        },
        series: [{
            name: 'Employees',
            data: Object.entries(deptCounts).map(([dept, count]) => ({
                name: dept,
                y: count
            }))
        }]
    });
}

// Create salary range chart
function createSalaryRangeChart(data, container = document.getElementById('salaryRangeChart')) {
    const ranges = {
        '0-5k': 0,
        '5k-10k': 0,
        '10k-15k': 0,
        '15k-20k': 0,
        '20k+': 0
    };

    data.forEach(emp => {
        const salary = Number(emp.salary);
        if (salary <= 5000) ranges['0-5k']++;
        else if (salary <= 10000) ranges['5k-10k']++;
        else if (salary <= 15000) ranges['10k-15k']++;
        else if (salary <= 20000) ranges['15k-20k']++;
        else ranges['20k+']++;
    });

    return Highcharts.chart(container, {
        chart: {
            type: 'column',
            animation: false,
            width: container.offsetWidth,
            height: 400
        },
        title: {
            text: null
        },
        xAxis: {
            categories: Object.keys(ranges),
            title: {
                text: 'Salary Range'
            }
        },
        yAxis: {
            title: {
                text: 'Number of Employees'
            }
        },
        tooltip: {
            formatter: function() {
                const percentage = (this.y / data.length * 100).toFixed(1);
                return `<b>${this.x}</b><br/>
                        Employees: ${this.y}<br/>
                        Percentage: ${percentage}%`;
            }
        },
        plotOptions: {
            column: {
                colorByPoint: true,
                colors: ['#FF9999', '#66B2FF', '#99FF99', '#FFCC99', '#FF99CC'],
                dataLabels: {
                    enabled: true,
                    format: '{y}'
                }
            }
        },
        series: [{
            name: 'Employees',
            data: Object.values(ranges)
        }]
    });
}

// Filter data based on selected values
function filterData() {
    const department = document.getElementById('departmentFilter').value;
    const location = document.getElementById('locationFilter').value;
    const position = document.getElementById('jobFilter').value;

    // First, get the directly filtered employees
    const directlyFiltered = employees.filter(emp => {
        return (department === 'all' || emp.department_name === department) &&
            (location === 'all' || emp.department_location_country_name === location) &&
            (position === 'all' || emp.position === position);
    });

    // If no filters are applied, return all employees
    if (department === 'all' && location === 'all' && position === 'all') {
        return employees;
    }

    // Create a set of filtered IDs
    const filteredIds = new Set(directlyFiltered.map(emp => emp.id));

    // Add all ancestors to maintain hierarchy
    const idsToInclude = new Set(filteredIds);

    // Keep adding parents until we reach the root
    let changed;
    do {
        changed = false;
        employees.forEach(emp => {
            if (idsToInclude.has(emp.id)) {
                // If this employee has a parent and we haven't included it yet
                if (emp.parentId && !idsToInclude.has(emp.parentId)) {
                    idsToInclude.add(emp.parentId);
                    changed = true;
                }
            }
        });
    } while (changed);

    // Return all employees that are either filtered or part of the hierarchy
    return employees.filter(emp => idsToInclude.has(emp.id));
}

// Create organization chart
function createOrgChart(data) {
    // Clear previous chart
    d3.select('#orgChart').html('');

    const chart = new d3.OrgChart()
        .container('#orgChart')
        .data(employees)
        .svgHeight(500)
        .nodeWidth(d => 180)  // Function returning width
        .nodeHeight(d => 90)  // Function returning height
        .childrenMargin(d => 40)  // Function returning margin
        .compactMarginBetween(d => 25)  // Function returning compact margin
        .compactMarginPair(d => 20)  // Function returning pair margin
        .nodeContent((d, i, arr, state) => {
            return `
                <div class="node-container">
                    <div style="display: flex;">
                        <img src="${d.data.image}" class="node-image"/>
                        <div class="node-details">
                            <div class="node-name">${d.data.name} ${d.data.lastName}</div>
                            <div class="node-position">${d.data.position}</div>
                            <div class="node-department">${d.data.department_name || ''}</div>
                        </div>
                    </div>
                </div>
            `;
        })
        .render()
}

// Update all visualizations
function updateDashboard() {
    const filteredData = filterData();
    updateMetrics(filteredData);
    createSalaryChart(filteredData);
    createLocationMap(filteredData);
    createDeptChart(filteredData);
    createSalaryRangeChart(filteredData);
    createOrgChart(filteredData);
}

// PDF Download functionality
document.getElementById('downloadPDF').addEventListener('click', async function() {
    // Show loading state
    const button = this;
    const originalText = button.innerHTML;
    button.innerHTML = `
        <svg class="download-icon" width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z">
                <animateTransform attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="1s"
                    repeatCount="indefinite"/>
            </path>
        </svg>
        Generating PDF...
    `;
    button.disabled = true;

    try {
        // Create a clone of the dashboard for PDF
        const originalDashboard = document.querySelector('.dashboard');
        const dashboard = originalDashboard.cloneNode(true);
        
        // Remove org chart and download button from the clone
        const orgChartCard = dashboard.querySelector('.chart-card:has(#orgChart)');
        const downloadBtn = dashboard.querySelector('#downloadPDF');
        if (orgChartCard) orgChartCard.remove();
        if (downloadBtn) downloadBtn.remove();
        
        // Add PDF class and set dimensions
        dashboard.classList.add('for-pdf');
        dashboard.style.width = '1600px';
        dashboard.style.backgroundColor = '#ffffff';
        dashboard.style.margin = '0';
        dashboard.style.padding = '20px';
        
        // Temporarily append the clone to the body
        dashboard.style.position = 'absolute';
        dashboard.style.left = '-9999px';
        document.body.appendChild(dashboard);

        // Recreate charts in the clone with fixed dimensions
        const filteredData = filterData();
        const chartContainers = dashboard.querySelectorAll('[id$="Chart"], #locationMap');
        
        // Wait for charts to be created and rendered
        await Promise.all([...chartContainers].map(async container => {
            if (container.id === 'orgChart') return;
            
            let newChart;
            switch(container.id) {
                case 'salaryChart':
                    newChart = createSalaryChart(filteredData, container);
                    break;
                case 'locationMap':
                    newChart = createLocationMap(filteredData, container);
                    break;
                case 'deptChart':
                    newChart = createDeptChart(filteredData, container);
                    break;
                case 'salaryRangeChart':
                    newChart = createSalaryRangeChart(filteredData, container);
                    break;
            }
            
            if (newChart && newChart.setSize) {
                newChart.setSize(700, 400, false);
            }
            
            return new Promise(resolve => setTimeout(resolve, 500));
        }));

        // Wait for charts to render
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Use html2canvas with specific options
        const canvas = await html2canvas(dashboard, {
            scale: 2,
            useCORS: true,
            logging: false,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 1600,
            height: dashboard.offsetHeight,
            onclone: (clonedDoc) => {
                const clonedDashboard = clonedDoc.querySelector('.dashboard');
                clonedDashboard.style.width = '1600px';
                clonedDashboard.style.transform = 'none';
            }
        });

        // Create PDF with proper dimensions
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height],
            hotfixes: ['px_scaling']
        });

        // Add the image with proper dimensions
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        pdf.save('HR-Analytics-Report.pdf');

        // Cleanup
        document.body.removeChild(dashboard);
        
        // Restore button state
        button.innerHTML = originalText;
        button.disabled = false;

        // Ensure original charts are still rendered
        updateDashboard();
    } catch (error) {
        console.error('PDF generation failed:', error);
        alert('Failed to generate PDF. Please try again. Error: ' + error.message);
        button.innerHTML = originalText;
        button.disabled = false;
        updateDashboard();
    }
}); 