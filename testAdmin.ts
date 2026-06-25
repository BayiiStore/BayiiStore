import * as admin from 'firebase-admin';
admin.initializeApp({credential: admin.credential.applicationDefault()});
const db = admin.firestore();
console.log('Success');
