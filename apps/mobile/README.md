# Moonlit Stories for Android

This workspace packages the existing statically exported website and Three.js
stories inside a native Capacitor Android application. Game and website source
remain in their existing workspaces; `www/` is generated output and should not
be edited directly.

## Build and run

From the repository root:

```bash
npm run android:sync
npm run android:open
```

Regenerate legacy Android launcher icons after changing `assets/icon.svg`:

```bash
npm run assets:android --workspace=@moonlit/mobile
```

For a debug APK:

```bash
npm run android:debug
```

For a release Android App Bundle:

```bash
npm run android:bundle
```

The release bundle still requires a production signing configuration before it
can be uploaded to Google Play.

The Gradle runner uses `JAVA_HOME` when present and otherwise resolves the Java
installation behind the active `java` command. Android Studio can also build the
project directly with its bundled JDK.

## Product scope

- All playable stories are bundled and unlocked.
- No account, analytics, advertising, billing, or network permission is added.
- Billing will later plug into the shared story-access interface without
  changing individual games.
