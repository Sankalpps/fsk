let products = []; // Will be populated from backend
let categories = ["All"];

const fallbackProducts = [
    { id: 1, name: "Stoneware Pour-Over Set", category: "Kitchen", price: 42, visual: "Warm Sand", description: "Hand-glazed ceramic set for slow mornings.", color: "linear-gradient(130deg, #f6d7b0, #f1e8d5)" },
    { id: 2, name: "Linen Throw Blanket", category: "Home", price: 58, visual: "Terracotta Weave", description: "Airy linen blend with a soft drape.", color: "linear-gradient(130deg, #f1baa2, #f6e2d3)" },
    { id: 3, name: "Brass Desk Lamp", category: "Office", price: 71, visual: "Brushed Gold", description: "Focused light with a warm matte finish.", color: "linear-gradient(130deg, #edd08f, #f8eed8)" },
    { id: 4, name: "Everyday Knit Tee", category: "Apparel", price: 34, visual: "Moss Green", description: "Breathable knit built for all-season wear.", color: "linear-gradient(130deg, #b9c8a2, #edf3e3)" },
    { id: 5, name: "Glass Meal Prep Set", category: "Kitchen", price: 49, visual: "Cloud White", description: "Stackable glass containers with bamboo lids.", color: "linear-gradient(130deg, #d7e0df, #f4f8f8)" },
    { id: 6, name: "Walnut Catchall Tray", category: "Home", price: 26, visual: "Dark Walnut", description: "Keeps keys, cards, and essentials together.", color: "linear-gradient(130deg, #c1a487, #f2e3d4)" },
    { id: 7, name: "Canvas Weekender Bag", category: "Apparel", price: 84, visual: "Sun Clay", description: "Spacious carryall with reinforced straps.", color: "linear-gradient(130deg, #ebb29e, #f9e2d7)" },
    { id: 8, name: "Modular Notebook Set", category: "Office", price: 22, visual: "Slate + Cream", description: "Interchangeable pages for projects and ideas.", color: "linear-gradient(130deg, #d7d4cf, #f6f4ef)" }
];

const API_BASE = window.location.hostname === "localhost" 
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
        if (!Array.isArray(products)) {
            throw new Error('Invalid products response');
        }
        // Recalculate categories after products load
        categories = ["All", ...new Set(products.map((product) => product.category))];
        renderFilters();
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        products = fallbackProducts;
        categories = ["All", ...new Set(products.map((product) => product.category))];
        renderFilters();
        renderProducts();
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
