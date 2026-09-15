const firebaseConfig = {
  apiKey: "AIzaSyDEXxPyNOdxF9sT4t-XtO6iym7VVcPyNNU",
  authDomain: "threadcrm-a354a.firebaseapp.com",
  projectId: "threadcrm-a354a",
  storageBucket: "threadcrm-a354a.firebasestorage.app",
  messagingSenderId: "403487832457",
  appId: "1:403487832457:web:92e56baeb1b4401aa04958"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();