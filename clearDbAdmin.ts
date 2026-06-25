import * as admin from 'firebase-admin';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8')).firebaseConfig;

admin.initializeApp({
  credential: admin.credential.applicationDefault(), // Wait, applicationDefault requires GOOGLE_APPLICATION_CREDENTIALS. Let's see if we have credentials.
});
