// Selecting elements
const hamburgerMenu = document.getElementById("hamburger-menu");
const sidebar = document.getElementById("sidebar");
const closeSidebar = document.getElementById("close-sidebar");
const searchButton = document.getElementById("search-button");
const searchInput = document.getElementById("search-input");

// Open Sidebar on Hamburger Click
hamburgerMenu.addEventListener("click", () => {
  sidebar.classList.add("active");
});

// Close Sidebar on Close Button Click
closeSidebar.addEventListener("click", () => {
  sidebar.classList.remove("active");
});

// Search Button Click Event
// searchButton.addEventListener('click', () => {
//   const query = searchInput.value.trim();
//   if (query) {
//     alert(`Searching for: ${query}`);

//     // You can replace the alert with your actual search logic
//   } else {
//     alert('Please enter a search term.');
//   }
// });

// Toggle FAQ answer visibility
document.querySelectorAll(".faq-item h3").forEach((header) => {
  header.addEventListener("click", () => {
    const item = header.parentElement;
    item.classList.toggle("active"); // Toggle the 'active' class
  });
});

// Get all MG buttons
const mgButtons = document.querySelectorAll(".mg-button");

// Function to update the table
const updateTable = (selectedMg) => {
  const rows = document.querySelectorAll(".product-table tbody tr");
  rows.forEach((row) => {
    // Update MG column
    row.querySelector("td:first-child").textContent = `${selectedMg}mg`;

    // Dynamically change prices based on MG
    const oldPriceElement = row.querySelector(".old-price");
    const newPriceElement = row.querySelector(".new-price");

    // Example logic to calculate prices based on MG
    const qty = parseInt(row.querySelector("td:nth-child(2)").textContent, 10);
    const basePrice = selectedMg * 3; // Example base price multiplier
    const perPillPrice = (basePrice / qty).toFixed(2);

    oldPriceElement.textContent = `$${(basePrice * 1.2).toFixed(2)}`; // Example markup
    newPriceElement.textContent = `$${perPillPrice} PER PILL`;

    // Update total price column
    row.querySelector("td:nth-child(4)").textContent = (
      basePrice * qty
    ).toFixed(2);
  });
};

// Add click event to all MG buttons
mgButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Remove active class from all buttons
    mgButtons.forEach((btn) => btn.classList.remove("active"));

    // Add active class to the clicked button
    button.classList.add("active");

    // Get the selected MG value
    const selectedMg = button.dataset.mg;

    // Update the table with the selected MG
    updateTable(selectedMg);
  });
});

// Initialize with default active button
//https://lh3.googleusercontent.com/d/1duiTewov1jsyyUaEnuGboshwFlHtLt3A

document.addEventListener("DOMContentLoaded", () => {
  const carouselContainer = document.querySelector(".carousel-container");
  const images = document.querySelectorAll(".carousel-container img");
  const leftArrow = document.querySelector(".arrow.left");
  const rightArrow = document.querySelector(".arrow.right");

  let currentIndex = 0;
  const imageCount = images.length;
  let imageWidth = images[0].clientWidth;

  // Move to a specific slide
  const moveToSlide = (index) => {
    carouselContainer.style.transform = `translateX(-${index * 100}%)`;
  };

  // Handle left arrow click
  leftArrow.addEventListener("click", () => {
    currentIndex = currentIndex === 0 ? imageCount - 1 : currentIndex - 1;
    moveToSlide(currentIndex);
  });

  // Handle right arrow click
  rightArrow.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % imageCount;
    moveToSlide(currentIndex);
  });

  // Auto-scroll every 3 seconds
  setInterval(() => {
    currentIndex = (currentIndex + 1) % imageCount;
    moveToSlide(currentIndex);
  }, 7000);
});

// Toggle visibility of reviews
document.querySelectorAll(".toggle-review").forEach((button) => {
  button.addEventListener("click", (e) => {
    const reviewText =
      e.target.parentElement.nextElementSibling.nextElementSibling;
    if (reviewText.classList.contains("hidden")) {
      reviewText.classList.remove("hidden");
      reviewText.classList.add("visible");
      e.target.textContent = "Hide Review ▲";
    } else {
      reviewText.classList.remove("visible");
      reviewText.classList.add("hidden");
      e.target.textContent = "Show Review ▼";
    }
  });
});


// add in frontend logics
// checkout.js
document.getElementById('place-order-btn').addEventListener('click', async function (event) {
  event.preventDefault();

  const formData = {
    firstName: document.getElementById('first-name').value,
    lastName: document.getElementById('last-name').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    companyName: document.getElementById('company-name').value,
    country: document.getElementById('country').value,
    streetAddress: document.getElementById('street-address').value,
    apartment: document.getElementById('apartment').value,
    city: document.getElementById('city').value,
    state: document.getElementById('state').value,
    zipCode: document.getElementById('zip-code').value,
    differentAddress: document.getElementById('different-address').checked,
    shippingAddress: {
      streetAddress: document.getElementById('ship-street-address')?.value || '',
      city: document.getElementById('ship-city')?.value || '',
      zipCode: document.getElementById('ship-zip')?.value || ''
    }
  };

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const result = await response.json();
    if (response.ok) {
      document.getElementById('order-number').textContent = result.orderNumber;
      document.getElementById('order-date').textContent = result.orderDate;
      document.getElementById('order-email').textContent = result.email;
      document.getElementById('order-total').textContent = `₹${result.totalAmount}`;
      document.getElementById('popup-div').style.display = 'flex';
    } else {
      alert('Checkout failed: ' + result.message);
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Something went wrong. Please try again later.');
  }
});





