const admin = require('firebase-admin');
const db = admin.firestore();

exports.getAllPosts = async (req, res) => {
    const posts = [];
    try {
        const snapshot = await db.collection('posts').orderBy('createdAt', 'desc').get();
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
        post.comments = [];
        const commentsSnapshot = await db.collection('comments').where('postId', '==', post.id).get();
        commentsSnapshot.forEach(comment => post.comments.push(comment.data()));
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

exports.postComment = async (req, res) => {
    try {
        const newComment = {
            username: req.userData.username,
            body: req.body.body,
            postId: req.params.postId
        }

        await db.collection('comments').add(newComment);
        return res.json('Comment added');
    } catch (error) {
        return res.status(500).json(error);
    }
};

exports.deletePost = async (req, res) => {
    try {
        const postSnapshot = await db.doc(`/posts/${req.params.postId}`).get();
        if (!postSnapshot.exists) {
            return res.status(404).json('Post not found');
        }
     
        const post = postSnapshot.data();
     
        if (post.username !== req.userData.username) {
            return res.status(400).json('Wrong credentials');
        }
     
        await db.doc(`/posts/${req.params.postId}`).delete();
        return res.json('Post was deleted');
    } catch (error) {
        return res.status(500).json(error);
    }
};

exports.likePost = async (req, res) => {
    try {
        const post = await db.doc(`/posts/${req.params.postId}`).get();
        if (!post.exists) {
            return res.status(404).json('Post not found');
        }

        const likeSnapshot = await db.collection('likes').where('username', '==', req.userData.username).where('postId', '==', req.params.postId).get();

        if (likeSnapshot.docs[0] !== undefined) {
            return res.json('You already liked this post');
        }
    
        const likeDocument = {
            username: req.userData.username,
            postId: req.params.postId
        }
    
        await db.collection('likes').add(likeDocument);
        return res.json('Like added');
    } catch (error) {
        return res.status(500).json(error);
    }
};

exports.unlikePost = async (req, res) => {
    try {
        const likeDocument = await db.collection('likes').where('username', '==', req.userData.username).where('postId', '==', req.params.postId).get();

        if (likeDocument.docs[0] === undefined) {
            return res.json('Like not found');
        }
    
        await db.doc(`/likes/${likeDocument.docs[0].id}`).delete()
        return res.json('Like deleted');
    } catch (error) {
        return res.status(500).json(error);
    }
};