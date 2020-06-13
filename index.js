const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());

admin.initializeApp();
const db = admin.firestore();

app.get('/posts', async (req, res) => {
    const posts = [];
    try {
        const snapshot = await db.collection('posts').orderBy('createdAt', 'desc').get()
        snapshot.forEach(doc => {
            let id = doc.id;
            let data = doc.data();

            posts.push({ id, ...data })
        });
        return res.json(posts);
    } catch (error) {
        return res.status(500).json(error)
    }
})

app.get('/posts/:postId', async (req, res) => {
    try {
        const snapshot = await db.doc(`/posts/${req.params.postId}`).get();
        if (!snapshot.exists) {
            return res.status(404).json({error: 'Post not found'})
        }
        const post = {
            id: snapshot.id,
            ... snapshot.data()
        }
        return res.json(post)
    } catch (error) {
        return res.status(500).json(error)
    }
})

app.post('/posts', async (req, res) => {
    try {
        if (req.body.body.trim() === '') {
            return res.status(400).json({body: 'Body must not be empty'})
        }
        const newPost = {
            username: req.body.username,
            body: req.body.body,
            createdAt: new Date().toISOString()
        }
        await db.collection('posts').add(newPost);
        return res.json('Post added');

    } catch (error) {
        return res.status(500).json(error)
    }
})

exports.api = functions.region('europe-west1').https.onRequest(app);