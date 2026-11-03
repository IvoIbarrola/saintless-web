const defaultProducts = window.SAINTLESS_PRODUCTS;
const savedProducts = localStorage.getItem("saintlessProducts");
const products = savedProducts ? JSON.parse(savedProducts) : [...defaultProducts];
if (!savedProducts) localStorage.setItem("saintlessProducts", JSON.stringify(products));

const CONFIG_KEY = "saintlessStoreConfig";
const defaultConfig = window.SAINTLESS_DEFAULT_CONFIG;
const storedConfig = localStorage.getItem(CONFIG_KEY);
const storedConfigValue = storedConfig ? JSON.parse(storedConfig) : {};
const parsedConfig = storedConfigValue && typeof storedConfigValue === "object" && !Array.isArray(storedConfigValue)
  ? storedConfigValue
  : {};
const storeConfig = {
  ...defaultConfig,
  ...parsedConfig,
  shippingZones: Array.isArray(parsedConfig.shippingZones) ? parsedConfig.shippingZones : defaultConfig.shippingZones,
  pickupPoints: Array.isArray(parsedConfig.pickupPoints) ? parsedConfig.pickupPoints : defaultConfig.pickupPoints,
  appearance: { ...defaultConfig.appearance, ...(parsedConfig.appearance || {}) },
};
const pickupPoints = storeConfig.pickupPoints;
const referenceRates = storeConfig.shippingZones;

const formatPrice = (value) => `$ ${new Intl.NumberFormat("es-AR").format(value)}`;
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character]);
const state = { category: "Todos", cart: new Map(), selectedPickup: pickupPoints[0]?.id || "", shippingEstimate: null };
const productGrid = document.querySelector("#product-grid");
const categoryOptions = document.querySelector("#category-options");
const productCount = document.querySelector("#product-count");
const emptyState = document.querySelector("#empty-state");
const minPrice = document.querySelector("#min-price");
const maxPrice = document.querySelector("#max-price");
const sortProducts = document.querySelector("#sort-products");
const cartDialog = document.querySelector("#cart-dialog");
const filterDialog = document.querySelector("#filter-dialog");
const toast = document.querySelector("#toast");
let toastTimeout;
let revealObserver;

function updateTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem("saintlessTheme", theme);
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    const dark = theme === "dark";
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", dark ? "Activar modo claro" : "Activar modo oscuro");
    const label = button.querySelector(".theme-label");
    if (label) label.textContent = dark ? "Modo claro" : "Modo oscuro";
  });
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#121211" : "#f4f1ed";
}

function updateAppearance() {
  const { primaryColor, accentColor, announcement } = storeConfig.appearance;
  if (/^#[\da-f]{6}$/i.test(primaryColor || "")) document.body.style.setProperty("--wine", primaryColor);
  if (/^#[\da-f]{6}$/i.test(accentColor || "")) document.body.style.setProperty("--red", accentColor);
  const announcementMessage = document.querySelector("#announcement-message");
  if (announcementMessage) announcementMessage.textContent = announcement;
}

function initializeMotion() {
  revealObserver?.disconnect();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealItems = document.querySelectorAll(".section-heading, .product-card, .delivery-card, .manifesto > *");
  document.body.classList.add("motion-ready");
  if (!storeConfig.appearance.motion || reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((element) => element.classList.add("is-visible"));
    return;
  }
  revealObserver = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });
  revealItems.forEach((element, index) => {
    if (element.classList.contains("product-card") || element.matches(".benefit-strip > div")) {
      element.style.setProperty("--reveal-delay", `${(index % 4) * 55}ms`);
    }
    revealObserver.observe(element);
  });
}

function renderCategories() {
  const categories = ["Todos", ...new Set(products.map((product) => product.category))];
  categoryOptions.innerHTML = categories.map((category) => {
    const count = category === "Todos" ? products.length : products.filter((product) => product.category === category).length;
    return `<button class="category-button" type="button" data-category="${escapeHTML(category)}" aria-pressed="${state.category === category}">
      <span>${escapeHTML(category)}</span><span class="category-count">${String(count).padStart(2, "0")}</span>
    </button>`;
  }).join("");
}

