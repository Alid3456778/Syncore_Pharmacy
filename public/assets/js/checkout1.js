window.$crisp = [];
window.CRISP_WEBSITE_ID = "68987257-808e-403d-a06c-35b3ec18c3ef";
(function () {
  var d = document;
  var s = d.createElement("script");
  s.src = "https://client.crisp.chat/l.js";
  s.async = 1;
  d.getElementsByTagName("head")[0].appendChild(s);
})();

let selectedPayment = null;

function openPaymentModal() {
  document.getElementById("paymentModal").style.display = "flex";
}

function selectPayment(method) {
  selectedPayment = method;
  const qr = document.getElementById("qr-code");
  const qr_text_id = document.getElementById("qrtext_id");
  const container = document.getElementById("qr-container");
  container.style.display = "block";

  if (method === "Zelle") {
    qr_text_id.textContent = "Yet Not Available";
    qr.src = "./assets/image/";
  } else if (method === "Bitcoin") {
    qr.src = "./assets/image/bitcoinScanner.jpg";
    qr_text_id.textContent =
      "Bitcoin (BTC) Address: bc1q4mgysdwjsxhw3qwzycnzgtvh2xc2akf5xfaras";
  } else if (method === "Venmo") {
    qr_text_id.textContent = "Yet Not Available";
    // qr.src = "./assets/image/venom.jpg";
  }
}

function confirmPayment() {
  document.getElementById("paymentModal").style.display = "none";
  placeOrder(); // Only now place order
}

function cancelPayment() {
  selectedPayment = null;
  document.getElementById("paymentModal").style.display = "none";
  document.getElementById("qr-container").style.display = "none";
}

// Hide modal when clicked outside content
window.addEventListener("click", function (event) {
  const modal = document.getElementById("paymentModal");
  const content = document.querySelector(".modal-content");

  if (event.target === modal) {
    modal.style.display = "none";
    document.getElementById("qr-container").style.display = "none";
    selectedPayment = null;
  }
});

// Global variables
let cartData = [];
let orderSummaryLoaded = false;

