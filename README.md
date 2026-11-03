# Saintless

Sitio responsive de Saintless con catálogo, panel local de productos y estadísticas,
modo claro/oscuro, pago de demostración, filtros, carrito y retiro gratuito.

## Ver la tienda y el panel local

Desde la raíz del proyecto, iniciá un servidor estático:

```bash
python3 -m http.server 8000
```

Abrí `http://localhost:8000/` para la tienda y
`http://localhost:8000/admin.html` para el panel. No requiere dependencias de
aplicación ni un proceso de compilación.

## Contenido editable

- Los productos, nombres, categorías, precios de muestra y rutas de imágenes están
  definidos en `catalog.js`. El catálogo editable se comparte con `admin.html`.
- Los puntos de retiro de muestra (sin ubicación ni fecha confirmadas) se editan en
  el arreglo `pickupPoints` de `app.js`.
- Las tarifas mostradas son de referencia para CABA y GBA; se editan en
  `referenceRates` en `app.js`. Confirmá y reemplazá precios, zonas, ferias y fechas
  con los datos vigentes antes de publicar.
- Las imágenes existentes se sirven desde `imgs/`. `Encabezado.jpg` se usa como
  imagen principal y `logo-Photoroom.png` como marca.

El panel `admin.html`, el tema elegido, el catálogo editado y las compras simuladas
usan `localStorage` del navegador. No hay autenticación, backend ni sincronización
entre dispositivos. Las compras son ficticias: no se captura información de tarjeta,
no se transmite información personal y no se realiza ningún cobro. La tarifa postal
es una referencia local, no una cotización de correo.

Las tarjetas de producto toman como referencia la interacción "Product Card" de
21st.dev (resplandor sensible al puntero, inclinación leve y movimiento de imagen),
adaptada al CSS/JavaScript nativo del proyecto. Las animaciones de entrada respetan
la preferencia de movimiento reducido del sistema.
