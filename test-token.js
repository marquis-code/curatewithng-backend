"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
dotenv.config();
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
async function test() {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
        privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
        if (!(0, app_1.getApps)().length) {
            (0, app_1.initializeApp)({
                credential: (0, app_1.cert)({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
        }
        console.log('App initialized successfully');
        const token = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjJmMjk1MGEyNGFlYWRkMjYzYzIxM2I2MDNhZjMxNWEzMjdiNmM3MjAiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiYWJhaCBtYXJxdWlzIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0lrN0ZvT1FUeDBpcjBvWFRnV1JrbUstalpLRU1heE9kTHlmUDJCRTRmbi1OWFBUOGtiPXM5Ni1jIiwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL2N1cmF0ZXdpdGhuZyIsImF1ZCI6ImN1cmF0ZXdpdGhuZyIsImF1dGhfdGltZSI6MTc4MjIzNjAzMCwidXNlcl9pZCI6Ik00ZnJONHM5ZktaU3ZhU3VoYzVKbmlyN2VMcjEiLCJzdWIiOiJNNGZyTjRzOWZLWlN2YVN1aGM1Sm5pcjdlTHIxIiwiaWF0IjoxNzgyMjM2MDMwLCJleHAiOjE3ODIyMzk2MzAsImVtYWlsIjoiYWJhaG1hcnF1aXNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTA1OTM3MjU1Mjk5MTIzMzY2ODciXSwiZW1haWwiOlsiYWJhaG1hcnF1aXNAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.Q6dek3jmGTbhrC0Z10a3tjEvTb4EkP-ch71IBQ5ppMIH3BSK2_Fwc5YiAPsoU_EPmh77_7xK-XfjLc6NxhwRp6TwLMngDUnmQZPj5WKtxT8R-l_P6RYOZKadffFhH9vJIceafCvV0NOOIGWuiI05kYBrxcQF2HGipcKIM5NGWZokU8DjuVhBGjMaggqAwG7FBrsTK3Frl4gzlmh73nakjlTkM-vQTUGQame4KSAb3ZgU-w7wV5rtlbmPdEIlNg-eX-B5hzWAPDejPi8BiifDpjqmtYeBTG0-DPDjqZbwVYlshKYTN-grlUgZ6zDcEGyiprkA5hu4WkmEUqfXNCcqQA";
        const decoded = await (0, auth_1.getAuth)().verifyIdToken(token);
        console.log('Token verified successfully', decoded.email);
    }
    catch (error) {
        console.error('Error verifying token:', error);
    }
}
test();
//# sourceMappingURL=test-token.js.map