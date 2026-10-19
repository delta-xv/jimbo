import { App } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";

export function listenForNativeEvents(callbacks: {
  stateChange?: (active: boolean) => void;
  back?: () => void;
}): () => void {
  const platform = Capacitor.getPlatform();
  let disposed = false;
  const handles: PluginListenerHandle[] = [];
  const remove = (handle: PluginListenerHandle) => {
    void Promise.resolve()
      .then(() => handle.remove())
      .catch(() => {});
  };
  const keep = (pending: Promise<PluginListenerHandle>) => {
    void pending
      .then((handle) => {
        if (disposed) remove(handle);
        else handles.push(handle);
      })
      .catch(() => {});
  };
  if (platform === "ios" || platform === "android") {
    if (callbacks.stateChange)
      keep(App.addListener("appStateChange", ({ isActive }) => {
        if (!disposed) callbacks.stateChange?.(isActive);
      }));
    if (platform === "android" && callbacks.back)
      keep(App.addListener("backButton", () => {
        if (!disposed) callbacks.back?.();
      }));
  }
  return () => {
    disposed = true;
    handles.forEach(remove);
    handles.length = 0;
  };
}
