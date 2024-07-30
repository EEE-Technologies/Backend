const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import cors
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;
const uri = 'mongodb://localhost:27017'; // Change this to your MongoDB URI
const dbName = 'Raytio'; // Change this to your database name

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors()); // Enable CORS for all routes

let db;

MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        db = client.db(dbName);
        console.log(`Connected to database: ${dbName}`);
    })
    .catch(error => console.error(error));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db.collection('Users').findOne({ 'user.name': username });
        if (user && user.user.password === password) {
            res.status(200).json({ success: true });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'An error occurred' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
