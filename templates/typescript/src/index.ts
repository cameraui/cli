import { API_EVENT, BasePlugin } from '@camera.ui/sdk';

import { ExampleLightControl, ExampleMotionSensor } from './sensor.js';

import type { CameraDevice, DeviceStorage, LightControl, LoggerService, MotionSensor, PluginAPI } from '@camera.ui/sdk';

/**
 * Sample Plugin
 *
 * Demonstrates the camera.ui plugin architecture with sensors:
 * - MotionSensor: External motion events (webhooks, ONVIF, etc.)
 * - LightControl: Controllable light with on/brightness
 *
 * The contract (provides/consumes) is defined in contract.ts.
 */
export default class SamplePlugin extends BasePlugin {
  // Maps to track cameras and sensors
  private cameras = new Map<string, CameraDevice>();
  private motionSensors = new Map<string, MotionSensor>();
  private lightControls = new Map<string, LightControl>();

  constructor(logger: LoggerService, api: PluginAPI, storage: DeviceStorage<any>) {
    super(logger, api, storage);

    // Register lifecycle event handlers
    this.api.on(API_EVENT.FINISH_LAUNCHING, this.onFinishLaunching.bind(this));
    this.api.on(API_EVENT.SHUTDOWN, this.onShutdown.bind(this));
  }

  /**
   * Configure cameras at startup.
   * Called for cameras already assigned to this plugin.
   */
  public async configureCameras(cameras: CameraDevice[]): Promise<void> {
    for (const camera of cameras) {
      await this.setupCamera(camera);
    }
  }

  /**
   * Called when a camera is selected for this plugin at runtime.
   */
  public async onCameraAdded(camera: CameraDevice): Promise<void> {
    this.logger.log('Camera selected:', camera.name);
    await this.setupCamera(camera);
  }

  /**
   * Called when a camera is deselected from this plugin.
   */
  public async onCameraReleased(cameraId: string): Promise<void> {
    const camera = this.cameras.get(cameraId);
    if (!camera) return;

    this.logger.log('Camera deselected:', camera.name);

    // Remove sensors
    const motion = this.motionSensors.get(cameraId);
    if (motion) {
      await camera.removeSensor(motion.id);
      this.motionSensors.delete(cameraId);
    }

    const light = this.lightControls.get(cameraId);
    if (light) {
      await camera.removeSensor(light.id);
      this.lightControls.delete(cameraId);
    }

    this.cameras.delete(cameraId);
  }

  /**
   * Set up sensors for a camera.
   */
  private async setupCamera(camera: CameraDevice): Promise<void> {
    if (this.cameras.has(camera.id)) return;

    this.cameras.set(camera.id, camera);

    // Create motion sensor
    const motion = new ExampleMotionSensor(`Motion - ${camera.name}`);
    this.motionSensors.set(camera.id, motion);
    await camera.addSensor(motion);

    // Create light control
    const light = new ExampleLightControl(camera, `Light - ${camera.name}`);
    this.lightControls.set(camera.id, light);
    await camera.addSensor(light);

    this.logger.log(`Sensors registered for ${camera.name}`);

    // Example: Trigger motion after 5 seconds (for testing)
    // setTimeout(() => motion.trigger(), 5000);
  }

  /**
   * Called when the plugin has finished launching.
   */
  private onFinishLaunching(): void {
    this.logger.log('Plugin started');
  }

  /**
   * Called when camera.ui is shutting down.
   */
  private async onShutdown(): Promise<void> {
    this.logger.log('Shutting down plugin');

    // Cleanup all sensors
    this.motionSensors.clear();
    this.lightControls.clear();
    this.cameras.clear();
  }
}
