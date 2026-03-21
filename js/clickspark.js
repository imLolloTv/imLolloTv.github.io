// https://reactbits.dev/animations/click-spark with the 💘 of ChatGPT

(function () {
    class ClickSpark {
        constructor(container, options = {}) {
            if (!container) {
                throw new Error("ClickSpark: container non trovato");
            }

            this.container = container;

            this.sparkColor = options.sparkColor || '#ffffff';
            this.sparkSize = options.sparkSize || 10;
            this.sparkRadius = options.sparkRadius || 15;
            this.sparkCount = options.sparkCount || 8;
            this.duration = options.duration || 400;
            this.easing = options.easing || 'ease-out';
            this.extraScale = options.extraScale || 1.0;

            this.sparks = [];

            // crea canvas
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');

            this.canvas.style.position = 'absolute';
            this.canvas.style.top = 0;
            this.canvas.style.left = 0;
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            this.canvas.style.pointerEvents = 'none';
            this.canvas.style.userSelect = 'none';
            this.canvas.style.display = 'block';

            this.canvas.style.zIndex = 999;

            // assicura position relativa
            const style = getComputedStyle(this.container);
            if (style.position === 'static') {
                this.container.style.position = 'relative';
            }

            this.container.appendChild(this.canvas);

            // bind
            this.handleClick = this.handleClick.bind(this);
            this.draw = this.draw.bind(this);
            this.handleResize = this.handleResize.bind(this);

            this.resizeCanvas();

            this.container.addEventListener('click', this.handleClick);

            this.resizeObserver = new ResizeObserver(this.handleResize);
            this.resizeObserver.observe(this.container);

            this.animationId = requestAnimationFrame(this.draw);
        }

        resizeCanvas() {
            const rect = this.container.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        }

        handleResize() {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.resizeCanvas();
            }, 100);
        }

        easeFunc(t) {
            switch (this.easing) {
                case 'linear':
                    return t;
                case 'ease-in':
                    return t * t;
                case 'ease-in-out':
                    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                default:
                    return t * (2 - t); // ease-out
            }
        }

        handleClick(e) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const now = performance.now();

            const newSparks = Array.from({ length: this.sparkCount }, (_, i) => ({
                x,
                y,
                angle: (2 * Math.PI * i) / this.sparkCount,
                startTime: now
            }));

            this.sparks.push(...newSparks);
        }

        draw(timestamp) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.sparks = this.sparks.filter((spark) => {
                const elapsed = timestamp - spark.startTime;

                if (elapsed >= this.duration) {
                    return false;
                }

                const progress = elapsed / this.duration;
                const eased = this.easeFunc(progress);

                const distance = eased * this.sparkRadius * this.extraScale;
                const lineLength = this.sparkSize * (1 - eased);

                const x1 = spark.x + distance * Math.cos(spark.angle);
                const y1 = spark.y + distance * Math.sin(spark.angle);
                const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
                const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

                this.ctx.strokeStyle = this.sparkColor;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();

                return true;
            });

            this.animationId = requestAnimationFrame(this.draw);
        }

        destroy() {
            cancelAnimationFrame(this.animationId);
            this.container.removeEventListener('click', this.handleClick);
            this.resizeObserver.disconnect();
            clearTimeout(this.resizeTimeout);
            this.canvas.remove();
        }
    }

    // espone globalmente
    window.ClickSpark = ClickSpark;
})();