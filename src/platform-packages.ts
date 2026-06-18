export const PLATFORM_PACKAGES_NODE = ['@camera.ui/sdk', '@camera.ui/rpc', '@camera.ui/common', 'node-av'] as const;

export const PLATFORM_PACKAGES_PYTHON = ['camera-ui-sdk', 'camera-ui-rpc', 'camera-ui-common'] as const;

export function isPlatformPackageNode(name: string): boolean {
  return (PLATFORM_PACKAGES_NODE as readonly string[]).includes(name);
}

export function isPlatformPackagePython(name: string): boolean {
  const normalized = name.trim().toLowerCase().replace(/[_.]/g, '-');
  return (PLATFORM_PACKAGES_PYTHON as readonly string[]).includes(normalized);
}
