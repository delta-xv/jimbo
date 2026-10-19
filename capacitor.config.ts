import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.jimbo.game",
  appName: "Jimbo",
  webDir: "build",
  android: { backgroundColor: "#102e2a" },
  ios: { backgroundColor: "#102e2a", contentInset: "never" },
  plugins: {
    SystemBars: {
      insetsHandling: "native",
      style: "DARK",
      initialViewportFitValueHint: "cover",
    },
  },
};
export default config;
