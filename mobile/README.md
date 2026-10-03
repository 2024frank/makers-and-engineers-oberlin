# MOE Members phone app

A small iOS and Android app for club members. It opens the member portal
(`https://oberlin32engineeringsociety.com/member`) inside the app, so members
get everything the website's member portal has.

## Updates

The app loads the live website. Every website deploy reaches the phones the
next time the app opens. A new app store release is only needed when something
in this folder changes (app name, icon, permissions, Capacitor version).

## Build

```bash
cd mobile
npm install
npx cap sync
```

- iOS: `npx cap open ios`, then run from Xcode. Needs Xcode.
- Android: `npx cap open android`, then run from Android Studio. Needs Android Studio.

## Icons and splash screens

Source images are in `assets/`. After changing them run `npm run icons`.

## Release

- App Store and TestFlight need an Apple Developer account. Set the team under
  Signing & Capabilities in Xcode, then Product > Archive.
- Google Play needs a Play Console account. In Android Studio use
  Build > Generate Signed App Bundle.

## Settings

`capacitor.config.json` holds the app id, name and the portal address.
`www/offline.html` is shown when the phone has no connection.
