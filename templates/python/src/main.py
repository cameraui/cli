"""
Sample camera.ui Plugin (Python)

Demonstrates the camera.ui plugin architecture with sensors:
- MotionSensor: External motion events (webhooks, ONVIF, etc.)
- LightControl: Controllable light with on/brightness
- ClassifierDetectorSensor: Multi-provider frame-based classification
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

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

if TYPE_CHECKING:
    from camera_ui_sdk import SensorType


# ============ MOTION SENSOR (External Events) ============


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

    def __init__(self, name: str) -> None:
        super().__init__(name)

    def trigger(self, detections: list[Detection] | None = None) -> None:
        """Trigger motion from external event."""
        self.detected = True
        self.detections = detections or []

    def reset(self) -> None:
        """Clear motion state."""
        self.detected = False
        self.detections = []


# ============ LIGHT CONTROL ============


class ExampleLightControl(LightControl):
    """
    Example light control sensor.

    Bidirectional control sensor - consumers can read and write state.
    Implements setOn/setBrightness to handle state changes.
    """

    def __init__(self, camera: CameraDevice, name: str = "Light") -> None:
        super().__init__(name)
        self._camera = camera

        # Initialize state
        self.on = False
        self.brightness = 100

        # Log state changes
        self.onPropertyChanged.subscribe(
            lambda event: self._camera.logger.debug(f"{self.name}: {event['property']} = {event['value']}")
        )

    @property
    def storage_schema(self) -> list[JsonSchema]:
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

    async def setOn(self, value: bool) -> None:
        """Called when consumer sets 'on' property."""
        self._camera.logger.log(f"Light turned {'ON' if value else 'OFF'}")
        self.on = value

        # Apply default brightness when turning on
        if value and self.storage:
            default_brightness = self.storage.values.get("defaultBrightness", 100)
            self.brightness = default_brightness

    async def setBrightness(self, value: int) -> None:
        """Called when consumer sets 'brightness' property."""
        self._camera.logger.log(f"Light brightness: {value}%")
        self.brightness = value


# ============ CLASSIFIER (Multi-Provider Example) ============


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
        - outputLabels: Labels this classifier can output
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

    async def detectClassifications(
        self,
        frame: VideoFrameData,
        triggerRegions: list[Detection] | None = None,  # noqa: ARG002
    ) -> ClassifierResult:
        """
        Classify objects in a frame.

        Called by DetectionCoordinator when triggerLabels are detected.
        The frame is pre-scaled to modelSpec.input dimensions.
        """
        threshold = 0.5
        if self.storage:
            threshold = self.storage.values.get("confidenceThreshold", 0.5)

        # TODO: Implement your classification model here
        # Example: Load TensorFlow model and run inference
        #
        # predictions = await self.model.classify(frame["data"])
        # return {
        #     "detected": len(predictions) > 0,
        #     "detections": [
        #         {
        #             "label": p.label,
        #             "confidence": p.score,
        #             "box": triggerRegions[0]["box"] if triggerRegions else {"x": 0, "y": 0, "width": 1, "height": 1},
        #         }
        #         for p in predictions
        #     ],
        # }

        self._camera.logger.debug(
            f"Classifying frame {frame['width']}x{frame['height']}, threshold: {threshold}"
        )

        # Return empty result (placeholder)
        return {
            "detected": False,
            "detections": [],
        }

    async def destroy(self) -> None:
        """Cleanup when sensor is destroyed."""
        # Release model resources if needed
        pass


# ============ PLUGIN ============


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

    async def onCameraAdded(self, camera: CameraDevice, _sensor_type: SensorType | None = None) -> None:
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
        """Set up sensors for a camera."""
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
