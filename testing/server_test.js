const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3000;

// Set up storage with multer to save uploaded files to the "uploads" directory
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Rename the file to include a timestamp
    }
});

const upload = multer({ storage: storage });

// Serve the HTML form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'server_test.html'));
});

// Handle image upload
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    res.json({ message: 'Image uploaded successfully' });
});

// Serve the uploaded files
app.use('/uploads', express.static('uploads'));

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