const ratingContainer = document.getElementById("rating");
const stars = ratingContainer.querySelectorAll("span[data-value]");
let selectedRating = 0;

// Replace with actual product ID from your page context
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("product_ID");
// console.log("product_id",productId)

stars.forEach((star) => {
  const val = parseInt(star.getAttribute("data-value"));

  star.addEventListener("mouseenter", () => highlightStars(val));
  star.addEventListener("mouseleave", () => highlightStars(selectedRating));
  star.addEventListener("click", () => {
    selectedRating = val;
    highlightStars(selectedRating);
    sendRatingToBackend(selectedRating, productId);
  });
});

function highlightStars(rating) {
  stars.forEach((star) => {
    const val = parseInt(star.getAttribute("data-value"));
    star.classList.toggle("selected", val <= rating);
  });
}

function sendRatingToBackend(rating, productId) {
  fetch("api/rating", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating: rating, product_id: productId }),
  })
    .then((response) => response.json())
    .then((data) => console.log("Server response:", data))
    .catch((error) => console.error("Error sending rating:", error));
}

//employee.js
function renderPage(pageNumber) {
            currentPage = pageNumber;
            tableBody.innerHTML = "";
            const page = pages[pageNumber - 1];
            if (!page) return;

            const headerRow = document.createElement("tr");
            headerRow.innerHTML = `<td colspan="6" style="font-weight:bold; background:var(--light-gray); text-align:center;">Orders for ${page.date}</td>`;
            tableBody.appendChild(headerRow);

            page.orders.forEach((request) => {
              const row = document.createElement("tr");
              const paymentStatus = request.payment_status || "pending";
              let name_or_id = " ";
              if(request.customer_first_name == null){
                name_or_id = "#" + request.order_id;
              }
              else{
                name_or_id = request.customer_first_name + ' ' + request.customer_last_name;
              }
              console.log(name_or_id);
              let statusBadgeHtml = paymentStatus === "completed"
                ? `<span class="payment-status-badge completed"><span class="status-icon">✅</span> Paid</span>`
                : `<span class="payment-status-badge pending"><span class="status-icon">⏳</span> Pending</span>`;

              let paymentButton = paymentStatus === "pending"
                ? `<button class="payment-done-btn" onclick="markPaymentDone(${request.order_id}, this)"><i class="fas fa-check"></i> Payment Done</button>`
                : "";
               console.log(request);
              row.innerHTML = `
                <td>${request.serial}</td>

                <td>${name_or_id}</td>
                <td>${request.user_id}</td>
                <td>${parseFloat(request.total_amount).toFixed(2)}</td>
                <td>${statusBadgeHtml}</td>
                <td class="action">
                  <button class="view-details-btn" onclick="openDetailsModal(${request.order_id}, ${request.user_id})"><i class="fas fa-eye"></i> View Details</button>
                  ${paymentButton}
                  <input type="text" id="track-${request.order_id}" placeholder="Tracking No" style="margin-top:5px; width:120px;" />
                  <button onclick="sendTrackingEmail(${request.order_id}, ${request.user_id})" style="background: linear-gradient(135deg, #3b82f6, #2563eb); margin-top:5px;"><i class="fas fa-envelope"></i> Send Tracking</button>
                </td>
              `;
              tableBody.appendChild(row);
            });

            const emptyRows = 10 - page.orders.length;
            for (let i = 0; i < emptyRows; i++) {
              const empty = document.createElement("tr");
              empty.innerHTML = `<td colspan="6">&nbsp;</td>`;
              tableBody.appendChild(empty);
            }

            renderPagination();
            document.querySelector("#process-requests").scrollIntoView({ behavior: "smooth", block: "start" });
          }

          async function openDetailsModal(orderId, userId) {
          const modal = document.getElementById("detailsModal");
          const modalBody = document.getElementById("modalBodyContent");
          modal.classList.add("active");
          modalBody.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

          try {
            const [orderItemsResponse, customerResponse] = await Promise.all([
              fetch(`/api/order-items/${orderId}`),
              fetch(`/api/customers/${userId}`),
            ]);

            if (!orderItemsResponse.ok || !customerResponse.ok) throw new Error("Failed to fetch data");

            const orderItems = await orderItemsResponse.json();
            const customer = await customerResponse.json();
            renderDetailsContent(orderItems, customer, orderId);
          } catch (error) {
            console.error("Error fetching details:", error);
            modalBody.innerHTML = `<div class="error-message">Failed to load details. Please try again.</div>`;
          }
        }

        async function loadDashboardData() {
          try {
            const res = await fetch('/api/requests');
            const orders = await res.json();

            // ✅ Count unique clients
            const clients = new Set(orders.map(o => o.user_id));

            // ✅ Categorize by payment status
            let pending = 0, done = 0, transferred = 0, pendingRequests = 0;

            orders.forEach(o => {
              if (o.payment_status === 'pending') pending++;
              else if (o.payment_status === 'completed') done++;
              else if (o.payment_status === 'transferred') transferred++;

              // If order is still unprocessed
              if (!o.payment_status || o.payment_status === 'pending') pendingRequests++;
            });

            // ✅ Update dashboard
            document.getElementById('clientsHandled').textContent = clients.size;
            document.getElementById('paymentPending').textContent = pending;
            document.getElementById('paymentDone').textContent = done;

            document.getElementById('pendingRequests').textContent = pendingRequests;

          } catch (err) {
            console.error('Error loading dashboard data:', err);
          }
        }