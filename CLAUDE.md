# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Image Swarm Simulation - A web-based particle swarm system that recreates uploaded images using Boyd's flocking behavior. Particles autonomously form image shapes, pause, then return to natural swarming patterns, cycling through multiple uploaded images.

## Architecture

- **index.html**: Main webpage with canvas, upload controls, and color toggle
- **swarm.js**: Complete simulation engine containing:
  - `Particle` class: Individual swarm agents with position, velocity, targets, and flocking behavior
  - `SwarmSimulation` class: Manages particle system, image processing, and animation loop
  - Boyd's flocking algorithm: separation, alignment, and cohesion forces
  - Image processing pipeline: scales images, extracts pixel data for particle targets

## Core Behaviors

- **Flocking**: Particles follow Boyd's three rules when not forming images
- **Image Formation**: Particles move to recreate uploaded images as shadow/silhouette
- **Color Modes**: Toggle between black/white particles or colored particles matching image pixels
- **Cycling**: Automatically transitions between multiple uploaded images
- **Image Management**: Upload multiple images, remove individual images from list

## Key Files

- Canvas size: 1000x600 pixels
- Particle count: 300 agents
- Image formation duration: 3 seconds before returning to swarm
- Supported formats: All browser-compatible image types