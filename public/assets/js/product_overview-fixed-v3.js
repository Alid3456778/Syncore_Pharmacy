window.$crisp = [];
window.CRISP_WEBSITE_ID = "68987257-808e-403d-a06c-35b3ec18c3ef";
(function () {
  var d = document;
  var s = d.createElement("script");
  s.src = "https://client.crisp.chat/l.js";
  s.async = 1;
  d.getElementsByTagName("head")[0].appendChild(s);
})();

// ============================================
// GLOBAL VARIABLES FOR PRODUCT DATA
// ============================================
let name_dabba = "";        // Product name
let imgg = "";              // Product image URL
let categoryId = 0;         // Category ID

// ============================================
// CART COUNT FUNCTIONALITY
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
  const cartCountSpan = document.getElementById("cart-count");
  
  if (!cartCountSpan) {
    console.warn("cart-count element not found in HTML. Add: <span id=\"cart-count\">0</span> to navbar");
    return;
  }

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

// ============================================
// PRODUCT VARIANTS & MG BUTTONS
// ============================================

function setupProductVariants(variants) {
  const buttonContainer = document.getElementById("button-container");
  
  if (!buttonContainer) {
    console.warn("button-container element not found. Add: <div id=\"button-container\"></div>");
    return;
  }

  const uniqueVariants = [
    ...new Set(
      variants.map((variant) => `${variant.unit_value} ${variant.unit_type}`)
    ),
  ];

  buttonContainer.innerHTML = "";

  uniqueVariants.forEach((variant, index) => {
    const button = document.createElement("button");
    button.className = "btn--toggle";
    if (index === 0) button.classList.add("btn--active");
    button.textContent = variant;
    button.setAttribute("data-variant", variant);

    button.addEventListener("click", () => {
      document
        .querySelectorAll(".btn--toggle")
        .forEach((btn) => btn.classList.remove("btn--active"));
      
      button.classList.add("btn--active");

      const [unitValue, unitType] = variant.split(" ");
      displayVariantOptions(variants, unitValue, unitType);
    });

    buttonContainer.appendChild(button);

    if (index === 0) {
      const [unitValue, unitType] = variant.split(" ");
      displayVariantOptions(variants, unitValue, unitType);
    }
  });
}

function displayVariantOptions(variants, selectedMg, unitType) {
  const tableBody = document.getElementById("popil");
  
  if (!tableBody) {
    console.warn("popil element (table body) not found. Add: <tbody id=\"popil\"></tbody>");
    return;
  }

  tableBody.innerHTML = "";

  const matchingVariants = variants.filter(
    (variant) => variant.unit_value === selectedMg
  );

  matchingVariants.sort((a, b) => a.qty - b.qty);

  const fragment = document.createDocumentFragment();

  matchingVariants.forEach((variant) => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-mg", variant.unit_value);

    let finalPrice = variant.offer_price
      ? variant.offer_price
      : variant.price_per_box;

    let priceHtml = variant.offer_price
      ? `<span style="text-decoration: line-through; color: #999;">
           ${variant.price_per_box}
         </span>
         <span style="color: green; font-weight: bold;">
           ${variant.offer_price}
         </span>`
      : `${variant.price_per_box}`;

    tr.innerHTML = `
      <td>${variant.qty}</td>
      <td>${variant.price_per_pill || "0.00"} per pill</td>
      <td>${priceHtml}</td>
      <td>
        <button class="btn--add" 
          data-variant-id="${variant.product_id}"
          data-catogary-id="${variant.category_id}"
          data-quantity="${variant.qty}"
          data-mg="${variant.unit_type}${variant.unit_value}"
          data-price="${finalPrice}">
          Add To Cart
        </button>
      </td>
    `;

    fragment.appendChild(tr);
  });

  tableBody.appendChild(fragment);
  setupAddToCartButtons();
}

