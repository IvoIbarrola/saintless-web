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
- Las zonas de envío de referencia y los puntos gratuitos de retiro se configuran
  desde el panel `admin.html`; sus valores predeterminados están en `config.js`.
  La tienda estima el costo con el rango postal configurado y muestra los puntos
  de retiro disponibles.
- Las imágenes existentes se sirven desde `imgs/`. `Encabezado.jpg` se usa como
  imagen principal y `logo-Photoroom.png` como marca.

El panel `admin.html`, el tema elegido, el catálogo editado y las compras simuladas
usan `localStorage` del navegador. No hay autenticación, backend ni sincronización
entre dispositivos. Las compras son ficticias: no se capturan datos de tarjeta ni
se realiza ningún cobro. Los datos de contacto de los pedidos de demostración se
guardan localmente; el panel solo ofrece abrir WhatsApp con un mensaje precompletado
cuando el administrador elige hacerlo. No hay chat integrado ni envío automático.
Las tarifas postales son referencias locales, no cotizaciones de correo.

Las tarjetas de producto toman como referencia la interacción "Product Card" de
21st.dev (resplandor sensible al puntero, inclinación leve y movimiento de imagen),
adaptada al CSS/JavaScript nativo del proyecto. Las animaciones de entrada respetan
la preferencia de movimiento reducido del sistema.
