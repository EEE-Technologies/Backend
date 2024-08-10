const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Create an instance of Express
const app = express();
const port = 3000;
const uri = 'mongodb://localhost:27017'; // Change this to your MongoDB URI
const dbName = 'Raytio'; // Change this to your database name

// Middleware to parse JSON requests with increased limits
app.use(bodyParser.json({ limit: '15000mb' })); // Increase the limit as needed
app.use(bodyParser.urlencoded({ extended: true, limit: '15000mb' })); // Increase the limit as needed

// Enable CORS for all routes
app.use(cors({
  origin: '*', // Replace this with your actual origin in production
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization'
}));

// Connect to MongoDB
mongoose.connect(`${uri}/${dbName}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Error connecting to MongoDB:', err);
});

// Define schema and models
const userSchema = new mongoose.Schema({
  user: {
    name: String,
    password: String,
    email: String,
    phone: String,
    age: String,
    profile_picture: String, // Add profile_picture field
    messageDataList: Array,
    following: Array,
    posts: [{
      username: String,
      profile_picture: String,
      title: String,
      post_image: String,
      description: String
    }]
  }
}, { collection: 'Users' });

const UserModel = mongoose.model('User', userSchema);

// Set up multer for file uploads (not used in this case, but could be if you handle file uploads differently)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)){
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const foundUser = await UserModel.findOne({ 'user.name': username });
    if (foundUser && foundUser.user.password === password) {
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
  const { username, email, phone, age, password, confirmPassword, profilePicture } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }

  try {
    const existingUser = await UserModel.findOne({ 'user.name': username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const newUser = {
      user: {
        name: username,
        email: email,
        phone: phone,
        age: age,
        password: password,
        profile_picture: profilePicture // Save the Base64 string here
      }
    };

    await UserModel.create(newUser);
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
    const users = await UserModel.find(
      { 'user.name': { $in: usernames } },
      { 'user.posts': 1, _id: 0 }
    ).exec();

    const postsList = users.map(user => user.user.posts).flat();

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

// Endpoint to add a post to a user's document
app.post('/uploadPost', async (req, res) => {
  const postToAdd = req.body;

  if (!postToAdd.username || !postToAdd.title || !postToAdd.description) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const result = await UserModel.findOneAndUpdate(
      { "user.name": postToAdd.username },
      { $push: { "user.posts": postToAdd } },
      { new: true, useFindAndModify: false }
    );

    if (result) {
      res.status(200).json({ success: true, message: 'Post added to user successfully.' });
    } else {
      res.status(404).json({ success: false, message: 'User not found.' });
    }
  } catch (error) {
    console.error('Error adding post:', error);
    res.status(500).json({ success: false, message: 'Error adding post.' });
  }
});

// Endpoint to get all user names and profile pictures
app.get('/api/get-search-results-username', async (req, res) => {
  try {
    const users = await UserModel.find({}, 'user.name user.profile_picture').exec(); // Retrieve 'user.name' and 'user.profile_picture' fields
    const results = users.map(user => ({
      name: user.user.name,
      profile_picture: user.user.profile_picture || null  // Use 'none' if profile_picture is not available
    }));
    res.status(200).json({ success: true, users: results }); // Send results as JSON response
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
});

// Endpoint to search for a user by name
app.get('/api/get-user-by-name/:name', async (req, res) => {
  const userName = req.params.name;
  try {
    const user = await UserModel.findOne({ 'user.name': userName });

    if (user) {
      res.status(200).json({ success: true, user });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
});

// New Endpoint to add a user to the following list
app.post('/api/add-following', async (req, res) => {
  const { username, newFollowing } = req.body;

  try {
    // Find the user by their name and update their following array
    const updatedUser = await UserModel.findOneAndUpdate(
      { 'user.name': username },
      { $addToSet: { 'user.following': newFollowing } }, // $addToSet avoids duplicates
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Following list updated successfully',
      updatedFollowing: updatedUser.user.following
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
});

// Create HTTP server with custom options
const serverOptions = {
  maxHeaderSize: 5000 * 1024 * 1024 // 500 MB
};
const server = http.createServer(serverOptions, app);

// Start the server
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
