const christmasAnimations = {
  container: null,
  activeAnimations: {
    snow: false,
    ornaments: false,
    lights: false,
    stars: false,
    confetti: false,
  },
  intervals: {},

  // Configuration - Easy to customize!
  config: {
    snow: {
      count: 50,
      speed: [5, 15], // min, max seconds
      size: [0.8, 2], // em
      chars: ["❄", "❅", "❆"],
    },
    ornaments: {
      count: 20,
      colors: [
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#ffd700",
        "#ff69b4",
        "#00ffff",
      ],
    },
    lights: {
      count: 30,
      colors: [
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#ffff00",
        "#ff00ff",
        "#00ffff",
      ],
    },
    stars: {
      count: 20,
      chars: ["⭐", "✨", "🌟"],
    },
    confetti: {
      count: 40,
      colors: [
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#ffff00",
        "#ff00ff",
        "#00ffff",
        "#ffd700",
      ],
    },
  },

  // Initialize
  init() {
    this.container = document.getElementById("christmasEffects");
    if (!this.container) {
      console.error("Christmas effects container not found!");
      return false;
    }
    return true;
  },

  // Random number generator
  random(min, max) {
    return Math.random() * (max - min) + min;
  },

  // Random array item
  randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  },

  // Create snowflakes
  createSnowflake() {
    if (!this.activeAnimations.snow) return;

    const snowflake = document.createElement("div");
    snowflake.className = "snowflake";
    snowflake.textContent = this.randomItem(this.config.snow.chars);
    snowflake.style.left = this.random(0, 100) + "%";
    snowflake.style.fontSize = this.random(...this.config.snow.size) + "em";
    snowflake.style.animationDuration =
      this.random(...this.config.snow.speed) + "s";
    snowflake.style.animationDelay = this.random(0, 2) + "s";

    this.container.appendChild(snowflake);

    setTimeout(() => {
      if (snowflake.parentNode) {
        snowflake.remove();
      }
    }, parseFloat(snowflake.style.animationDuration) * 1000);
  },

  // // Create ornament
  // createOrnament(index) {
  //   const container = document.createElement('div');
  //   container.className = 'ornament-container';

  //   // Random string length (30px to 150px)
  //   const stringLength = this.random(30, 150);

  //   // Create string
  //   const string = document.createElement('div');
  //   string.className = 'ornament-string';
  //   string.style.height = stringLength + 'px';

  //   // Create ornament ball
  //   const ornament = document.createElement('div');
  //   ornament.className = 'ornament';
  //   ornament.style.color = this.randomItem(this.config.ornaments.colors);

  //   // Position across the top
  //   container.style.left = (index / this.config.ornaments.count) * 100 + '%';
  //   container.style.animationDelay = this.random(0, 2) + 's';
  //   container.style.animationDuration = this.random(2.5, 4) + 's';

  //   // Assemble
  //   container.appendChild(string);
  //   container.appendChild(ornament);
  //   this.container.appendChild(container);

  //   return container;
  // },
  // Create ornament
  createOrnament(index) {
    const container = document.createElement("div");
    container.className = "ornament-container";

    // Random string length (30px to 150px)
    const stringLength = this.random(30, 150);

    // Create string
    const string = document.createElement("div");
    string.className = "ornament-string";
    string.style.height = stringLength + "px";

    // Create ornament ball
    const ornament = document.createElement("div");
    ornament.className = "ornament";
    ornament.style.color = this.randomItem(this.config.ornaments.colors);

    // Adjust count based on screen size
    const isMobile = window.innerWidth <= 768;
    const visibleCount = isMobile
      ? Math.ceil(this.config.ornaments.count / 2)
      : this.config.ornaments.count;

    // Only create ornament if within visible count
    if (index >= visibleCount) {
      return null;
    }

    // Position across the top
    container.style.left = (index / visibleCount) * 100 + "%";
    container.style.animationDelay = this.random(0, 2) + "s";
    container.style.animationDuration = this.random(2.5, 4) + "s";

    // Assemble
    container.appendChild(string);
    container.appendChild(ornament);
    this.container.appendChild(container);

    return container;
  },

  // Create light
  createLight(index) {
    const light = document.createElement("div");
    light.className = "light";
    light.style.color = this.randomItem(this.config.lights.colors);
    light.style.left = (index / this.config.lights.count) * 100 + "%";
    light.style.top = this.random(5, 95) + "%";
    light.style.animationDelay = this.random(0, 2) + "s";

    this.container.appendChild(light);
    return light;
  },

  // Create star
  createStar(index) {
    const star = document.createElement("div");
    star.className = "star";
    star.textContent = this.randomItem(this.config.stars.chars);
    star.style.left = this.random(0, 100) + "%";
    star.style.top = this.random(0, 100) + "%";
    star.style.animationDelay = this.random(0, 3) + "s";

    this.container.appendChild(star);
    return star;
  },

  // Create confetti
  createConfetti() {
    if (!this.activeAnimations.confetti) return;

    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.color = this.randomItem(this.config.confetti.colors);
    confetti.style.left = this.random(0, 100) + "%";
    confetti.style.animationDuration = this.random(3, 6) + "s";
    confetti.style.animationDelay = this.random(0, 1) + "s";

    this.container.appendChild(confetti);

    setTimeout(() => {
      if (confetti.parentNode) {
        confetti.remove();
      }
    }, parseFloat(confetti.style.animationDuration) * 1000);
  },

  // Toggle functions
  toggleSnow() {
    if (!this.init()) return;

    this.activeAnimations.snow = !this.activeAnimations.snow;

    if (this.activeAnimations.snow) {
      this.intervals.snow = setInterval(() => this.createSnowflake(), 200);
    } else {
      clearInterval(this.intervals.snow);
      this.removeElements(".snowflake");
    }
  },

  toggleOrnaments() {
    if (!this.init()) return;

    this.activeAnimations.ornaments = !this.activeAnimations.ornaments;

    if (this.activeAnimations.ornaments) {
      for (let i = 0; i < this.config.ornaments.count; i++) {
        this.createOrnament(i);
      }
    } else {
      this.removeElements(".ornament-container");
    }
  },

    toggleLights() {
      if (!this.init()) return;

      this.activeAnimations.lights = !this.activeAnimations.lights;

      if (this.activeAnimations.lights) {
        for (let i = 0; i < this.config.lights.count; i++) {
          this.createLight(i);
        }
      } else {
        this.removeElements('.light');
      }
    },

    toggleStars() {
      if (!this.init()) return;

      this.activeAnimations.stars = !this.activeAnimations.stars;

      if (this.activeAnimations.stars) {
        for (let i = 0; i < this.config.stars.count; i++) {
          this.createStar(i);
        }
      } else {
        this.removeElements('.star');
      }
    },

    toggleConfetti() {
      if (!this.init()) return;

      this.activeAnimations.confetti = !this.activeAnimations.confetti;

      if (this.activeAnimations.confetti) {
        this.intervals.confetti = setInterval(() => this.createConfetti(), 150);
      } else {
        clearInterval(this.intervals.confetti);
        this.removeElements('.confetti');
      }
    },

  // Remove elements by selector
  removeElements(selector) {
    if (!this.container) return;
    const elements = this.container.querySelectorAll(selector);
    elements.forEach((el) => el.remove());
  },

  // Start all animations
  startAll() {
    if (!this.init()) return;

    if (!this.activeAnimations.snow) this.toggleSnow();
    // if (!this.activeAnimations.ornaments) this.toggleOrnaments();
    // if (!this.activeAnimations.lights) this.toggleLights();
    // if (!this.activeAnimations.stars) this.toggleStars();
    // if (!this.activeAnimations.confetti) this.toggleConfetti();
  },

  // Stop all animations
  stopAll() {
    Object.keys(this.activeAnimations).forEach((key) => {
      if (this.activeAnimations[key]) {
        const methodName =
          "toggle" + key.charAt(0).toUpperCase() + key.slice(1);
        if (typeof this[methodName] === "function") {
          this[methodName]();
        }
      }
    });
  },
};

// Auto-start on page load
window.addEventListener("DOMContentLoaded", () => {
  christmasAnimations.startAll();
});
