import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Validar que todas las variables de entorno estén configuradas
const requiredEnvVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && typeof window === "undefined") {
  console.error('❌ Variables de entorno de Firebase faltantes:', missingVars.join(', '));
  console.error('💡 Asegúrate de tener un archivo .env.local con todas las variables configuradas');
}

if (typeof window !== "undefined") {
  // Validar en el cliente también - verificar que los valores no estén vacíos
  const configValues = Object.values(firebaseConfig);
  const hasEmptyValues = configValues.some(value => !value || value === '');
  if (hasEmptyValues) {
    console.error('❌ Algunas variables de entorno de Firebase están vacías');
    console.error('💡 Verifica que next.config.mjs esté exportando las variables en el objeto env');
    console.error('💡 Asegúrate de haber reiniciado el servidor después de actualizar .env.local');
    console.error('💡 Revisa FIREBASE_SETUP.md para más detalles');
  }
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (typeof window !== "undefined") {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (error: any) {
      console.error('❌ Error al inicializar Firebase:', error.message);
      console.error('💡 Verifica que todas las variables de entorno estén correctamente configuradas en .env.local');
      throw new Error('Error de configuración de Firebase. Verifica la consola para más detalles.');
    }
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { auth, db, storage };
