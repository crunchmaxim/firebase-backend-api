const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();

app.use(cors());

admin.initializeApp();
const db = admin.firestore();

// Auth middleware import
const { authMiddleware } = require('./util/authmiddleware');

// Handlers imports
const { getAllPosts, getOnePost, createNewPost, postComment, deletePost, likePost, unlikePost } = require('./handlers/posts');
const { signUp, login, uploadUserImage, getUserInfo, setAboutMe, setStatus } = require('./handlers/users');

// Posts routes
app.get('/posts', getAllPosts); // Get all posts
app.get('/posts/:postId', getOnePost); // Get one post
app.post('/posts', authMiddleware, createNewPost); //Create new post
app.post('/posts/:postId/comment', authMiddleware, postComment); // Add a comment to the post
app.delete('/posts/:postId', authMiddleware, deletePost); // Delete post
app.get('/posts/:postId/like', authMiddleware, likePost); // Like a post
app.get('/posts/:postId/unlike', authMiddleware, unlikePost); // Unlike a post

// Users routes
app.post('/signup', signUp); // Sign up
app.post('/login', login); // Login
app.post('/users/image', authMiddleware, uploadUserImage); // Upload user image
app.get('/users/:username', getUserInfo); // Get user info
app.post('/users/aboutme', authMiddleware, setAboutMe); // Set about me
app.post('/users/status', authMiddleware, setStatus); // Set status

exports.api = functions.region('europe-west1').https.onRequest(app);

// Notifications
exports.createNotificationOnLike = functions.region('europe-west1').firestore.document('likes/{id}')
    .onCreate(async likeSnapshot => {
        const postSnapshot = await db.doc(`/posts/${likeSnapshot.data().postId}`).get();

        const newLikeNotification = {
            sender: likeSnapshot.data().username,
            recipient: postSnapshot.data().username,
            type: 'like',
            read: false,
            createdAt: new Date().toISOString()
        }
        await db.doc(`/notifications/${likeSnapshot.id}`).set(newLikeNotification);
        return;
    })

exports.deleteNotificationOnUnlike = functions.region('europe-west1').firestore.document('likes/{id}')
    .onDelete(async likeSnapshot => {
        await db.doc(`/notifications/${likeSnapshot.id}`).delete();
        return;
    })

exports.createNotificationOnComment = functions.region('europe-west1').firestore.document('comments/{id}')
    .onCreate(async commentSnapshot => {
        const postSnapshot = await db.doc(`/posts/${commentSnapshot.data().postId}`).get();

        const newCommentNotification = {
            sender: commentSnapshot.data().username,
            recipient: postSnapshot.data().username,
            type: 'comment',
            read: false,
            createdAt: new Date().toISOString()
        }
        await db.doc(`/notifications/${commentSnapshot.id}`).set(newCommentNotification);
        return;
    })