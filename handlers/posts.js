const admin = require('firebase-admin');
const db = admin.firestore();

exports.getAllPosts = async (req, res) => {
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
        return res.status(500).json(error);
    }
};

exports.getOnePost = async (req, res) => {
    try {
        const snapshot = await db.doc(`/posts/${req.params.postId}`).get();
        if (!snapshot.exists) {
            return res.status(404).json({ error: 'Post not found' });
        }
        const post = {
            id: snapshot.id,
            ...snapshot.data()
        }
        return res.json(post);
    } catch (error) {
        return res.status(500).json(error);
    }
};

exports.createNewPost = async (req, res) => {
    try {
        if (req.body.body.trim() === '') {
            return res.status(400).json({ body: 'Body must not be empty' });
        }
        const newPost = {
            username: req.userData.username,
            body: req.body.body,
            createdAt: new Date().toISOString()
        }
        await db.collection('posts').add(newPost);
        return res.json('Post added');

    } catch (error) {
        return res.status(500).json(error);
    }
};