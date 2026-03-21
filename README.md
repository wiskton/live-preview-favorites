Live Preview + Favorites 📺⭐
A browser extension designed to enhance your streaming experience on Twitch and Kick. It allows you to favorite your top streamers and see a live preview of their content simply by hovering over their links.

✨ Features
Dual Platform Support: Fully compatible with both Twitch and Kick.

Live Hover Preview: See what's happening on a stream without leaving your current page.

Favorites System: Keep your most-watched streamers at the top for quick access.

Clean UI: Minimalist design that integrates seamlessly into the original site's layout.

🚀 Installation
Download/Clone this repository to your local machine.

Open your browser (Chrome, Edge, or any Chromium-based browser).

Go to chrome://extensions/.

Enable "Developer mode" (usually a toggle in the top right corner).

Click on "Load unpacked" and select the folder containing the extension files.

🛠️ Technical Details
Manifest Version: 3 (Latest standard).

Permissions: Uses storage to save your favorite streamers locally.

Content Scripts: Injects content.js to detect stream links and handle hover events.

External APIs: * decapi.me & unavatar.io for fetching stream metadata and profile icons.

📂 Project Structure
Plaintext
├── icons/             # Extension icons (16x16, 32x32, 48x48, 128x128)
├── content.js         # Core logic for hover previews and DOM manipulation
├── popup.html         # The interface for the extension button
├── manifest.json      # Extension configuration and permissions
└── README.md          # Documentation
🤝 Contributing
Feel free to open issues or submit pull requests if you want to improve the preview speed or add new features!
