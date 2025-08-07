// 주식 상세 페이지 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // 탭 기능 초기화
    initTabs();
    
    // 주식 차트 초기화
    initStockChart();
});

// 탭 기능
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // 모든 탭 버튼 비활성화
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // 클릭된 탭 버튼 활성화
            this.classList.add('active');
            
            // 모든 탭 패널 숨김
            tabPanes.forEach(pane => pane.classList.remove('active'));
            // 해당 탭 패널 표시
            const targetPane = document.getElementById(targetTab);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });
}

// 주식 차트 생성
function initStockChart() {
    const canvas = document.getElementById('stockChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // 서버에서 전달받은 차트 데이터 사용
    let chartLabels = [];
    let chartPrices = [];
    
    // window.stockChartData는 EJS에서 전달받은 데이터
    if (window.stockChartData && window.stockChartData.labels.length > 0) {
        chartLabels = window.stockChartData.labels;
        chartPrices = window.stockChartData.prices;
    } else {
        // 데이터가 없을 경우 기본 메시지
        console.log('차트 데이터가 없습니다.');
        return;
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: '주가',
                data: chartPrices,
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0, // 곡선이 아닌 직선으로 연결
                pointBackgroundColor: '#1976d2',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#1976d2',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return '₩' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        maxTicksLimit: 7
                    }
                },
                y: {
                    display: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '₩' + value.toLocaleString();
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            hover: {
                mode: 'nearest',
                intersect: false
            }
        }
    });
}

// 유틸리티 함수들
function formatCurrency(amount) {
    return '₩' + amount.toLocaleString();
}

function formatPercentage(rate) {
    return (rate >= 0 ? '+' : '') + rate.toFixed(2) + '%';
}

// 반응형 차트 리사이즈
window.addEventListener('resize', function() {
    const chart = Chart.getChart('stockChart');
    if (chart) {
        chart.resize();
    }
});
