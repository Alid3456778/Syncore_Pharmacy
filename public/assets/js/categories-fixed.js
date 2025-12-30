window.$crisp = [];
window.CRISP_WEBSITE_ID = "68987257-808e-403d-a06c-35b3ec18c3ef";
(function () {
  var d = document;
  var s = d.createElement("script");
  s.src = "https://client.crisp.chat/l.js";
  s.async = 1;
  d.getElementsByTagName("head")[0].appendChild(s);
})();

// Count cart items and show in navbar
document.addEventListener("DOMContentLoaded", async () => {
  // UPDATED: Changed selector from 'cart-count' to match new HTML
  // You'll need to add this element to your navbar in HTML:
  // <span id="cart-count" style="display:none;">0</span>

  const cartCountSpan = document.getElementById("cart-count");

  if (!cartCountSpan) {
    console.warn(
      'cart-count element not found in HTML. Add this to your navbar: <span id="cart-count">0</span>'
    );
    return;
  }

  // Check if cart count exists in local storage
  const storedCartCount = localStorage.getItem("cartCount");

  if (storedCartCount !== null) {
    cartCountSpan.textContent = storedCartCount;
    cartCountSpan.style.display = "inline-block";
    return;
  }

  try {
    const response = await fetch("/api/cart/count");
    const result = await response.json();

    if (result.success) {
      const cartCount = result.count;
      // Store cart count in local storage
      localStorage.setItem("cartCount", cartCount);
      if (cartCount > 0) {
        cartCountSpan.textContent = cartCount;
        cartCountSpan.style.display = "inline-block";
      }
    } else {
      console.error("Failed to fetch cart count:", result.message);
    }
  } catch (error) {
    console.error("Error fetching cart count:", error);
  }
});

// Load and display products based on category
document.addEventListener("DOMContentLoaded", () => {
  async function loadProductData(categoryID) {
    // UPDATED: Changed from 'loading-message' to 'loadingState'
    const loadingMessage = document.getElementById("loadingState");
    if (loadingMessage) {
      loadingMessage.innerHTML = `
        <div class="loading-spinner"></div>
        <p>LOADING PRODUCTS...</p>
      `;
      loadingMessage.style.display = "flex";
      loadingMessage.style.flexDirection = "column";
      loadingMessage.style.alignItems = "center";
      loadingMessage.style.justifyContent = "center";
    }

    // UPDATED: Changed from 'product-grid' to 'productsGrid'
    const tableBody = document.getElementById("productsGrid");
    try {
      const response = await fetch(`/products?categoryID=${categoryID}`);
      const products = await response.json();
      // console.log(products);


      if (products.length === 0) {
        tableBody.innerHTML = `<p>No products found for the selected category.</p>`;
        if (loadingMessage) {
          loadingMessage.style.display = "none";
        }
        return;
      }

      tableBody.innerHTML = "";
      displayBatch(products, 0, products.length, tableBody);
      if (loadingMessage) {
        loadingMessage.style.display = "none";
      }
    } catch (error) {
      console.error("Error loading product data:", error);
      if (loadingMessage) {
        loadingMessage.innerHTML = `<p>Error loading products. Please try again.</p>`;
        loadingMessage.style.display = "block";
      }
    }
  }

  // Function to display a batch of products
  function displayBatch(products, start, end, tableBody) {
    const batch = products.slice(start, end);
    // console.log(products);
    // Helper function to generate stars from rating
    function generateStars(rating) {
      const fullStars = Math.round(rating);
      let starsHTML = "";
      for (let i = 0; i < fullStars; i++) {
        starsHTML += "⭐";
      }
      return starsHTML;
    }

    // Display each product in the batch
    batch.forEach((product) => {
      const productID = product.id;

      const stockOverlay =
        product.stocks === 0
          ? `<div class="stock-overlay">
               <img src="./assets/image2/out-of-stock.png" alt="Out of Stock" />
             </div>`
          : "";

      const rowHTML = `
        <div class="product-card medicine-card ${
          product.category_id || "all"
        }" data-product-id="${productID}">
          ${stockOverlay}
          ${
            product.offer_price != null
              ? `<p><img src="./assets/image2/off-image.png" class="Offer-avail" alt="Offer"/></p>`
              : ``
          }
          <div class="product-image"> <img src="${
            product.image_url || ""
          }" alt="Product Image" loading="lazy"
            onload="this.style.opacity='1'" /> </div>
          <div class="product-details product-info">
            <h3 class="product-name" >${
              product.product_name || "No Description"
            }</h3>
            <p id="pric" >${
              product.trade_names
                ? product.trade_names.split(",")[0].trim()
                : ""
            }</p>
       
            ${
              product.category_id == 1
                ? `<p style="font-weight: bold;">(4-5 Day's Delivery)</p>`
                : `<p style="font-weight: bold;"></p>`
            }
            <div class="product-meta">
            <div class="rating product-rating">
              <small class="rating__count rating-count">${generateStars(
                product.rating
              )}</small>
            </div>
            <div class="product-buttons">
              <a href="./product_overview.html?product_ID=${
                product.product_id
              }"> 
                <button class="buy-btn add-to-cart">Buy Now</button>
              </a>
            </div>
          </div>
        </div>
      `;
      tableBody.innerHTML += rowHTML;
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  const initialCategoryID = urlParams.get("catogeries_ID") || "all";
  loadProductData(initialCategoryID);
});

// Function to get products with localStorage caching
async function getProducts() {
  const cached = localStorage.getItem("SearchProducts");

  if (cached) {
    return JSON.parse(cached); // Use localStorage data
  }
  
  const response = await fetch("/products");
  const products = await response.json();
  
  localStorage.setItem("SearchProducts", JSON.stringify(products)); // Save data
  return products;
}

// Product search functionality
async function buildProductSearch() {
  try {
    const products = await getProducts();

    // UPDATED: Changed from 'search-input' to 'searchInput'
    const searchInput = document.getElementById("searchInput");

    // UPDATED: Changed from 'search-button' - now using querySelector for common search patterns
    const searchButton =
      document.querySelector("[data-search-button]") ||
      document.querySelector(".search-btn") ||
      null;

    // UPDATED: Changed from 'suggestions' - will create if doesn't exist
    let suggestionBox = document.getElementById("suggestions");

    // Create suggestion box if it doesn't exist
    if (!suggestionBox) {
      suggestionBox = document.createElement("ul");
      suggestionBox.id = "suggestions";
      suggestionBox.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-top: none;
        max-height: 200px;
        overflow-y: auto;
        display: none;
        z-index: 10;
        list-style: none;
        margin: 0;
        padding: 0;
      `;
      searchInput.parentElement.style.position = "relative";
      searchInput.parentElement.appendChild(suggestionBox);
    }

    if (!searchInput) {
      console.warn("searchInput element not found");
      return;
    }

    // Real-time suggestions
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();
      suggestionBox.innerHTML = "";

      if (!query) {
        suggestionBox.style.display = "none";
        return;
      }

      const matches = products.filter((product) =>
        product.product_name.toLowerCase().includes(query)
      );

      if (matches.length > 0) {
        matches.slice(0, 5).forEach((product) => {
          const li = document.createElement("li");
          li.textContent = product.product_name;
          li.style.cssText = `
            padding: 10px 15px;
            cursor: pointer;
            border-bottom: 1px solid #f0f0f0;
          `;
          li.onmouseover = () => (li.style.backgroundColor = "#f5f5f5");
          li.onmouseout = () => (li.style.backgroundColor = "white");
          li.onclick = () => {
            searchInput.value = product.product_name;
            suggestionBox.style.display = "none";
            handleSearch();
          };
          suggestionBox.appendChild(li);
        });
        suggestionBox.style.display = "block";
      } else {
        suggestionBox.style.display = "none";
      }
    });

    // Hide suggestions when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-filter") && !e.target.closest(".search")) {
        suggestionBox.style.display = "none";
      }
    });

    // Search and redirect if exact match found
    function handleSearch() {
      const query = searchInput.value.trim();
      const matchingProduct = products.find(
        (product) => product.product_name === query
      );

      if (matchingProduct) {
        window.location.href = `product_overview.html?product_ID=${matchingProduct.product_id}`;
      } else {
        alert("No matching product found.");
      }
    }

    // Button click or Enter = search
    if (searchButton) {
      searchButton.addEventListener("click", handleSearch);
    }

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSearch();
      }
    });

    // Filtering product cards (if present on page)
    const productCards = document.querySelectorAll(".product");
    function filterProducts() {
      const query = searchInput.value.trim().toLowerCase();

      productCards.forEach((product) => {
        const productName = product.dataset.name.toLowerCase();
        product.style.display = productName.includes(query) ? "block" : "none";
      });
    }

    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        filterProducts();
      }
    });

    if (searchButton) {
      searchButton.addEventListener("click", filterProducts);
    }
  } catch (error) {
    console.error("Error fetching products:", error);
  }
}

