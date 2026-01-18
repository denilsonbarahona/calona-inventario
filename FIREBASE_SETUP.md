# Configuración de Firebase

## Solución al error "CONFIGURATION_NOT_FOUND"

Este error ocurre cuando Firebase Authentication no está correctamente configurado. Sigue estos pasos:

### 1. Verificar que Firebase Authentication esté habilitado

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Authentication** en el menú lateral
4. Si no está habilitado, haz clic en **Get Started**
5. En la pestaña **Sign-in method**, habilita **Email/Password**
   - Haz clic en **Email/Password**
   - Activa el toggle
   - Haz clic en **Save**

### 2. Verificar las variables de entorno

Asegúrate de que tu archivo `.env.local` tenga todas las variables correctas:

```env
FIREBASE_API_KEY=tu_api_key_aqui
FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu_project_id
FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
FIREBASE_APP_ID=tu_app_id
```

### 3. Obtener las credenciales de Firebase

1. En Firebase Console, ve a **Project Settings** (ícono de engranaje)
2. Baja hasta **Your apps**
3. Si no tienes una app web, haz clic en **Add app** > **Web** (ícono `</>`)
4. Copia las credenciales del objeto `firebaseConfig`
5. Pega los valores en tu `.env.local`

**Ejemplo de configuración:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyASaYNHlYV3d7KV_Vc9O-lpQKyu6niqWRw",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

**En tu `.env.local` debe quedar así:**
```env
FIREBASE_API_KEY=AIzaSyASaYNHlYV3d7KV_Vc9O-lpQKyu6niqWRw
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 4. Reiniciar el servidor de desarrollo

Después de actualizar `.env.local`, **debes reiniciar el servidor**:

```bash
# Detén el servidor (Ctrl+C)
# Luego inícialo de nuevo
npm run dev
```

### 5. Verificar que las variables se estén leyendo

El código ahora mostrará errores en la consola si faltan variables. Revisa la consola del navegador y del servidor.

### Problemas comunes

- **"CONFIGURATION_NOT_FOUND"**: Authentication no está habilitado o el `authDomain` es incorrecto
- **Variables no se leen**: Reinicia el servidor después de cambiar `.env.local`
- **Error en el cliente**: Verifica que `next.config.mjs` esté exportando las variables en `env`

### Verificación rápida

1. ✅ Authentication > Sign-in method > Email/Password está habilitado
2. ✅ `.env.local` existe y tiene todas las variables
3. ✅ `next.config.mjs` exporta las variables en `env`
4. ✅ Servidor reiniciado después de cambios en `.env.local`
5. ✅ Las variables en `.env.local` coinciden con Firebase Console
