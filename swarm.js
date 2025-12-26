class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.targetX = x;
        this.targetY = y;
        this.hasTarget = false;
        this.color = { r: 255, g: 255, b: 255 };
        this.targetColor = { r: 255, g: 255, b: 255 };
    }

    update(particles, canvas) {
        if (this.hasTarget) {
            // Move towards target position
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                this.vx += dx * 0.01;
                this.vy += dy * 0.01;
            } else {
                // Close to target, slow down
                this.vx *= 0.9;
                this.vy *= 0.9;
            }
        } else {
            // Apply Boyd's flocking behavior
            this.flock(particles);
        }

        // Apply velocity damping
        this.vx *= 0.99;
        this.vy *= 0.99;

        // Limit speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const maxSpeed = this.hasTarget ? 3 : 2;
        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen boundaries
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;

        // Interpolate color towards target
        this.color.r += (this.targetColor.r - this.color.r) * 0.1;
        this.color.g += (this.targetColor.g - this.color.g) * 0.1;
        this.color.b += (this.targetColor.b - this.color.b) * 0.1;
    }

    flock(particles) {
        // Simplified flocking for performance - only check nearby particles
        const separationRadius = 25;
        const separationRadiusSq = separationRadius * separationRadius;

        let sepX = 0, sepY = 0;
        let sepCount = 0;

        // Optimized: only check a sample of particles for performance
        const sampleSize = Math.min(50, particles.length);
        const step = Math.floor(particles.length / sampleSize);

        for (let i = 0; i < particles.length; i += step) {
            const other = particles[i];
            if (other === this) continue;

            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const distSq = dx * dx + dy * dy;

            if (distSq > 0 && distSq < separationRadiusSq) {
                const dist = Math.sqrt(distSq);
                sepX += dx / dist;
                sepY += dy / dist;
                sepCount++;
            }
        }

        // Separation
        if (sepCount > 0) {
            sepX /= sepCount;
            sepY /= sepCount;
            this.vx += sepX * 0.3;
            this.vy += sepY * 0.3;
        }
    }

    draw(imageData, canvasWidth) {
        // Draw as a single pixel
        const x = Math.floor(this.x);
        const y = Math.floor(this.y);
        const index = (y * canvasWidth + x) * 4;

        if (index >= 0 && index < imageData.data.length) {
            imageData.data[index] = Math.floor(this.color.r);
            imageData.data[index + 1] = Math.floor(this.color.g);
            imageData.data[index + 2] = Math.floor(this.color.b);
            imageData.data[index + 3] = 255;
        }
    }
}

class SwarmSimulation {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.images = [];
        this.currentImageIndex = 0;
        this.formingImage = false;
        this.imageFormTime = 0;
        this.colorMode = false;
        this.targetPixels = [];
        this.debugCanvas = document.getElementById('debugCanvas');
        this.debugCtx = this.debugCanvas.getContext('2d');

