const token = 'cmpq2e1r01qg7bbodbr0cmpq2e1r01qg7bbodbrg';
let socket;
let lastPrice = null;
let prevClose = null;
let currentSymbol = null;

function createWebSocket() {
    socket = new WebSocket(`wss://ws.finnhub.io?token=${token}`);

    socket.addEventListener('open', function (event) {
        subscribeToSymbol(currentSymbol);
    });

    socket.addEventListener('message', function (event) {
        const data = JSON.parse(event.data);
        if (data.type === 'trade' && data.data) {
            data.data.forEach(trade => {
                updateDisplay(trade.p, trade.t);
            });
        }
    });

    socket.addEventListener('close', function () {
        console.error('WebSocket closed unexpectedly. Attempting to reconnect...');
        setTimeout(createWebSocket, 5000); // Attempt to reconnect every 5 seconds
    });
}

async function fetchSymbolData(query) {
    const searchResponse = await fetch(`https://finnhub.io/api/v1/search?q=${query}&token=${token}`);
    const searchData = await searchResponse.json();
    const symbol = searchData.result[0].symbol;


    const quoteResponse = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${token}`);
    const quoteData = await quoteResponse.json();

    prevClose = quoteData.pc;
    document.title = symbol;
    updateDisplay(quoteData.c, quoteData.t * 1000); // Multiply by 1000 to convert to milliseconds
    return symbol;
}

function subscribeToSymbol(symbol) {
    if (currentSymbol && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({'type':'unsubscribe', 'symbol': currentSymbol}));
    }
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({'type':'subscribe', 'symbol': symbol}));
    }
    currentSymbol = symbol;
}

function updateDisplay(price, timestamp) {

    // const priceDisplay = document.getElementById('priceDisplay');
    const priceElement = document.getElementById('priceElement');
    const changeElement = document.getElementById('changeElement');
    const timeElement = document.getElementById('timeElement');

    const formattedPrice = `USD ${new Intl.NumberFormat('en-US').format(price)}`;
    const date = new Date(timestamp);
    const now = new Date();
    let timeString;
 
    if (date.toDateString() === now.toDateString()) {
        timeString = ' at ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } else {
        timeString = ' on ' + date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    }
   
    timeElement.textContent = timeString;
    
    priceElement.textContent = formattedPrice;
    if (lastPrice !== null) {
        priceElement.style.backgroundColor = price >= lastPrice ? '#c2f2c2' : '#fcdede';
        setTimeout(() => {
            priceElement.style.backgroundColor = '';
        }, 500);
    }
    lastPrice = price;

    if (prevClose !== null) {
        const absoluteChange = price - prevClose;
        const percentageChange = absoluteChange / prevClose * 100;
        const sign = absoluteChange >= 0 ? '+' : '';
        changeElement.textContent = ` ${sign}${absoluteChange.toFixed(2)} (${sign}${percentageChange.toFixed(2)}%)`;
        changeElement.style.color = sign === '+' ? 'green' : 'red';
    }
}

document.getElementById('symbolInput').addEventListener('keypress', async function(event) {
    if (event.key === 'Enter') {
        const newSymbol = await fetchSymbolData(event.target.value);
        subscribeToSymbol(newSymbol);
    }
});

createWebSocket(); // Initialize WebSocket connection
