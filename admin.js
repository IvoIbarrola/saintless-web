const PRODUCT_KEY = "saintlessProducts";
const ORDER_KEY = "saintlessDemoOrders";
const CONFIG_KEY = "saintlessStoreConfig";
const PRODUCT_DEFAULTS = window.SAINTLESS_PRODUCTS;
const CONFIG_DEFAULTS = window.SAINTLESS_DEFAULT_CONFIG;
const productEditor = document.querySelector("#product-editor");
const productForm = document.querySelector("#product-form");
const toast = document.querySelector("#admin-toast");
let toastTimer;
const configItemEditor = document.querySelector("#config-item-editor");
const configItemForm = document.querySelector("#config-item-form");

function getStoreConfig() {
  const saved = localStorage.getItem(CONFIG_KEY);
  const parsedValue = saved ? JSON.parse(saved) : {};
  const parsed = parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue) ? parsedValue : {};
  return {
    ...CONFIG_DEFAULTS,
    ...parsed,
    shippingZones: Array.isArray(parsed.shippingZones) ? parsed.shippingZones : CONFIG_DEFAULTS.shippingZones.map((zone) => ({ ...zone })),
    pickupPoints: Array.isArray(parsed.pickupPoints) ? parsed.pickupPoints : CONFIG_DEFAULTS.pickupPoints.map((point) => ({ ...point })),
    appearance: { ...CONFIG_DEFAULTS.appearance, ...(parsed.appearance || {}) },
  };
}

function saveStoreConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  renderStoreSettings(config);
}

function getProducts() {
  const saved = localStorage.getItem(PRODUCT_KEY);
  return saved ? JSON.parse(saved) : [...PRODUCT_DEFAULTS];
}

function saveProducts(products) {
  localStorage.setItem(PRODUCT_KEY, JSON.stringify(products));
  renderDashboard();
}

