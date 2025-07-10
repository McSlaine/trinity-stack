document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const companyId = urlParams.get('id');
    const cashflowChartCanvas = document.getElementById('cashflow-chart');
    const chartLoader = document.getElementById('chart-loader');
    const runReportBtn = document.getElementById('run-report-btn');
    const daterangeInput = $('input[name="daterange"]');

    if (!companyId) {
        document.body.innerHTML = '<h1>No company file ID provided.</h1>';
        return;
    }

    let chart;

    daterangeInput.daterangepicker({
        opens: 'left',
        startDate: moment().subtract(12, 'months'),
        endDate: moment(),
    });

    const showLoader = (show) => {
        chartLoader.style.display = show ? 'block' : 'none';
    };

    function renderCashFlowChart(buckets) {
        if (chart) chart.destroy();
        const labels = Object.keys(buckets).sort();
        const values = labels.map(m => buckets[m]);

        chart = new Chart(cashflowChartCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Net Cash Flow',
                    data: values,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.3,
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    async function loadCashFlowData(startDate, endDate) {
        showLoader(true);
        try {
            const response = await fetch(`/company-file/${companyId}/reports/cashflow-summary?startDate=${startDate}&endDate=${endDate}`);
            if (!response.ok) {
                throw new Error('Failed to fetch cash flow data');
            }
            const data = await response.json();
            renderCashFlowChart(data);
        } catch (error) {
            console.error('Cash Flow Error:', error);
            cashflowChartCanvas.closest('.card').innerHTML = '<p class="error">Could not load cash flow data.</p>';
        } finally {
            showLoader(false);
        }
    }

    runReportBtn.addEventListener('click', () => {
        const { startDate, endDate } = daterangeInput.data('daterangepicker');
        loadCashFlowData(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
    });

    // Initial load for the default 12 months
    const { startDate, endDate } = daterangeInput.data('daterangepicker');
    loadCashFlowData(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
});