// ============================================
// SETUP ADD TO CART BUTTONS (FIXED)
// ============================================
function setupAddToCartButtons() {
  document.querySelectorAll(".btn--add").forEach((button) => {
    button.addEventListener("click", function () {
      // Get data from button attributes
      const variantId = this.getAttribute("data-variant-id");
      const quantity = this.getAttribute("data-quantity") || 1;
      const categoryIdFromButton = this.getAttribute("data-catogary-id");
      const mg = this.getAttribute("data-mg") || "default_mg_value";
      const price = this.getAttribute("data-price").replace(/[^0-9,.]/g, "") || "0";

      // ✅ USE GLOBAL VARIABLES SET FROM API WITH FALLBACK
      const finalCategoryId = categoryIdFromButton || categoryId || 0;

      console.log("Adding to cart:", {
        variantId,
        quantity,
        categoryId: finalCategoryId,
        mg,
        price,
        name: name_dabba,
        image: imgg
      });

      // Call addToCart with all required parameters
      addToCart(
        variantId,
        finalCategoryId,
        quantity,
        mg,
        price,
        name_dabba,
        imgg
      );
    });
  });
}

// ============================================
// ADD TO CART - SEND TO BACKEND
// ============================================
function addToCart(variantId, categoryId, quantity, mg, price, name, image_url) {
  // Validate parameters - be lenient, use fallbacks
  if (!variantId || !quantity) {
    console.error("Missing critical parameters:", {
      variantId, quantity
    });
    alert("Error: Missing product information. Please try again.");
    return;
  }

  // Ensure numeric categoryId
  const validCategoryId = parseInt(categoryId) || 0;

  fetch("/add-to-cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: variantId,
      quantity: quantity,
      mg: mg || "N/A",
      price: price || "0",
      name: name || "Unknown Product",
      image_url: image_url || "./assets/placeholder.jpg",
      categoryId: validCategoryId,  // ✅ Ensure it's a number
    }),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        // Update cart count in navbar
        const cartCount = result.cartCount || parseInt(localStorage.getItem("cartCount") || 0) + 1;
        localStorage.setItem("cartCount", cartCount);
        
        const cartCountSpan = document.getElementById("cart-count");
        if (cartCountSpan) {
          cartCountSpan.textContent = cartCount;
          cartCountSpan.style.display = "inline-block";
        }

        // alert(`✓ Added ${quantity} tablets to cart!`);
      } else {
        alert("Error: " + result.message);
      }
    })
    .catch((error) => {
      console.error("Error adding to cart:", error);
      alert("Server error, please try again later.");
    });
}

// ============================================
// LOAD PRODUCT DETAILS
// ============================================
async function loadProductDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const productID = urlParams.get("product_ID");

  if (!productID) {
    showError("Product ID not found in URL");
    return;
  }

  try {
    const response = await fetch(`/api/product?product_ID=${productID}`);
    const { product, variants } = await response.json();

    buildProductSearch();
    updateProductUI(product, variants);
    updateMetaTags(product);
    
    // ✅ SAFE: Won't crash if API doesn't exist
    loadReviewsIfAvailable(productID);
  } catch (error) {
    console.error("Error loading product details:", error);
    showError("Failed to load product details. Please try again later.");
  }
}

