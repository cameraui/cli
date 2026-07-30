import { ClassifierDetectorSensor, LightControl, MotionSensor } from '@camera.ui/sdk';

import type { CameraDevice, ClassifierResult, Detection, JsonSchema, ModelSpec, VideoFrameData } from '@camera.ui/sdk';

/**
 * Example Motion Sensor
 *
 * Use this for external motion sources:
 * - ONVIF camera events
 * - SMTP notifications
 * - Webhook triggers
 * - API polling
 *
 * For frame-based detection, extend MotionDetectorSensor instead.
 */
export class ExampleMotionSensor extends MotionSensor {
  /**
   * Pass a nativeId (e.g. the upstream device id) so the host can reconcile
   * this sensor across restarts. Without it, identity falls back to
   * (type, name) and a rename creates a new sensor.
   */
  constructor(name: string, nativeId?: string) {
    super(name, { nativeId });
  }

  /**
   * Called once the sensor is registered and its storage is ready.
   * Start pollers, subscriptions or timers here.
   */
  protected override onStart(): void {
    // Example: subscribe to your device's event stream
  }

  /**
   * Counterpart of onStart: tear down whatever it started.
   * Runs on removal, plugin shutdown and cleanup.
   */
  protected override onStop(): void {
    // Example: unsubscribe / clear timers
  }

  /**
   * Trigger motion from an external event.
   * Without explicit detections the SDK synthesizes a full-frame 'motion' detection.
   */
  trigger(detections?: Detection[]): void {
    this.reportDetections(true, detections);
  }

  /**
   * Clear motion state
   */
  reset(): void {
    this.clearDetections();
  }
}

/**
 * Example Light Control
 *
 * Bidirectional control sensor - consumers can read and write state.
 * Override setOn/setOff/setBrightness to drive your hardware, then call
 * super to sync the SDK state. For hardware-pushed updates (someone flipped
 * the physical switch), call super.setOn()/super.setOff() from your event
 * handler - that only syncs state.
 */
export class ExampleLightControl extends LightControl {
  private cameraDevice: CameraDevice;

  constructor(camera: CameraDevice, name = 'Light') {
    super(name);
    this.cameraDevice = camera;

    // Log state changes
    this.onPropertyChanged.subscribe(({ property, value }) => {
      this.cameraDevice.logger.debug(`${this.name}: ${property} = ${value}`);
    });
  }

  /**
   * Storage schema for per-sensor configuration
   * These settings are persisted and shown in the UI.
   */
  override get storageSchema(): JsonSchema[] {
    return [
      {
        type: 'number',
        key: 'defaultBrightness',
        title: 'Default Brightness',
        description: 'Default brightness level (0-100)',
        defaultValue: 100,
        minimum: 0,
        maximum: 100,
        store: true,
      },
      {
        type: 'boolean',
        key: 'autoOff',
        title: 'Auto-Off',
        description: 'Automatically turn off after timeout',
        defaultValue: false,
        store: true,
      },
    ];
  }

  /**
   * Called when a consumer turns the light on
   */
  override async setOn(): Promise<void> {
    // TODO: Drive your hardware here, then sync the SDK state
    this.cameraDevice.logger.log('Light turned ON');
    await super.setOn();

    // Apply default brightness when turning on
    await this.setBrightness(this.storage.values.defaultBrightness ?? 100);
  }

  /**
   * Called when a consumer turns the light off
   */
  override async setOff(): Promise<void> {
    // TODO: Drive your hardware here, then sync the SDK state
    this.cameraDevice.logger.log('Light turned OFF');
    await super.setOff();
  }

  /**
   * Called when a consumer sets the brightness
   */
  override async setBrightness(value: number): Promise<void> {
    // TODO: Drive your hardware here, then sync the SDK state
    this.cameraDevice.logger.log(`Light brightness: ${value}%`);
    await super.setBrightness(value);
  }
}

/**
 * Example Classifier Sensor
 *
 * Multi-provider sensor: Multiple classifiers can be registered per camera.
 * Example use cases:
 * - Bird species classifier (triggers on 'bird' from object detection)
 * - Dog breed classifier (triggers on 'dog')
 * - Plant species classifier
 *
 * The DetectionCoordinator calls detectClassifications() when triggerLabels are detected.
 */
export class ExampleClassifier extends ClassifierDetectorSensor {
  private cameraDevice: CameraDevice;

  constructor(camera: CameraDevice, name = 'Classifier') {
    super(name);
    this.cameraDevice = camera;
  }

  /**
   * Schema for classifier configuration
   */
  override get storageSchema(): JsonSchema[] {
    return [
      {
        type: 'number',
        key: 'confidenceThreshold',
        title: 'Confidence Threshold',
        description: 'Minimum confidence for classifications (0-1)',
        defaultValue: 0.5,
        minimum: 0.1,
        maximum: 1.0,
        step: 0.05,
        store: true,
      },
    ];
  }

  /**
   * Model specification
   *
   * - input: Frame size and format expected by the model
   * - triggerLabels: Object labels that trigger classification
   */
  get modelSpec(): ModelSpec {
    return {
      input: {
        width: 224,
        height: 224,
        format: 'rgb',
      },
      // Trigger when object detection finds these labels
      triggerLabels: ['animal'],
    };
  }

  /**
   * Classify frames in batch.
   *
   * Called by the DetectionCoordinator when triggerLabels are detected.
   * Each frame is pre-scaled to modelSpec.input dimensions (normally a
   * trigger region cropped by the upstream object detector).
   * Must return exactly one ClassifierResult per input frame, in order.
   */
  async detectClassifications(frames: VideoFrameData[]): Promise<ClassifierResult[]> {
    const threshold = this.storage.values.confidenceThreshold ?? 0.5;

    // TODO: Implement your classification model here
    // Example: Load a model in onStart() and run inference per frame
    //
    // return Promise.all(frames.map(async (frame) => {
    //   const predictions = await this.model.classify(frame.data);
    //   const detections = predictions.filter(p => p.score >= threshold).map(p => ({
    //     label: 'animal',
    //     attribute: p.label,
    //     confidence: p.score,
    //     box: { x: 0, y: 0, width: 1, height: 1 },
    //   }));
    //   return { detected: detections.length > 0, detections };
    // }));

    this.cameraDevice.logger.debug(`Classifying ${frames.length} frame(s), threshold: ${threshold}`);

    // Return one empty result per frame (placeholder)
    return frames.map(() => ({ detected: false, detections: [] }));
  }

  /**
   * Release model resources when the sensor is removed
   */
  protected override onStop(): void {
    // Example: this.model?.dispose()
  }
}
