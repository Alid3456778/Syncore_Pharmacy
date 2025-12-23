
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