window.$crisp = [];
window.CRISP_WEBSITE_ID = "68987257-808e-403d-a06c-35b3ec18c3ef";
(function () {
  var d = document;
  var s = d.createElement("script");
  s.src = "https://client.crisp.chat/l.js";
  s.async = 1;
  d.getElementsByTagName("head")[0].appendChild(s);
})();

//cart count script
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
    // Fetch the cart count for the logged-in user
    const response = await fetch("/api/cart/count"); // Adjust endpoint as needed
    const result = await response.json();
    // Store cart count in local storage
    localStorage.setItem("cartCount", cartCount);
    if (result.success) {
      const cartCount = result.count; // Get the count from the response
      if (cartCount > 0) {
        cartCountSpan.textContent = cartCount; // Update badge content
        cartCountSpan.style.display = "inline-block"; // Show badge
      }
    } else {
      console.error("Failed to fetch cart count:", result.message);
    }
  } catch (error) {
    console.error("Error fetching cart count:", error);
  }
});

// Enhanced Image carousel functionality with zoom
function setupCarousel() {
  const carousel = document.querySelector(".carousel__slide");
  const prevButton = document.getElementById("prevSlide");
  const nextButton = document.getElementById("nextSlide");
  let currentSlide = 0;

  function showSlide(index) {
    const containers = carousel.querySelectorAll(".zoom-container");
    if (containers.length === 0) return;

    containers.forEach((container, i) => {
      container.style.display = i === index ? "flex" : "none";
    });
  }

  function addHoverZoom(img, container) {
    img.addEventListener("mouseenter", () => {
      if (window.innerWidth > 768) {
        img.style.transform = "scale(5)";
        img.style.cursor = "zoom-in";
      }
    });

    img.addEventListener("mouseleave", () => {
      img.style.transform = "scale(1)";
    });

    img.addEventListener("mousemove", (e) => {
      if (window.innerWidth > 768) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;

        img.style.transformOrigin = `${xPercent}% ${yPercent}%`;
      }
    });
  }

  function openZoom(imageSrc) {
    const zoomOverlay = document.getElementById("zoomOverlay");
    const zoomedImage = document.getElementById("zoomedImage");

    zoomedImage.src = imageSrc;
    zoomOverlay.classList.add("active");
    document.body.style.overflow = "hidden";

    setupZoomInteraction(zoomedImage);
  }

  function setupZoomInteraction(img) {
    let scale = 1;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let translateX = 0;
    let translateY = 0;

    img.style.transform = "scale(3) translate(0, 0)";
    scale = 1;
    translateX = 0;
    translateY = 0;

    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      scale += delta;
      scale = Math.min(Math.max(0.5, scale), 3);

      img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
    };

    const handleClick = (e) => {
      if (!isDragging) {
        scale = scale > 1 ? 1 : 2;
        translateX = 0;
        translateY = 0;
        img.style.transform = `scale(${scale}) translate(0, 0)`;
      }
    };

    const handleMouseDown = (e) => {
      if (scale > 1) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        img.style.cursor = "grabbing";
      }
    };

    const handleMouseMove = (e) => {
      if (isDragging && scale > 1) {
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
      img.style.cursor = scale > 1 ? "grab" : "zoom-in";
    };

    img.addEventListener("wheel", handleWheel);
    img.addEventListener("click", handleClick);
    img.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  function closeZoom() {
    const zoomOverlay = document.getElementById("zoomOverlay");
    zoomOverlay.classList.remove("active");
    document.body.style.overflow = "auto";
  }

  function initCarousel() {
    const images = carousel.querySelectorAll("img");
    if (images.length === 0) return;

    // Clear carousel and rebuild with zoom containers
    carousel.innerHTML = "";

    Array.from(images).forEach((img, index) => {
      const zoomContainer = document.createElement("div");
      zoomContainer.className = "zoom-container";
      zoomContainer.style.display = index === 0 ? "flex" : "none";

      const newImg = img.cloneNode(true);
      newImg.addEventListener("click", () => openZoom(newImg.src));

      addHoverZoom(newImg, zoomContainer);

      zoomContainer.appendChild(newImg);
      carousel.appendChild(zoomContainer);
    });

    showSlide(currentSlide);

    // Navigation events
    prevButton.addEventListener("click", () => {
      const containers = carousel.querySelectorAll(".zoom-container");
      currentSlide = (currentSlide - 1 + containers.length) % containers.length;
      showSlide(currentSlide);
    });

    nextButton.addEventListener("click", () => {
      const containers = carousel.querySelectorAll(".zoom-container");
      currentSlide = (currentSlide + 1) % containers.length;
      showSlide(currentSlide);
    });

    // Zoom overlay events
    document.getElementById("zoomClose").addEventListener("click", closeZoom);
    document.getElementById("zoomOverlay").addEventListener("click", (e) => {
      if (e.target.id === "zoomOverlay") closeZoom();
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      const zoomOverlay = document.getElementById("zoomOverlay");
      if (zoomOverlay.classList.contains("active")) {
        if (e.key === "Escape") closeZoom();
      }
      if (e.key === "ArrowLeft") {
        const containers = carousel.querySelectorAll(".zoom-container");
        currentSlide =
          (currentSlide - 1 + containers.length) % containers.length;
        showSlide(currentSlide);
      }
      if (e.key === "ArrowRight") {
        const containers = carousel.querySelectorAll(".zoom-container");
        currentSlide = (currentSlide + 1) % containers.length;
        showSlide(currentSlide);
      }
    });
  }

  // Observer to initialize carousel after images are loaded
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === "childList" &&
        carousel.querySelectorAll("img").length > 0
      ) {
        initCarousel();
        observer.disconnect();
      }
    });
  });

  observer.observe(carousel, { childList: true });
}

