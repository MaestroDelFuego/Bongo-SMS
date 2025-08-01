# Bongo SMS

**Bongo SMS** is a lightweight, offline-friendly, peer-to-peer messaging web app designed to run on a local Raspberry Pi network. It's perfect for LAN-only group chats without any internet connection.

## Features

- 🗨️ Real-time group messaging
- 💾 Messages persist on the server (JSON-based)
- 📡 Completely offline-capable (ideal for Raspberry Pi + Wi-Fi AP setups)
- 📱 Responsive and mobile-friendly UI using Tailwind CSS
- 🔒 No external internet access required
- 🌙 Dark gradient theme with light message bubbles
- 🧠 Remembers user via localStorage

## How It Works

- The Raspberry Pi runs a local server (e.g., Node.js with Express).
- Clients connect via Wi-Fi AP hosted by the Pi.
- Users choose a username (stored in their browser).
- Messages are sent to the Pi's local server and displayed to all clients.
- All traffic stays local and private to the LAN.