// API functions with comprehensive error handling
const API = {
  async getCart() {
    try {
      console.log("📞 API Call: Fetching cart data from /api/cart");

      const response = await fetch("/api/cart", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important: Include cookies for sessionId
      });

      console.log("📡 Cart API Response Status:", response.status);
      console.log(
        "📡 Cart API Response Headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error("Session not found. Please add items to cart first.");
        }
        throw new Error(
          `HTTP Error ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("📦 Cart API Response Data:", data);

      if (!data.success) {
        throw new Error(`API Error: ${data.message || "Cart fetch failed"}`);
      }

      if (!Array.isArray(data.data)) {
        throw new Error("Invalid cart data format: Expected array");
      }

      return data;
    } catch (error) {
      console.error("❌ Cart API Error:", error);

      // Categorize different types of errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          "Network Error: Unable to connect to server. Please check your internet connection."
        );
      } else if (error.message.includes("Session not found")) {
        throw new Error(
          "No items in cart. Please add some products to your cart first."
        );
      } else if (error.message.includes("HTTP Error 404")) {
        throw new Error(
          "API Error: Cart endpoint not found. Please contact support."
        );
      } else if (error.message.includes("HTTP Error 500")) {
        throw new Error(
          "Server Error: Internal server error. Please try again later."
        );
      } else {
        throw new Error(`Cart Loading Error: ${error.message}`);
      }
    }
  },

  async checkout(orderData) {
    try {
      console.log("📞 API Call: Submitting order to /api/checkout");
      console.log("📦 Order Data:", JSON.stringify(orderData, null, 2));

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include", // Include cookies for sessionId
        body: JSON.stringify(orderData),
      });

      console.log("📡 Checkout API Response Status:", response.status);
      console.log(
        "📡 Checkout API Response Headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        // Try to get error message from response body
        let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          console.log("Could not parse error response as JSON");
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("📦 Checkout API Response Data:", data);

      if (!data.success) {
        throw new Error(
          `Checkout Error: ${data.message || "Order placement failed"}`
        );
      }

      return data;
    } catch (error) {
      console.error("❌ Checkout API Error:", error);

      // Categorize different types of errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          "Network Error: Unable to connect to server. Please check your internet connection."
        );
      } else if (error.message.includes("HTTP Error 404")) {
        throw new Error(
          "API Error: Checkout endpoint not found. Please contact support."
        );
      } else if (error.message.includes("HTTP Error 400")) {
        throw new Error(
          "Validation Error: " + error.message.replace("HTTP Error 400: ", "")
        );
      } else if (error.message.includes("HTTP Error 422")) {
        throw new Error(
          "Data Error: Please check all form fields and try again."
        );
      } else if (error.message.includes("HTTP Error 500")) {
        throw new Error(
          "Server Error: Internal server error. Please try again later."
        );
      } else {
        throw new Error(`Order Processing Error: ${error.message}`);
      }
    }
  },
};

// Utility functions
function showError(fieldId, message) {
  const errorElement = document.getElementById(fieldId + "-error");
  if (errorElement) {
    errorElement.textContent = message;
  }
}

function clearErrors() {
  document.querySelectorAll(".error").forEach((error) => {
    error.textContent = "";
  });
}

// Test data utility function

// Enhanced form validation with detailed logging
function validateForm() {
  console.log("🔍 Starting form validation...");
  clearErrors();
  let isValid = true;

  const requiredFields = [
    { id: "first-name", name: "First Name" },
    { id: "last-name", name: "Last Name" },
    { id: "street-address", name: "Street Address" },
    { id: "city", name: "City" },
    { id: "state", name: "State" },
    { id: "zip-code", name: "ZIP Code" },
    { id: "country", name: "Country" },
    { id: "phone", name: "Phone" },
    { id: "email", name: "Email" },
  ];

  // Check required fields
  requiredFields.forEach((field) => {
    const element = document.getElementById(field.id);
    const value = element ? element.value.trim() : "";

    console.log(`🔍 Checking ${field.name} (${field.id}): "${value}"`);

    if (!element) {
      console.error(`❌ Field element not found: ${field.id}`);
      isValid = false;
      return;
    }

    if (!value) {
      console.log(`❌ ${field.name} is empty`);
      showError(field.id, `${field.name} is required`);
      isValid = false;
    } else {
      console.log(`✅ ${field.name} is valid`);
    }
  });

  // Specific field validations
  const email = document.getElementById("email").value.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.log(`❌ Email format invalid: ${email}`);
    showError("email", "Please enter a valid email address");
    isValid = false;
  }

  const zipCode = document.getElementById("zip-code").value.trim();
  if (zipCode && !/^[0-9]{5}(-[0-9]{4})?$/.test(zipCode)) {
    console.log(`❌ ZIP code format invalid: ${zipCode}`);
    showError(
      "zip-code",
      "Please enter a valid ZIP code (e.g., 12345 or 12345-6789)"
    );
    isValid = false;
  }

  const phone = document.getElementById("phone").value.trim();
  const phoneDigits = phone.replace(/\D/g, "");
  if (phone && phoneDigits.length < 10) {
    console.log(
      `❌ Phone number too short: ${phone} (${phoneDigits.length} digits)`
    );
    showError(
      "phone",
      "Please enter a valid phone number (at least 10 digits)"
    );
    isValid = false;
  }

  // Validate shipping address if different address is checked
  const differentAddress = document.getElementById("different-address").checked;
  console.log(`🔍 Different shipping address checked: ${differentAddress}`);

  if (differentAddress) {
    const shipFields = [
      { id: "ship-street-address", name: "Shipping Street Address" },
      { id: "ship-city", name: "Shipping City" },
      { id: "ship-zip", name: "Shipping ZIP Code" },
    ];

    shipFields.forEach((field) => {
      const element = document.getElementById(field.id);
      const value = element ? element.value.trim() : "";

      console.log(`🔍 Checking ${field.name} (${field.id}): "${value}"`);

      if (!value) {
        console.log(
          `❌ ${field.name} is required when shipping to different address`
        );
        alert(`${field.name} is required when shipping to a different address`);
        isValid = false;
      }
    });
  }

  console.log(`🔍 Form validation result: ${isValid ? "VALID" : "INVALID"}`);
  return isValid;
}

// Function to calculate shipping cost based on total price and product categories
function calculateShippingCost(total, cartItems) {
  let chargeableTotal = 0;

  cartItems.forEach((item) => {
    const categoryId = parseInt(item.category_id, 10);
    const price = parseFloat(item.price);

    if (categoryId !== 1) {
      chargeableTotal += price;
    }
  });

  // Calculate shipping cost based on chargeable total price
  if (chargeableTotal > 300) {
    return 0; // Free shipping for chargeable items above $300
  } else if (chargeableTotal >= 101 && chargeableTotal <= 300) {
    return 10; // $10 for chargeable items between $101 and $300
  } else if (chargeableTotal >= 51 && chargeableTotal <= 100) {
    return 15; // $15 for chargeable items between $51 and $100
  } else if (chargeableTotal >= 1 && chargeableTotal <= 50) {
    return 20; // $20 for chargeable items between $1 and $50
  }

  return 0; // Default to free shipping
}

// Function to load and display cart items
async function loadCartItems() {
  const loadingElement = document.getElementById("order-loading");
  const placeOrderBtn = document.getElementById("place-order-btn");

  try {
    loadingElement.innerHTML = "Loading cart items...";
    placeOrderBtn.disabled = true;

    console.log("🔄 Starting cart loading process...");
    const response = await API.getCart();

    if (response.success && response.data) {
      cartData = response.data;
      console.log("✅ Cart loaded successfully:", cartData);

      if (cartData.length === 0) {
        loadingElement.innerHTML =
          '<p style="color: #666;">Your cart is empty. <a href="./categories.html" style="color: #007cba;">Continue shopping</a></p>';
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = "Cart is Empty";
        return;
      }

      // Validate cart data structure
      const validatedCartData = cartData.map((item, index) => {
        console.log(`🔍 Validating cart item ${index + 1}:`, item);
        const cleanPrice = item.price
          .toString()
          .replace(/,/g, "")
          .replace(/[^0-9.]/g, "");
        // Ensure all required fields exist
        const validatedItem = {
          id: item.id || index + 1,
          product_id: item.product_id || item.productId || item.id,
          name: item.name || "Unknown Product",
          mg: item.mg || item.strength || "",
          quantity: parseInt(item.quantity || 1, 10),
          price: parseFloat(cleanPrice).toFixed(2),
          category_id: item.category_id || item.categoryId || 1,
        };

        // Log any missing or converted fields
        Object.keys(validatedItem).forEach((key) => {
          if (item[key] !== validatedItem[key]) {
            console.log(
              `⚠️ Item ${index + 1}: ${key} converted from "${item[key]}" to "${
                validatedItem[key]
              }"`
            );
          }
        });

        return validatedItem;
      });

      cartData = validatedCartData;
      displayCartItems();
      orderSummaryLoaded = true;
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = "Place Order";
    } else {
      throw new Error("Invalid response format or missing data");
    }
  } catch (error) {
    console.error("❌ Cart loading failed:", error);

    loadingElement.innerHTML = `
            <div style="color: #d32f2f; padding: 15px; background: #ffebee; border-radius: 4px; margin-bottom: 15px;">
              <strong>⚠️ Error Loading Cart:</strong><br>
              ${error.message}<br>
              <button onclick="loadCartItems()" style="margin-top: 10px; padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">
                🔄 Retry
              </button>
            </div>
          `;

    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = "Cart Loading Failed";

    // Log additional debug information
    // console.log("🐛 Debug Info:");
    // console.log("  - Current URL:", window.location.href);
    // console.log("  - User Agent:", navigator.userAgent);
    // console.log(
    //   "  - Network Status:",
    //   navigator.onLine ? "Online" : "Offline"
    // );
  }
}

