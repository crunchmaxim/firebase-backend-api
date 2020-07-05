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
const { getAllPosts, getOnePost, createNewPost, postComment, deletePost, likePost, unlikePost, getPostComments, deleteComment, addPostImage } = require('./handlers/posts');
const { signUp, login, uploadUserImage, getUserInfo, deleteNotification, getAuthUserInfo } = require('./handlers/users');

// Posts routes
app.get('/posts', getAllPosts); // Get all posts
app.get('/posts/:postId', getOnePost); // Get one post
app.post('/posts', authMiddleware, createNewPost); //Create new post
app.post('/posts/:postId/comment', authMiddleware, postComment); // Add a comment to the post
app.post('/posts/:postId/image', authMiddleware, addPostImage); // Add an image to the post
app.delete('/posts/:postId', authMiddleware, deletePost); // Delete post
app.get('/posts/:postId/like', authMiddleware, likePost); // Like a post
app.get('/posts/:postId/unlike', authMiddleware, unlikePost); // Unlike a post
app.get('/posts/:postId/comments', getPostComments); // Get comments for a post
app.delete('/comments/:commentId', authMiddleware, deleteComment); // Delete comment

// Users routes
app.post('/signup', signUp); // Sign up
app.post('/login', login); // Login
app.post('/users/image', authMiddleware, uploadUserImage); // Upload user image
app.get('/users/:username', getUserInfo); // Get user info
app.get('/me', authMiddleware, getAuthUserInfo); // Get authorized user info
app.delete('/notifications/:notificationId', authMiddleware, deleteNotification); // Delete notification

exports.api = functions.region('europe-west1').https.onRequest(app);

// Notifications
exports.createNotificationOnLike = functions.region('europe-west1').firestore.document('likes/{id}')
    .onCreate(async likeSnapshot => {
        const postSnapshot = await db.doc(`/posts/${likeSnapshot.data().postId}`).get();

        const newLikeNotification = {
            sender: likeSnapshot.data().username,
            senderImage: likeSnapshot.data().imageUrl,
            recipient: postSnapshot.data().username,
            postTitle: postSnapshot.data().title,
            type: 'like',
            read: false,
            createdAt: new Date().toISOString(),
            postId: postSnapshot.id
        }
        if (newLikeNotification.sender === newLikeNotification.recipient) {
            return;
        }

        await db.doc(`/notifications/${likeSnapshot.id}`).set(newLikeNotification);
        return;
    });

exports.deleteNotificationOnUnlike = functions.region('europe-west1').firestore.document('likes/{id}')
    .onDelete(async likeSnapshot => {
        await db.doc(`/notifications/${likeSnapshot.id}`).delete();
        return;
    });

exports.createNotificationOnComment = functions.region('europe-west1').firestore.document('comments/{id}')
    .onCreate(async commentSnapshot => {
        const postSnapshot = await db.doc(`/posts/${commentSnapshot.data().postId}`).get();

        const newCommentNotification = {
            sender: commentSnapshot.data().username,
            senderImage: commentSnapshot.data().imageUrl,
            recipient: postSnapshot.data().username,
            postTitle: postSnapshot.data().title,
            type: 'comment',
            createdAt: new Date().toISOString(),
            postId: postSnapshot.id
        }
        if (newCommentNotification.sender === newCommentNotification.recipient) {
            return;
        }

        await db.doc(`/notifications/${commentSnapshot.id}`).set(newCommentNotification);
        return;
    });

exports.deleteNotificationOnCommentDelete = functions.region('europe-west1').firestore.document('comments/{id}')
    .onDelete(async commentSnapshot => {
        await db.doc(`/notifications/${commentSnapshot.id}`).delete();
        return;
    });

exports.onPostDelete = functions.region('europe-west1').firestore.document('posts/{id}')
    .onDelete(async postSnapshot => {
        const commentArray = await db.collection('comments').where('postId', '==', postSnapshot.id).get();
        commentArray.forEach(async comment => {
            await db.doc(`/comments/${comment.id}`).delete()
        });

        const likesArray = await db.collection('likes').where('postId', '==', postSnapshot.id).get();
        likesArray.forEach(async like => {
            await db.doc(`likes/${like.id}`).delete()
        });
        return;
    });

exports.onChangeUserImage = functions.region('europe-west1').firestore.document('users/{id}')
    .onUpdate(async change => {
        if (change.before.data().imageUrl !== change.after.data().imageUrl) {
            const postsSnapshot = await db.collection('posts').where('username', '==', change.before.data().username).get();
            postsSnapshot.forEach(async post => {
                await db.doc(`/posts/${post.id}`).update({imageUrl: change.after.data().imageUrl});
                return;
            })
            const commentsSnapshot = await db.collection('comments').where('username', '==', change.before.data().username).get();
            commentsSnapshot.forEach(async comment => {
                await db.doc(`/comments/${comment.id}`).update({imageUrl: change.after.data().imageUrl});
                return;
            })
        }
    });