// ============================================
// UPDATE PRODUCT UI (POPULATE ALL DATA)
// ============================================
function updateProductUI(product, variants) {
  // console.log("Product ",product);
  // ✅ SET GLOBAL VARIABLES WITH FALLBACKS
  name_dabba = product.product_name || "Unknown Product";
  imgg = product.image_url || "./assets/placeholder.jpg";
  categoryId = product.category_id || 0;

  console.log("Product data loaded:", { 
    name: name_dabba, 
    image: imgg, 
    categoryId: categoryId,
    type: typeof categoryId
  });

  if(document.getElementById("productBreadcrumb")){
    document.getElementById("productBreadcrumb").textContent= product.product_name || "Product";
  }

  // Update product title
  if (document.getElementById("productTitle")) {
    document.getElementById("productTitle").textContent = product.product_name || "Product";
  }

  // Update product category
  if (document.getElementById("productCategory")) {
    document.getElementById("productCategory").textContent = product.category_name || "Uncategorized";
  }

  // Update pricing
  if (document.getElementById("currentPrice")) {
    document.getElementById("currentPrice").textContent = `$${product.price || 0}`;
  }

  if (document.getElementById("originalPrice") && product.original_price) {
    document.getElementById("originalPrice").textContent = `$${product.original_price}`;
  }

  // Update ratings
  if (document.getElementById("ratingNumber")) {
    document.getElementById("ratingNumber").textContent = product.rating || "4.5";
  }

  if (document.getElementById("reviewCount")) {
    document.getElementById("reviewCount").textContent = `(${product.review_count || 0} reviews)`;
  }

  // ============================================
  // ✅ POPULATE TAB 1: DESCRIPTION
  // ============================================
  if (document.getElementById("productDescription")) {
    document.getElementById("productDescription").textContent = 
      product.product_description || "No description available";
  }

  // ============================================
  // ✅ POPULATE TAB 2: DETAILS
  // ============================================
  if (document.getElementById("productDetailsList")) {
    document.getElementById("productDetailsList").innerHTML = `
      <li>
        <strong>Manufacturer:</strong>
        <span>${product.manufacturer || "Not specified"}</span>
      </li>
      <li>
        <strong>Active Ingredient:</strong>
        <span>${product.ingredients || "Not specified"}</span>
      </li>
      <li>
        <strong>Storage:</strong>
        <span>${product.storage}</span>
      </li>
      <li>
        <strong>User Instruction:</strong>
        <span>${product.usage_instructions}</span>
      </li>
    `;
  }

  if(document.getElementById("description-text")){
    document.getElementById("description-text").textContent= product.usage_instructions;
  }

  // ============================================
  // ✅ POPULATE TAB 3: HOW TO USE
  // ============================================
  if (document.getElementById("usage")) {
    const usageInstructions = product.usage_instructions || [];
    
      document.getElementById("usage").innerHTML = `
        <div class="description-text">
          ${usageInstructions}
        </div>
      `;
   
  }

  // Update stock status
  if (document.getElementById("stockStatus")) {
    if (product.stocks === 0) {
      document.getElementById("stockStatus").innerHTML = 
        '<span style="color: red;">❌ Out of Stock</span>';
    }
  }

  // ============================================
  // ✅ MAIN IMAGE UPDATE
  // ============================================
  if (document.getElementById("mainImage")) {
    document.getElementById("mainImage").innerHTML = `
      <img src="${product.image_url}" class="product-image" alt="Product image">
    `;
  }

  // ============================================
  // ✅ THUMBNAIL IMAGES WITH DATA ATTRIBUTES
  // ============================================
  if (document.getElementById("thumbnail-images")) {
    document.getElementById("thumbnail-images").innerHTML = `
      <div class="thumbnail active" data-image="${product.image_url}">
        <img src="${product.image_url}" class="product-image" alt="Product main image">
      </div>
      <div class="thumbnail" data-image="${product.addtional_img1 || product.image_url}">
        <img src="${product.addtional_img1 || product.image_url}" class="product-image" alt="Product image 2">
      </div>
      <div class="thumbnail" data-image="${product.addtional_img2 || product.image_url}">
        <img src="${product.addtional_img2 || product.image_url}" class="product-image" alt="Product image 3">
      </div>
      <div class="thumbnail" data-image="${product.addtional_img3 || product.image_url}">
        <img src="${product.addtional_img3 || product.image_url}" class="product-image" alt="Product image 4">
      </div>
    `;
    
    // ✅ ATTACH EVENT LISTENERS AFTER CREATING THUMBNAILS!
    setupThumbnailListeners();
  }

  // Handle out of stock
  if (product.stocks === 0) {
    const tableBody = document.getElementById("popil");
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: red; padding: 2rem; font-weight: 600;">
            ❌ Out of Stock
          </td>
        </tr>
      `;
    }
  } else {
    // Setup product variants (MG buttons and table)
    if (variants && variants.length > 0) {
      setupProductVariants(variants);
    }
  }
}

// ============================================
// ✅ SETUP THUMBNAIL EVENT LISTENERS
// ============================================
function setupThumbnailListeners() {
  const mainImage = document.getElementById("mainImage");
  const thumbnails = document.querySelectorAll(".thumbnail");

  if (!mainImage || thumbnails.length === 0) {
    console.warn("Thumbnail elements not found. Check HTML structure.");
    return;
  }

  thumbnails.forEach((thumb) => {
    thumb.addEventListener("click", function () {
      // Get the image URL from data attribute
      const imageUrl = this.getAttribute("data-image");

      if (!imageUrl) {
        console.warn("No image URL found on thumbnail");
        return;
      }

      // Remove active class from all thumbnails
      thumbnails.forEach((t) => t.classList.remove("active"));

      // Add active class to clicked thumbnail
      this.classList.add("active");

      // ✅ UPDATE MAIN IMAGE WITH ACTUAL IMAGE URL
      mainImage.innerHTML = `
        <img src="${imageUrl}" class="product-image" alt="Product image">
      `;

      console.log("✅ Image updated to:", imageUrl);
    });
  });

  console.log("✅ Thumbnail listeners attached successfully!");
}

function updateMetaTags(product) {
  if (!product || !product.product_name || !product.product_description) {
    console.warn("Product data missing required fields for meta tags");
    return;
  }

  document.title = product.product_name + " | XYZ Medical";

  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement("meta");
    metaDescription.setAttribute("name", "description");
    document.head.appendChild(metaDescription);
  }
  metaDescription.setAttribute("content", product.product_description);
}

function showError(message) {
  const container = document.querySelector(".product-container") || document.body;
  container.innerHTML = `
    <div style="padding: 2rem; text-align: center; color: #d32f2f; background: #ffebee; border-radius: 8px; margin: 2rem;">
      <h2>⚠️ Error</h2>
      <p>${message}</p>
      <a href="categories.html" style="color: #0066CC; text-decoration: none; font-weight: 600;">← Back to Categories</a>
    </div>
  `;
}

// ============================================
// ✅ TAB SWITCHING FUNCTIONALITY
// ============================================
function switchTab(tabName) {
  // Get all tab buttons and content divs
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  if (tabButtons.length === 0 || tabContents.length === 0) {
    console.warn("Tab elements not found in HTML");
    return;
  }

  // Remove active class from all buttons
  tabButtons.forEach((btn) => {
    btn.classList.remove("active");
  });

  // Remove active class from all content divs
  tabContents.forEach((content) => {
    content.classList.remove("active");
  });

  // Add active class to clicked button
  if (event && event.target) {
    event.target.classList.add("active");
  }

  // Add active class to corresponding content
  const selectedTab = document.getElementById(tabName);
  if (selectedTab) {
    selectedTab.classList.add("active");
    console.log(`✅ Switched to tab: ${tabName}`);
  } else {
    console.warn(`⚠️ Tab with id "${tabName}" not found`);
  }
}

// ============================================
// REVIEWS FUNCTIONALITY (OPTIONAL/SAFE)
// ============================================

function loadReviewsIfAvailable(productID) {
  const reviewsList = document.getElementById('reviews-list');
  if (!reviewsList) return;

  fetch(`/api/product/${productID}/reviews`)
    .then(response => {
      if (!response.ok) {
        console.warn(`Reviews API not available: ${response.status}`);
        reviewsList.innerHTML = '<p class="no-reviews">Reviews coming soon!</p>';
        return null;
      }
      return response.json();
    })
    .then(data => {
      if (data && data.reviews) {
        displayReviews(data.reviews);
      }
    })
    .catch(error => {
      console.warn("Reviews API not yet implemented:", error.message);
      const reviewsList = document.getElementById('reviews-list');
      if (reviewsList) {
        reviewsList.innerHTML = '<p class="no-reviews">Reviews coming soon!</p>';
      }
    });
}

function displayReviews(reviews) {
  const reviewsList = document.getElementById('reviews-list');
  if (!reviewsList) return;

  if (!reviews || reviews.length === 0) {
    reviewsList.innerHTML = '<p class="no-reviews">No reviews yet. Be the first to review!</p>';
    return;
  }

  reviewsList.innerHTML = reviews.map(review => `
    <div class="review-item">
      <div class="review-header">
        <div class="reviewer-info">
          <p class="reviewer-name">${review.reviewer_name || 'Anonymous'}</p>
          <p class="review-date">${new Date(review.created_at).toLocaleDateString()}</p>
        </div>
        <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
      </div>
      <h4 class="review-title">${review.review_title}</h4>
      <p class="review-text">${review.review_comment}</p>
    </div>
  `).join('');
}

function setupReviewForm() {
  const reviewForm = document.getElementById('review-form');
  if (!reviewForm) return;

  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productID = new URLSearchParams(window.location.search).get('product_ID');
    const formData = {
      product_id: productID,
      reviewer_name: document.getElementById('reviewer-name').value,
      reviewer_email: document.getElementById('reviewer-email').value,
      rating: document.querySelector('input[name="rating"]:checked').value,
      review_title: document.getElementById('reviewer-title').value,
      review_comment: document.getElementById('reviewer-comment').value,
    };

    try {
      const response = await fetch('/api/reviews/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      const messageEl = document.getElementById('review-message');

      if (result.success) {
        messageEl.className = 'review-message success';
        messageEl.textContent = '✓ Review submitted successfully!';
        reviewForm.reset();
        
        setTimeout(() => {
          loadReviewsIfAvailable(productID);
          messageEl.className = 'review-message';
          messageEl.textContent = '';
        }, 1500);
      } else {
        messageEl.className = 'review-message error';
        messageEl.textContent = '✗ Error: ' + result.message;
      }
    } catch (error) {
      document.getElementById('review-message').className = 'review-message error';
      document.getElementById('review-message').textContent = '✗ Reviews API not yet available';
      console.warn('Reviews API not yet implemented:', error.message);
    }
  });
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

async function buildProductSearch() {
  try {
    const searchInput = document.getElementById("search-input");
    const searchButton = document.getElementById("search-button");

    if (!searchInput) {
      console.warn("search-input element not found. Search functionality disabled.");
      return;
    }

    let suggestions = document.getElementById("suggestions");

    if (!suggestions) {
      suggestions = document.createElement("div");
      suggestions.id = "suggestions";
      suggestions.className = "suggestions-box";
      searchInput.parentElement.style.position = "relative";
      searchInput.parentElement.appendChild(suggestions);
    }

    const productsResponse = await fetch("/products");
    const products = await productsResponse.json();

    localStorage.setItem("SearchProducts", JSON.stringify(products));

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();
      suggestions.innerHTML = "";

      if (!query) {
        suggestions.style.display = "none";
        return;
      }

      const matches = products.filter((product) =>
        product.product_name.toLowerCase().includes(query)
      );

      if (matches.length > 0) {
        const ul = document.createElement("ul");
        ul.style.cssText = "list-style: none; margin: 0; padding: 0;";

        matches.slice(0, 5).forEach((product) => {
          const li = document.createElement("li");
          li.textContent = product.product_name;
          li.style.cssText = `padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #f0f0f0;`;
          li.onmouseover = () => (li.style.backgroundColor = "#f5f5f5");
          li.onmouseout = () => (li.style.backgroundColor = "white");
          li.onclick = () => {
            searchInput.value = product.product_name;
            suggestions.style.display = "none";
            handleSearch(products);
          };
          ul.appendChild(li);
        });

        suggestions.appendChild(ul);
        suggestions.style.display = "block";
      }
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-container")) {
        suggestions.style.display = "none";
      }
    });

    function handleSearch(products) {
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

    if (searchButton) {
      searchButton.addEventListener("click", () => handleSearch(products));
    }

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSearch(products);
      }
    });
  } catch (error) {
    console.error("Error setting up product search:", error);
  }
}

