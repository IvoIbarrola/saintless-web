window.SAINTLESS_DEFAULT_CONFIG = {
  shippingZones: [
    { id: "caba", name: "CABA", postalStart: 1000, postalEnd: 1499, price: 3900 },
    { id: "gba", name: "GBA", postalStart: 1500, postalEnd: 1899, price: 5200 },
  ],
  pickupPoints: [
    { id: "feria-palermo", name: "Feria mensual · Punto 1", detail: "Ubicación y fecha a confirmar" },
    { id: "feria-san-telmo", name: "Feria mensual · Punto 2", detail: "Ubicación y fecha a confirmar" },
    { id: "feria-proxima", name: "Próxima feria", detail: "La fecha y el punto se coordinan por mensaje" },
  ],
  appearance: {
    defaultTheme: "light",
    primaryColor: "#4f0f1b",
    accentColor: "#a60321",
    announcement: "RETIRO GRATIS EN FERIAS · ENVÍO A COORDINAR",
    motion: true,
  },
};
