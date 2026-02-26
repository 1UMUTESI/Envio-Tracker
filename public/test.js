const fetch = require('node-fetch');
setInterval(async () => {
    const data = { 
        temperature: (25 + Math.random() * 10).toFixed(1), 
        humidity: (40 + Math.random() * 20).toFixed(1) 
    };
    await fetch('http://localhost:3000/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    console.log("Sent data:", data);
}, 3000); // Sends data every 3 seconds