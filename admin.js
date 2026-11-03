const PRODUCT_KEY = "saintlessProducts";
const ORDER_KEY = "saintlessDemoOrders";
const PRODUCT_DEFAULTS = window.SAINTLESS_PRODUCTS;
const productEditor = document.querySelector("#product-editor");
const productForm = document.querySelector("#product-form");
const toast = document.querySelector("#admin-toast");
let toastTimer;

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
    return `<article class="recent-order">
      <span class="order-symbol" aria-hidden="true">S.</span>
      <span class="order-description"><strong>${escapeHTML(order.id)}</strong><small>${formattedDate} · ${escapeHTML(order.delivery === "pickup" ? "Retiro gratis" : "Envío")}</small></span>
      <b>${formatPrice(Number(order.total || 0))}</b>
    </article>`;
  }).join("");
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
window.addEventListener("storage", (event) => {
  if (event.key === PRODUCT_KEY || event.key === ORDER_KEY) renderDashboard();
  if (event.key === "saintlessTheme" && event.newValue) updateTheme(event.newValue);
});

fillImageSelect();
updateTheme(localStorage.getItem("saintlessTheme") || "light");
renderDashboard();
