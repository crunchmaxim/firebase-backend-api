const admin = require('firebase-admin');
const db = admin.firestore();

exports.authMiddleware = async (req, res, next) => {
    try {
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            return res.status(400).json('Wrong token');
        }
        const token = req.headers.authorization.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userInfo = await db.collection('users').where('userId', '==', decodedToken.uid).limit(1).get();
        req.userData = {};
        req.userData.username = userInfo.docs[0].data().username;
        req.userData.imageUrl = userInfo.docs[0].data().imageUrl;
        next();

    } catch (error) {
        return res.status(500).json(error);
    }
};
