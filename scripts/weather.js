document.addEventListener("DOMContentLoaded", function() {
    let weatherChart = null;
    const tabs = document.querySelectorAll(".tab-btn");

    // Функция для получения даты в формате YYYY-MM-DD
    function getFormattedDate(offset) {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Главная функция загрузки погоды
    function loadWeatherForDay(offset) {
        const targetDate = getFormattedDate(offset);
        
        // Меняем параметр на стабильный "precipitation" (осадки в мм)
        const baseUrl = offset < 0 
            ? "https://archive-api.open-meteo.com/v1/archive" 
            : "https://api.open-meteo.com/v1/forecast";

        const url = `${baseUrl}?latitude=55.75&longitude=37.62&hourly=temperature_2m,precipitation&start_date=${targetDate}&end_date=${targetDate}`;

        document.getElementById("weather-info").innerHTML = "<p class='loading'>Загрузка данных...</p>";

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);
                return res.json();
            })
            .then(data => {
                renderChart(data.hourly);
            })
            .catch(err => {
                console.error(err);
                document.getElementById("weather-info").innerHTML = `<p style='color:#ef4444;'>Не удалось загрузить данные (Ошибка ${targetDate})</p>`;
            });
    }

    function renderChart(hourlyData) {
    let hoursLabels = [];
    let targetIndices = [];

    // Проверяем ширину экрана (если меньше 600px — это мобилка)
    if (window.innerWidth <= 600) {
        // Настройки для телефона: шаг 2 часа + финальный 23:00
        hoursLabels = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];
        targetIndices = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
    } else {
        // Настройки для компьютера: каждый час от 00:00 до 23:00 (все 24 точки)
        for (let i = 0; i < 24; i++) {
            hoursLabels.push(`${String(i).padStart(2, '0')}:00`);
            targetIndices.push(i);
        }
    }
    
    const temps = [];
    const rainMM = [];

    // Заполняем массивы данными по выбранным индексам
    targetIndices.forEach(i => {
        temps.push(hourlyData.temperature_2m[i]);
        rainMM.push(hourlyData.precipitation ? hourlyData.precipitation[i] : 0);
    });

    // Расчет средней температуры (оставляем как было, считаем по всем 24 часам для точности)
    const avgTemp = (hourlyData.temperature_2m.reduce((a, b) => a + b, 0) / 24).toFixed(1);
        document.getElementById("weather-info").innerHTML = `
            <div class="weather-summary">
                <div>
                    <div class="weather-temp">${avgTemp}°C</div>
                    <div style="color: #94a3b8;">Средняя температура за эти сутки</div>
                </div>
            </div>
        `;

        if (weatherChart) {
            weatherChart.destroy();
        }

        const ctx = document.getElementById('weatherChart').getContext('2d');
        weatherChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hoursLabels,
                datasets: [
                    {
                        type: 'line',
                        label: 'Температура (°C)',
                        data: temps,
                        borderColor: '#3b82f6',
                        backgroundColor: 'transparent',
                        borderWidth: 3,
                        tension: 0.4,
                        yAxisID: 'y-temp',
                    },
                    {
                        label: 'Осадки (мм)',
                        data: rainMM,
                        backgroundColor: 'rgba(16, 185, 129, 0.25)',
                        borderColor: '#10b981',
                        borderWidth: 1,
                        yAxisID: 'y-rain',
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b' } },
                    'y-temp': {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: 'Градусы (°C)', color: '#3b82f6' },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#64748b' }
                    },
                    'y-rain': {
                        type: 'linear',
                        position: 'right',
                        min: 0,
                        // Автоматическое масштабирование шкалы осадков, но не меньше 5 мм для красоты
                        max: Math.max(...rainMM, 5),
                        title: { display: true, text: 'Осадки (мм)', color: '#10b981' },
                        grid: { display: false },
                        ticks: { color: '#64748b' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#f8fafc' } }
                }
            }
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const dayAttr = parseInt(tab.getAttribute("data-day"));
            const offset = dayAttr - 1; 
            
            loadWeatherForDay(offset);
        });
    });

    // Стартуем по умолчанию с сегодняшнего дня
    loadWeatherForDay(0);
});
