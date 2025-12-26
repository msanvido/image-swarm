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
        const separationRadius = 25;
        const alignmentRadius = 50;
        const cohesionRadius = 50;
        
        let sepCount = 0;
        let alignCount = 0;
        let cohCount = 0;
        
        let sepX = 0, sepY = 0;
        let alignX = 0, alignY = 0;
        let cohX = 0, cohY = 0;

        for (let other of particles) {
            if (other === this) continue;
            
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0 && distance < separationRadius) {
                sepX += dx / distance;
                sepY += dy / distance;
                sepCount++;
            }
            
            if (distance > 0 && distance < alignmentRadius) {
                alignX += other.vx;
                alignY += other.vy;
                alignCount++;
            }
            
            if (distance > 0 && distance < cohesionRadius) {
                cohX += other.x;
                cohY += other.y;
                cohCount++;
            }
        }
        
        // Separation
        if (sepCount > 0) {
            sepX /= sepCount;
            sepY /= sepCount;
            this.vx += sepX * 0.5;
            this.vy += sepY * 0.5;
        }
        
        // Alignment
        if (alignCount > 0) {
            alignX /= alignCount;
            alignY /= alignCount;
            this.vx += (alignX - this.vx) * 0.1;
            this.vy += (alignY - this.vy) * 0.1;
        }
        
        // Cohesion
        if (cohCount > 0) {
            cohX /= cohCount;
            cohY /= cohCount;
            this.vx += (cohX - this.x) * 0.005;
            this.vy += (cohY - this.y) * 0.005;
        }
    }

    draw(ctx) {
        ctx.fillStyle = `rgb(${Math.floor(this.color.r)}, ${Math.floor(this.color.g)}, ${Math.floor(this.color.b)})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
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
        
        this.init();
    }

    init() {
        // Create initial particles
        for (let i = 0; i < 1200; i++) {
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
            item.innerHTML = `
                <span>${img.name}</span>
                <button class="remove-btn" onclick="swarm.removeImage(${index})">Remove</button>
            `;
            imageList.appendChild(item);
        });
    }

    processImage(img) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Scale image to fit canvas while maintaining aspect ratio
        const scale = Math.min(this.canvas.width / img.width, this.canvas.height / img.height) * 0.8;
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        
        tempCanvas.width = scaledWidth;
        tempCanvas.height = scaledHeight;
        
        tempCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
        
        const imageData = tempCtx.getImageData(0, 0, scaledWidth, scaledHeight);
        const pixels = [];
        
        // Sample pixels for particle targets
        const step = 3; // Sample every 3rd pixel for performance
        for (let y = 0; y < scaledHeight; y += step) {
            for (let x = 0; x < scaledWidth; x += step) {
                const index = (y * scaledWidth + x) * 4;
                const r = imageData.data[index];
                const g = imageData.data[index + 1];
                const b = imageData.data[index + 2];
                const alpha = imageData.data[index + 3];
                
                // Only include visible pixels with some contrast
                const brightness = (r + g + b) / 3;
                if (alpha > 128 && brightness < 200) {
                    pixels.push({
                        x: x + (this.canvas.width - scaledWidth) / 2,
                        y: y + (this.canvas.height - scaledHeight) / 2,
                        color: this.colorMode ? { r, g, b } : { r: 255, g: 255, b: 255 }
                    });
                }
            }
        }
        
        return pixels;
    }

    formImage() {
        if (this.images.length === 0) return;
        
        const currentImage = this.images[this.currentImageIndex];
        this.targetPixels = this.processImage(currentImage.data);
        
        // Assign targets to particles
        this.particles.forEach((particle, index) => {
            if (index < this.targetPixels.length) {
                const target = this.targetPixels[index];
                particle.targetX = target.x;
                particle.targetY = target.y;
                particle.targetColor = target.color;
                particle.hasTarget = true;
            } else {
                particle.hasTarget = false;
                particle.targetColor = { r: 255, g: 255, b: 255 };
            }
        });
        
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
        
        // Update particles
        this.particles.forEach(particle => {
            particle.update(this.particles, this.canvas);
        });
    }

    draw() {
        // Clear canvas completely (no shadow/fade effect)
        this.ctx.fillStyle = 'rgb(0, 0, 0)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw particles
        this.particles.forEach(particle => {
            particle.draw(this.ctx);
        });
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

    // Reset the file input to clear the filename display
    e.target.value = '';
});

document.getElementById('colorToggle').addEventListener('change', function(e) {
    swarm.setColorMode(e.target.checked);
});

document.getElementById('resetSwarm').addEventListener('click', function() {
    swarm.reset();
});