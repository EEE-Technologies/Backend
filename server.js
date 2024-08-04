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

// Login endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        console.log('Received username:', username);
        console.log('Received password:', password);

        const foundUser = await db.collection('Users').findOne({ 'user.name': username });

        if (foundUser && foundUser.user.password === password) {
            console.log('Retrieved user document:', foundUser);
            res.status(200).json({ success: true, userDocument: foundUser });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ success: false, message: 'An error occurred' });
    }
});

// Signup endpoint
app.post('/signup', async (req, res) => {
    const { username, email, phone, age, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    try {
        const existingUser = await db.collection('Users').findOne({ 'user.name': username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        const newUser = {
            user: {
                name: username,
                email: email,
                phone: phone,
                age: age,
                password: password
            }
        };

        await db.collection('Users').insertOne(newUser);
        res.status(201).json({ success: true, message: 'User created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'An error occurred' });
    }
});

// Get users by usernames endpoint
app.post('/get-users', async (req, res) => {
    const { usernames } = req.body;

    if (!Array.isArray(usernames) || usernames.length === 0) {
        return res.status(400).json({ success: false, message: 'No usernames provided' });
    }

    try {
        // Query the database for documents where the user.name is in the list of usernames
        const users = await db.collection('Users').find(
            { 'user.name': { $in: usernames } },
            { projection: { 'user.posts': 1, _id: 0 } } // Only include the posts field in the result
        ).toArray();

        // Map the results to only include the posts from each user
        const postsList = users.map(user => user.user.posts).flat(); // Flatten the array of posts

        if (postsList.length > 0) {
            res.status(200).json({ success: true, posts: postsList });
        } else {
            res.status(404).json({ success: false, message: 'No posts found' });
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ success: false, message: 'An error occurred' });
    }
});



app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});