function getOrders() {
  return JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function formatPrice(value) {
  return `$ ${new Intl.NumberFormat("es-AR").format(value)}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function renderStats(products, orders) {
  const revenue = orders.reduce((total, order) => total + Number(order.total || 0), 0);
  document.querySelector("#stat-products").textContent = String(products.length).padStart(2, "0");
  document.querySelector("#stat-orders").textContent = String(orders.length).padStart(2, "0");
  document.querySelector("#stat-revenue").textContent = formatPrice(revenue);
  document.querySelector("#stat-average").textContent = formatPrice(orders.length ? Math.round(revenue / orders.length) : 0);

  const counts = products.reduce((result, product) => {
    result.set(product.category, (result.get(product.category) || 0) + 1);
    return result;
  }, new Map());
  const maxCount = Math.max(1, ...counts.values());
  document.querySelector("#category-chart").innerHTML = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count], index) => `
      <div class="chart-row">
        <div class="chart-label"><span>${escapeHTML(category)}</span><strong>${count}</strong></div>
        <div class="chart-track"><span class="chart-bar" style="--bar-width:${Math.round((count / maxCount) * 100)}%;--bar-delay:${index * 80}ms"></span></div>
      </div>
    `).join("");
}

function renderOrders(orders) {
  const recentOrders = [...orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  document.querySelector("#orders-empty").hidden = recentOrders.length > 0;
  document.querySelector("#recent-orders").innerHTML = recentOrders.map((order) => {
    const date = new Date(order.date);
    const formattedDate = Number.isNaN(date.valueOf())
      ? "Fecha no disponible"
      : new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(date);
    const customer = order.customer || {};
    const whatsappHref = configureContactMessage(order);
    return `<article class="recent-order">
      <span class="order-symbol" aria-hidden="true">S.</span>
      <span class="order-description"><strong>${escapeHTML(customer.name || order.id)}</strong><small>${escapeHTML(order.id)} · ${formattedDate} · ${escapeHTML(order.delivery === "pickup" ? "Retiro gratis" : "Envío")}</small></span>
      <span class="order-contact">
        <b>${formatPrice(Number(order.total || 0))}</b>
        ${whatsappHref ? `<a class="whatsapp-contact" href="${whatsappHref}" target="_blank" rel="noopener noreferrer" aria-label="Contactar a ${escapeHTML(customer.name || "cliente")} por WhatsApp">WhatsApp ↗</a>` : `<small class="contact-unavailable">${customer.phone ? "Revisá el teléfono" : "Sin teléfono"}</small>`}
      </span>
    </article>`;
  }).join("");
}

function renderStoreSettings(config = getStoreConfig()) {
  const { appearance } = config;
  if (/^#[\da-f]{6}$/i.test(appearance.primaryColor || "")) {
    document.body.style.setProperty("--wine", appearance.primaryColor);
  }
  if (/^#[\da-f]{6}$/i.test(appearance.accentColor || "")) {
    document.body.style.setProperty("--red", appearance.accentColor);
  }
  document.querySelector("#setting-theme").value = appearance.defaultTheme;
  document.querySelector("#setting-announcement").value = appearance.announcement;
  document.querySelector("#setting-primary").value = appearance.primaryColor;
  document.querySelector("#setting-accent").value = appearance.accentColor;
  document.querySelector("#setting-motion").checked = Boolean(appearance.motion);
  renderConfigList("shipping-zone-list", config.shippingZones, "zone");
  renderConfigList("pickup-point-list", config.pickupPoints, "pickup");
}

function renderConfigList(targetId, items, type) {
  const target = document.querySelector(`#${targetId}`);
  if (!items.length) {
    target.innerHTML = '<p class="config-list-empty">Todavía no hay opciones configuradas.</p>';
    return;
  }
  target.innerHTML = items.map((item) => {
    const details = type === "zone"
      ? `CP ${item.postalStart}–${item.postalEnd} · ${formatPrice(Number(item.price))}`
      : item.detail;
    return `<article class="config-list-item">
      <span class="config-item-copy"><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(details)}</small></span>
      <span class="config-item-actions">
        <button type="button" data-config-edit="${escapeHTML(item.id)}" data-config-type="${type}">Editar</button>
        <button type="button" data-config-delete="${escapeHTML(item.id)}" data-config-type="${type}" ${type === "pickup" && items.length === 1 ? "disabled" : ""}>Eliminar</button>
      </span>
    </article>`;
  }).join("");
}

function openConfigEditor(type, item = null) {
  configItemForm.reset();
  document.querySelector("#config-item-error").textContent = "";
  document.querySelector("#config-item-type").value = type;
  document.querySelector("#config-item-id").value = item?.id || "";
  document.querySelector("#config-item-title").textContent = item ? "Editar opción" : type === "zone" ? "Nueva zona" : "Nuevo punto de retiro";
  document.querySelector("#config-item-name").value = item?.name || "";
  document.querySelector("#config-postal-start").value = item?.postalStart ?? "";
  document.querySelector("#config-postal-end").value = item?.postalEnd ?? "";
  document.querySelector("#config-shipping-price").value = item?.price ?? "";
  document.querySelector("#config-pickup-detail").value = item?.detail || "";
  document.querySelectorAll(".config-zone-fields").forEach((field) => { field.hidden = type !== "zone"; });
  document.querySelectorAll(".config-pickup-fields").forEach((field) => { field.hidden = type !== "pickup"; });
  document.querySelector("#config-postal-start").required = type === "zone";
  document.querySelector("#config-postal-end").required = type === "zone";
  document.querySelector("#config-shipping-price").required = type === "zone";
  document.querySelector("#config-pickup-detail").required = type === "pickup";
  configItemEditor.showModal();
  document.querySelector("#config-item-name").focus();
}

function configureContactMessage(order) {
  const customer = order.customer || {};
  const phone = String(customer.phone || "").replace(/\D/g, "");
  if (phone.length < 10 || phone.length > 15) return "";
  const greetingName = customer.name ? ` ${customer.name}` : "";
  const items = Array.isArray(order.items)
    ? order.items.map((item) => `${Number(item.quantity) || 1} × ${item.name}`).join(", ")
    : "";
  const message = `Hola${greetingName}, te contacto por tu pedido de demostración ${order.id} en Saintless.${items ? ` Productos: ${items}.` : ""} ¿Coordinamos la entrega?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function renderProductRows() {
  const products = getProducts();
  const search = document.querySelector("#product-search").value.trim().toLocaleLowerCase("es");
  const visible = products.filter((product) =>
    `${product.name} ${product.category}`.toLocaleLowerCase("es").includes(search),
  );
  document.querySelector("#products-empty").hidden = visible.length > 0;
  document.querySelector("#admin-product-list").innerHTML = visible.map((product) => `
    <tr>
      <td><span class="table-product"><img src="${escapeHTML(product.image)}" alt="" /><span><strong>${escapeHTML(product.name)}</strong><small>${escapeHTML(product.caption || "Accesorio Saintless")}</small></span></span></td>
      <td>${escapeHTML(product.category)}</td>
      <td class="table-price">${formatPrice(Number(product.price))}</td>
      <td>${product.tag ? `<span class="table-tag">${escapeHTML(product.tag)}</span>` : '<span class="table-no-tag">—</span>'}</td>
      <td><span class="table-actions"><button type="button" data-edit="${escapeHTML(product.id)}">Editar</button><button type="button" data-delete="${escapeHTML(product.id)}" aria-label="Eliminar ${escapeHTML(product.name)}">Eliminar</button></span></td>
    </tr>
  `).join("");
}

function renderDashboard() {
  const products = getProducts();
  const orders = getOrders();
  renderStats(products, orders);
  renderOrders(orders);
  renderProductRows();
}

function fillImageSelect() {
  const images = [...new Set(PRODUCT_DEFAULTS.map((product) => product.image))];
  document.querySelector("#edit-product-image").innerHTML = images
    .map((image) => `<option value="${escapeHTML(image)}">${escapeHTML(image.replace("imgs/", ""))}</option>`)
    .join("");
}

function openEditor(product = null) {
  productForm.reset();
  document.querySelector("#editor-error").textContent = "";
  document.querySelector("#edit-product-id").value = product?.id || "";
  document.querySelector("#editor-title").textContent = product ? "Editar producto" : "Agregar producto";
  document.querySelector("#edit-product-name").value = product?.name || "";
  document.querySelector("#edit-product-category").value = product?.category || "";
  document.querySelector("#edit-product-price").value = product?.price || "";
  document.querySelector("#edit-product-image").value = product?.image || PRODUCT_DEFAULTS[0].image;
  document.querySelector("#edit-product-alt").value = product?.alt || "";
  document.querySelector("#edit-product-tag").value = product?.tag || "";
  document.querySelector("#edit-product-caption").value = product?.caption || "";
  productEditor.showModal();
  document.querySelector("#edit-product-name").focus();
}

function updateTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem("saintlessTheme", theme);
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    const dark = theme === "dark";
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", dark ? "Activar modo claro" : "Activar modo oscuro");
    button.querySelector(".theme-label").textContent = dark ? "Modo claro" : "Modo oscuro";
  });
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#121211" : "#f4f1ed";
}

document.querySelector("#add-product").addEventListener("click", () => openEditor());
document.querySelector("#close-editor").addEventListener("click", () => productEditor.close());
document.querySelector("#cancel-editor").addEventListener("click", () => productEditor.close());
productEditor.addEventListener("click", (event) => {
  if (event.target === productEditor) productEditor.close();
});

productForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const products = getProducts();
  const previousId = document.querySelector("#edit-product-id").value;
  const name = document.querySelector("#edit-product-name").value.trim();
  const category = document.querySelector("#edit-product-category").value.trim();
  const price = Number(document.querySelector("#edit-product-price").value);
  const image = document.querySelector("#edit-product-image").value;
  const alt = document.querySelector("#edit-product-alt").value.trim();
  const caption = document.querySelector("#edit-product-caption").value.trim();
  const tag = document.querySelector("#edit-product-tag").value.trim();
  if (!name || !category || !Number.isFinite(price) || price <= 0 || !alt) {
    document.querySelector("#editor-error").textContent = "Completá nombre, categoría, precio válido y descripción de imagen.";
    return;
  }
  const id = previousId || `saintless-${crypto.randomUUID()}`;
  const product = { id, name, category, price, image, alt, caption, ...(tag ? { tag } : {}) };
  const index = products.findIndex((item) => item.id === previousId);
  if (index >= 0) products[index] = product;
  else products.unshift(product);
  saveProducts(products);
  productEditor.close();
  showToast(previousId ? "Producto actualizado." : "Producto agregado al catálogo.");
});

document.querySelector("#admin-product-list").addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) {
    const product = getProducts().find((item) => item.id === editButton.dataset.edit);
    if (product) openEditor(product);
    return;
  }
  if (deleteButton) {
    const products = getProducts();
    const filtered = products.filter((item) => item.id !== deleteButton.dataset.delete);
    if (filtered.length === products.length) return;
    saveProducts(filtered);
    showToast("Producto eliminado del catálogo.");
  }
});

document.querySelector("#product-search").addEventListener("input", renderProductRows);
document.querySelector("#clear-demo-orders").addEventListener("click", () => {
  if (!getOrders().length) {
    showToast("No hay compras de prueba para borrar.");
    return;
  }
  if (!window.confirm("¿Borrar las compras simuladas de este navegador?")) return;
  localStorage.setItem(ORDER_KEY, "[]");
  renderDashboard();
  showToast("Se borraron las compras simuladas.");
});
document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
  button.addEventListener("click", () => updateTheme(document.body.dataset.theme === "dark" ? "light" : "dark"));
});
document.querySelector("#settings-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const config = getStoreConfig();
  config.appearance = {
    ...config.appearance,
    defaultTheme: document.querySelector("#setting-theme").value,
    announcement: document.querySelector("#setting-announcement").value.trim(),
    primaryColor: document.querySelector("#setting-primary").value,
    accentColor: document.querySelector("#setting-accent").value,
    motion: document.querySelector("#setting-motion").checked,
  };
  if (!config.appearance.announcement) {
    document.querySelector("#setting-announcement").focus();
    showToast("Escribí un mensaje para la franja superior.");
    return;
  }
  saveStoreConfig(config);
  updateTheme(config.appearance.defaultTheme);
  showToast("Personalización guardada para esta tienda local.");
});
document.querySelector("#add-shipping-zone").addEventListener("click", () => openConfigEditor("zone"));
document.querySelector("#add-pickup-point").addEventListener("click", () => openConfigEditor("pickup"));
document.querySelector("#close-config-editor").addEventListener("click", () => configItemEditor.close());
document.querySelector("#cancel-config-editor").addEventListener("click", () => configItemEditor.close());
configItemEditor.addEventListener("click", (event) => {
  if (event.target === configItemEditor) configItemEditor.close();
});
configItemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const type = document.querySelector("#config-item-type").value;
  const id = document.querySelector("#config-item-id").value;
  const name = document.querySelector("#config-item-name").value.trim();
  const config = getStoreConfig();
  const items = type === "zone" ? config.shippingZones : config.pickupPoints;
  let item;
  if (type === "zone") {
    const postalStart = Number(document.querySelector("#config-postal-start").value);
    const postalEnd = Number(document.querySelector("#config-postal-end").value);
    const price = Number(document.querySelector("#config-shipping-price").value);
    if (!name || !Number.isInteger(postalStart) || !Number.isInteger(postalEnd) || postalStart < 0 || postalEnd > 9999 || postalStart > postalEnd || !Number.isFinite(price) || price < 0) {
      document.querySelector("#config-item-error").textContent = "Revisá el nombre, el rango de códigos postales y el costo.";
      return;
    }
    const overlaps = items.some((zone) =>
      zone.id !== id && postalStart <= Number(zone.postalEnd) && postalEnd >= Number(zone.postalStart),
    );
    if (overlaps) {
      document.querySelector("#config-item-error").textContent = "Este rango se superpone con otra zona. Usá un rango distinto.";
      return;
    }
    item = { id: id || `zone-${crypto.randomUUID()}`, name, postalStart, postalEnd, price };
  } else {
    const detail = document.querySelector("#config-pickup-detail").value.trim();
    if (!name || !detail) {
      document.querySelector("#config-item-error").textContent = "Completá el nombre, la ubicación y la fecha del punto.";
      return;
    }
    item = { id: id || `pickup-${crypto.randomUUID()}`, name, detail };
  }
  const existingIndex = items.findIndex((entry) => entry.id === id);
  if (existingIndex >= 0) items[existingIndex] = item;
  else items.push(item);
  if (type === "zone") config.shippingZones = items;
  else config.pickupPoints = items;
  saveStoreConfig(config);
  configItemEditor.close();
  showToast(type === "zone" ? "Zona de envío guardada." : "Punto de retiro guardado.");
});
for (const listId of ["shipping-zone-list", "pickup-point-list"]) {
  document.querySelector(`#${listId}`).addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-config-edit]");
    const deleteButton = event.target.closest("[data-config-delete]");
    const type = (editButton || deleteButton)?.dataset.configType;
    if (!type) return;
    const config = getStoreConfig();
    const items = type === "zone" ? config.shippingZones : config.pickupPoints;
    if (editButton) {
      const item = items.find((entry) => entry.id === editButton.dataset.configEdit);
      if (item) openConfigEditor(type, item);
      return;
    }
    if (type === "pickup" && items.length === 1) {
      showToast("Dejá al menos un punto de retiro disponible.");
      return;
    }
    if (!window.confirm("¿Eliminar esta opción de entrega?")) return;
    const filtered = items.filter((entry) => entry.id !== deleteButton.dataset.configDelete);
    if (type === "zone") config.shippingZones = filtered;
    else config.pickupPoints = filtered;
    saveStoreConfig(config);
    showToast("Opción de entrega eliminada.");
  });
}
window.addEventListener("storage", (event) => {
  if (event.key === PRODUCT_KEY || event.key === ORDER_KEY) renderDashboard();
  if (event.key === "saintlessTheme" && event.newValue) updateTheme(event.newValue);
  if (event.key === CONFIG_KEY) renderStoreSettings();
});

fillImageSelect();
renderStoreSettings();
updateTheme(localStorage.getItem("saintlessTheme") || getStoreConfig().appearance.defaultTheme || "light");
renderDashboard();
