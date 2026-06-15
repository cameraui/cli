import { ClassifierDetectorSensor, LightControl, MotionSensor } from '@camera.ui/sdk';

import type { CameraDevice, ClassifierResult, Detection, JsonSchema, ModelSpec, VideoFrameData } from '@camera.ui/sdk';

// ============ MOTION SENSOR (External Events) ============

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
  constructor(name: string) {
    super(name);
  }

  /**
   * Trigger motion from external event
   */
  trigger(detections: Detection[] = []): void {
    this.detected = true;
    this.detections = detections;
  }

  /**
   * Clear motion state
   */
  reset(): void {
    this.detected = false;
    this.detections = [];
  }
}

// ============ LIGHT CONTROL ============

/**
 * Example Light Control
 *
 * Bidirectional control sensor - consumers can read and write state.
 * Implements setOn/setBrightness to handle state changes.
 */
export class ExampleLightControl extends LightControl {
  private cameraDevice: CameraDevice;

  /**
   * Storage schema for per-sensor configuration
   * These settings are persisted and shown in the UI.
   */
  schema: JsonSchema[] = [
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

  constructor(camera: CameraDevice, name = 'Light') {
    super(name);
    this.cameraDevice = camera;

    // Initialize state
    this.on = false;
    this.brightness = 100;

    // Log state changes
    this.onPropertyChanged.subscribe(({ property, value }) => {
      this.cameraDevice.logger.debug(`${this.name}: ${property} = ${value}`);
    });
  }

  /**
   * Called when consumer sets 'on' property
   */
  async setOn(value: boolean): Promise<void> {
    this.cameraDevice.logger.log(`Light turned ${value ? 'ON' : 'OFF'}`);
    this.on = value;

    // Apply default brightness when turning on
    if (value && this.storage) {
      const defaultBrightness = this.storage.values.defaultBrightness ?? 100;
      this.brightness = defaultBrightness;
    }
  }

  /**
   * Called when consumer sets 'brightness' property
   */
  async setBrightness(value: number): Promise<void> {
    this.cameraDevice.logger.log(`Light brightness: ${value}%`);
    this.brightness = value;
  }
}

// ============ CLASSIFIER (Multi-Provider Example) ============

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

  /**
   * Schema for classifier configuration
   */
  schema: JsonSchema[] = [
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

  constructor(camera: CameraDevice, name = 'Classifier') {
    super(name);
    this.cameraDevice = camera;
  }

  /**
   * Model specification
   *
   * - input: Frame size and format expected by the model
   * - outputLabels: Labels this classifier can output
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
   * Classify objects in a frame
   *
   * Called by DetectionCoordinator when triggerLabels are detected.
   * The frame is pre-scaled to modelSpec.input dimensions.
   */
  async detectClassifications(frame: VideoFrameData, _triggerRegions?: Detection[]): Promise<ClassifierResult> {
    const threshold = this.storage?.values.confidenceThreshold ?? 0.5;

    // TODO: Implement your classification model here
    // Example: Load TensorFlow model and run inference
    //
    // const predictions = await this.model.classify(frame.data);
    // return {
    //   detected: predictions.length > 0,
    //   detections: predictions.map(p => ({
    //     label: p.label,
    //     confidence: p.score,
    //     box: triggerRegions?.[0]?.box ?? { x: 0, y: 0, width: 1, height: 1 },
    //   })),
    // };

    this.cameraDevice.logger.debug(`Classifying frame ${frame.width}x${frame.height}, threshold: ${threshold}`);

    // Return empty result (placeholder)
    return {
      detected: false,
      detections: [],
    };
  }

  /**
   * Cleanup when sensor is destroyed
   */
  async destroy(): Promise<void> {
    // Release model resources if needed
  }
}
