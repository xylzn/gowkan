// Navbar Scroll Effect
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 50) {
        nav.classList.add('py-2');
        nav.querySelector('.glass-nav').classList.add('shadow-2xl', 'bg-dark/80');
    } else {
        nav.classList.remove('py-2');
        nav.querySelector('.glass-nav').classList.remove('shadow-2xl', 'bg-dark/80');
    }
});

// Refactored Carousel Logic to fix scrolling bugs
class Carousel {
    constructor(id, options = {}) {
        this.container = document.getElementById(id);
        if (!this.container) return;
        
        this.track = this.container.querySelector('.carousel-track');
        this.items = Array.from(this.track.children);
        this.nextBtn = document.getElementById(`${id.split('-')[0]}-next`);
        this.prevBtn = document.getElementById(`${id.split('-')[0]}-prev`);
        
        this.currentIndex = options.startIndex || 0;
        this.isMobile = window.innerWidth < 768;
        
        this.init();
    }

    init() {
        this.update(true); // Initial update without transition for starting index
        
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.next());
            this.prevBtn.addEventListener('click', () => this.prev());
        }

        // Improved Touch support for mobile
        let startX = 0;
        let isDragging = false;

        this.track.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            isDragging = true;
            this.track.style.transition = 'none';
        });

        this.track.addEventListener('touchmove', e => {
            if (!isDragging) return;
            const currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            const itemWidth = this.items[0].offsetWidth + 24;
            const baseOffset = -this.currentIndex * itemWidth;
            this.track.style.transform = `translateX(${baseOffset + diff}px)`;
        });

        this.track.addEventListener('touchend', e => {
            if (!isDragging) return;
            isDragging = false;
            this.track.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) this.next();
                else this.prev();
            } else {
                this.update();
            }
        });

        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth < 768;
            if (wasMobile !== this.isMobile) {
                this.currentIndex = this.isMobile && this.container.id === 'packages-carousel' ? 1 : 0;
            }
            this.update();
        });
    }

    update(immediate = false) {
        if (immediate) this.track.style.transition = 'none';
        else this.track.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';

        const itemWidth = this.items[0].offsetWidth + 24;
        const offset = -this.currentIndex * itemWidth;
        
        // Fix: Desktop should also translate the track
        this.track.style.transform = `translateX(${offset}px)`;

        // 3D Effect & Active State
        this.items.forEach((item, index) => {
            item.classList.remove('active');
            if (index === this.currentIndex) {
                item.classList.add('active');
            } else if (index > this.currentIndex && index < this.currentIndex + (this.isMobile ? 1 : 3)) {
                // For desktop, items visible in the viewport should also look active or semi-active
                item.style.opacity = '1';
                item.style.transform = 'scale(1) translateZ(0)';
            } else {
                item.style.opacity = '0.4';
                item.style.transform = 'scale(0.9) translateZ(-50px)';
            }
        });

        // Specific handling for active class in 3D effect
        this.items[this.currentIndex].classList.add('active');

        // Hide/Show arrows
        if (this.prevBtn) {
            this.prevBtn.style.opacity = this.currentIndex === 0 ? '0.2' : '1';
            this.prevBtn.style.pointerEvents = this.currentIndex === 0 ? 'none' : 'auto';
        }
        if (this.nextBtn) {
            const maxIndex = this.isMobile ? this.items.length - 1 : this.items.length - 3;
            this.nextBtn.style.opacity = this.currentIndex >= maxIndex ? '0.2' : '1';
            this.nextBtn.style.pointerEvents = this.currentIndex >= maxIndex ? 'none' : 'auto';
        }

        if (immediate) {
            setTimeout(() => {
                this.track.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
            }, 50);
        }
    }

    next() {
        const maxIndex = this.isMobile ? this.items.length - 1 : this.items.length - 3;
        if (this.currentIndex < maxIndex) {
            this.currentIndex++;
            this.update();
        }
    }

    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.update();
        }
    }
}

// Modal functionality for Gallery (Dark Theme)
const createModal = () => {
    const modal = document.createElement('div');
    modal.id = 'gallery-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-6 opacity-0 pointer-events-none transition-all duration-500';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-dark/90 backdrop-blur-xl"></div>
        <div class="glass-card max-w-4xl w-full p-8 rounded-[3rem] relative z-10 scale-90 transition-all duration-500 border border-white/10 shadow-2xl">
            <button class="absolute top-6 right-6 w-10 h-10 glass-card rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all border border-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="aspect-video md:aspect-[4/5] rounded-3xl overflow-hidden bg-white/5">
                    <img id="modal-img" src="" alt="" class="w-full h-full object-cover">
                </div>
                <div class="flex flex-col justify-center">
                    <span id="modal-tag" class="text-primary text-xs font-bold uppercase tracking-widest mb-2 block">Category</span>
                    <h3 id="modal-title" class="text-3xl font-black mb-6 text-white">Project Title</h3>
                    <p class="text-white/60 font-medium leading-relaxed mb-8">
                        Solusi website kustom dengan performa tinggi dan desain yang memukau. Kami memastikan setiap detail sesuai dengan identitas brand Anda.
                    </p>
                    <div class="space-y-4 mb-8">
                        <div class="flex items-center gap-3">
                            <div class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg></div>
                            <span class="text-sm font-bold text-white/80">Premium Design</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg></div>
                            <span class="text-sm font-bold text-white/80">High Performance</span>
                        </div>
                    </div>
                    <a href="https://wa.me/yournumber" class="block text-center py-4 bg-primary text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-primary/30 transition-all cta-highlight cta-glow">Konsultasi Sekarang</a>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('button');
    const bg = modal.querySelector('.absolute');

    const closeModal = () => {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.querySelector('.glass-card').classList.add('scale-90');
        document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', closeModal);
    bg.addEventListener('click', closeModal);

    return modal;
};

// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 100;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Reveal animations on scroll
const revealElements = () => {
    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach(el => {
        const windowHeight = window.innerHeight;
        const revealTop = el.getBoundingClientRect().top;
        const revealPoint = 150;

        if (revealTop < windowHeight - revealPoint) {
            el.classList.add('active');
        }
    });
};

window.addEventListener('scroll', revealElements);

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Carousels
    new Carousel('gallery-carousel', { startIndex: 0 });
    new Carousel('blog-carousel', { startIndex: 0 });
    
    if (window.innerWidth < 768) {
        new Carousel('packages-carousel', { startIndex: 1 }); // Start from 2nd package on mobile
    }

    const modal = createModal();
    const modalImg = modal.querySelector('#modal-img');
    const modalTag = modal.querySelector('#modal-tag');
    const modalTitle = modal.querySelector('#modal-title');

    document.querySelectorAll('.carousel-item a').forEach(btn => {
        if (btn.innerText.includes('Lihat Demo')) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const card = btn.closest('.glass-card');
                const img = card.querySelector('img').src;
                const title = card.querySelector('h3').innerText;
                const tag = card.querySelector('span').innerText;

                modalImg.src = img;
                modalTitle.innerText = title;
                modalTag.innerText = tag;

                modal.classList.remove('opacity-0', 'pointer-events-none');
                modal.querySelector('.glass-card').classList.remove('scale-90');
                document.body.style.overflow = 'hidden';
            });
        }
    });

    revealElements(); // Initial check
});
