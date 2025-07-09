# FamilyCooksClean

A modern, AI-powered recipe and meal planning app built with React Native, Expo, and Supabase.

## Overview
FamilyCooksClean helps you discover, save, and cook recipes with the help of an AI Chef assistant. You can chat with the AI, get personalized recipe suggestions, track your favorites and recently cooked meals, and enjoy a beautiful, mobile-first experience.

## Features
- **AI Chef Chat**: Ask for recipes, substitutions, or meal ideas and get instant AI-powered responses.
- **Recipe Detail & Cooking Mode**: View detailed recipes, check off ingredients, and follow animated step-by-step instructions with a built-in cooking timer.
- **Favorites & Recently Cooked**: Quickly access your favorite and recent recipes, with animated modal transitions.
- **Personalized Experience**: Save AI-generated recipes to your account.
- **Modern UI/UX**: Inspired by top apps like Airbnb, with floating input bars, bottom sheets, and smooth animations.

## Tech Stack
- **React Native** (with Expo)
- **TypeScript**
- **Supabase** (auth & backend)
- **Node.js/Express** (AI and recipe API)
- **react-native-reanimated** (animations)
- **expo-router** (navigation)

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

### Setup
1. **Clone the repo:**
   ```bash
   git clone https://github.com/yourusername/FamilyCooksClean.git
   cd FamilyCooksClean/client
   ```
2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```
3. **Set up environment variables:**
   - Create a `.env` file in the `client` directory:
     ```env
     SUPABASE_URL=your-supabase-url
     SUPABASE_ANON_KEY=your-supabase-anon-key
     ```
   - (Optional) Add any other API endpoints or secrets as needed.
4. **Start the app:**
   ```bash
   npx expo start
   ```
   - Scan the QR code with Expo Go or run on an emulator.

## Project Structure
```
client/
  app/                # App screens and navigation
  components/         # Reusable UI components
  constants/          # App-wide constants
  hooks/              # Custom React hooks
  assets/             # Images, fonts, etc.
  lib/                # Supabase and API clients
  scripts/            # Utility scripts
  package.json        # Project dependencies and scripts
  ...
```

## Scripts
- `npm start` / `npx expo start` — Start the Expo development server
- `npm run lint` — Lint the codebase
- `npm run reset-project` — Clean and reset the project (see scripts/reset-project.js)

## Environment Variables
- `SUPABASE_URL` — Your Supabase project URL
- `SUPABASE_ANON_KEY` — Your Supabase anon/public API key

## Troubleshooting
- **Missing Supabase env vars:** Ensure `.env` is present and restart the dev server after changes.
- **Module not found:** Run `npm install` to ensure all dependencies are installed.
- **Navigation errors:** Make sure all screen files export a default React component and match the navigation stack.

## License
MIT

---

*Made with ❤️ by the FamilyCooksClean team.* 