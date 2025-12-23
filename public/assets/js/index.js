window.$crisp = [];
window.CRISP_WEBSITE_ID = "68987257-808e-403d-a06c-35b3ec18c3ef";
(function () {
  var d = document;
  var s = d.createElement("script");
  s.src = "https://client.crisp.chat/l.js";
  s.async = 1;
  d.getElementsByTagName("head")[0].appendChild(s);
})();

// No. of items in cart
document.addEventListener("DOMContentLoaded", async () => {
  const cartCountSpan = document.querySelector(".cart-badge");

  try {
    // Check if cart count exists in local storage
    // const storedCartCount = localStorage.getItem("cartCount");

    // if (storedCartCount !== null) {
    //   cartCountSpan.textContent = storedCartCount;
    //   cartCountSpan.style.display = "inline-block";
    //   return;
    // }

    // Fetch the cart count for the logged-in user
    const response = await fetch("/api/cart/count");
    const result = await response.json();

    if (result.success) {
      const cartCount = result.count;
      // Store cart count in local storage
      localStorage.setItem("cartCount", parseInt(cartCount));
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

// Initialize hero search functionality
document.addEventListener("DOMContentLoaded", function () {
  initHeroSearch();
  buildProductSearch();
});

// Get product data (from Local Storage or API)
async function getProducts() {
  const cached = localStorage.getItem("SearchProducts");

  if (cached) {
    return JSON.parse(cached); // Use localStorage data
  }

  const response = await fetch("/products");
  const products = await response.json();
  if (!products || !Array.isArray(products)) {
    throw new Error("Invalid product data");
  }
  else{
    console.log("Fetched products from API:", products);
  }
  localStorage.setItem("SearchProducts", JSON.stringify(products)); // Save data
  return products;
}

async function initHeroSearch() {
  try {
    const products = await getProducts();
    // console.log("Hero Search Products:", products);

    const heroSearchInput = document.querySelector(".search-input");
    const heroSearchButton = document.querySelector(".search-submit");
    const heroSuggestionBox = document.getElementById("hero-suggestions");

    if (!heroSearchInput || !heroSearchButton) return;

    // Real-time suggestions for hero search
    heroSearchInput.addEventListener("input", () => {
      const query = heroSearchInput.value.trim().toLowerCase();
      heroSuggestionBox.innerHTML = "";

      if (!query) {
        heroSuggestionBox.style.display = "none";
        return;
      }

      const matches = products.filter((product) =>
        product.product_name.toLowerCase().includes(query)
      );

      if (matches.length > 0) {
        matches.forEach((product) => {
          const li = document.createElement("li");

          const img = document.createElement("img");
          img.src = product.image_url || "assets/image/default.png";
          img.alt = product.product_name;
          img.style.width = "50px";
          img.style.height = "50px";
          img.style.objectFit = "cover";
          img.style.marginRight = "10px";
          img.style.borderRadius = "5px";

          const span = document.createElement("span");
          span.textContent = product.product_name;

          li.appendChild(img);
          li.appendChild(span);

          li.onclick = () => {
            window.location.href = `product_overview.html?product_ID=${product.product_id}`;
          };

          heroSuggestionBox.appendChild(li);
        });
        heroSuggestionBox.style.display = "block";
      } else {
        heroSuggestionBox.style.display = "none";
      }
    });

    // Hide suggestions when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-container")) {
        heroSuggestionBox.style.display = "none";
      }
    });

    // Handle search
    function handleHeroSearch() {
      const query = heroSearchInput.value.trim();
      const matchingProduct = products.find(
        (product) => product.product_name.toLowerCase() === query.toLowerCase()
      );

      if (matchingProduct) {
        window.location.href = `product_overview.html?product_ID=${matchingProduct.product_id}`;
      } else if (query) {
        alert("No exact matching product found.");
      }
    }

    // Button click and Enter key handling
    heroSearchButton.addEventListener("click", handleHeroSearch);
    heroSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleHeroSearch();
      }
    });
  } catch (err) {
    console.log("Error loading Hero Search:", err);
  }
}