function updateActiveFilters() {
  const activeCount = Number(Boolean(minPrice.value)) + Number(Boolean(maxPrice.value));
  const count = activeCount + Number(state.category !== "Todos");
  const badge = document.querySelector("#active-filter-count");
  badge.textContent = String(count);
  badge.hidden = count === 0;
  document.querySelector("#open-filters").setAttribute("aria-label", count ? `Abrir filtros, ${count} activos` : "Abrir filtros");
}

function updateFilterDialogMode() {
  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  const openButton = document.querySelector("#open-filters");
  if (isMobile) {
    if (filterDialog.open && !filterDialog.matches(":modal")) filterDialog.close();
    openButton.setAttribute("aria-expanded", String(filterDialog.matches(":modal")));
  } else {
    if (filterDialog.matches(":modal")) filterDialog.close();
    filterDialog.setAttribute("open", "");
    openButton.setAttribute("aria-expanded", "false");
  }
}

function setCheckoutStep(step) {
  document.querySelectorAll("[data-checkout-step]").forEach((section) => {
    section.hidden = Number(section.dataset.checkoutStep) !== step;
  });
  document.querySelectorAll("[data-step-indicator]").forEach((indicator) => {
    const isCurrent = Number(indicator.dataset.stepIndicator) === step;
    indicator.classList.toggle("is-current", isCurrent);
    indicator.classList.toggle("is-complete", Number(indicator.dataset.stepIndicator) < step);
    if (isCurrent) indicator.setAttribute("aria-current", "step");
    else indicator.removeAttribute("aria-current");
  });
  if (step === 2) document.querySelector("#checkout-payment-title").focus();
}

function validateCheckoutContact() {
  const phoneField = document.querySelector("#checkout-phone");
  const phoneDigits = phoneField.value.replace(/\D/g, "");
  phoneField.setCustomValidity(
    phoneDigits.length >= 10 && phoneDigits.length <= 15
      ? ""
      : "Ingresá un número de WhatsApp con código de país (entre 10 y 15 dígitos).",
  );
  const requiredFields = [...document.querySelector('[data-checkout-step="1"]').querySelectorAll("input[required]")];
  const invalidField = requiredFields.find((field) => !field.checkValidity());
  if (!invalidField) return true;
  invalidField.reportValidity();
  invalidField.focus();
  return false;
}

function getVisibleProducts() {
  const minimum = minPrice.value === "" ? 0 : Number(minPrice.value);
  const maximum = maxPrice.value === "" ? Number.POSITIVE_INFINITY : Number(maxPrice.value);
  const visible = products.filter((product) =>
    (state.category === "Todos" || product.category === state.category) &&
    product.price >= minimum &&
    product.price <= maximum,
  );
  const sorters = {
    "price-low": (a, b) => a.price - b.price,
    "price-high": (a, b) => b.price - a.price,
    name: (a, b) => a.name.localeCompare(b.name, "es"),
  };
  return sorters[sortProducts.value] ? visible.sort(sorters[sortProducts.value]) : visible;
}

function renderProducts() {
  const visible = getVisibleProducts();
  productCount.textContent = `${String(visible.length).padStart(2, "0")} ${visible.length === 1 ? "pieza" : "piezas"}`;
  emptyState.hidden = visible.length > 0;
  productGrid.hidden = visible.length === 0;
  productGrid.innerHTML = visible.map((product) => `
    <article class="product-card reveal-on-scroll">
      <div class="product-image-wrap">
        <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.alt)}" loading="lazy" />
        ${product.tag ? `<span class="product-badge">${escapeHTML(product.tag)}</span>` : ""}
        <button class="product-add" type="button" data-add-product="${escapeHTML(product.id)}" aria-label="Agregar ${escapeHTML(product.name)} a mi bolsa">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
      <div class="product-info">
        <p class="product-category">${escapeHTML(product.category)}</p>
        <div class="product-title-row"><h3>${escapeHTML(product.name)}</h3><span class="product-price">${formatPrice(product.price)}</span></div>
        <p class="product-caption">${escapeHTML(product.caption)}</p>
      </div>
    </article>
  `).join("");
  updateActiveFilters();
  initializeMotion();
}

