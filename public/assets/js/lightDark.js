document.addEventListener("DOMContentLoaded", () => {
  const themeSwitch = document.getElementById("theme-switch");
  if (!themeSwitch) {
    console.error("Theme switch element not found!");
    return;
  }

  // Load saved theme
  if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark");
    themeSwitch.checked = true;
  }

  themeSwitch.addEventListener("change", () => {
    if (themeSwitch.checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  });
});