// Header search functionality
async function buildProductSearch() {
  try {
    const products = await getProducts();

    const searchInput = document.getElementById("search-input");
    const searchButton = document.querySelector(".search-btn");
    const suggestionBox = document.getElementById("suggestions");

    if (!searchInput || !searchButton) return;

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
        matches.forEach((product) => {
          const li = document.createElement("li");

          const img = document.createElement("img");
          img.src = product.image_url || "assets/image/default.png";
          img.alt = product.product_name;
          img.className = "suggestion-image";
          img.style.width = "50px";
          img.style.height = "50px";
          img.style.objectFit = "cover";
          img.style.marginRight = "10px";
          img.style.borderRadius = "5px";

          const span = document.createElement("span");
          span.textContent = product.product_name;

          li.appendChild(img);
          li.appendChild(span);

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

// DRAG-TO-SCROLL FOR CATEGORIES (Updated selector)
const carousel = document.querySelector(".categories-grid");
if (carousel) {
  let isDown = false,
    startX,
    scrollLeft;

  carousel.addEventListener("mousedown", (e) => {
    isDown = true;
    carousel.classList.add("active");
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
  });

  carousel.addEventListener("mouseleave", () => {
    isDown = false;
    carousel.classList.remove("active");
  });

  carousel.addEventListener("mouseup", () => {
    isDown = false;
    carousel.classList.remove("active");
  });

  carousel.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - carousel.offsetLeft;
    const walk = (x - startX) * 1;
    carousel.scrollLeft = scrollLeft - walk;
  });
}

// NAV DROPDOWN TOGGLE
const navButtons = document.querySelectorAll(".nav__btn");
document.addEventListener("click", (e) => {
  // if clicked on a nav button, toggle its menu
  const btn = e.target.closest(".nav__btn");
  if (btn) {
    const key = btn.dataset.menu;
    const menu = document.getElementById(`menu-${key}`);

    // close others
    navButtons.forEach((b) => {
      const other = document.getElementById(`menu-${b.dataset.menu}`);
      if (b !== btn) {
        b.classList.remove("active");
        other.style.display = "none";
      }
    });

    // toggle this one
    const isOpen = btn.classList.toggle("active");
    menu.style.display = isOpen ? "block" : "none";

    return;
  }

  // click elsewhere? close all
  navButtons.forEach((b) => {
    const m = document.getElementById(`menu-${b.dataset.menu}`);
    b.classList.remove("active");
    m.style.display = "none";
  });
});

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("testimonials-grid");

  try {
    // Fetch all verified reviews (top 6, for example)
    const res = await fetch("/api/reviews");
    const data = await res.json();

    if (!data.success || !data.reviews?.length) {
      container.innerHTML = "<p>No customer reviews yet.</p>";
      return;
    }
 
    // Filter verified reviews only
    const verifiedReviews = data.reviews.filter((r) => r.verified);

    if (!verifiedReviews.length) {
      container.innerHTML = "<p>No verified customer reviews yet.</p>";
      return;
    }

    // Build testimonials HTML
    container.innerHTML = verifiedReviews
      .slice(0, 6) // limit to top 6 reviews
      .map(
        (r) => `
        <div class="testimonial">
          <div class="stars">${"★".repeat(r.rating)}</div>
          <p class="testimonial-text">
            "${r.review_text}"
          </p>
          <p class="testimonial-author">— ${r.name}</p>
          <div class="verified-purchase">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Verified Purchase
          </div>
        </div>
      `
      )
      .join("");
  } catch (err) {
    console.error("Error fetching reviews:", err);
    container.innerHTML =
      "<p>Failed to load reviews. Please try again later.</p>";
  }
});

// Your banner images
const heroImages = [
  "assets/image2/christmas.png"
];

if (heroImages.length === 0) {
  console.log("No hero images available.");
} else {
  let currentIndex = 0;
  // Set styles for hero-section class
  // const heropartSection = document.querySelector(".hero-container");
  // heropartSection.style.maxWidth = "800px";
  // heropartSection.style.margin = "0 auto";
  // heropartSection.style.color = "black";
  // heropartSection.style.position = "relative";
  // heropartSection.style.zIndex = "1";
  // heropartSection.style.animation = "fadeInDown 0.8s ease-out";
  // heropartSection.style.ease - out;

  // Select the hero section
  const heroSection = document.querySelector(".hero");
  // Smooth fade animation
  heroSection.style.transition = "background-image 1.5s ease-in-out";

  function changeHeroImage() {
    currentIndex = (currentIndex + 1) % heroImages.length;
    heroSection.style.backgroundImage = `url(assets/image2/christmas.png)`;
    // heroSection.style.backgroundSize = "contain";
    heroSection.style.backgroundPosition = "center";
    // heroSection.style.height = "80vh";
    heroSection.style.width = "100vw";
  }

  // Set first image immediately
  heroSection.style.backgroundImage = `url(${heroImages[0]})`;

  // Change image every 5 seconds
  setInterval(changeHeroImage, 5000);
}

  document.querySelector('.hero').addEventListener('click', function(e) {
  // Only redirect if clicking the background, not inner elements
  if (e.target === this || e.target === this.querySelector('::before')) {
    window.location.href = 'categories.html?catogeries_ID=1';
  }
});
