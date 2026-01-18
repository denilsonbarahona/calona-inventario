# Calona - Sistema de Gestión de Inventario

Sistema completo de gestión de inventario para bodegas y sucursales desarrollado con Next.js y Firebase.

## Características

- **Gestión de Bodegas**: Crear y administrar bodegas
- **Gestión de Sucursales**: Crear sucursales y asignarlas a bodegas
- **Gestión de Usuarios**: Crear usuarios con roles (Admin, Manager, Cajero) y asignarlos a sucursales
- **Gestión de Productos**: Crear productos con variaciones (talla, color, tamaño) e imágenes
- **Inventario**: Gestionar inventario en bodegas y sucursales
- **Transferencias**: Transferir productos de bodegas a sucursales
- **Ventas**: Sistema de punto de venta con carrito
- **Reportes**: 
  - Reporte de ventas por fecha
  - Reporte de ingresos
  - Reporte de ganancias
  - Reporte de transferencias

## Tecnologías

- Next.js 14+ (App Router)
- Firebase (Auth, Firestore, Storage)
- Tailwind CSS
- TypeScript

## Configuración

1. Clona el repositorio
2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
FIREBASE_API_KEY=tu_api_key
FIREBASE_AUTH_DOMAIN=tu_auth_domain
FIREBASE_PROJECT_ID=tu_project_id
FIREBASE_STORAGE_BUCKET=tu_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
FIREBASE_APP_ID=tu_app_id
```

   O copia el archivo `.env.example` a `.env.local` y completa los valores.

4. Configura Firebase:
   - Crea un proyecto en Firebase Console
   - Habilita Authentication (Email/Password)
   - Crea una base de datos Firestore
   - Configura Storage para imágenes

5. Ejecuta el proyecto:
```bash
npm run dev
```

## Estructura de Roles

- **Admin**: Acceso total al sistema
- **Manager**: Puede transferir inventario, vender y ver reportes
- **Cajero**: Solo puede realizar ventas

## Flujo de Trabajo

1. **Crear Bodegas**: El admin crea bodegas donde se almacenará el inventario
2. **Crear Sucursales**: El admin crea sucursales y puede asociarlas a bodegas
3. **Crear Productos**: Admin o Manager crean productos con sus variaciones e imágenes
4. **Agregar Inventario a Bodega**: 
   - Navega a "Inventario" > "Inventario Bodegas"
   - Selecciona una bodega
   - Haz clic en "Agregar Producto" (o navega a `/dashboard/inventory/warehouse/add`)
   - Selecciona producto, variación (si aplica), cantidad, precio de compra y precio de venta
   - Los precios se definen aquí y se usan para calcular ganancias en las ventas
5. **Transferir a Sucursal**: Admin o Manager transfieren productos de bodega a sucursal (reduce bodega, aumenta sucursal)
6. **Vender**: Admin, Manager o Cajero pueden vender productos desde las sucursales (reduce inventario de sucursal)
7. **Ver Reportes**: Admin y Manager pueden ver reportes de ventas, ganancias y transferencias

## Notas Importantes

- Los precios (compra y venta) se definen al agregar productos a la bodega
- Las transferencias reducen el inventario de bodega y aumentan el de sucursal
- Las ventas reducen el inventario de la sucursal
- Las ganancias se calculan usando el precio de compra almacenado en la bodega
