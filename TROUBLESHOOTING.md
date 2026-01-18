# Solución de Problemas - Error 404 en Rutas

## Problema: Todas las rutas del dashboard dan 404 excepto `/dashboard` y `/login`

### Soluciones a probar:

1. **Reiniciar el servidor de desarrollo**
   ```bash
   # Detén el servidor (Ctrl+C)
   # Elimina la carpeta .next
   rm -rf .next
   # Reinicia el servidor
   npm run dev
   ```

2. **Verificar que las rutas existan**
   - Las rutas deben estar en `app/(dashboard)/[ruta]/page.tsx`
   - Por ejemplo: `app/(dashboard)/clients/page.tsx` para `/dashboard/clients`

3. **Verificar el layout**
   - El layout en `app/(dashboard)/layout.tsx` no debe bloquear el renderizado
   - Asegúrate de que retorne el contenido incluso durante la carga

4. **Limpiar caché del navegador**
   - Presiona `Ctrl+Shift+R` (o `Cmd+Shift+R` en Mac) para hacer hard refresh
   - O abre en modo incógnito

5. **Verificar la consola del navegador**
   - Abre las herramientas de desarrollador (F12)
   - Revisa la pestaña Console y Network para ver errores

6. **Verificar que estés autenticado**
   - Las rutas del dashboard requieren autenticación
   - Si no estás autenticado, serás redirigido a `/login`

### Rutas que deberían funcionar:

- `/dashboard` - Dashboard principal
- `/dashboard/clients` - Clientes
- `/dashboard/warehouses` - Bodegas
- `/dashboard/branches` - Sucursales
- `/dashboard/products` - Productos
- `/dashboard/users` - Usuarios
- `/dashboard/sales` - Ventas
- `/dashboard/reports` - Reportes
- `/dashboard/profile` - Perfil

### Si el problema persiste:

1. Verifica que el servidor esté corriendo en `http://localhost:3000`
2. Revisa los logs del servidor para ver si hay errores
3. Asegúrate de que todas las dependencias estén instaladas: `npm install`
