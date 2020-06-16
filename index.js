const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();

app.use(cors());

admin.initializeApp();

// Auth middleware import
const {authMiddleware} = require('./util/authmiddleware');

// Handlers imports
const {getAllPosts, getOnePost, createNewPost} = require('./handlers/posts');
const {signUp, login, uploadUserImage, getUserInfo, setAboutMe, setStatus} = require('./handlers/users');

// Posts routes
app.get('/posts', getAllPosts); // Get all posts
app.get('/posts/:postId', getOnePost); // Get one post
app.post('/posts', authMiddleware, createNewPost); //Create new post

// Users routes
app.post('/signup', signUp); // Sign up
app.post('/login', login); // Login
app.post('/users/image', authMiddleware, uploadUserImage); // Upload user image
app.get('/users/:username', getUserInfo ); // Get user info
app.post('/users/aboutme', authMiddleware, setAboutMe); // Set about me
app.post('/users/status', authMiddleware, setStatus); // Set status

exports.api = functions.region('europe-west1').https.onRequest(app);