function renderPickupOptions() {
  const options = pickupPoints.map((point) => `
    <label class="pickup-option">
      <input type="radio" name="pickup-point" value="${escapeHTML(point.id)}" ${point.id === state.selectedPickup ? "checked" : ""} />
      <span><strong>${escapeHTML(point.name)}</strong><small>${escapeHTML(point.detail)}</small></span>
      <em>GRATIS</em>
    </label>
  `).join("");
  document.querySelector("#pickup-options-list").innerHTML = options;
  document.querySelector("#cart-pickup-select").innerHTML = pickupPoints
    .map((point) => `<option value="${escapeHTML(point.id)}">${escapeHTML(point.name)} · Gratis</option>`)
    .join("");
  if (!pickupPoints.some((point) => point.id === state.selectedPickup)) state.selectedPickup = pickupPoints[0]?.id || "";
  document.querySelector("#cart-pickup-select").value = state.selectedPickup;
  renderSelectedPickup();
  document.querySelector("#pickup-count").textContent = String(pickupPoints.length).padStart(2, "0");
}

function renderSelectedPickup() {
  const selected = pickupPoints.find((point) => point.id === state.selectedPickup);
  document.querySelector("#pickup-selected").textContent = selected
    ? `Seleccionado: ${selected.name} · Retiro gratuito.`
    : "Elegí un punto para reservar tu retiro.";
}

function getCartCount() {
  return [...state.cart.values()].reduce((total, item) => total + item.quantity, 0);
}

function selectedDelivery() {
  return document.querySelector('input[name="cart-delivery"]:checked')?.value ?? "pickup";
}

function getCartShippingPrice() {
  return state.shippingEstimate?.price ?? null;
}

function renderCart() {
  const items = [...state.cart.values()];
  const count = getCartCount();
  const subtotal = items.reduce((total, item) => total + item.product.price * item.quantity, 0);
  document.querySelector("#cart-count").textContent = String(count);
  document.querySelector("#dialog-cart-count").textContent = `(${count})`;
  document.querySelector("#cart-empty").hidden = count > 0;
  document.querySelector("#cart-summary").hidden = count === 0;
  document.querySelector("#cart-items").innerHTML = items.map(({ product, quantity }) => `
    <article class="cart-item">
      <img src="${escapeHTML(product.image)}" alt="" />
      <div>
        <h3>${escapeHTML(product.name)}</h3>
        <p>${formatPrice(product.price)}</p>
        <div class="quantity-control" aria-label="Cantidad de ${escapeHTML(product.name)}">
          <button type="button" data-quantity="${escapeHTML(product.id)}" data-change="-1" aria-label="Quitar una unidad de ${escapeHTML(product.name)}">−</button>
          <span>${quantity}</span>
          <button type="button" data-quantity="${escapeHTML(product.id)}" data-change="1" aria-label="Agregar una unidad de ${escapeHTML(product.name)}">+</button>
        </div>
      </div>
      <button class="remove-item" type="button" data-remove="${escapeHTML(product.id)}" aria-label="Quitar ${escapeHTML(product.name)} de la bolsa">Quitar</button>
    </article>
  `).join("");
  const deliveryIsShipping = selectedDelivery() === "shipping";
  const shipping = deliveryIsShipping ? getCartShippingPrice() : 0;
  document.querySelector("#cart-shipping-price").textContent = shipping === null ? "Consultar" : formatPrice(shipping);
  document.querySelector("#cart-subtotal").textContent = formatPrice(subtotal);
  document.querySelector("#cart-delivery-cost").textContent = deliveryIsShipping
    ? shipping === null ? "A confirmar" : formatPrice(shipping)
    : "Gratis";
  document.querySelector("#cart-total").textContent = formatPrice(subtotal + (shipping ?? 0));
  document.querySelector("#cart-note").textContent = deliveryIsShipping
    ? "El envío y su costo final se confirman según tu código postal antes de coordinar el pedido."
    : "El retiro en feria es gratuito. Coordinamos el punto y día después de tu consulta.";
  document.querySelector("#checkout-address-wrap").hidden = !deliveryIsShipping;
  document.querySelector("#checkout-address").required = deliveryIsShipping;
  updateCheckoutReview();
}

