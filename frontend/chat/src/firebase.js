import { initializeApp } from 'firebase/app';
import {getAuth} from 'firebase/auth';

//Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWSeJOGQjlIguO8Yw8Yt29d-eUdgDyRGk",
  authDomain: "websockets-ec8ac.firebaseapp.com",
  projectId: "websockets-ec8ac",
  storageBucket: "websockets-ec8ac.firebasestorage.app",
  messagingSenderId: "489520475890",
  appId: "1:489520475890:web:1102026161ee3f84f8aa6b",
  measurementId: "G-BWPYMK9HTG"
};

//Initialize Firebase
const app = initializeApp(firebaseConfig);

//initialize Firebase Authentication and get a reference to the service

export const auth = getAuth(app);
export default app;