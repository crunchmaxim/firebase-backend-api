const admin = require('firebase-admin');
const db = admin.firestore();
const firebase = require('firebase');

// Validators imports
const isEmail = require('validator/lib/isEmail');
const isEmpty = require('validator/lib/isEmpty');

// Upload image imports
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');

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

exports.signUp = async (req, res) => {
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
                imageUrl: 'https://firebasestorage.googleapis.com/v0/b/socialapp2-f9053.appspot.com/o/no-img.png?alt=media',
                aboutMe: '',
                status: ''
            }

            await db.doc(`/users/${req.body.username}`).set(newUserCredentials)

            return res.json({ token });
        }
    } catch (error) {
        return res.status(500).json(error);
    }
};

exports.login = async (req, res) => {
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
};

exports.uploadUserImage = (req, res) => {
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
            return res.status(500).json(error);
        }
    })
    busboy.end(req.rawBody);
};

exports.getUserInfo = async (req, res) => {
    try {
        const userInfo = {};

        const userData = await db.doc(`/users/${req.params.username}`).get();
        if (!userData.exists) {
            return res.status(404).json('User not found');
        }
        userInfo.details = userData.data();
        userInfo.posts = [];

        const userPosts = await db.collection('posts').where('username', '==', req.params.username).orderBy('createdAt', 'desc').get();
        userPosts.forEach(post => userInfo.posts.push(post.data()));

        return res.json(userInfo);
    } catch (error) {
        return res.status(500).json(error);
    }

}