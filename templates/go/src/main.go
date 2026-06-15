package main

import (
	sdk "github.com/seydx/camera-ui-sdk"
)

// {{pluginName}}Plugin is the main plugin struct.
type {{pluginName}}Plugin struct {
	logger  *sdk.Logger
	api     *sdk.PluginAPI
	storage *sdk.DeviceStorage
}

// NewPlugin creates a new plugin instance.
// This is called by the SDK during plugin initialization.
func NewPlugin(logger *sdk.Logger, api *sdk.PluginAPI, storage *sdk.DeviceStorage) sdk.Plugin {
	return &{{pluginName}}Plugin{
		logger:  logger,
		api:     api,
		storage: storage,
	}
}

// ConfigureCameras is called on startup with all assigned cameras.
func (p *{{pluginName}}Plugin) ConfigureCameras(cameras []*sdk.CameraDevice) error {
	p.logger.Log("Configuring cameras:", len(cameras))

	for _, camera := range cameras {
		if err := p.OnCameraAdded(camera); err != nil {
			p.logger.Error("Failed to configure camera:", camera.Name(), err)
		}
	}

	return nil
}

// OnCameraAdded is called when a camera is added/assigned at runtime.
func (p *{{pluginName}}Plugin) OnCameraAdded(camera *sdk.CameraDevice) error {
	p.logger.Log("Camera added:", camera.Name())
	return nil
}

// OnCameraReleased is called when a camera is removed/unassigned at runtime.
func (p *{{pluginName}}Plugin) OnCameraReleased(cameraID string) error {
	p.logger.Log("Camera released:", cameraID)
	return nil
}

func main() {
	sdk.Run(NewPlugin)
}
