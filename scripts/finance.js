document.addEventListener("DOMContentLoaded", function() {
    const amountInput = document.getElementById("amount");
    const fromSelect = document.getElementById("from-currency");
    const toSelect = document.getElementById("to-currency");
    const resultBox = document.getElementById("finance-result");

    const url = "https://open.er-api.com/v6/latest/USD";
    let rates = {};

    function calculate() {
        const amount = parseFloat(amountInput.value) || 0;
        const fromCur = fromSelect.value;
        const toCur = toSelect.value;
        
        if (!rates[fromCur] || !rates[toCur]) return;

        // Математика кросс-курса через базовый USD:
        // Переводим исходную валюту в USD, а затем полученные USD в целевую валюту
        const amountInUSD = amount / rates[fromCur];
        const finalResult = (amountInUSD * rates[toCur]).toFixed(2);
        
        resultBox.innerText = `${amount} ${fromCur} = ${finalResult} ${toCur}`;
    }

    fetch(url)
        .then(res => res.json())
        .then(data => {
            rates = data.rates;
            calculate();
        })
        .catch(() => {
            resultBox.innerText = "Ошибка обновления курсов";
            resultBox.style.color = "#ef4444";
        });

    amountInput.addEventListener("input", calculate);
    fromSelect.addEventListener("change", calculate);
    toSelect.addEventListener("change", calculate);
});