  window.$crisp = [];
    window.CRISP_WEBSITE_ID = "68987257-808e-403d-a06c-35b3ec18c3ef";
    (function () {
      var d = document;
      var s = d.createElement("script");
      s.src = "https://client.crisp.chat/l.js";
      s.async = 1;
      d.getElementsByTagName("head")[0].appendChild(s);
    })();

     document.addEventListener("DOMContentLoaded", () => {
      // Always start at top
      window.scrollTo(0, 0);
    
      // Get ?section=... from URL
      const params = new URLSearchParams(window.location.search);
      const sectionId = params.get("section");
    
      if (sectionId) {
        const target = document.getElementById(sectionId);
        if (target) {
          // Smooth scroll after slight delay
          setTimeout(() => {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
    
            // Highlight after scroll
            target.classList.add("highlight");
            setTimeout(() => target.classList.remove("highlight"), 2000);
          }, 300);
        }
      }

      // Update active nav link on scroll
      const navLinks = document.querySelectorAll('.nav-link');
      const sections = document.querySelectorAll('section');
      
      function updateActiveNav() {
        let current = '';
        sections.forEach(section => {
          const sectionTop = section.offsetTop - 100;
          if (window.scrollY >= sectionTop) {
            current = section.getAttribute('id');
          }
        });
        
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
          }
        });
      }
      
      window.addEventListener('scroll', updateActiveNav);
      updateActiveNav();
    });