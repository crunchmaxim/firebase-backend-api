const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const firebase = require('firebase');

// Upload image imports
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');

// validators imports
const isEmail = require('validator/lib/isEmail');
const isEmpty = require('validator/lib/isEmpty');

const app = express();
app.use(cors());

admin.initializeApp();
const db = admin.firestore();

const firebaseConfig = {
    apiKey: "AIzaSyAsae74LvBzykYPo7bANZ9A1z20Yepyb2I",
    authDomain: "socialapp2-f9053.firebaseapp.com",
    databaseURL: "https://socialapp2-f9053.firebaseio.com",
    projectId: "socialapp2-f9053",
    storageBucket: "socialapp2-f9053.appspot.com",
    messagingSenderId: "158140953454",
    appId: "1:158140953454:web:963054003ca699ba39477f"
};

firebase.initializeApp(firebaseConfig);

// Get all posts
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
        return res.status(500).json(error);
    }
})

// Get one post
app.get('/posts/:postId', async (req, res) => {
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
})

// Auth middleware
const authMiddleware = async (req, res, next) => {
    try {
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            return res.status(400).json('Wrong token');
        }
        const token = req.headers.authorization.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userInfo = await db.collection('users').where('userId', '==', decodedToken.uid).limit(1).get();
        req.userData = {};
        req.userData.username = userInfo.docs[0].data().username;
        next();

    } catch (error) {
        return res.status(500).json(error);
    }
}



//Create new post
app.post('/posts', authMiddleware, async (req, res) => {
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
})

// Sign up
app.post('/signup', async (req, res) => {
    try {
        const newUser = {
            username: req.body.username,
            password: req.body.password,
            confirmPassword: req.body.password,
            email: req.body.email
        }
        // validators
        if (isEmpty(req.body.username)) return res.json('Username must not be empty');
        if (!isEmail(req.body.email)) return res.json('Incorrect email');
        if (req.body.password !== req.body.confirmPassword) return res.json('Passwords must match');

        const doc = await db.doc(`/users/${req.body.username}`).get();
        if (doc.exists) {
            return res.status(400).json('User with this name already exists');
        } else {
            const newUserData = await firebase.auth().createUserWithEmailAndPassword(req.body.email, req.body.password);
            const token = await newUserData.user.getIdToken();

            newUserCredentials = {
                username: req.body.username,
                email: req.body.email,
                createdAt: new Date().toISOString(),
                userId: newUserData.user.uid,
                imageUrl: 'https://firebasestorage.googleapis.com/v0/b/socialapp2-f9053.appspot.com/o/no-img.png?alt=media'
            }

            await db.doc(`/users/${req.body.username}`).set(newUserCredentials)

            return res.json({ token });
        }
    } catch (error) {
        return res.status(500).json(error);
    }
})

// Login
app.post('/login', async (req, res) => {
    try {
        const user = {
            email: req.body.email,
            password: req.body.password
        }

        const userData = await firebase.auth().signInWithEmailAndPassword(user.email, user.password);
        const token = await userData.user.getIdToken();

        return res.json({ token });
    } catch (error) {
        return res.status(500).json("Wrong email or password");
    }
})

// Upload user image
app.post('/users/image', authMiddleware, (req, res) => {
    const busboy = new Busboy({ headers: req.headers });

    let imageFileName;
    let imageToBeUploaded = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
            return res.status(400).json({ error: 'Wrong file type submitted' });
        }

        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        imageFileName = `${Math.round(Math.random() * 10000000000)}.${imageExtension}`;

        const filepath = path.join(os.tmpdir(), imageFileName)

        imageToBeUploaded = { filepath, mimetype };

        file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', async () => {
        try {
            await admin.storage().bucket().upload(imageToBeUploaded.filepath, {
                resumable: false,
                metadata: {
                    metadata: {
                        contentType: imageToBeUploaded.mimetype
                    }
                }
            })

            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;

            await db.doc(`/users/${req.userData.username}`).update({ imageUrl });

            return res.json('Image upload successfully');
        } catch (error) {
            return res.status(500).json(error)
        }
    })
    busboy.end(req.rawBody);
})

exports.api = functions.region('europe-west1').https.onRequest(app);