let name_dabba = "";
let imgg = "";
let categoryId = 0;
// Fetch product details from API based on the product_ID in the URL
async function fetchProductDetails() {
  // Show loading indicators
  document.getElementById("nameing_of_product").innerHTML = "Loading...";
  document.getElementById("differ").innerHTML =
    '<div class="loading-spinner"></div>';
  document.getElementById("three-box-section").innerHTML =
    '<div class="loading-spinner"></div>';

  // Get product_ID from URL (expected format: /product?product_ID=5)
  const urlParams = new URLSearchParams(window.location.search);
  const productID = urlParams.get("product_ID");

  if (!productID) {
    showError("Product ID not found in URL");
    return;
  }

  try {
    // Fetch product details and variants from the API
    const resp = await fetch(`/api/product?product_ID=${productID}`);
    const { product, variants } = await resp.json();

    buildProductSearch();
    updateProductUI(product, variants);

    updateMetaTags(product);
  } catch (error) {
    console.error("Error fetching product details:", error);
    showError("Failed to load product details. Please try again later.");
  }
}

function updateMetaTags(product) {
  if (!product || !product.product_name || !product.product_description) {
    console.error(
      "Product data is missing required fields (name, short_description)."
    );
    return;
  }

  const brandName = "MCland Pharma"; // Use a default if brand is missing

  // --- 1. Construct the content ---

  // Optimized Title: Product Name | Benefit/Category - Brand
  const pageTitle = `${product.product_name} | Order Online - ${brandName}`;

  // Optimized Description: Use the short_description, ensuring it includes key terms and brand
  const pageDescription = `Buy ${product.product_name} from ${brandName}. ${product.product_description} Get secure delivery for genuine medications.`;

  // --- 2. Update/Create the <title> tag ---

  document.title = pageTitle;

  // --- 3. Update/Create the <meta description> tag ---

  // Try to find the existing meta description tag
  let metaDescriptionTag = document.head.querySelector(
    'meta[name="description"]'
  );

  if (!metaDescriptionTag) {
    // If it doesn't exist, create a new one
    metaDescriptionTag = document.createElement("meta");
    metaDescriptionTag.name = "description";
    document.head.appendChild(metaDescriptionTag);
  }

  // Set the content
  metaDescriptionTag.content = pageDescription;

  // --- OPTIONAL: Add Meta Author (If needed) ---
  let metaAuthorTag = document.head.querySelector('meta[name="author"]');
  if (!metaAuthorTag) {
    metaAuthorTag = document.createElement("meta");
    metaAuthorTag.name = "author";
    document.head.appendChild(metaAuthorTag);
  }
  metaAuthorTag.content = brandName;
}

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

// Build search options for the datalist
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

// buildProductSearch();
document.addEventListener("DOMContentLoaded", () => {
  buildProductSearch();
});