function displayCartItems() {
  const cartItemsElement = document.getElementById("cart-items");
  const totalCostElement = document.getElementById("total-cost");
  const shippingCostElement = document.getElementById("shipping-cost");

  let subtotal = 0;
  cartItemsElement.innerHTML = "";
  // Display each cart item
  cartData.forEach((item) => {
    const cleanPrice = item.price
      .toString()
      .replace(/,/g, "")
      .replace(/[^0-9.]/g, "");
    const itemPrice = parseFloat(item.price);
    console.log("pricing is ", cleanPrice);
    subtotal += parseFloat(item.price);

    const row = `
            <tr>
              <td>${item.name} ${item.mg ? item.mg + "mg" : ""} × ${
      item.quantity
    }</td>
              <td>$${item.price}</td>
            </tr>
          `;
    cartItemsElement.innerHTML += row;
  });

  // Calculate and display shipping cost
  const shippingCost = calculateShippingCost(subtotal, cartData);
  const totalCost = subtotal + shippingCost;

  shippingCostElement.textContent = `$${shippingCost.toFixed(2)}`;
  totalCostElement.textContent = `$${totalCost.toFixed(2)}`;

  // Show the order content and hide loading
  document.getElementById("order-loading").style.display = "none";
  document.getElementById("order-content").style.display = "block";
}

