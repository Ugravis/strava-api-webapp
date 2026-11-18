import { GeolocateControl } from "maplibre-gl";

interface UserLocationOptions {
  /** The edges of the map hidden by the panel and the bands, kept out of the centering. */
  inset: () => { right: number; bottom: number };
  /** Whether the user shows their position, a setting of the map. */
  enabled: () => boolean;
  /** Called by a click on the button while the setting is off: the click turns it back on. */
  onEnable: () => void;
}

/**
 * The native control of the position of the user, its blue dot kept up to date
 * as they move: each click centers the map on them once, the camera never
 * following them afterwards. MapLibre follows the user in its tracking mode and
 * turns the dot off on a second click; this control leaves that lock at once.
 * The button stays while the setting is off, its icon struck through.
 */
export class UserLocationControl extends GeolocateControl {
  private readonly location: UserLocationOptions;
  /** Whether the browser can give the position, known once the button is set up. */
  private supported = false;
  /** Whether the next fix only places the dot, the camera kept where it is. */
  private quiet = false;

  constructor(location: UserLocationOptions) {
    super({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showAccuracyCircle: true });
    this.location = location;
    // Once the button is ready, the position asked at once: the browser prompts the user if needed.
    const finishSetupUI = this._finishSetupUI;
    this._finishSetupUI = (supported) => {
      finishSetupUI(supported);
      this.supported = supported && this._setup;
      if (location.enabled()) this.showQuietly();
    };
    const updateCamera = this._updateCamera;
    this._updateCamera = (position) => {
      if (this.quiet) this.quiet = false;
      else {
        this.options.fitBoundsOptions = { ...this.options.fitBoundsOptions, padding: { top: 0, left: 0, ...location.inset() } };
        updateCamera(position);
      }
      // After the native step, which still reads the lock it set.
      queueMicrotask(() => this.leaveLock());
    };
  }

  /** A click: the setting turned back on first if it was off, then the map centered on the user. */
  override trigger(): boolean {
    if (!this.location.enabled()) this.location.onEnable();
    return super.trigger();
  }

  /** Follows the setting: the dot shown without moving the map, or hidden with the watch of the position stopped. */
  setEnabled(enabled: boolean): void {
    if (enabled) {
      this.showQuietly();
      return;
    }
    this.quiet = false;
    if (this._watchState === "OFF") return;
    // From the background state, MapLibre goes back to the lock: from the lock, it turns off.
    if (this._watchState === "BACKGROUND") this._watchState = "ACTIVE_LOCK";
    super.trigger();
  }

  private showQuietly(): void {
    if (!this.supported || !this._map || this._watchState !== "OFF") return;
    this.quiet = true;
    super.trigger();
  }

  /** The lock on the user left for the background state: the dot moves, the camera stays. */
  private leaveLock(): void {
    if (this._watchState !== "ACTIVE_LOCK") return;
    this._watchState = "BACKGROUND";
    this._geolocateButton.classList.remove("maplibregl-ctrl-geolocate-active");
    this._geolocateButton.classList.add("maplibregl-ctrl-geolocate-background");
  }
}
