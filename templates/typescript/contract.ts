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
  ],

  // Sensors this plugin consumes from other plugins (empty if standalone)
  consumes: [],
};

export default contract;
