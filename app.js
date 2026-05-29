document.querySelectorAll('a[href^="#"]').forEach
(anchor => {
    anchor.addEventListener('click', function(e){
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
    });
});
});


// Thumbnails
  function setVideoPoster() {
    const video = document.getElementById('my-background-video');
    if (!video) return;

    if (window.innerWidth >= 800) {
      // Desktop thumbnail
      video.setAttribute('poster', 'video/desktop-thumbnail.jpg');
    } else {
      // Mobile thumbnail
      video.setAttribute('poster', 'video/mobile-thumbnail.jpg');
    }
  }

  // Run when page loads
  window.addEventListener('DOMContentLoaded', setVideoPoster);


// Listen for the 'load' event on the window object
window.addEventListener('load', function () {
    // Get the video element by its ID
    const video = document.getElementById('my-background-video');

    // Play the video
    video.play();
});

//Auto refresh video source after resize

let resizeTimer;

window.addEventListener('resize', () => {
    // Clear the timer every time the window is resized
    clearTimeout(resizeTimer);

    // Set a timer to run the refresh after 250ms of no resizing
    resizeTimer = setTimeout(() => {
        const video = document.getElementById('my-background-video');
        
        // This forces the browser to re-check the <source> media queries
        video.load(); 
        
        // Optional: Ensure it plays again after loading
        video.play();
        
        console.log("Video source updated for new screen size.");
    }, 250); 
});

//Nacer scroll effect
window.addEventListener('scroll', ()=>{
    const navbar = document.querySelector('.navbar');
    window.scrollY > 50 ?
    navbar.style.backgroundColor = 'rgba(10, 10, 10 , 0.98)':
    navbar.style.backgroundColor = ' rgba(10, 10, 10, 0.95)';
}) ;

 const slider = document.getElementById('slider');
        const foreground = document.getElementById('foreground');
        const line = document.getElementById('line');
        const button = document.getElementById('button');

        // Function to update the split position (0 to 100%)
        function updateSplit(percentage) {
            // Keep the boundaries strictly inside the container (0% to 100%)
            const cappedPercent = Math.max(0, Math.min(100, percentage));
            
            // Mask the fireman image: reveal everything from the left (0%) to our cursor x position (cappedPercent)
            foreground.style.clipPath = `polygon(0 0, ${cappedPercent}% 0, ${cappedPercent}% 100%, 0 100%)`;
            
            // Move our line and button anchor visually
            line.style.left = `${cappedPercent}%`;
            button.style.left = `${cappedPercent}%`;
        }

        // Mouse Move Event
        slider.addEventListener('mousemove', (e) => {
            const rect = slider.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const percentage = (mouseX / rect.width) * 100;
            
            updateSplit(percentage);
        });

        // Touch Support for mobile/tablets
        slider.addEventListener('touchmove', (e) => {
            if (e.touches.length === 0) return;
            const rect = slider.getBoundingClientRect();
            // Get position of the first touch point
            const touchX = e.touches[0].clientX - rect.left;
            const percentage = (touchX / rect.width) * 100;
            
            updateSplit(percentage);
        });