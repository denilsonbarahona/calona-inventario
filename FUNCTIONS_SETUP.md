# Configuración de Cloud Functions

## Pasos para configurar y desplegar

### 1. Configurar el proyecto de Firebase

Edita el archivo `.firebaserc` y reemplaza `TU_PROJECT_ID_AQUI` con tu `FIREBASE_PROJECT_ID` (el mismo que tienes en tu `.env.local`).

O ejecuta este comando desde la raíz del proyecto:

```bash
firebase use --add
```

Esto te pedirá que selecciones tu proyecto de Firebase.

### 2. Instalar dependencias de Functions

```bash
cd functions
npm install
```

### 3. Compilar las funciones

```bash
cd functions
npm run build
```

### 4. Desplegar las funciones

Desde la raíz del proyecto:

```bash
firebase deploy --only functions
```

O desde la carpeta functions:

```bash
cd functions
npm run deploy
```

## Solución de problemas

### Error: "No currently active project"

1. Ejecuta: `firebase use --add`
2. Selecciona tu proyecto de la lista
3. O edita `.firebaserc` manualmente con tu `projectId`

### Error: "Failed to list Firebase projects"

1. Verifica que estés logueado: `firebase login`
2. Verifica tu conexión a internet
3. Intenta de nuevo: `firebase projects:list`

### Error al desplegar

Asegúrate de que:
- ✅ Estás en la raíz del proyecto (donde está `firebase.json`)
- ✅ El proyecto está configurado en `.firebaserc`
- ✅ Las dependencias están instaladas en `functions/`
- ✅ Las funciones compilaron correctamente (`functions/lib/` existe)
