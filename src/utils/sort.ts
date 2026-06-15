// https://github.com/vuejs/create-vue/blob/dd60a395d8a9c1600135bcdb142bfe37571d520a/utils/sortDependencies.ts#L1C1-L22C2
export function sortDependencies(packageJson: Record<string, any>): Record<string, any> {
  const sorted: Record<string, any> = {};

  const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

  for (const depType of depTypes) {
    if (packageJson[depType]) {
      sorted[depType] = {};

      Object.keys(packageJson[depType])
        .sort()
        .forEach((name) => {
          sorted[depType][name] = packageJson[depType][name];
        });
    }
  }

  return {
    ...packageJson,
    ...sorted,
  };
}

export function sortScripts(packageJson: Record<string, any>): Record<string, any> {
  const sorted: Record<string, any> = {};

  if (packageJson.scripts) {
    Object.keys(packageJson.scripts)
      .sort()
      .forEach((name) => {
        sorted[name] = packageJson.scripts[name];
      });
  }

  return sorted;
}