// Function to handle form submission and place order
async function placeOrder() {
  console.log("🚀 Starting order placement process...");

  if (!orderSummaryLoaded) {
    alert("Please wait for the cart to load before placing your order.");
    return;
  }

  if (cartData.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  if (!validateForm()) {
    alert("Please fix the errors in the form before proceeding.");
    return;
  }

  const placeOrderBtn = document.getElementById("place-order-btn");
  const originalText = placeOrderBtn.textContent;
  placeOrderBtn.disabled = true;
  placeOrderBtn.textContent = "Processing...";
  placeOrderBtn.classList.add("loading");

  try {
    console.log("📋 Collecting form data...");

    // Collect form data exactly matching your backend structure
    const formData = {
      firstName: document.getElementById("first-name").value.trim(),
      lastName: document.getElementById("last-name").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      email: document.getElementById("email").value.trim(),

      country: document.getElementById("country").value,
      billingStreetAddress: document
        .getElementById("street-address")
        .value.trim(),

      billingCity: document.getElementById("city").value.trim(),
      billingState: document.getElementById("state").value,
      billingZip: document.getElementById("zip-code").value.trim(),
    };

    console.log("👤 Form Data:", formData);

    // Calculate totals
    console.log("💰 Calculating order totals...");
    const subtotal = cartData.reduce(
      (sum, item) => sum + parseFloat(item.price),
      0
    );
    const shippingCost = calculateShippingCost(subtotal, cartData);
    const totalCost = subtotal + shippingCost;

    // console.log("💰 Pricing Breakdown:");
    // console.log("  - Subtotal:", subtotal.toFixed(2));
    // console.log("  - Shipping:", shippingCost.toFixed(2));
    // console.log("  - Total:", totalCost.toFixed(2));

    // Prepare order data exactly matching your backend expectations
    const orderData = {
      // Customer Information (exact field names from your backend)
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      email: formData.email,
      companyName: formData.companyName,
      country: formData.country,
      billingStreetAddress: formData.billingStreetAddress,
      apartment: formData.apartment,
      billingCity: formData.billingCity,
      billingState: formData.billingState,
      billingZip: formData.billingZip,

      // Cart items (matching your backend structure)
      cartItems: cartData.map((item) => ({
        product_id: parseInt(item.product_id, 10),
        name: item.name,
        mg: item.mg,
        quantity: parseInt(item.quantity, 10),
        price: parseFloat(item.price),
      })),

      // Pricing (matching your backend)
      shippingCost: parseFloat(shippingCost.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
    };

    console.log(
      "📦 Final Order Data Structure:",
      JSON.stringify(orderData, null, 2)
    );

    // Update button to show submission status
    placeOrderBtn.textContent = "Submitting Order...";

    // Submit order to API
    console.log("📨 Submitting order to backend...");
    const result = await API.checkout(orderData);

    console.log("✅ Order submitted successfully:", result);

    if (result.success) {
      // Your backend doesn't return orderId in the current code, so we'll use a generated one
      const orderId =
        result.orderId ||
        result.order_id ||
        Math.floor(Math.random() * 1000000000);

      console.log("🎉 Order placed successfully with ID:", orderId);

      // Store order details for invoice page
      const orderDetails = {
        ...orderData,
        orderId: orderId,
        orderDate: new Date().toISOString(),
        status: "confirmed",
        subtotal: subtotal,
      };

      // Store order details for invoice page
      try {
        sessionStorage.setItem("orderDetails", JSON.stringify(orderDetails));
        localStorage.setItem("orderDetails", JSON.stringify(orderDetails)); // Fallback
        window.orderDetails = orderDetails; // Fallback
        console.log("💾 Order details stored for invoice page");
      } catch (e) {
        console.warn("⚠️ Could not store order details:", e);
      }

      // Update modal with order number
      document.getElementById("modal-order-number").textContent = "#" + orderId;

      // Show success modal
      openConfirmationPopup();
    } else {
      throw new Error(
        result.message || "Order placement failed - no success status"
      );
    }
  } catch (error) {
    console.error("❌ Order placement failed:", error);

    // Show detailed error message to user
    const errorMessage = error.message || "Unknown error occurred";

    alert(
      `Order Placement Failed!\n\n${errorMessage}\n\nPlease try again or contact support if the problem persists.`
    );

    // Log additional debug information
    // console.log("🐛 Order Debug Info:");
    // console.log("  - Error Type:", error.constructor.name);
    // console.log("  - Error Stack:", error.stack);
    // console.log("  - Form Valid:", validateForm());
    // console.log("  - Cart Data Length:", cartData.length);
    // console.log("  - Order Summary Loaded:", orderSummaryLoaded);
  } finally {
    // Always restore button state
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = originalText;
    placeOrderBtn.classList.remove("loading");
    console.log("🔄 Button state restored");
  }
}

// Modal functions
function openConfirmationPopup() {
  document.getElementById("confirmationModal").style.display = "flex";
}

function viewOrder() {
  window.location.href = "./invoice1.html";
}

function goHome() {
  window.location.href = "./index.html";
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Load cart items when page loads
  loadCartItems();

  // Handle different shipping address toggle
  document
    .getElementById("different-address")
    .addEventListener("change", function () {
      const shippingForm = document.getElementById("shipping-address-form");
      shippingForm.style.display = this.checked ? "block" : "none";
    });

  // Handle place order button click
  document.getElementById("place-order-btn").addEventListener("click", () => {
    if (!validateForm()) {
      alert("Please enter the Form Detail before proceeding.");
      return;
    }
    openPaymentModal();
  });

  // Real-time form validation
  document.querySelectorAll("input, select").forEach((field) => {
    field.addEventListener("blur", function () {
      if (this.hasAttribute("required") && !this.value.trim()) {
        showError(this.id, "This field is required");
      } else {
        clearErrors();
      }
    });
  });
});
