import { PluginRole, SensorType } from '@camera.ui/sdk';

import type { PluginContract } from '@camera.ui/sdk';

/**
 * Plugin Contract
 *
 * Defines what sensors this plugin provides and consumes.
 * This is used by camera.ui to determine plugin compatibility.
 */
export const contract: PluginContract = {
  // Plugin display name
  name: 'Sample Plugin',

  // Plugin role - what this plugin does
  role: PluginRole.SensorProvider,

  // Sensors this plugin provides (add the sensor types you implement)
  provides: [
    SensorType.Motion,
    SensorType.Light,
    SensorType.Classifier, // Multi-provider: multiple classifiers per camera
    // SensorType.Object,     // Object detection
    // SensorType.Battery,    // Battery level
    // SensorType.Doorbell,   // Doorbell trigger
    // SensorType.Contact,    // Contact sensor
    // SensorType.Siren,      // Siren control
    // SensorType.Switch,     // Switch control
    // SensorType.SecuritySystem, // Security system
    // SensorType.Occupancy,  // Occupancy/presence
    // SensorType.Smoke,      // Smoke detector
    // SensorType.Leak,       // Water leak detector
    // SensorType.Temperature, // Temperature sensor
    // SensorType.Humidity,   // Humidity sensor
    // SensorType.Lock,       // Lock control
    // SensorType.Garage,     // Garage door opener
  ],

  // Sensor types this plugin consumes from other plugins. Only sensors of
  // these types that the user exported are delivered to this plugin.
  consumes: [],

  // Capability flags for host-invoked interfaces (detection, discovery, NVR, ...)
  interfaces: [],
};

export default contract;