        this.init();
    }

    init() {
        // Create initial particles
        for (let i = 0; i < 40000; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            this.particles.push(new Particle(x, y));
        }

        this.animate();
    }

    addImage(imageData, name) {
        this.images.push({ data: imageData, name: name });
        this.updateImageList();
    }

    removeImage(index) {
        this.images.splice(index, 1);
        if (this.currentImageIndex >= this.images.length) {
            this.currentImageIndex = 0;
        }
        this.updateImageList();
    }

    updateImageList() {
        const imageList = document.getElementById('imageList');
        imageList.innerHTML = '';

        this.images.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = 'image-item';

            // Create thumbnail canvas
            const thumbnail = document.createElement('canvas');
            const thumbCtx = thumbnail.getContext('2d');
            thumbnail.width = 100;
            thumbnail.height = 100;

            // Draw scaled image
            const scale = Math.min(100 / img.data.width, 100 / img.data.height);
            const scaledWidth = img.data.width * scale;
            const scaledHeight = img.data.height * scale;
            const offsetX = (100 - scaledWidth) / 2;
            const offsetY = (100 - scaledHeight) / 2;

            thumbCtx.fillStyle = '#000';
            thumbCtx.fillRect(0, 0, 100, 100);
            thumbCtx.drawImage(img.data, offsetX, offsetY, scaledWidth, scaledHeight);

            item.innerHTML = `
                <div class="image-item-info">
                    <span>${img.name}</span>
                    <button class="remove-btn" onclick="swarm.removeImage(${index})">Remove</button>
                </div>
            `;

            // Insert thumbnail at the beginning
            item.insertBefore(thumbnail, item.firstChild);
            imageList.appendChild(item);
        });
    }

    processImage(img) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // Calculate scale to fit canvas while maintaining aspect ratio
        const scaleX = this.canvas.width / img.width;
        const scaleY = this.canvas.height / img.height;
        const scale = Math.min(scaleX, scaleY) * 0.8; // Use 80% of available space

        const scaledWidth = Math.floor(img.width * scale);
        const scaledHeight = Math.floor(img.height * scale);

        tempCanvas.width = scaledWidth;
        tempCanvas.height = scaledHeight;

        // Draw the scaled image maintaining aspect ratio
        tempCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

        // Get the image data
        const imageData = tempCtx.getImageData(0, 0, scaledWidth, scaledHeight);

        // Convert to grayscale
        const grayscaleData = tempCtx.createImageData(scaledWidth, scaledHeight);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const alpha = imageData.data[i + 3];

            // Convert to grayscale using proper luminance formula
            const gray = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);

            grayscaleData.data[i] = gray;
            grayscaleData.data[i + 1] = gray;
            grayscaleData.data[i + 2] = gray;
            grayscaleData.data[i + 3] = alpha;
        }

        // Display grayscale image in debug canvas
        this.debugCanvas.width = scaledWidth;
        this.debugCanvas.height = scaledHeight;
        this.debugCtx.putImageData(grayscaleData, 0, 0);

        const pixels = [];

        // Calculate offset to center image on main canvas
        const offsetX = (this.canvas.width - scaledWidth) / 2;
        const offsetY = (this.canvas.height - scaledHeight) / 2;

        // Sample pixels for particle targets
        const step = 2; // Sample every 2nd pixel for better density
        for (let y = 0; y < scaledHeight; y += step) {
            for (let x = 0; x < scaledWidth; x += step) {
                const index = (y * scaledWidth + x) * 4;
                const grayTone = grayscaleData.data[index];
                const alpha = grayscaleData.data[index + 3];

                if (alpha < 128) continue; // Skip transparent pixels

                // Particle density proportional to gray tone
                // 0 gray = 0% particles, 128 gray = 25% particles, 255 gray = 50% particles
                const densityRatio = (grayTone / 255) * 0.5; // 0 to 0.5 range

                // Use probability to determine if we add a particle here
                if (Math.random() < densityRatio) {
                    // Get original color if in color mode
                    const origR = imageData.data[index];
                    const origG = imageData.data[index + 1];
                    const origB = imageData.data[index + 2];

                    pixels.push({
                        x: x + offsetX + (Math.random() - 0.5) * step,
                        y: y + offsetY + (Math.random() - 0.5) * step,
                        color: this.colorMode ? { r: origR, g: origG, b: origB } : { r: 255, g: 255, b: 255 }
                    });
                }
            }
        }

        // Update debug info
        document.getElementById('debugInfo').textContent = `Target points: ${pixels.length}`;

        return pixels;
    }

    formImage() {
        if (this.images.length === 0) return;

        const currentImage = this.images[this.currentImageIndex];
        this.targetPixels = this.processImage(currentImage.data);

        // Assign targets to ALL particles by distributing them across available target pixels
        for (let i = 0; i < this.particles.length; i++) {
            if (this.targetPixels.length > 0) {
                // Distribute particles evenly across target pixels using modulo
                const targetIndex = i % this.targetPixels.length;
                const target = this.targetPixels[targetIndex];

                this.particles[i].targetX = target.x;
                this.particles[i].targetY = target.y;
                this.particles[i].targetColor = target.color;
                this.particles[i].hasTarget = true;
            } else {
                this.particles[i].hasTarget = false;
                this.particles[i].targetColor = { r: 255, g: 255, b: 255 };
            }
        }

        this.formingImage = true;
        this.imageFormTime = Date.now();
    }

    update() {
        // Check if we should start forming an image
        if (!this.formingImage && this.images.length > 0) {
            if (Math.random() < 0.005) { // Random chance to start forming
                this.formImage();
            }
        }
        
        // Check if we should stop forming and return to swarming
        if (this.formingImage && Date.now() - this.imageFormTime > 3000) { // Form for 3 seconds
            this.particles.forEach(particle => {
                particle.hasTarget = false;
                particle.targetColor = { r: 255, g: 255, b: 255 };
            });
            this.formingImage = false;
            
            // Move to next image
            if (this.images.length > 1) {
                this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
            }
        }
        
        // Update particles - use for loop for better performance
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].update(this.particles, this.canvas);
        }
    }

    draw() {
        // Create or reuse ImageData for better performance
        if (!this.imageData) {
            this.imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
        }

        // Clear the image data (set all to black)
        const data = this.imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 0;     // R
            data[i + 1] = 0; // G
            data[i + 2] = 0; // B
            data[i + 3] = 255; // A
        }

        // Draw all particles directly to ImageData
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].draw(this.imageData, this.canvas.width);
        }

        // Put the image data on canvas in one operation
        this.ctx.putImageData(this.imageData, 0, 0);
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    reset() {
        this.particles.forEach(particle => {
            particle.hasTarget = false;
            particle.targetColor = { r: 255, g: 255, b: 255 };
            particle.vx = (Math.random() - 0.5) * 2;
            particle.vy = (Math.random() - 0.5) * 2;
        });
        this.formingImage = false;
    }

    setColorMode(enabled) {
        this.colorMode = enabled;
    }
}

// Initialize the simulation
const canvas = document.getElementById('swarmCanvas');
const swarm = new SwarmSimulation(canvas);

// Event listeners
document.getElementById('uploadBtn').addEventListener('click', function() {
    document.getElementById('imageUpload').click();
});

document.getElementById('imageUpload').addEventListener('change', function(e) {
    const files = Array.from(e.target.files);

    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const img = new Image();
            img.onload = function() {
                swarm.addImage(img, file.name);
            };
            img.src = URL.createObjectURL(file);
        }
    });

    // Reset the file input
    e.target.value = '';
});

document.getElementById('colorToggle').addEventListener('change', function(e) {
    swarm.setColorMode(e.target.checked);
});

document.getElementById('resetSwarm').addEventListener('click', function() {
    swarm.reset();
});