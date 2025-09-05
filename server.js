const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve CV.pdf at /cv route
app.get('/cv', (req, res) => {
    res.download(path.join(__dirname, 'CV.pdf'), 'Victor_CV.pdf');
});

// Root route serves the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Portfolio server running on http://localhost:${PORT}`);
});