# Gradle Dependency Visualizer

[English](README.md) | [中文](README.cn.md)

An Android-focused Gradle dependency visualization tool.  
It parses the output of `./gradlew dependencies` into an interactive graph, helping you quickly inspect dependency layers, version conflicts, and key nodes.

Live demo: <https://deps.aimfor.top>

## Features

- Parse Gradle dependency tree text into graph data
- Visualize dependencies with an interactive force-directed graph
- Detect and highlight dependency version conflicts automatically
- Search nodes and inspect detailed dependency information
- Export the current graph as a PNG image

## Tech Stack

- React 19
- TypeScript
- Vite
- D3.js
- Framer Motion

## Local Development

- Install dependencies: `npm ci`
- Start dev server: `npm run dev`
- Build for production: `npm run build`
- Run lint: `npm run lint`

## Screenshots

![Gradle Dependency Visualizer Screenshot 1](screenshots/ScreenShot_2026-03-09_110833_877.png)
![Gradle Dependency Visualizer Screenshot 2](screenshots/ScreenShot_2026-03-09_110853_423.png)

## Deployment

This project includes a GitHub Actions workflow that builds and deploys automatically to an Nginx server on pushes to the `main` branch.
