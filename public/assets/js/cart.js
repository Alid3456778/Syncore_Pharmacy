document.querySelectorAll(".remove-btn").forEach((button) => {
  button.addEventListener("click", (e) => {
    const item = e.target.closest(".cart-item");
    item.remove();
    //removing from local storage
    localStorage.setItem("cartCount", parseInt(localStorage.getItem("cartCount")) - 1);
    updateBillSummary();
  });
});

document.getElementById("add-products-btn").addEventListener("click", () => {
  alert("Redirecting to the shop page...");
  window.location.href = "./categories.html";
});

async function loadCartItems() {
  try {
    const cartResponse = await fetch("/api/cart");
    const cartData = await cartResponse.json();
    if (!cartData.success) throw new Error("Failed to fetch cart items.");

    const cartItems = cartData.data;
    const container = document.getElementById("cart-items");
    if (cartItems.length === 0) {
      container.innerHTML = "<p>Your cart is empty.</p>";
      return;
    }

    container.innerHTML = "";
    let subtotal = 0;
    for (const item of cartItems) {
      const price = parseFloat(item.price.replace(/[^\d.-]/g, "")) || 0;
      subtotal += price;
      const mgText = item.mg ? ` (${item.mg} MG)` : "";
      const div = document.createElement("div");
      div.className = "cart-item";
      div.innerHTML = `
        <img src="${item.image_url}" alt="Product Image" />
        <div class="product-details">
          <div class="product-detail-1">
            <h3>${item.name || "Unnamed Product"}${mgText}</h3>
            <button class="remove-btn" onclick="removeItem('${
              item.id
            }')">Remove</button>
          </div>
          <div class="product-detail-2">
            <p>Price: ₹${price.toFixed(2)}</p>
            <p>Quantity: ${item.quantity}</p>
          </div>
        </div>
      `;
      container.appendChild(div);
    }

    document.getElementById("subtotal").textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById("total").textContent = `$${subtotal.toFixed(2)}`;
  } catch (err) {
    console.error(err);
    document.getElementById("cart-items").innerHTML =
      "<p>Error loading cart items.</p>";
  }
}

function removeItem(id) {
  localStorage.setItem("cartCount", parseInt(localStorage.getItem("cartCount")) - 1);
  fetch("/remove-from-cart", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: id }), // Use unique product_id
  })
    .then((res) => res.json())
    .then((result) => {
      if (result.success) {
        showToast("Item removed from cart");
        loadCartItems(); // Reload cart to update UI
      } else {
        alert("Error removing item: " + result.message);
      }
    })
    .catch(() => alert("Server error while removing item."));
}

document.addEventListener("DOMContentLoaded", loadCartItems);

function showToast(message, duration = 3000) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, duration);
}
