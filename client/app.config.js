export default {
    expo: {
      // App identity (recommended to set now, before TestFlight)
      name: "AI Recipe Tool",
      slug: "ai-recipe-tool",
      scheme: "airecipetool",
      updates: { url: "https://u.expo.dev/c1093962-cd55-4fbb-9b8d-b85c71e08dd5" },
  
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/images/icon.png",
      userInterfaceStyle: "automatic",
      newArchEnabled: false,
  
      // EAS Update (OTA) compatibility strategy
      runtimeVersion: {
        policy: "appVersion",
      },
  
      ios: {
        supportsTablet: true,
        // Strongly recommended for TestFlight/App Store
        bundleIdentifier: "com.ejwalters24.airecipetool",
        infoPlist: {
          ITSAppUsesNonExemptEncryption: false,
        },
      },
  
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/images/adaptive-icon.png",
          backgroundColor: "#ffffff",
        },
        edgeToEdgeEnabled: true,
        // Optional but good to set if you ever ship Android
        package: "com.ejwalters24.airecipetool",
      },
  
      web: {
        bundler: "metro",
        output: "static",
        favicon: "./assets/images/favicon.png",
      },
  
      plugins: [
        "expo-router",
        [
          "expo-splash-screen",
          {
            image: "./assets/images/splash-icon.png",
            imageWidth: 200,
            resizeMode: "contain",
            backgroundColor: "#ffffff",
          },
        ],
      ],
  
      experiments: {
        typedRoutes: true,
      },
  
      extra: {
        // Keep your existing env vars
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
        eas: {
            projectId: "c1093962-cd55-4fbb-9b8d-b85c71e08dd5",
          },
      },
    },
  };
  