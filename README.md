# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/d8070118-22c4-4cad-a5c6-c9518c9a8e9f

## Mobile & Android Compatibility

This app is fully optimized for mobile devices including Android smartphones:

### Android Browser Support
- ✅ **Android Chrome**: Fully supported with real-time speech recognition via WebRTC
- ✅ **Android Firefox**: Supported
- ✅ **Samsung Internet**: Supported

### Speech Recognition Features
- **Real-time transcription** powered by OpenAI Whisper
- **Android-optimized** audio capture with fallback mechanisms
- **Automatic retry** logic for unstable connections
- **Enhanced noise suppression** for medical terminology accuracy

### Key Mobile Features
- Touch-optimized UI with proper touch targets (minimum 44x44px)
- Responsive layouts for all screen sizes
- Safe area support for notched devices
- Optimized input fields (no zoom on focus)
- Smooth scrolling and animations

### For Developers - Troubleshooting Android Issues
If experiencing speech recognition issues on Android:
1. **Microphone permissions**: Ensure microphone access is granted in browser settings (Settings → Site settings → Microphone)
2. **HTTPS required**: Microphone access requires HTTPS (works automatically on Lovable)
3. **Clear browser cache**: Clear cache and reload if experiencing connection issues
4. **Check console logs**: Open Chrome DevTools for detailed connection logs
5. **Connection state**: Look for "WebRTC connection established (Android mode)" in console
6. **Audio constraints**: The app auto-detects Android and uses optimized audio settings

Common Android-specific behaviors:
- Slightly higher VAD threshold (0.6 vs 0.5) to reduce false positives
- Longer silence detection (500ms vs 200ms) for better phrase capture
- Extended duplicate window (3s vs 2s) for more reliable deduplication
- Auto-retry up to 3 times on connection failures

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d8070118-22c4-4cad-a5c6-c9518c9a8e9f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d8070118-22c4-4cad-a5c6-c9518c9a8e9f) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
