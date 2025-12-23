window.$crisp = [];
window.CRISP_WEBSITE_ID = "68987257-808e-403d-a06c-35b3ec18c3ef";
(function () {
  var d = document;
  var s = d.createElement("script");
  s.src = "https://client.crisp.chat/l.js";
  s.async = 1;
  d.getElementsByTagName("head")[0].appendChild(s);
})();

//count cart items and show in navbar
document.addEventListener("DOMContentLoaded", async () => {
  const cartCountSpan = document.getElementById("cart-count");
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
    const loadingMessage = document.getElementById("loading-message");
    if (loadingMessage) {
      loadingMessage.innerText = "LOADING PRODUCTS...";
    }

    const tableBody = document.getElementById("product-grid");
    try {
      const response = await fetch(`/products?categoryID=${categoryID}`);
      const products = await response.json();
      // console.log("Product ",products);
      // const pricesResponse = await fetch("/product-prices");
      // const prices = await pricesResponse.json();

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
        loadingMessage.innerText = "Error loading products. Please try again.";
      }
    }
  }

  // Function to display a batch of products
  function displayBatch(products, start, end, tableBody) {
    const batch = products.slice(start, end);

    // Helper function to generate stars from rating
    function generateStars(rating) {
      const fullStars = Math.round(rating);
      let starsHTML = '';
      for (let i = 0; i < fullStars; i++) {
        starsHTML += '⭐';
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
                    product.offer_price != null ?`<p  > <img src="./assets/image2/off-image.png" class="Offer-avail" ></img></p>` : ``
                  }
                <img src="${
                  product.image_url || ""
                }" alt="Product Image" loading="lazy"
                  onload="this.style.opacity='1'" />
                <div class="product-details">
                  <h3>${product.product_name || "No Description"}</h3>
                  <p id="pric">${
                    product.trade_names
                      ? product.trade_names.split(",")[0].trim()
                      : ""
                  }</p>
                  ${
                    product.category_id == 1
                      ? `<p style="font-weight: bold;">(4-5 Day's Delivery)</p>`
                      : `<p style="font-weight: bold;"></p>`
                  }
                  <div class="rating">
                    <small class="rating__count">${generateStars(product.rating)}</small>
                  </div>
                  <div class="product-buttons">
                    <a href="./product_overview.html?product_ID=${
                      product.product_id
                    }"> 
                      <button class="buy-btn"> Buy Now </button>
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

    const searchInput = document.getElementById("search-input");
    const searchButton = document.getElementById("search-button");
    const suggestionBox = document.getElementById("suggestions");

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
      if (!e.target.closest(".search")) {
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
    searchButton.addEventListener("click", handleSearch);
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

    searchButton.addEventListener("click", filterProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
  }
}

buildProductSearch();
