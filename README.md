# Challenge Monthly Tracker

A modern, privacy-focused Progressive Web App (PWA) for tracking monthly habits and activities.

## Purpose

This application allows users to track their daily activities (like reading, exercise, work blocks) in a visual grid format. It was built to solve the need for a **free**, **offline**, and **locally-stored** alternative to subscription-based habit trackers.

## Key Features

- **Zero Cost**: No backend, no subscriptions.
- **Privacy First**: All data is stored in your browser's (or device's) `localStorage`. Nothing leaves your device.
- **Progressive Web App (PWA)**: Installable on mobile and desktop. Works completely offline.
- **Dynamic Activities**: Add custom activities and delete the ones you no longer need.
- **Monthly Overview**: Easily navigate between months.
- **CSV Export**: Backup your data or analyze it in a spreadsheet.
- **Glassmorphism Design**: A sleek, modern UI with smooth interactions.

## Technical Approach

- **HTML5/CSS3**: Utilized modern CSS features (flexbox, grid, variables, backdrop-filter) for a responsive and aesthetic layout without heavy frameworks.
- **Vanilla JavaScript**: Pure JS for logic to keep the app lightweight and fast.
- **Service Worker**: Caches assets (`index.html`, `style.css`, `script.js`) to ensure the app loads instantly and works without an internet connection.
- **Manifest**: enabling "Add to Home Screen" functionality for a native app-like experience.

## How to Run

1.  **Clone or Download** the project.
2.  **Serve** the directory. You can use any static file server.
    *   Python: `python -m http.server`
    *   Node: `npx serve`
3.  **Open** the local URL (usually `http://localhost:8000`).
4.  **Install**: Click the install icon in your browser's address bar to add it to your device.
