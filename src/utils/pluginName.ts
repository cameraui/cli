export const PLUGIN_IDENTIFIER = /^((@[\w-.]*)\/)?(camera-ui-)/;

export const PLUGIN_IDENTIFIER_PATTERN = /^((@[\w-.]*)\/)?(camera-ui-[\w-]*)$/;

export function isQualifiedPluginIdentifier(pluginName: string): boolean {
  const normalizedName = pluginName.replace(/\\/g, '/');
  return PLUGIN_IDENTIFIER_PATTERN.test(normalizedName);
}

export function extractPluginScope(pluginName: string): string | undefined {
  return PLUGIN_IDENTIFIER_PATTERN.exec(pluginName)![2];
}

export function extractPluginName(pluginName: string): string {
  return PLUGIN_IDENTIFIER_PATTERN.exec(pluginName)![3];
}

export function transformDisplaName(pluginName: string): string {
  const extractedPkgName = extractPluginName(pluginName).replace('camera-ui-', '').replaceAll('-', ' ');

  return extractedPkgName
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
