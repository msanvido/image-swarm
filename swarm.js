class Particle {
    constructor(x, y, isSwarmMaster = false) {
        this.x = x;
        this.y = y;
        // More natural initial velocity with direction
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1.0;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        // Acceleration for smooth movement
        this.ax = 0;
        this.ay = 0;
        this.targetX = x;
        this.targetY = y;
        this.hasTarget = false;
        this.color = { r: 255, g: 255, b: 255 };
        this.targetColor = { r: 255, g: 255, b: 255 };
        this.isSwarmMaster = isSwarmMaster;
        this.swarmMaster = null;
        // Individual characteristics for variation
        this.maxSpeed = isSwarmMaster ? 2.0 + Math.random() * 0.5 : 1.2 + Math.random() * 0.6;
        this.maxForce = 0.05 + Math.random() * 0.02;
        this.perceptionRadius = 40 + Math.random() * 20;
    }

    update(particles, canvas, swarmMasters) {
        // Reset acceleration
        this.ax = 0;
        this.ay = 0;

        if (this.hasTarget) {
            // Move towards target position with smooth steering
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 5) {
                // Steer towards target (desired velocity)
                const desiredSpeed = Math.min(distance * 0.1, this.maxSpeed * 1.5);
                const desiredVx = (dx / distance) * desiredSpeed;
                const desiredVy = (dy / distance) * desiredSpeed;
                
                // Calculate steering force
                const steerX = desiredVx - this.vx;
                const steerY = desiredVy - this.vy;
                const steerMag = Math.sqrt(steerX * steerX + steerY * steerY);
                
                // Limit steering force for smooth turning
                if (steerMag > this.maxForce * 2) {
                    this.ax += (steerX / steerMag) * this.maxForce * 2;
                    this.ay += (steerY / steerMag) * this.maxForce * 2;
                } else {
                    this.ax += steerX;
                    this.ay += steerY;
                }
            } else {
                // Close to target, apply gentle braking
                this.ax -= this.vx * 0.1;
                this.ay -= this.vy * 0.1;
            }
        } else {
            // Free swarming behavior with boids algorithm
            if (this.isSwarmMaster) {
                // Swarm masters have more exploratory behavior
                const wanderAngle = Math.random() * Math.PI * 2;
                const wanderForce = 0.3;
                this.ax += Math.cos(wanderAngle) * wanderForce;
                this.ay += Math.sin(wanderAngle) * wanderForce;
            } else {
                // Regular particles use boids behavior
                const boids = this.calculateBoids(particles);
                this.ax += boids.separation.x * 1.5;
                this.ay += boids.separation.y * 1.5;
                this.ax += boids.alignment.x * 1.0;
                this.ay += boids.alignment.y * 1.0;
                this.ax += boids.cohesion.x * 0.8;
                this.ay += boids.cohesion.y * 0.8;

                // Follow swarm master if assigned
                if (this.swarmMaster) {
                    const dx = this.swarmMaster.x - this.x;
                    const dy = this.swarmMaster.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Follow swarm master with smooth steering
                    //if (distance > 100) {
                        const desiredSpeed = this.maxSpeed;
                        const desiredVx = (dx / distance) * desiredSpeed;
                        const desiredVy = (dy / distance) * desiredSpeed;
                        
                        const steerX = desiredVx - this.vx;
                        const steerY = desiredVy - this.vy;
                        const steerMag = Math.sqrt(steerX * steerX + steerY * steerY);
                        
                        if (steerMag > this.maxForce) {
                            this.ax += (steerX / steerMag) * this.maxForce * 0.5;
                            this.ay += (steerY / steerMag) * this.maxForce * 0.5;
                        } else {
                            this.ax += steerX * 0.5;
                            this.ay += steerY * 0.5;
                        }
                    //}
                }
            }
        }

        // Apply acceleration to velocity (smooth movement)
        this.vx += this.ax;
        this.vy += this.ay;

        // Natural velocity damping (air resistance)
        this.vx *= 0.995;
        this.vy *= 0.995;

        // Limit speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen boundaries with smooth transition
        if (this.x < -10) this.x = canvas.width + 10;
        if (this.x > canvas.width + 10) this.x = -10;
        if (this.y < -10) this.y = canvas.height + 10;
        if (this.y > canvas.height + 10) this.y = -10;

        // Interpolate color towards target
        this.color.r += (this.targetColor.r - this.color.r) * 0.1;
        this.color.g += (this.targetColor.g - this.color.g) * 0.1;
        this.color.b += (this.targetColor.b - this.color.b) * 0.1;
    }

    calculateBoids(particles) {
        let separation = { x: 0, y: 0 };
        let alignment = { x: 0, y: 0 };
        let cohesion = { x: 0, y: 0 };
        let separationCount = 0;
        let neighborCount = 0;
        const perceptionRadiusSq = this.perceptionRadius * this.perceptionRadius;

        // Sample particles for performance (check every Nth particle)
        const sampleSize = Math.min(100, particles.length);
        const step = Math.max(1, Math.floor(particles.length / sampleSize));

        for (let i = 0; i < particles.length; i += step) {
            const other = particles[i];
            if (other === this) continue;

            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const distSq = dx * dx + dy * dy;

            if (distSq > 0 && distSq < perceptionRadiusSq) {
                const dist = Math.sqrt(distSq);

                // Separation: steer away from nearby particles
                if (dist < this.perceptionRadius * 0.5) {
                    separation.x += dx / (distSq + 0.1); // Weight by inverse distance
                    separation.y += dy / (distSq + 0.1);
                    separationCount++;
                }

                // Alignment: steer towards average heading of neighbors
                alignment.x += other.vx;
                alignment.y += other.vy;

                // Cohesion: steer towards average position of neighbors
                cohesion.x += other.x;
                cohesion.y += other.y;

                neighborCount++;
            }
        }

        // Normalize and scale forces
        if (separationCount > 0) {
            const mag = Math.sqrt(separation.x * separation.x + separation.y * separation.y);
            if (mag > 0) {
                separation.x = (separation.x / mag) * this.maxForce;
                separation.y = (separation.y / mag) * this.maxForce;
            }
        }

        if (neighborCount > 0) {
            // Alignment: average velocity of neighbors
            alignment.x /= neighborCount;
            alignment.y /= neighborCount;
            const alignMag = Math.sqrt(alignment.x * alignment.x + alignment.y * alignment.y);
            if (alignMag > 0) {
                alignment.x = (alignment.x / alignMag) * this.maxSpeed;
                alignment.y = (alignment.y / alignMag) * this.maxSpeed;
                alignment.x -= this.vx;
                alignment.y -= this.vy;
                const steerMag = Math.sqrt(alignment.x * alignment.x + alignment.y * alignment.y);
                if (steerMag > this.maxForce) {
                    alignment.x = (alignment.x / steerMag) * this.maxForce;
                    alignment.y = (alignment.y / steerMag) * this.maxForce;
                }
            }

            // Cohesion: steer towards center of mass
            cohesion.x /= neighborCount;
            cohesion.y /= neighborCount;
            cohesion.x -= this.x;
            cohesion.y -= this.y;
            const cohMag = Math.sqrt(cohesion.x * cohesion.x + cohesion.y * cohesion.y);
            if (cohMag > 0) {
                cohesion.x = (cohesion.x / cohMag) * this.maxSpeed;
                cohesion.y = (cohesion.y / cohMag) * this.maxSpeed;
                cohesion.x -= this.vx;
                cohesion.y -= this.vy;
                const steerMag = Math.sqrt(cohesion.x * cohesion.x + cohesion.y * cohesion.y);
                if (steerMag > this.maxForce) {
                    cohesion.x = (cohesion.x / steerMag) * this.maxForce;
                    cohesion.y = (cohesion.y / steerMag) * this.maxForce;
                }
            }
        }

        return { separation, alignment, cohesion };
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
        this.swarmMasters = [];
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
        const numSwarmMasters = 10;
        const numParticles = 40000;

        // Create swarm masters
        for (let i = 0; i < numSwarmMasters; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const master = new Particle(x, y, true);
            this.swarmMasters.push(master);
            this.particles.push(master);
        }

        // Create regular particles and assign them to swarm masters
        for (let i = numSwarmMasters; i < numParticles; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const particle = new Particle(x, y, false);

            // Assign to a random swarm master
            particle.swarmMaster = this.swarmMasters[i % numSwarmMasters];
            this.particles.push(particle);
        }

        this.animate();
    }

    addImage(imageData, name) {
        // Process the image once and store the target pixels
        const targetPixels = this.processImage(imageData);
        this.images.push({ data: imageData, name: name, targetPixels: targetPixels });
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

        // Display target pixels on debug canvas
        this.debugCanvas.width = scaledWidth;
        this.debugCanvas.height = scaledHeight;
        this.debugCtx.fillStyle = '#000';
        this.debugCtx.fillRect(0, 0, scaledWidth, scaledHeight);

        // Draw each target pixel as a white dot
        this.debugCtx.fillStyle = '#fff';
        for (let i = 0; i < pixels.length; i++) {
            const px = pixels[i].x - offsetX;
            const py = pixels[i].y - offsetY;
            this.debugCtx.fillRect(Math.floor(px), Math.floor(py), 1, 1);
        }

        // Update debug info
        document.getElementById('debugInfo').textContent = `Target points: ${pixels.length}`;

        return pixels;
    }

    formImage() {
        if (this.images.length === 0) return;

        const currentImage = this.images[this.currentImageIndex];
        // Use pre-computed target pixels instead of recomputing
        this.targetPixels = currentImage.targetPixels;

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
            if (Math.random() < 0.002) { // Reduced probability for longer gaps between images
                this.formImage();
            }
        }

        // Check if we should stop forming and return to swarming
        if (this.formingImage && Date.now() - this.imageFormTime > 5000) { // Form for 5 seconds
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
            this.particles[i].update(this.particles, this.canvas, this.swarmMasters);
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
            // Reset with natural initial velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.0;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.ax = 0;
            particle.ay = 0;
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