// Update the UI with product details and variants
function updateProductUI(product, variants) {
  name_dabba = product.product_name;
  imgg = product.image_url;
  categoryId = product.category_id;
  // console.log(product);
  // Update product name
  document.getElementById("nameing_of_product").innerHTML = `${
    product.product_name || "Product Name"
  } `;

  // Update carousel images
  document.getElementById("product_images_sinf").innerHTML = `
          <img src="${
            product.image_url || "./assets/image/placeholder.png"
          }" alt="${product.product_name}" loading="lazy" />
          <img src="${
            product.addtional_img1 || "./assets/image/placeholder.png"
          }" alt="${product.product_name}" loading="lazy" />
          <img src="${
            product.addtional_img2 || "./assets/image/placeholder.png"
          }" alt="${product.product_name}" loading="lazy" />
          <img src="${
            product.addtional_img3 || "./assets/image/placeholder.png"
          }" alt="${product.product_name}" loading="lazy" />
          <img src="${
            product.addtional_img4 || "./assets/image/placeholder.png"
          }" alt="${product.product_name}" loading="lazy" />
          <img src="${
            product.addtional_img5 || "./assets/image/placeholder.png"
          }" alt="${product.product_name}" loading="lazy" />
          <img src="${
            product.addtional_img6 || "./assets/image/placeholder.png"
          }" alt="${product.product_name}" loading="lazy" />
        `;

  // Update tabs content
  document.getElementById("desc").innerHTML = `
          <p>${product.product_description || "No description available."}</p>
        `;

  document.getElementById("benefits").innerHTML = `
          <ul class="tab-list">
            <li>Withdrawal Symptoms: ${
              product.withdrawal_symptoms || "N/A"
            }</li>
            <li>Warnings Precautions : ${
              product.warnings_precautions || "N/A"
            }</li>
          </ul>
        `;

  document.getElementById("details").innerHTML = `
          <p>Ingredients: ${product.ingredients || "Not specified"}</p>
          <p>Packaging Details: ${
            product.packaging_details || "Not specified"
          }</p>
        `;

  document.getElementById("usage").innerHTML = `
          <ol class="tab-list">
            <li>${
              product.how_to_use || "Use as directed by your physician."
            }</li>
            <li>Storage: ${
              product.storage || "Store in a cool, dry place."
            }</li>
            <li>Drug Interaction: ${
              product.drug_interaction ||
              "Consult your doctor about possible drug interactions."
            }</li>
          </ol>
        `;

  document.getElementById("reviews").innerHTML = `
          <p><strong>Average Rating:</strong> 4.5/5 stars</p>
          <p><strong>Recent Review:</strong> "This medication worked well for me!" - Recent Customer</p>
        `;

  document.getElementById("differ").innerHTML = `
  <div class="accordion-container">
    ${generateAccordionItem(
      "1. Product Details",
      `
      <li><strong>Product Name:</strong> ${product.product_name || "N/A"}</li>
      <li><strong>Description:</strong> ${
        product.product_description || "N/A"
      }</li>
      <li><strong>Trade Names:</strong> ${product.trade_names || "N/A"}</li>
      <li><strong>Ingredients:</strong> ${product.ingredients || "N/A"}</li>
    `
    )}
    ${generateAccordionItem(
      "2. Manufactured By",
      `
      <li>${product.manufactured_by || "No manufacturer info available"}</li>
    `
    )}
    ${generateAccordionItem(
      "3. Drug Abuse",
      `
      <li>${product.drug_abuse || "No drug abuse info available"}</li>
    `
    )}
    ${generateAccordionItem(
      "4. Usage & Instructions",
      `
      <li><strong>How to Use:</strong> ${product.how_to_use || "N/A"}</li>
      <li><strong>Drug Interactions:</strong> ${
        product.drug_interaction || "N/A"
      }</li>
      <li><strong>Storage:</strong> ${product.storage || "N/A"}</li>
      <li><strong>Side Effects:</strong> ${product.side_effects || "N/A"}</li>
      <li><strong>Withdrawal Symptoms:</strong> ${
        product.withdrawal_symptoms || "N/A"
      }</li>
    `
    )}
    ${generateAccordionItem(
      "5. Packaging Details",
      `
      <li>${product.packaging_details || "No packaging info available"}</li>
    `
    )}
    ${generateAccordionItem(
      "6. Safety Information",
      `
      <li>${product.warnings_precautions || "No safety info available"}</li>
    `
    )}
  </div>
`;
  if (product.stocks == 0) {
    const tableBody = document.getElementById("popil");
    tableBody.innerHTML = `<p style="color: red;" >Out of Stock</p>`;
  } else {
    // Set up variant buttons and table rows
    setupProductVariants(variants);
  }

  function generateAccordionItem(title, content) {
    return `
    <div class="accordion-item">
      <button class="accordion-header">${title}</button>
      <div class="accordion-body">
        <ul>${content}</ul>
      </div>
    </div>
  `;
  }

  // Accordion toggle behavior
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("accordion-header")) {
      e.target.classList.toggle("active");
      const body = e.target.nextElementSibling;
      body.style.maxHeight = body.style.maxHeight
        ? null
        : body.scrollHeight + "px";
    }
  });
}

