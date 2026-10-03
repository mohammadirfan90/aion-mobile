# Aion LMS - Mobile Application


A modern, cross-platform **Learning Management System (LMS) Mobile App** built with **React Native**, **Expo SDK 57**, and **TypeScript**. Designed for students and instructors to access courses, track progress, manage assignments, and engage in interactive learning seamlessly across mobile and web platforms.


## Key Features

*** Course Directory & Enrollment**: Browse available courses, view detailed syllabi, and enroll in interactive modules.
***Native Navigation**: File-based routing powered by **Expo Router** for smooth transitions and deep-linking support.
*** Responsive & Themed UI**: Built-in support for light/dark modes and custom design tokens (`ThemedView`, `ThemedText`).
*** Learning Progress Tracking**: Track completed lessons, upcoming deadlines, and quiz results.
*** Multi-Platform Support**: Works seamlessly across iOS, Android, and Web using a single shared codebase.
*** Micro-Animations**: Smooth UI motion powered by `react-native-reanimated` and `react-native-gesture-handler`.

##  Tech Stack

***Core Framework**: [React Native 0.86](https://reactnative.dev/) & [React 19](https://react.dev/)
***Platform & Tooling**: [Expo SDK 57](https://expo.dev/)
***Router**: [Expo Router v57](https://docs.expo.dev/router/introduction/) (File-based Routing)
***Language**: [TypeScript 6.0](https://www.typescriptlang.org/)
***Styling & Animation**: React Native Reanimated, Safe Area Context, React Native Web


## Project Structure

```text
mobile/
├── assets/                # App icons, splash screens, and static images
├── src/
│   ├── app/               # Expo Router pages (screens & navigation layouts)
│   │   ├── _layout.tsx    # Root layout & theme providers
│   │   ├── index.tsx      # Home screen / Dashboard
│   │   └── explore.tsx    # Course exploration & discovery
│   ├── components/        # Reusable UI components (ThemedView, HintRow, etc.)
│   ├── constants/         # Theme colors, layout constants, spacing
│   ├── hooks/             # Custom React hooks (theme, device state, etc.)
│   └── global.css         # Global styles
├── scripts/               # Helper & setup scripts
├── app.json               # Expo configuration & app metadata
├── tsconfig.json          # TypeScript compiler configuration
└── package.json           # App dependencies & npm scripts
```

---

## Getting Started

### Prerequisites

Ensure you have the following installed on your development machine:

***Node.js** (v18.x or later recommended)
***npm** or **bun** / **yarn**
***Expo Go app** on your iOS or Android device (for physical device testing), or an **Android Emulator** / **iOS Simulator**.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/Aion_MobileApp.git
   cd Aion_MobileApp/mobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

---

### Running the App

Start the Expo local development server:

```bash
npx expo start
```

From the terminal menu, you can launch the app on your preferred target:

* **Android Emulator / Device**: Press `a` or run:
  ```bash
  npm run android
  ```
* **iOS Simulator**: Press `i` or run:
  ```bash
  npm run ios
  ```
* **Web Browser**: Press `w` or run:
  ```bash
  npm run web
  ```



## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm start` | Starts the Expo dev server (`npx expo start`) |
| `npm run android` | Starts Expo dev server targeting Android emulator |
| `npm run ios` | Starts Expo dev server targeting iOS simulator |
| `npm run web` | Launches the web preview in your default browser |
| `npm run lint` | Runs Expo linter (`npx expo lint`) |
| `npm run reset-project` | Resets starter template files to `app-example` |


