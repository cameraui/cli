"""
Sample camera.ui Plugin (Python)

Demonstrates the camera.ui plugin architecture with sensors:
- MotionSensor: External motion events (webhooks, ONVIF, etc.)
- LightControl: Controllable light with on/brightness
- ClassifierDetectorSensor: Multi-provider frame-based classification

Sensors are entities of their own. There are two ways to register them:
- camera.addSensor(sensor): the sensor belongs to this camera's hardware
  (spotlight, siren, battery, ...). The assignment is locked, users cannot
  re-assign it.
- api.sensorManager.addSensor(sensor): standalone device (smart plug, hub,
  imported smart-home device). The user assigns it to cameras in the UI.
"""

from __future__ import annotations

from typing import Any

from camera_ui_sdk import (
    API_EVENT,
    BasePlugin,
    CameraDevice,
    ClassifierDetectorSensor,
    ClassifierResult,
    Detection,
    DeviceStorage,
    JsonSchema,
    LightControl,
    LoggerService,
    ModelSpec,
    MotionSensor,
    PluginAPI,
    VideoFrameData,
)


class ExampleMotionSensor(MotionSensor):
    """
    Example motion sensor for external triggers.

    Use this for external motion sources:
    - ONVIF camera events
    - SMTP notifications
    - Webhook triggers
    - API polling

    For frame-based detection, extend MotionDetectorSensor instead.
    """

    def __init__(self, name: str, native_id: str | None = None) -> None:
        # Pass a native_id (e.g. the upstream device id) so the host can
        # reconcile this sensor across restarts. Without it, identity falls
        # back to (type, name) and a rename creates a new sensor.
        super().__init__(name, native_id=native_id)

    def on_start(self) -> None:
        """Called once the sensor is registered and its storage is ready.

        Start pollers, subscriptions or timers here.
        """

    def on_stop(self) -> None:
        """Counterpart of on_start: tear down whatever it started.

        Runs on removal, plugin shutdown and cleanup.
        """

    def trigger(self, detections: list[Detection] | None = None) -> None:
        """Trigger motion from an external event.

        Without explicit detections the SDK synthesizes a full-frame
        'motion' detection.
        """
        self.reportDetections(True, detections)

    def reset(self) -> None:
        """Clear motion state."""
        self.clearDetections()


class ExampleLightControl(LightControl):
    """
    Example light control sensor.

    Bidirectional control sensor - consumers can read and write state.
    Override setOn/setOff/setBrightness to drive your hardware, then call
    super() to sync the SDK state. For hardware-pushed updates (someone
    flipped the physical switch), call super().setOn()/super().setOff() from
    your event handler - that only syncs state.
    """

    def __init__(self, camera: CameraDevice, name: str = "Light") -> None:
        super().__init__(name)
        self._camera = camera

        # Log state changes
        self.onPropertyChanged.subscribe(
            lambda event: self._camera.logger.debug(f"{self.name}: {event['property']} = {event['value']}")
        )

    @property
    def storage_schema(self) -> list[JsonSchema]:
        """Storage schema for per-sensor configuration.

        These settings are persisted and shown in the UI.
        """
        return [
            {
                "type": "number",
                "key": "defaultBrightness",
                "title": "Default Brightness",
                "description": "Default brightness level (0-100)",
                "defaultValue": 100,
                "minimum": 0,
                "maximum": 100,
                "store": True,
            },
            {
                "type": "boolean",
                "key": "autoOff",
                "title": "Auto-Off",
                "description": "Automatically turn off after timeout",
                "defaultValue": False,
                "store": True,
            },
        ]

    async def setOn(self) -> None:
        """Called when a consumer turns the light on."""
        # TODO: Drive your hardware here, then sync the SDK state
        self._camera.logger.log("Light turned ON")
        await super().setOn()

        # Apply default brightness when turning on
        await self.setBrightness(self.storage.values.get("defaultBrightness", 100))

    async def setOff(self) -> None:
        """Called when a consumer turns the light off."""
        # TODO: Drive your hardware here, then sync the SDK state
        self._camera.logger.log("Light turned OFF")
        await super().setOff()

    async def setBrightness(self, value: int) -> None:
        """Called when a consumer sets the brightness."""
        # TODO: Drive your hardware here, then sync the SDK state
        self._camera.logger.log(f"Light brightness: {value}%")
        await super().setBrightness(value)