// Set up variant buttons and table rows
function setupProductVariants(variants) {
  const uniqueVariants = [
    ...new Set(
      variants.map((variant) => `${variant.unit_value} ${variant.unit_type}`)
    ),
  ];
  const buttonContainer = document.getElementById("button-container");
  buttonContainer.innerHTML = "";

  uniqueVariants.forEach((variant, index) => {
    const button = document.createElement("button");

    button.className = "btn btn--toggle";
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

// Display variant options in the table
function displayVariantOptions(variants, selectedMg, unitType) {
  const tableBody = document.getElementById("popil");
  tableBody.innerHTML = "";

  const matchingVariants = variants.filter(
    (variant) => variant.unit_value === selectedMg
  );
  // console.log(variants);
  const fragment = document.createDocumentFragment();
  //for sorting the quantity in ascending order
  matchingVariants.sort((a, b) => a.qty - b.qty);

  matchingVariants.forEach((variant) => {
    // console.log("varietns are ", variant);
    const tr = document.createElement("tr");
    tr.setAttribute("data-mg", variant.unit_value);

    let finalPrice = variant.offer_price
      ? variant.offer_price
      : variant.price_per_box;

    let priceHtml = variant.offer_price
      ? `<span style="text-decoration: line-through; color:red;">
       ${variant.price_per_box}
     </span>
     <span style="color:green; font-weight:bold;">
       ${variant.offer_price}
     </span>`
      : `${variant.price_per_box}`;

    tr.innerHTML = `
            
            <td>${variant.qty}</td>
            <td>${variant.price_per_pill || "$0.00 per pill"}</td>
             <td>${priceHtml}</td>
            <td>
              <button class="btn btn--add" 
                data-variant-id="${variant.product_id}"
                data-catogary-id="${variant.category_id}"
                data-quantity="${variant.qty}"
                data-mg="${variant.unit_type}${variant.unit_value}"
                data-price="${finalPrice}
                ">
                Add To Cart
              </button>
            </td>
          `;

    fragment.appendChild(tr);
  });

  tableBody.appendChild(fragment);
  setupAddToCartButtons();
}

// Function to refresh the page
function refreshPage() {
  window.location.reload(); // Reloads the current page
}

// Set up "Add To Cart" buttons
function setupAddToCartButtons() {
  document.querySelectorAll(".btn--add").forEach((button) => {
    button.addEventListener("click", function () {
      const cartCountSpan = localStorage.getItem("cartCount");

      localStorage.setItem("cartCount", parseInt(cartCountSpan) + 1);

      const variantId = this.getAttribute("data-variant-id");

      const quantity = this.getAttribute("data-quantity") || 1;
      const mg = this.getAttribute("data-mg") || "default_mg_value";
      const price =
        this.getAttribute("data-price").replace(/[^0-9,.]/g, "") ||
        "default_price";
      const immg = imgg;
      const name = name_dabba;
      console.log("catogery", categoryId);
      addToCart(variantId, categoryId, quantity, mg, price, name, immg);
    });
  });
}

// Send a POST request to add the item to cart
function addToCart(variantId, categoryId, quantity, mg, price, name, immg) {
  fetch("/add-to-cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: variantId,
      quantity: quantity,
      mg: mg,
      price: price,
      name: name,
      image_url: immg,
      categoryId: categoryId,
    }),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        //apna code dalna hey
        // alert("Item added to cart!");
        refreshPage();
      } else {
        alert("Error: " + result.message);
      }
    })
    .catch((error) => {
      console.error("Error adding to cart:", error);
      alert("Server error, please try again later.");
    });
}

// Display error messages in designated areas
function showError(message) {
  const errorElements = [
    document.getElementById("nameing_of_product"),
    document.getElementById("differ"),
    document.getElementById("three-box-section"),
    document.getElementById("product_images_sinf"),
  ];

  errorElements.forEach((element) => {
    if (element) {
      element.innerHTML = `<div class="error-message">${message}</div>`;
    }
  });
}

// Tabs functionality
function setupTabs() {
  const tabButtons = document.querySelectorAll(".tabs__btn");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons and tabs
      document.querySelectorAll(".tabs__btn").forEach((btn) => {
        btn.classList.remove("tabs__btn--active");
      });

      document.querySelectorAll(".tab").forEach((tab) => {
        tab.classList.add("hidden");
      });

      // Add active class to clicked button
      button.classList.add("tabs__btn--active");

      // Show corresponding tab
      const tabId = button.getAttribute("data-tab");
      document.getElementById(tabId).classList.remove("hidden");
    });
  });
}

// FAQ accordion functionality
function setupFaqAccordion() {
  const faqQuestions = document.querySelectorAll(".faq__q");

  faqQuestions.forEach((question) => {
    question.addEventListener("click", () => {
      const answer = question.nextElementSibling;
      answer.classList.toggle("hidden");
    });
  });
}

// Initialize everything when the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  fetchProductDetails();
  setupTabs();
  setupFaqAccordion();
  setupCarousel();
  // setupCustomOrderModal();
});
