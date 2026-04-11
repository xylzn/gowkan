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

// Mobile Sidebar Logic
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const closeSidebarBtn = document.getElementById('close-sidebar');
const mobileSidebar = document.getElementById('mobile-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarLinks = document.querySelectorAll('.sidebar-link');

const toggleSidebar = (show) => {
    if (show) {
        mobileSidebar.classList.remove('translate-x-full');
        mobileSidebar.classList.add('translate-x-0');
        sidebarOverlay.classList.remove('opacity-0', 'pointer-events-none');
        sidebarOverlay.classList.add('opacity-100', 'pointer-events-auto');
        document.body.style.overflow = 'hidden';
    } else {
        mobileSidebar.classList.remove('translate-x-0');
        mobileSidebar.classList.add('translate-x-full');
        sidebarOverlay.classList.remove('opacity-100', 'pointer-events-auto');
        sidebarOverlay.classList.add('opacity-0', 'pointer-events-none');
        document.body.style.overflow = '';
    }
};

mobileMenuBtn?.addEventListener('click', () => toggleSidebar(true));
closeSidebarBtn?.addEventListener('click', () => toggleSidebar(false));
sidebarOverlay?.addEventListener('click', () => toggleSidebar(false));
sidebarLinks.forEach(link => link.addEventListener('click', () => toggleSidebar(false)));

// Refactored Carousel Logic
class Carousel {
    constructor(id, options = {}) {
        this.container = document.getElementById(id);
        if (!this.container) return;
        
        this.track = this.container.querySelector('.carousel-track');
        this.items = Array.from(this.track.children);
        this.nextBtn = document.getElementById(`${id.split('-')[0]}-next`);
        this.prevBtn = document.getElementById(`${id.split('-')[0]}-prev`);
        
        this.isMobile = window.innerWidth < 768;
        this.currentIndex = options.startIndex !== undefined ? options.startIndex : 0;
        
        // Specific start index for packages on mobile
        if (this.isMobile && id === 'packages-carousel') {
            this.currentIndex = 1;
        }
        
        this.init();
    }

    init() {
        this.update(true);
        
        this.nextBtn?.addEventListener('click', () => this.next());
        this.prevBtn?.addEventListener('click', () => this.prev());

        // Touch support
        let startX = 0;
        let currentTranslate = 0;
        let isDragging = false;

        this.track.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            isDragging = true;
            this.track.style.transition = 'none';
            const style = window.getComputedStyle(this.track);
            const matrix = new WebKitCSSMatrix(style.transform);
            currentTranslate = matrix.m41;
        }, { passive: true });

        this.track.addEventListener('touchmove', e => {
            if (!isDragging) return;
            const currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            
            // Add resistance at boundaries
            let move = currentTranslate + diff;
            const maxIndex = this.isMobile ? this.items.length - 1 : Math.max(0, this.items.length - 3);
            
            const gap = 24;
            const itemWidth = this.items[0].offsetWidth;
            const containerWidth = this.container.offsetWidth;
            
            let minOffset, maxOffset;
            if (this.isMobile) {
                maxOffset = (containerWidth - itemWidth) / 2;
                minOffset = maxOffset - (maxIndex * (itemWidth + gap));
            } else {
                maxOffset = 0;
                minOffset = -(maxIndex * (itemWidth + gap));
            }

            if (move > maxOffset) {
                move = maxOffset + (move - maxOffset) * 0.3; // Resistance
            } else if (move < minOffset) {
                move = minOffset + (move - minOffset) * 0.3; // Resistance
            }

            this.track.style.transform = `translateX(${move}px)`;
        }, { passive: true });

        this.track.addEventListener('touchend', e => {
            if (!isDragging) return;
            isDragging = false;
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
                if (this.isMobile && this.container.id === 'packages-carousel') {
                    this.currentIndex = 1;
                } else {
                    this.currentIndex = 0;
                }
            }
            this.update(true);
        });
    }

    update(immediate = false) {
        if (immediate) this.track.style.transition = 'none';
        else this.track.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';

        const gap = 24;
        const itemWidth = this.items[0].offsetWidth;
        const containerWidth = this.container.offsetWidth;
        
        // Centering for mobile
        let offset;
        if (this.isMobile) {
            // Center the current item
            offset = (containerWidth - itemWidth) / 2 - (this.currentIndex * (itemWidth + gap));
        } else {
            // Normal desktop logic
            offset = -this.currentIndex * (itemWidth + gap);
        }
        
        this.track.style.transform = `translateX(${offset}px)`;

        // Active State Logic
        this.items.forEach((item, index) => {
            item.classList.remove('active', 'is-visible');
            
            if (index === this.currentIndex) {
                item.classList.add('active');
            }
            
            // For desktop, show items in viewport as visible (not dimmed)
            if (!this.isMobile) {
                if (index >= this.currentIndex && index < this.currentIndex + 3) {
                    item.classList.add('is-visible');
                }
            }
        });

        // Button States
        if (this.prevBtn) {
            this.prevBtn.style.opacity = this.currentIndex === 0 ? '0.2' : '1';
            this.prevBtn.style.pointerEvents = this.currentIndex === 0 ? 'none' : 'auto';
        }
        if (this.nextBtn) {
            const maxIndex = this.isMobile ? this.items.length - 1 : Math.max(0, this.items.length - 3);
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
        const maxIndex = this.isMobile ? this.items.length - 1 : Math.max(0, this.items.length - 3);
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

// Modal functionality for Gallery
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

// Smooth Scroll
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

// Reveal animations
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
    new Carousel('gallery-carousel');
    new Carousel('blog-carousel');
    new Carousel('packages-carousel');

    const modal = createModal();
    const modalImg = modal.querySelector('#modal-img');
    const modalTag = modal.querySelector('#modal-tag');
    const modalTitle = modal.querySelector('#modal-title');

    document.querySelectorAll('.carousel-item a').forEach(btn => {
        if (btn.innerText.includes('Lihat Demo')) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const card = btn.closest('.carousel-item');
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

    revealElements();
});