// ============================================
// CAROUSEL & ZOOM
// ============================================

function setupCarousel() {
  const carousel = document.querySelector(".carousel__slide");
  if (!carousel) return;

  let currentSlide = 0;

  function showSlide(index) {
    const containers = carousel.querySelectorAll(".zoom-container");
    if (containers.length === 0) return;

    containers.forEach((container, i) => {
      container.style.display = i === index ? "flex" : "none";
    });
  }

  function addHoverZoom(img, container) {
    if (!img || !container) return;

    img.addEventListener("mouseenter", () => {
      if (window.innerWidth > 768) {
        img.style.transform = "scale(2)";
        img.style.cursor = "zoom-in";
      }
    });

    img.addEventListener("mouseleave", () => {
      img.style.transform = "scale(1)";
    });
  }

  carousel.querySelectorAll("img").forEach((img) => {
    addHoverZoom(img, img.parentElement);
  });

  const prevButton = document.getElementById("prevSlide");
  const nextButton = document.getElementById("nextSlide");

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      currentSlide = (currentSlide - 1 + carousel.querySelectorAll(".zoom-container").length) % 
                     carousel.querySelectorAll(".zoom-container").length;
      showSlide(currentSlide);
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      currentSlide = (currentSlide + 1) % carousel.querySelectorAll(".zoom-container").length;
      showSlide(currentSlide);
    });
  }

  showSlide(0);
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  loadProductDetails();
  setupCarousel();
  setupReviewForm();
});

function refreshPage() {
  window.location.reload();
}
