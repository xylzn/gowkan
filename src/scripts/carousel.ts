export class Carousel {
    container: HTMLElement | null;
    track: HTMLElement | null;
    items: HTMLElement[];
    nextBtn: HTMLElement | null;
    prevBtn: HTMLElement | null;
    currentIndex: number;
    isMobile: boolean;

    constructor(id: string, options: any = {}) {
        this.container = document.getElementById(id);
        if (!this.container) {
            this.track = null;
            this.items = [];
            this.nextBtn = null;
            this.prevBtn = null;
            this.currentIndex = 0;
            this.isMobile = false;
            return;
        }
        
        this.track = this.container.querySelector('.carousel-track');
        this.items = Array.from(this.track?.children || []) as HTMLElement[];
        this.nextBtn = document.getElementById(`${id.split('-')[0]}-next`);
        this.prevBtn = document.getElementById(`${id.split('-')[0]}-prev`);
        
        this.isMobile = window.innerWidth < 768;
        this.currentIndex = options.startIndex !== undefined ? options.startIndex : 0;
        
        if (this.isMobile && id === 'packages-carousel') {
            this.currentIndex = 1;
        }
        
        this.init();
    }

    init() {
        this.update(true);
        
        this.nextBtn?.addEventListener('click', () => this.next());
        this.prevBtn?.addEventListener('click', () => this.prev());

        let startX = 0;
        let currentTranslate = 0;
        let isDragging = false;

        this.track?.addEventListener('touchstart', (e: TouchEvent) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            if (this.track) this.track.style.transition = 'none';
            const style = window.getComputedStyle(this.track!);
            const matrix = new WebKitCSSMatrix(style.transform);
            currentTranslate = matrix.m41;
        }, { passive: true });

        this.track?.addEventListener('touchmove', (e: TouchEvent) => {
            if (!isDragging || !this.track || !this.container) return;
            const currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            
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
                move = maxOffset + (move - maxOffset) * 0.3;
            } else if (move < minOffset) {
                move = minOffset + (move - minOffset) * 0.3;
            }

            this.track.style.transform = `translateX(${move}px)`;
        }, { passive: true });

        this.track?.addEventListener('touchend', (e: TouchEvent) => {
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
                if (this.isMobile && this.container?.id === 'packages-carousel') {
                    this.currentIndex = 1;
                } else {
                    this.currentIndex = 0;
                }
            }
            this.update(true);
        });
    }

    update(immediate = false) {
        if (!this.track || !this.container || this.items.length === 0) return;

        if (immediate) this.track.style.transition = 'none';
        else this.track.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';

        const gap = 24;
        const itemWidth = this.items[0].offsetWidth;
        const containerWidth = this.container.offsetWidth;
        
        let offset;
        if (this.isMobile) {
            offset = (containerWidth - itemWidth) / 2 - (this.currentIndex * (itemWidth + gap));
        } else {
            offset = -this.currentIndex * (itemWidth + gap);
        }
        
        this.track.style.transform = `translateX(${offset}px)`;

        this.items.forEach((item, index) => {
            item.classList.remove('active', 'is-visible');
            
            if (index === this.currentIndex) {
                item.classList.add('active');
            }
            
            if (!this.isMobile) {
                if (index >= this.currentIndex && index < this.currentIndex + 3) {
                    item.classList.add('is-visible');
                }
            }
        });

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
                if (this.track) this.track.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
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