function updateCheckoutReview() {
  const subtotal = [...state.cart.values()].reduce((total, item) => total + item.product.price * item.quantity, 0);
  const shipping = selectedDelivery() === "shipping" ? getCartShippingPrice() : 0;
  document.querySelector("#checkout-subtotal").textContent = formatPrice(subtotal);
  document.querySelector("#checkout-delivery").textContent = shipping === null ? "A confirmar" : shipping ? formatPrice(shipping) : "Gratis";
  document.querySelector("#checkout-total").textContent = formatPrice(subtotal + (shipping ?? 0));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function resetFilters() {
  state.category = "Todos";
  minPrice.value = "";
  maxPrice.value = "";
  sortProducts.value = "featured";
  renderCategories();
  renderProducts();
}

function estimateShipping(postalCode) {
  const normalized = postalCode.trim();
  if (!/^\d{4,8}$/.test(normalized)) {
    return { error: "Ingresá un código postal válido de 4 a 8 números." };
  }
  const numericPostalCode = Number(normalized.slice(0, 4));
  const rate = referenceRates.find((item) => numericPostalCode >= Number(item.postalStart) && numericPostalCode <= Number(item.postalEnd));
  return rate
    ? { price: Number(rate.price), zone: rate.name }
    : { error: "Para esta zona, el costo se confirma al coordinar el pedido." };
}

function runShippingEstimate(input, output) {
  const estimate = estimateShipping(input.value);
  if (estimate.error) {
    output.textContent = estimate.error;
    if (input.id === "cart-postal-code") {
      state.shippingEstimate = null;
      renderCart();
    }
    return;
  }
  state.shippingEstimate = { price: estimate.price, zone: estimate.zone };
  output.textContent = `Estimado ${estimate.zone}: ${formatPrice(estimate.price)}. Tarifa de referencia; se confirma al coordinar.`;
  if (input.id === "cart-postal-code") renderCart();
}

categoryOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderProducts();
  if (filterDialog.matches(":modal")) filterDialog.close();
});

for (const input of [minPrice, maxPrice]) {
  input.addEventListener("input", renderProducts);
  input.addEventListener("change", () => {
    if (minPrice.value && maxPrice.value && Number(minPrice.value) > Number(maxPrice.value)) {
      showToast("El precio mínimo no puede superar el precio máximo.");
    }
  });
}
sortProducts.addEventListener("change", renderProducts);

document.querySelector("#clear-filters").addEventListener("click", resetFilters);
document.querySelector("#empty-reset").addEventListener("click", resetFilters);
document.querySelector("#open-filters").addEventListener("click", () => {
  if (filterDialog.matches(":modal")) return;
  if (filterDialog.open) filterDialog.close();
  filterDialog.showModal();
  document.querySelector("#open-filters").setAttribute("aria-expanded", "true");
  document.querySelector("#filter-title").focus();
});
document.querySelector("#close-filters").addEventListener("click", () => filterDialog.close());
filterDialog.addEventListener("click", (event) => {
  if (event.target === filterDialog && filterDialog.matches(":modal")) filterDialog.close();
});
filterDialog.addEventListener("close", () => document.querySelector("#open-filters").setAttribute("aria-expanded", "false"));
window.addEventListener("resize", updateFilterDialogMode);
window.matchMedia("(max-width: 760px)").addEventListener("change", updateFilterDialogMode);
document.querySelector("#estimate-shipping").addEventListener("click", () => {
  runShippingEstimate(document.querySelector("#postal-code"), document.querySelector("#shipping-result"));
});
document.querySelector("#postal-code").addEventListener("keydown", (event) => {
  if (event.key === "Enter") runShippingEstimate(event.currentTarget, document.querySelector("#shipping-result"));
});

