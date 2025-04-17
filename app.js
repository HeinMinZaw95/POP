
  
            window.addEventListener('scroll', reveal);
        
            function reveal(){
                var reveals = document.querySelectorAll('.reveal')
        
                for(var i = 0; i < reveals.length; i++){
        
                    var windowheight = window.innerHeight;
                    var revealtop = reveals[i].getBoundingClientRect().top;
                    var revealpoint = 50;
        
                    if(revealtop < windowheight - revealpoint){
                        reveals[i].classList.add('active');
                    }
                    else{
                        reveals[i].classList.remove('active');
                    }
                }
            }


            function setAnimationScroll (){
                gsap.registerPlugin(ScrollTrigger);
                let runAnimation = gsap.timeline({
                    scrollTrigger: {
                        trigger: "bg_city",
                        start: "top top",
                        end: "+=2000",
                        scrub: true,
                        pin: true
                    }
                });
            
                runAnimation.add([
                    gsap.to(".rocket",{
                        y: 100
                    }),
                    gsap.to("#earth" , 2, {
                       opacity:1
                    })
                ])
                    .add([
                    gsap.to("#earth" , 2, {
                        y: -200,
                        opacity: 0
                    }),
                    gsap.to("#nose", 2, {
                        x: 200,
                        opacity: 0
                    }),
                    gsap.to("#tail", 2, {
                        x:-200, y:-200,
                        opacity: 0
                    }),
                    gsap.to("#bottom", 2, {
                        x:200, y:200,
                        opacity: 0
                    })
            
            
            
                ]);
            }

//Swiper Start//
const swiper = new Swiper('.card-wrapper ', {
    loop: true,
    spaceBetween: 30,
  
    // Pagination bullets
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
      dynamicBullets: true
    },
  
    // Navigation arrows
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    breakpoints: {
        0: {
            slidesPerView: 1
        },
        900: {
            slidesPerView: 2
        },
        1024: {
            slidesPerView: 3
        }
    }
  });
//Swiper End//
