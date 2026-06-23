document.addEventListener("DOMContentLoaded", function() {
    const container = document.getElementById("crypto-container");
    
    // API CoinGecko для получения топ-монет в USD и изменения за 24 часа
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,the-open-network&vs_currencies=usd&include_24hr_change=true";
    
    // Объект для хранения старых цен (чтобы сравнивать изменения при автообновлении)
    let previousPrices = {};

    function fetchCryptoData() {
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error("Превышен лимит запросов API");
                return res.json();
            })
            .then(data => {
                // Переименуем ключи из API в красивые тикеры для вывода
                const coinMapping = {
                    'bitcoin': { name: 'Bitcoin', ticker: 'BTC' },
                    'ethereum': { name: 'Ethereum', ticker: 'ETH' },
                    'solana': { name: 'Solana', ticker: 'SOL' },
                    'binancecoin': { name: 'BNB Coin', ticker: 'BNB' },
                    'the-open-network': { name: 'Toncoin', ticker: 'TON' }
                };

                let htmlContent = "";

                Object.keys(coinMapping).forEach(id => {
                    const coin = data[id];
                    const info = coinMapping[id];
                    const currentPrice = coin.usd;
                    const change24h = coin.usd_24h_change.toFixed(2);
                    
                    // Класс для суточного изменения (зеленый/красный цвет)
                    const changeClass = change24h >= 0 ? 'crypto-up' : 'crypto-down';
                    const changeSign = change24h >= 0 ? '+' : '';

                    // Проверяем мгновенное изменение (для анимации вспышки карточки)
                    let flashClass = '';
                    if (previousPrices[id]) {
                        if (currentPrice > previousPrices[id]) {
                            flashClass = 'flash-green';
                        } else if (currentPrice < previousPrices[id]) {
                            flashClass = 'flash-red';
                        }
                    }

                    // Сохраняем текущую цену как старую для следующего тика
                    previousPrices[id] = currentPrice;

                    // Форматируем вывод цены (чтобы дешевые монеты имели центы, а дорогие — нет)
                    const formattedPrice = currentPrice > 100 
                        ? Math.round(currentPrice).toLocaleString('en-US') 
                        : currentPrice.toFixed(2);

                    htmlContent += `
                        <div class="crypto-card ${flashClass}" id="card-${id}">
                            <div class="crypto-meta">
                                <span class="crypto-name">${info.name}</span>
                                <span class="crypto-ticker">${info.ticker}</span>
                            </div>
                            <div class="crypto-market">
                                <span class="crypto-price">$${formattedPrice}</span>
                                <span class="crypto-change ${changeClass}">${changeSign}${change24h}%</span>
                            </div>
                        </div>
                    `;
                });

                container.innerHTML = htmlContent;

                // Через 1 секунду убираем классы анимации вспышки, чтобы их можно было запустить снова
                setTimeout(() => {
                    Object.keys(coinMapping).forEach(id => {
                        const card = document.getElementById(`card-${id}`);
                        if (card) card.classList.remove('flash-green', 'flash-red');
                    });
                }, 1000);
            })
            .catch(err => {
                console.error(err);
                container.innerHTML = `<p style='color:#ef4444;'>Превышен лимит запросов к API. Пожалуйста, подождите минуту.</p>`;
            });
    }

    // Запускаем сразу при загрузке страницы
    fetchCryptoData();

    // Запускаем интервал обновления каждые 20 секунд
    const interval = setInterval(fetchCryptoData, 20000);

    // Очищаем интервал при уходе со страницы
    window.addEventListener("beforeunload", () => clearInterval(interval));
});