document.querySelector("#pickup-options-list").addEventListener("change", (event) => {
  if (event.target.name !== "pickup-point") return;
  state.selectedPickup = event.target.value;
  document.querySelector("#cart-pickup-select").value = state.selectedPickup;
  renderSelectedPickup();
});
document.querySelector("#cart-pickup-select").addEventListener("change", (event) => {
  state.selectedPickup = event.target.value;
  const matchingOption = document.querySelector(`input[name="pickup-point"][value="${state.selectedPickup}"]`);
  if (matchingOption) matchingOption.checked = true;
  renderSelectedPickup();
});

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-product]");
  if (!button) return;
  const product = products.find((item) => item.id === button.dataset.addProduct);
  if (!product) return;
  const existing = state.cart.get(product.id);
  state.cart.set(product.id, { product, quantity: (existing?.quantity ?? 0) + 1 });
  renderCart();
  showToast(`${product.name} se agregó a tu bolsa.`);
});

document.querySelector("#cart-items").addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove]");
  if (removeButton) {
    state.cart.delete(removeButton.dataset.remove);
    renderCart();
    return;
  }
  const quantityButton = event.target.closest("[data-quantity]");
  if (!quantityButton) return;
  const item = state.cart.get(quantityButton.dataset.quantity);
  if (!item) return;
  const nextQuantity = item.quantity + Number(quantityButton.dataset.change);
  if (nextQuantity <= 0) state.cart.delete(item.product.id);
  else state.cart.set(item.product.id, { ...item, quantity: nextQuantity });
  renderCart();
});

document.querySelector("#cart-items").addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const quantityButton = event.target.closest("[data-quantity]");
  if (quantityButton) event.preventDefault();
});

