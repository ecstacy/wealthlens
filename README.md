# WealthLens

A local-first, privacy-focused personal finance & portfolio manager built with Expo / React Native.

Consolidates income, expenses, and a multi-geography investment portfolio (Indian MFs/SIPs/stocks, EU/global stocks, FDs/PPF/NPS, crypto) into one secure, on-device app. AI-powered analysis (via the Claude API) covers portfolio health, mutual-fund overlap detection, diversification gaps, and return forecasting.

> All financial data stays encrypted on-device. Only anonymized portfolio *structure* (percentages, asset classes) is ever sent for AI analysis — never balances, account numbers, or personal identifiers.

## Features

- 📊 Multi-currency, multi-geography portfolio tracking (INR / EUR / USD / GBP)
- 🔍 Search-as-you-type security picker (Yahoo Finance for stocks/ETFs/crypto, mfapi.in for Indian mutual funds)
- 💰 Income & expense tracking with savings-rate insights
- 🥧 Asset-class & geography allocation charts
- 🤖 Claude-powered analysis: portfolio health, MF overlap, rebalancing, tax efficiency, return forecast
- 🔐 Biometric / PIN lock, encrypted SQLite storage

## Tech Stack

Expo SDK 56 · React Native 0.85 · Expo Router · expo-sqlite · React Native Paper · react-native-gifted-charts · Zustand · Claude API

## Getting Started

```bash
npm install --legacy-peer-deps
npx expo start --dev-client
```

For a standalone Android build:

```bash
cd android
./gradlew :app:assembleRelease -x lint -x lintVitalRelease -PreactNativeArchitectures=arm64-v8a
```

### Signing

Release builds use `android/keystore.properties` (gitignored) for signing credentials. Without it, the build falls back to debug signing so the project still compiles after a fresh clone. To produce your own signed builds, create `android/keystore.properties`:

```properties
storeFile=your-release.keystore
storePassword=********
keyAlias=********
keyPassword=********
```

### Claude API key

Set your Anthropic API key in-app under **Settings → Claude API Key**. It is stored in the device secure keychain, never in the repo.

## Notes on the toolchain

- AGP is pinned to **8.13.2** via a `resolutionStrategy.force` in `android/build.gradle` (the highest version compatible with the RN 0.85 / Expo 56 Gradle plugins).
- Builds require JDK 17; lint is disabled for release builds (a tooling OOM unrelated to app code).