class ExampleClassifier(ClassifierDetectorSensor[dict[str, Any]]):
    """
    Example classifier sensor.

    Multi-provider sensor: Multiple classifiers can be registered per camera.
    Example use cases:
    - Bird species classifier (triggers on 'bird' from object detection)
    - Dog breed classifier (triggers on 'dog')
    - Plant species classifier

    The DetectionCoordinator calls detectClassifications() when triggerLabels are detected.
    """

    def __init__(self, camera: CameraDevice, name: str = "Classifier") -> None:
        super().__init__(name)
        self._camera = camera

    @property
    def storage_schema(self) -> list[JsonSchema]:
        return [
            {
                "type": "number",
                "key": "confidenceThreshold",
                "title": "Confidence Threshold",
                "description": "Minimum confidence for classifications (0-1)",
                "defaultValue": 0.5,
                "minimum": 0.1,
                "maximum": 1.0,
                "step": 0.05,
                "store": True,
            },
        ]

    @property
    def modelSpec(self) -> ModelSpec:
        """
        Model specification.

        - input: Frame size and format expected by the model
        - triggerLabels: Object labels that trigger classification
        """
        return {
            "input": {
                "width": 224,
                "height": 224,
                "format": "rgb",
            },
            # Trigger when object detection finds these labels
            "triggerLabels": ["animal"],
        }

    async def detectClassifications(self, frames: list[VideoFrameData]) -> list[ClassifierResult]:
        """
        Classify frames in batch.

        Called by the DetectionCoordinator when triggerLabels are detected.
        Each frame is pre-scaled to modelSpec.input dimensions (normally a
        trigger region cropped by the upstream object detector).
        Must return exactly one ClassifierResult per input frame, in order.
        """
        threshold = self.storage.values.get("confidenceThreshold", 0.5)

        # TODO: Implement your classification model here
        # Example: Load a model in on_start() and run inference per frame
        #
        # results: list[ClassifierResult] = []
        # for frame in frames:
        #     predictions = await self.model.classify(frame["data"])
        #     detections = [
        #         {
        #             "label": "animal",
        #             "attribute": p.label,
        #             "confidence": p.score,
        #             "box": {"x": 0, "y": 0, "width": 1, "height": 1},
        #         }
        #         for p in predictions
        #         if p.score >= threshold
        #     ]
        #     results.append({"detected": len(detections) > 0, "detections": detections})
        # return results

        self._camera.logger.debug(f"Classifying {len(frames)} frame(s), threshold: {threshold}")

        # Return one empty result per frame (placeholder)
        return [{"detected": False, "detections": []} for _ in frames]

    def on_stop(self) -> None:
        """Release model resources when the sensor is removed."""


class SamplePlugin(BasePlugin):
    """
    Sample plugin demonstrating camera.ui SDK usage.

    The contract (provides/consumes) is defined in contract.ts.
    """

    def __init__(self, logger: LoggerService, api: PluginAPI, storage: DeviceStorage[Any]) -> None:
        super().__init__(logger, api, storage)

        # Maps to track cameras and sensors
        self.cameras: dict[str, CameraDevice] = {}
        self.motion_sensors: dict[str, ExampleMotionSensor] = {}
        self.light_controls: dict[str, ExampleLightControl] = {}

        # Register lifecycle event handlers
        self.api.on(API_EVENT.FINISH_LAUNCHING, self._on_finish_launching)
        self.api.on(API_EVENT.SHUTDOWN, self._on_shutdown)

    async def configureCameras(self, cameraDevices: list[CameraDevice]) -> None:
        """
        Configure cameras at startup.
        Called for cameras already assigned to this plugin.
        """
        for camera in cameraDevices:
            await self._setup_camera(camera)

    async def onCameraAdded(self, camera: CameraDevice) -> None:
        """Called when a camera is selected for this plugin at runtime."""
        self.logger.log(f"Camera selected: {camera.name}")
        await self._setup_camera(camera)

    async def onCameraReleased(self, cameraId: str) -> None:
        """Called when a camera is deselected from this plugin."""
        camera = self.cameras.get(cameraId)
        if not camera:
            return

        self.logger.log(f"Camera deselected: {camera.name}")

        # Remove sensors
        motion = self.motion_sensors.get(cameraId)
        if motion:
            await camera.removeSensor(motion.id)
            del self.motion_sensors[cameraId]

        light = self.light_controls.get(cameraId)
        if light:
            await camera.removeSensor(light.id)
            del self.light_controls[cameraId]

        del self.cameras[cameraId]

    async def _setup_camera(self, camera: CameraDevice) -> None:
        """Set up camera-owned sensors. The assignment is locked to this camera."""
        if camera.id in self.cameras:
            return

        self.cameras[camera.id] = camera

        # Create motion sensor
        motion = ExampleMotionSensor(f"Motion - {camera.name}")
        self.motion_sensors[camera.id] = motion
        await camera.addSensor(motion)

        # Create light control
        light = ExampleLightControl(camera, f"Light - {camera.name}")
        self.light_controls[camera.id] = light
        await camera.addSensor(light)

        self.logger.log(f"Sensors registered for {camera.name}")

        # Example: Trigger motion after 5 seconds (for testing)
        # import asyncio
        # asyncio.get_event_loop().call_later(5, motion.trigger)

    def _on_finish_launching(self) -> None:
        """Called when the plugin has finished launching."""
        self.logger.log("Plugin started")

        # Standalone sensors (not part of a camera's hardware) go through the
        # sensor manager. Pass a native_id so the host can reconcile the
        # sensor across restarts:
        #
        # plug = SwitchControl("Smart Plug", native_id="plug-1")
        # await self.api.sensorManager.addSensor(plug)

    def _on_shutdown(self) -> None:
        """Called when camera.ui is shutting down."""
        self.logger.log("Shutting down plugin")

        # Cleanup all sensors
        self.motion_sensors.clear()
        self.light_controls.clear()
        self.cameras.clear()


def __main__() -> type[SamplePlugin]:
    """Plugin entry point - returns the plugin class."""
    return SamplePlugin