buildProductSearch();

// Category data with icons and descriptions
const categoryData = {
  0:{
    name: "All Products",
    icon: "💊",
  },
  1: {
    name: "USA Premium Quality",
    icon: "💊",
    description:
      "Authentic American pharmaceutical products of the highest standard",
  },
  2: {
    name: "General Health",
    icon: "💊",
    description:
      "Essential medicines for everyday wellness and general healthcare",
  },
  3: {
    name: "Pain Relief",
    icon: "🩹",
    description: "Effective solutions for pain management and relief",
  },
  4: {
    name: "Cardiac Care",
    icon: "❤️",
    description:
      "Trusted medications for heart health and cardiovascular wellness",
  },
  5: {
    name: "Mental Health",
    icon: "🧠",
    description: "Support for emotional, psychological, and mental wellness",
  },
  6: {
    name: "Sexual Wellness",
    icon: "💗",
    description: "Confidential solutions for intimate health and wellness",
  },
  7: {
    name: "Skincare",
    icon: "✨",
    description: "Advanced dermatological treatments and skincare solutions",
  },
  8: {
    name: "Steroids",
    icon: "💪",
    description: "Performance enhancement and bodybuilding products",
  },
  9: {
    name: "Women's Health",
    icon: "👩",
    description: "Specialized care and products for women's wellness",
  },
  10: {
    name: "Men's Health",
    icon: "👨",
    description: "Targeted solutions for men's vitality and health",
  },
};

// Get category ID from URL
function getCategoryIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("catogeries_ID") || "0";
}

// Load category information
function loadCategoryInfo() {
  const categoryId = getCategoryIdFromUrl();
  const category = categoryData[categoryId];

  if (category) {
    document.getElementById("categoryIcon").textContent = category.icon;
    document.getElementById("categoryTitle").textContent = category.name;
    document.getElementById("categoryDescription").textContent =
      category.description;
    document.getElementById("breadcrumbCategory").textContent = category.name;
    document.title = `${category.name} - XYZ Medical`;
  }
}

loadCategoryInfo();
