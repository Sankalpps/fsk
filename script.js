let products = []; // Will be populated from backend
let categories = ["All"];

const API_BASE = window.location.protocol === "file:"
    ? "http://localhost:5501"
    : "";

function apiUrl(path) {
    return `${API_BASE}${path}`;
}

async function parseJsonResponse(res) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        throw new Error(`Expected JSON but received: ${text.slice(0, 80)}`);
    }
}

// Load products from backend
async function loadProducts() {
    try {
        const res = await fetch(apiUrl('/api/products'));
        if (!res.ok) throw new Error('Failed to fetch products');
        products = await parseJsonResponse(res);
        // Recalculate categories after products load
        categories = ["All", ...new Set(products.map((product) => product.category))];
        renderFilters();
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        // Fallback: use dummy data if backend is down
    }
}

const cart = new Map();

const filters = document.getElementById("filters");
const productGrid = document.getElementById("productGrid");
const cartCount = document.getElementById("cartCount");
const cartList = document.getElementById("cartList");
const cartTotal = document.getElementById("cartTotal");
const cartPanel = document.getElementById("cartPanel");
const overlay = document.getElementById("overlay");
const openCart = document.getElementById("openCart");
const closeCart = document.getElementById("closeCart");
const checkoutButton = document.querySelector(".checkout");

let activeCategory = "All";

function formatMoney(value) {
    return `$${value.toFixed(2)}`;
}

function getCartItems() {
    return [...cart.entries()]
        .map(([id, qty]) => ({ id, qty }))
        .filter(({ id, qty }) => Number.isFinite(id) && qty > 0);
}

async function syncCartToBackend() {
    try {
        await fetch(apiUrl('/api/cart'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: getCartItems() })
        });
    } catch (error) {
        console.error('Cart sync failed:', error);
    }
}

function renderFilters() {
    filters.innerHTML = "";
    categories.forEach((category) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip" + (category === activeCategory ? " active" : "");
        chip.textContent = category;
        chip.addEventListener("click", () => {
            activeCategory = category;
            renderFilters();
            renderProducts();
        });
        filters.appendChild(chip);
    });
}

function addToCart(id) {
    const current = cart.get(id) || 0;
    cart.set(id, current + 1);
    renderCart();
    syncCartToBackend();
}

function changeQty(id, delta) {
    const next = (cart.get(id) || 0) + delta;
    if (next <= 0) {
        cart.delete(id);
    } else {
        cart.set(id, next);
    }
    renderCart();
    syncCartToBackend();
}

function renderProducts() {
    productGrid.innerHTML = "";
    const visible = activeCategory === "All"
        ? products
        : products.filter((product) => product.category === activeCategory);

    visible.forEach((product, index) => {
        const card = document.createElement("article");
        card.className = "product";

        card.innerHTML = `
            <div class="product-visual" style="background:${product.color};">${product.visual}</div>
            <div class="product-body">
                <p class="meta">${product.category}</p>
                <h4 class="name">${product.name}</h4>
                <p class="desc">${product.description}</p>
                <div class="row">
                    <span class="price">${formatMoney(product.price)}</span>
                    <div>
                        <button class="buy view" type="button">View</button>
                        <button class="buy add-cart" type="button">Add to cart</button>
                    </div>
                </div>
            </div>
        `;

        card.style.animationDelay = `${index * 0.06}s`;
        card.querySelector(".view").addEventListener("click", () => loadProductById(product.id));
        card.querySelector(".add-cart").addEventListener("click", () => addToCart(product.id));
        productGrid.appendChild(card);
    });

    // Small reveal effect after each render to keep transitions smooth.
    requestAnimationFrame(() => {
        document.querySelectorAll(".product").forEach((item) => item.classList.add("reveal"));
    });
}

async function loadProductById(id) {
    try {
        const res = await fetch(apiUrl(`/api/products/${id}`));
        if (!res.ok) throw new Error("Failed to fetch product details");
        const product = await parseJsonResponse(res);
        alert(`${product.name}\n${product.category}\n${formatMoney(product.price)}\n\n${product.description}`);
    } catch (error) {
        console.error("Product details error:", error);
        alert("Unable to load product details right now.");
    }
}

function renderCart() {
    const ids = [...cart.keys()];
    const count = [...cart.values()].reduce((sum, qty) => sum + qty, 0);
    cartCount.textContent = `(${count})`;

    if (ids.length === 0) {
        cartList.innerHTML = '<li class="empty">Your cart is empty. Add products to see them here.</li>';
        cartTotal.textContent = formatMoney(0);
        return;
    }

    let total = 0;
    cartList.innerHTML = "";

    ids.forEach((id) => {
        const product = products.find((item) => item.id === id);
        if (!product) return;
        const qty = cart.get(id);
        const subtotal = product.price * qty;
        total += subtotal;

        const li = document.createElement("li");
        li.className = "cart-item";
        li.innerHTML = `
            <div class="cart-item-top">
                <strong>${product.name}</strong>
                <button class="remove" type="button">Remove</button>
            </div>
            <div class="row">
                <div class="qty">
                    <button type="button" aria-label="Decrease">-</button>
                    <span>${qty}</span>
                    <button type="button" aria-label="Increase">+</button>
                </div>
                <span>${formatMoney(subtotal)}</span>
            </div>
        `;

        const buttons = li.querySelectorAll(".qty button");
        buttons[0].addEventListener("click", () => changeQty(id, -1));
        buttons[1].addEventListener("click", () => changeQty(id, 1));
        li.querySelector(".remove").addEventListener("click", () => {
            cart.delete(id);
            renderCart();
            syncCartToBackend();
        });

        cartList.appendChild(li);
    });

    cartTotal.textContent = formatMoney(total);
}

async function handleCheckout() {
    if (cart.size === 0) {
        alert("Your cart is empty. Add at least one item before checkout.");
        return;
    }

    const items = getCartItems();

    if (items.length === 0) {
        alert("Unable to checkout because cart items are invalid.");
        return;
    }

    const savedUser = localStorage.getItem("user");
    const email = savedUser ? JSON.parse(savedUser).email : "guest@example.com";

    try {
        checkoutButton.disabled = true;
        checkoutButton.textContent = "Processing...";

        const res = await fetch(apiUrl("/api/checkout"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items, email })
        });

        const data = await parseJsonResponse(res);
        if (!res.ok || !data.ok) {
            throw new Error(data.error || "Checkout failed");
        }

        alert(`Order placed successfully. Order ID: ${data.orderId} | Total: ${formatMoney(data.total)}`);
        cart.clear();
        renderCart();
        syncCartToBackend();
        setCartOpen(false);
    } catch (error) {
        console.error("Checkout error:", error);
        alert(`Checkout failed: ${error.message}`);
    } finally {
        checkoutButton.disabled = false;
        checkoutButton.textContent = "Proceed to Checkout";
    }
}

function setCartOpen(isOpen) {
    cartPanel.classList.toggle("open", isOpen);
    overlay.classList.toggle("open", isOpen);
}

document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => addToCart(Number(button.dataset.add)));
});

openCart.addEventListener("click", () => setCartOpen(true));
closeCart.addEventListener("click", () => setCartOpen(false));
overlay.addEventListener("click", () => setCartOpen(false));
window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setCartOpen(false);
});
checkoutButton.addEventListener("click", handleCheckout);

// Call on page load
window.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    renderFilters();
    renderCart();
});
