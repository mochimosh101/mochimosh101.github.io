    // Fetch URL
    window.addEventListener('DOMContentLoaded', function() {
      const includeElements = document.querySelectorAll('x-include');
      Array.from(includeElements).forEach(element => {
        const src = element.getAttribute('src');
        fetch(src)
          .then(response => response.text())
          .then(content => {
            const includedElement = document.createElement('div');
            includedElement.innerHTML = content;
            element.replaceWith(includedElement);
          });
      });
    });
// Fetch URL

fetch("items.json")
  .then(r => r.json())
  .then(names => {
    for (const [id, name] of Object.entries(names)) {
      const item = ITEMS.find(x => x.id == id);
      if (item) item.name = name;
    }
    render(ITEMS);
  });


// Top Nav Bar
window.addEventListener('scroll', function() {
  var navbar = document.getElementById("navbar");
  if (window.scrollY > 0) {
    navbar.classList.remove("shrink");
  } else {
    navbar.classList.add("shrink");
  }
});

window.addEventListener('scroll', function() {
  var navbar = document.getElementById("navbar-mobile");
  if (window.scrollY > 0) {
    navbar.classList.remove("shrink");
  } else {
    navbar.classList.add("shrink");
  }
});
// Top Nav Bar

// Header
$(document).ready(function(){
  $("#carousel").slick({
    slidesToShow: 1,
    slidesToScroll: 1,
    infinite: true,
    dots: true,
    arrows: false,
    autoplay: true,
    autoplaySpeed: 6000
  });
});
// Header

// Loading
// Loading