document.querySelector("#open-cart").addEventListener("click", () => {
  renderCart();
  cartDialog.showModal();
});
document.querySelector("#close-cart").addEventListener("click", () => cartDialog.close());
document.querySelector("#continue-shopping").addEventListener("click", () => cartDialog.close());
cartDialog.addEventListener("click", (event) => {
  if (event.target === cartDialog) cartDialog.close();
});
document.querySelectorAll('input[name="cart-delivery"]').forEach((input) => {
  input.addEventListener("change", renderCart);
});
document.querySelector("#cart-postal-code").addEventListener("change", (event) => {
  runShippingEstimate(event.currentTarget, document.querySelector("#cart-shipping-result"));
});
document.querySelector("#cart-postal-code").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    runShippingEstimate(event.currentTarget, document.querySelector("#cart-shipping-result"));
  }
});
document.querySelector("#checkout-button").addEventListener("click", () => {
  if (selectedDelivery() === "shipping" && !state.shippingEstimate) {
    const postalCode = document.querySelector("#cart-postal-code");
    runShippingEstimate(postalCode, document.querySelector("#cart-shipping-result"));
    if (!state.shippingEstimate) {
      postalCode.focus();
      return;
    }
  }
  if (selectedDelivery() === "shipping" && !document.querySelector("#checkout-address").value.trim()) {
    document.querySelector("#checkout-address").required = true;
  }
  document.querySelector("#checkout-form").hidden = false;
  document.querySelector("#checkout-button").hidden = true;
  setCheckoutStep(1);
  updateCheckoutReview();
  document.querySelector("#checkout-name").focus();
});
document.querySelector("#back-to-cart").addEventListener("click", () => {
  document.querySelector("#checkout-form").hidden = true;
  document.querySelector("#checkout-button").hidden = false;
  document.querySelector("#checkout-button").focus();
});
document.querySelector("#checkout-next").addEventListener("click", () => {
  if (!validateCheckoutContact()) return;
  setCheckoutStep(2);
});
document.querySelector("#checkout-previous").addEventListener("click", () => {
  setCheckoutStep(1);
  document.querySelector("#checkout-name").focus();
});
document.querySelector("#checkout-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (document.querySelector('[data-checkout-step="1"]').hidden === false) {
    if (validateCheckoutContact()) setCheckoutStep(2);
    return;
  }
  if (!form.reportValidity()) return;
  const items = [...state.cart.values()];
  if (!items.length) return;
  const shipping = selectedDelivery() === "shipping" ? getCartShippingPrice() ?? 0 : 0;
  const subtotal = items.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const orders = JSON.parse(localStorage.getItem("saintlessDemoOrders") || "[]");
  const formData = new FormData(form);
  const selectedPickupPoint = pickupPoints.find((point) => point.id === state.selectedPickup);
  const order = {
    id: `DEMO-${Date.now().toString().slice(-8)}`,
    date: new Date().toISOString(),
    total: subtotal + shipping,
    items: items.map(({ product, quantity }) => ({ id: product.id, name: product.name, quantity, price: product.price })),
    delivery: selectedDelivery(),
    deliveryDetails: selectedDelivery() === "pickup"
      ? selectedPickupPoint ? `${selectedPickupPoint.name} · ${selectedPickupPoint.detail}` : "Punto de retiro a coordinar"
      : document.querySelector("#checkout-address").value.trim(),
    postalCode: selectedDelivery() === "shipping" ? document.querySelector("#cart-postal-code").value.trim() : "",
    payment: formData.get("payment-method"),
    customer: {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
    },
    status: "Simulación",
  };
  orders.push(order);
  localStorage.setItem("saintlessDemoOrders", JSON.stringify(orders));
  state.cart.clear();
  state.shippingEstimate = null;
  renderCart();
  form.reset();
  form.hidden = true;
  document.querySelector("#checkout-button").hidden = false;
  setCheckoutStep(1);
  cartDialog.close();
  showToast(`Compra simulada ${order.id}: no se realizó ningún cobro.`);
});

document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    updateTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
  });
});

productGrid.addEventListener("pointermove", (event) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const card = event.target.closest(".product-card");
  if (!card) return;
  const rect = card.getBoundingClientRect();
  card.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
  card.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
  card.style.setProperty("--rotate-x", `${((event.clientY - rect.top) / rect.height - 0.5) * -3}deg`);
  card.style.setProperty("--rotate-y", `${((event.clientX - rect.left) / rect.width - 0.5) * 3}deg`);
});
productGrid.addEventListener("pointerout", (event) => {
  const card = event.target.closest(".product-card");
  if (!card || card.contains(event.relatedTarget)) return;
  card.style.removeProperty("--rotate-x");
  card.style.removeProperty("--rotate-y");
});

document.querySelector("#cart-postal-code").addEventListener("input", () => {
  state.shippingEstimate = null;
  renderCart();
});

function updateScrollProgress() {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
  document.querySelector("#scroll-progress").style.width = `${Math.min(100, Math.max(0, progress))}%`;
}

/*
 * The storefront uses a vanilla-CSS adaptation of 21st.dev's Product Card
 * interaction: image lift, pointer-follow glow, and a restrained hover tilt.
 * The reveal observer above adds staggered entrance motion without a runtime dependency.
 */
updateAppearance();
updateTheme(localStorage.getItem("saintlessTheme") || storeConfig.appearance.defaultTheme || "light");
initializeMotion();
updateFilterDialogMode();
updateScrollProgress();
window.addEventListener("scroll", updateScrollProgress, { passive: true });
document.querySelector("#announcement-message").textContent = storeConfig.appearance.announcement;
window.addEventListener("storage", (event) => {
  if (event.key === "saintlessProducts" && event.newValue) window.location.reload();
  if (event.key === CONFIG_KEY) window.location.reload();
});

document.querySelector("#current-year").textContent = String(new Date().getFullYear());
renderCategories();
renderProducts();
renderPickupOptions();
renderCart();
