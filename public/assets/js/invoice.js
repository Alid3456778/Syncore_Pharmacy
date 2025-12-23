 window.$crisp = [];
    window.CRISP_WEBSITE_ID = "68987257-808e-403d-a06c-35b3ec18c3ef";
    (function () {
      var d = document;
      var s = d.createElement("script");
      s.src = "https://client.crisp.chat/l.js";
      s.async = 1;
      d.getElementsByTagName("head")[0].appendChild(s);
    })();

    // Debug function
    function showDebugInfo(data) {
      const debugInfo = document.getElementById('debug-info');
      const debugContent = document.getElementById('debug-content');
      debugContent.innerHTML = `
        <strong>Raw Order Data:</strong><br>
        ${JSON.stringify(data, null, 2)}<br><br>
        <strong>Data Sources Checked:</strong><br>
        - sessionStorage: ${sessionStorage.getItem('orderDetails') ? 'Found' : 'Not found'}<br>
        - localStorage: ${localStorage.getItem('orderDetails') ? 'Found' : 'Not found'}<br>
        - window.orderDetails: ${window.orderDetails ? 'Found' : 'Not found'}
      `;
      // Uncomment next line to show debug info
      // debugInfo.style.display = 'block';
    }

    function showError(message) {
      const errorContainer = document.getElementById('error-container');
      errorContainer.innerHTML = `
        <div class="error-message">
          <strong>⚠️ Error Loading Invoice:</strong><br>
          ${message}<br><br>
          <button onclick="window.location.href='./index.html'" style="padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Go to Home
          </button>
          <button onclick="loadOrderData()" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
            Retry
          </button>
        </div>
      `;
    }

    function formatCurrency(amount) {
      const num = parseFloat(amount);
      return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
    }

    function formatAddress(streetAddress, apartment) {
      let address = streetAddress || '';
      if (apartment) {
        address += apartment ? `, ${apartment}` : '';
      }
      return address || 'N/A';
    }

    function loadOrderData() {
      console.log('🔄 Loading order data for invoice...');
      
      document.getElementById('loading-message').style.display = 'block';
      document.getElementById('invoice-content').style.display = 'none';
      document.getElementById('error-container').innerHTML = '';

      let order = null;

      try {
        // Try multiple data sources
        if (sessionStorage.getItem('orderDetails')) {
          console.log('📦 Found order data in sessionStorage');
          order = JSON.parse(sessionStorage.getItem('orderDetails'));
        } else if (localStorage.getItem('orderDetails')) {
          console.log('📦 Found order data in localStorage');
          order = JSON.parse(localStorage.getItem('orderDetails'));
        } else if (window.orderDetails) {
          console.log('📦 Found order data in window.orderDetails');
          order = window.orderDetails;
        }

        if (!order) {
          throw new Error('No order data found. Please complete checkout first.');
        }

        console.log('✅ Order data loaded:', order);
        showDebugInfo(order);
        displayOrderDetails(order);

      } catch (error) {
        console.error('❌ Error loading order data:', error);
        showError(error.message);
      }
    }

    function displayOrderDetails(order) {
      try {
        console.log('🎨 Displaying order details...');

        // Fill customer details with fallback values
        document.getElementById('firstName').textContent = order.firstName || 'N/A';
        document.getElementById('lastName').textContent = order.lastName || 'N/A';
        document.getElementById('phone').textContent = order.phone || 'N/A';
        document.getElementById('email').textContent = order.email || 'N/A';
        
        // Handle address formatting
        document.getElementById('address').textContent = formatAddress(
          order.billingStreetAddress || order.streetAddress, 
          order.apartment
        );
        
        document.getElementById('city').textContent = order.billingCity || order.city || 'N/A';
        document.getElementById('state').textContent = order.billingState || order.state || 'N/A';
        document.getElementById('zip').textContent = order.billingZip || order.zipCode || order.zip || 'N/A';
        document.getElementById('country').textContent = order.country || 'N/A';
        
        // Format and display order date
        const orderDate = order.orderDate ? new Date(order.orderDate).toLocaleDateString() : new Date().toLocaleDateString();
        document.getElementById('orderDate').textContent = orderDate;

        // Process products/cart items
        let subtotal = 0;
        let totalShipping = 0;
        const tbody = document.getElementById('productRows');
        tbody.innerHTML = ''; // Clear existing rows

        // Handle different possible product data structures
        const products = order.cartItems || order.products || [];
        console.log('📦 Processing products:', products);

        if (products.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">No products found</td></tr>';
        } else {
          products.forEach((product, index) => {
            console.log(`🔍 Processing product ${index + 1}:`, product);

            // Extract product details with multiple fallback options
            const name = product.name || 'Unknown Product';
            const mg = product.mg ? ` ${product.mg}mg` : '';
            const quantity = parseInt(product.quantity || product.qty || 1);
            
            // Handle price parsing - remove any currency symbols and parse
            let unitPrice = 0;
            if (typeof product.price === 'string') {
              unitPrice = parseFloat(product.price.replace(/[^0-9.-]/g, '')) || 0;
            } else {
              unitPrice = parseFloat(product.price) || 0;
            }

            const totalPrice = unitPrice ;
            subtotal += totalPrice;

            // Determine shipping for this item
            let itemShipping = 0;
            const categoryId = parseInt(product.category_id || 0);
            
            // If category_id is 1, free shipping, otherwise calculate based on order shipping
            if (categoryId !== 1 && order.shippingCost) {
              const orderShipping = parseFloat(order.shippingCost) || 0;
              // Distribute shipping across non-free items
              const nonFreeItems = products.filter(p => parseInt(p.category_id || 0) !== 1).length;
              itemShipping = nonFreeItems > 0 ? orderShipping / nonFreeItems : 0;
            }

            totalShipping += itemShipping;

            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${name}${mg}</td>
              <td>${quantity}</td>
              <td>${formatCurrency(unitPrice)}</td>
             
            `;
            tbody.appendChild(row);

            console.log(`✅ Added product: ${name} - Qty: ${quantity} - Price: ${formatCurrency(totalPrice)} - Shipping: ${itemShipping > 0 ? formatCurrency(itemShipping) : 'Free'}`);
          });
        }

        // Calculate and display totals
        const orderShipping = parseFloat(order.shippingCost || 0);
        const finalTotal = subtotal + orderShipping;

        document.getElementById('subtotal').textContent = formatCurrency(subtotal);
        document.getElementById('shippingTotal').textContent = formatCurrency(orderShipping);
        document.getElementById('total').textContent = formatCurrency(finalTotal);

        console.log('💰 Final Calculations:');
        console.log(`  - Subtotal: ${formatCurrency(subtotal)}`);
        console.log(`  - Shipping: ${formatCurrency(orderShipping)}`);
        console.log(`  - Total: ${formatCurrency(finalTotal)}`);

        // Show the invoice content and hide loading
        document.getElementById('loading-message').style.display = 'none';
        document.getElementById('invoice-content').style.display = 'block';

      } catch (error) {
        console.error('❌ Error displaying order details:', error);
        showError('Failed to display order details: ' + error.message);
      }
    }

    // PDF Download function
    function downloadPDF() {
      console.log('📄 Starting PDF download...');
      
      const element = document.getElementById("invoice");
      const orderNumber = Math.floor(Math.random() * 1000000); // Fallback order number
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Invoice-${orderNumber}.pdf`,
        image: { 
          type: 'jpeg', 
          quality: 0.98 
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollX: 0,
          scrollY: 0,
          backgroundColor: '#ffffff'
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        }
      };

      // Hide download button temporarily for PDF
      const downloadBtn = document.getElementById('download-btn');
      downloadBtn.style.display = 'none';

      html2pdf().from(element).set(opt).save().then(() => {
        console.log('✅ PDF downloaded successfully');
        downloadBtn.style.display = 'block';
      }).catch((error) => {
        console.error('❌ PDF download failed:', error);
        alert('Failed to download PDF. Please try again.');
        downloadBtn.style.display = 'block';
      });
    }

    // Initialize when page loads
    document.addEventListener('DOMContentLoaded', function() {
      console.log('📄 Invoice page loaded');
      loadOrderData();
    });

    // PDF Download event listener
    document.getElementById('download-btn').addEventListener('click', downloadPDF);

    // Retry mechanism - check for data periodically if not found initially
    let retryCount = 0;
    const maxRetries = 5;

    function checkForOrderData() {
      if (retryCount < maxRetries && !document.getElementById('invoice-content').style.display !== 'none') {
        console.log(`🔄 Retry ${retryCount + 1}/${maxRetries} - Checking for order data...`);
        
        if (sessionStorage.getItem('orderDetails') || localStorage.getItem('orderDetails') || window.orderDetails) {
          loadOrderData();
        } else {
          retryCount++;
          setTimeout(checkForOrderData, 1000); // Check again in 1 second
        }
      }
    }

    // Start retry mechanism after 2 seconds if no data initially
    setTimeout(() => {
      if (document.getElementById('loading-message').style.display !== 'none') {
        checkForOrderData();
      }
    }, 2000);