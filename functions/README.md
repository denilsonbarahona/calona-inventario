# Firebase Cloud Functions

## Instalación

```bash
cd functions
npm install
```

## Desarrollo Local

```bash
npm run serve
```

## Desplegar

```bash
npm run deploy
```

## Función: createUser

Crea un nuevo usuario en Firebase Auth y Firestore sin cambiar la sesión actual del admin.

**Requisitos:**
- El usuario debe estar autenticado
- El usuario debe tener rol de "admin"

**Parámetros:**
- `email`: Email del nuevo usuario
- `password`: Contraseña del nuevo usuario
- `name`: Nombre del nuevo usuario
- `role`: Rol del nuevo usuario ("admin", "manager", "cashier")
- `branchId`: (Opcional) ID de la sucursal asignada
