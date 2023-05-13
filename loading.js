// Check if the page is initially loaded or reloaded
if (performance.navigation.type === 0 || performance.navigation.type === 1) {
  // Redirect to the loading screen
  window.location.href = "loading.html";

  // Wait for a specified duration (in milliseconds) before loading the main application
  setTimeout(function() {
    window.location.href = "index.html"; // Replace "index.html" with the URL of your main application or website
  }, 3000); // Adjust the delay time as needed
}