import { getLatestCameraUiVersion, getLatestNodeLTSVersion } from './utils/versions.js';

export const NODE_LTS = '22.14.0';
export const CAMERA_UI_LTS = '0.0.49';

export async function getNodeLtsVersion(): Promise<string> {
  try {
    const node = await getLatestNodeLTSVersion();
    return node.version;
  } catch {
    return NODE_LTS;
  }
}

export async function getCameraUiLtsVersion(): Promise<string> {
  try {
    const cameraui = await getLatestCameraUiVersion();
    return cameraui.latest;
  } catch {
    return CAMERA_UI_LTS;
  }
}
