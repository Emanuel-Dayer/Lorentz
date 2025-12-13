import Phaser from "phaser";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  setDoc,
  doc,
  addDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  getDoc,
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signInWithPopup,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCRxNBeHtepDaBs9LuKAeYeRm_V1EEgus0",
  authDomain: "lorentz-login-highscore.firebaseapp.com",
  databaseURL: "https://lorentz-login-highscore-default-rtdb.firebaseio.com",
  projectId: "lorentz-login-highscore",
  storageBucket: "lorentz-login-highscore.firebasestorage.app",
  messagingSenderId: "567772805964",
  appId: "1:567772805964:web:261ed50f203a07b515ede9"
};

export default class FirebasePlugin extends Phaser.Plugins.BasePlugin {
  constructor(pluginManager) {
    super(pluginManager);
    const app = initializeApp(firebaseConfig);
    this.db = getFirestore(app);
    this.auth = null;
    this.authInitialized = false;
    this.onLoggedInCallback = () => {};

    // Inicializar Auth solo si hay conexión. Evita que el SDK intente peticiones al iniciar offline.
    const tryInitAuth = () => {
      try {
        if (!this.authInitialized) {
          this.auth = getAuth(app);
          this.authInitialized = true;
          this.authStateChangedUnsubscribe = onAuthStateChanged(this.auth, (user) => {
            if (user && this.onLoggedInCallback) this.onLoggedInCallback();
          });
        }
      } catch (e) {
        // Silence initialization errors when offline
        console.warn('Firebase Auth init deferred or failed:', e?.message || e);
      }
    };

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      tryInitAuth();
    } else if (typeof window !== 'undefined') {
      // Esperar hasta que volvamos online
      window.addEventListener('online', () => tryInitAuth(), { once: true });
    }
  }

  destroy() {
    if (this.authStateChangedUnsubscribe) this.authStateChangedUnsubscribe();
    super.destroy();
  }

  onLoggedIn(callback) {
    this.onLoggedInCallback = callback;
  }

  async saveGameData(userId, data) {
    await setDoc(doc(this.db, "game-data", userId), data);
  }

  async loadGameData(userId) {
    const snap = await getDoc(doc(this.db, "game-data", userId));
    return snap.data();
  }

  async createUserWithEmail(email, password) {
    if (!this.authInitialized) throw new Error('Auth not initialized');
    const credentials = await createUserWithEmailAndPassword(this.auth, email, password);
    return credentials.user;
  }

  async signInWithEmail(email, password) {
    if (!this.authInitialized) throw new Error('Auth not initialized');
    const credentials = await signInWithEmailAndPassword(this.auth, email, password);
    return credentials.user;
  }

  async signInAnonymously() {
    if (!this.authInitialized) throw new Error('Auth not initialized');
    const credentials = await signInAnonymously(this.auth);
    return credentials.user;
  }

  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    if (!this.authInitialized) throw new Error('Auth not initialized');
    const credentials = await signInWithPopup(this.auth, provider);
    return credentials.user;
  }

  async signInWithGithub() {
    const provider = new GithubAuthProvider();
    if (!this.authInitialized) throw new Error('Auth not initialized');
    const credentials = await signInWithPopup(this.auth, provider);
    const user = credentials.user;
    
    // Obtener el GitHub ID desde providerData
    const githubProviderData = user.providerData.find(
      (pd) => pd.providerId === 'github.com'
    );

    if (githubProviderData) {
      const githubId = githubProviderData.uid;
      try {
        // Llamar a la API de GitHub para obtener el username
        const response = await fetch(`https://api.github.com/user/${githubId}`, {
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          // Guardar el login (username) real de GitHub
          user.githubUsername = userData.login;
        }
      } catch (error) {
        console.warn('Error obteniendo username de GitHub:', error);
      }
    }
    
    return user;
  }

  getUser() {
    return this.authInitialized && this.auth ? this.auth.currentUser : null;
  }

  async addHighScore(name, score, uid = null) {
    const payload = {
      name,
      score,
      createdAt: new Date(),
    };
    if (uid) payload.uid = uid;
    await addDoc(collection(this.db, "high-scores"), payload);
  }

  async getHighScores() {
    const q = query(
      collection(this.db, "high-scores"),
      orderBy("score", "desc"),
      limit(10)
    );
    const querySnapshot = await getDocs(q);
    const scores = [];
    querySnapshot.forEach((d) => {
      scores.push(d.data());
    });

    return scores;
  }

  // Devuelve el siguiente número libre para nombres AnonX buscando en la colección game-data
  async getNextAnonNumber() {
    try {
      const q = query(collection(this.db, "game-data"));
      const snapshot = await getDocs(q);
      const anonNumbers = [];
      snapshot.forEach((d) => {
        const name = d.data()?.displayName;
        if (name && typeof name === 'string' && name.startsWith('Anon')) {
          const n = parseInt(name.replace('Anon', ''));
          if (!isNaN(n)) anonNumbers.push(n);
        }
      });

      if (anonNumbers.length === 0) return 1;
      let nextNum = 1;
      while (anonNumbers.includes(nextNum)) nextNum++;
      return nextNum;
    } catch (e) {
      // Si no podemos leer la colección (p. ej. permission-denied), no mostramos un error ruidoso.
      // Devolver -1 indica al llamador que no fue posible calcular un número único global.
      return -1;
    }
  }
}