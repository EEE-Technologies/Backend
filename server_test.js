const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Create an instance of Express
const app = express();
const port = 3000;

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/Raytio', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Error connecting to MongoDB:', err);
});

// Define the schema and model for the 'users' collection
const userSchema = new mongoose.Schema({
  user: {
    name: String,
    password: String,
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

// Endpoint to add a post to a user's document
app.post('/uploadPost', async (req, res) => {
  const postToAdd = req.body; // Get the entire post object from the request body

  try {
    // Find the user by username and update their posts array
    const result = await UserModel.findOneAndUpdate(
      { "user.name": postToAdd.username }, // Find user by username
      { $push: { "user.posts": postToAdd } }, // Append the post to the user's posts array
      { new: true, useFindAndModify: false } // Return the updated document
    );

    if (result) {
      res.send('Post added to user successfully.');
    } else {
      res.status(404).send('User not found.');
    }
  } catch (error) {
    console.error('Error adding post:', error);
    res.status(500).send('Error adding post.');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

