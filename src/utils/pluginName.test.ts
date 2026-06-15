import { describe, expect, it } from 'vitest';

import { extractPluginName, extractPluginScope, isQualifiedPluginIdentifier, transformDisplaName } from './pluginName.js';

describe('isQualifiedPluginIdentifier', () => {
  it('accepts unscoped camera-ui plugin names', () => {
    expect(isQualifiedPluginIdentifier('camera-ui-foo')).toBe(true);
  });

  it('accepts scoped camera-ui plugin names', () => {
    expect(isQualifiedPluginIdentifier('@acme/camera-ui-foo')).toBe(true);
  });

  it('rejects names without the camera-ui- prefix', () => {
    expect(isQualifiedPluginIdentifier('foo')).toBe(false);
    expect(isQualifiedPluginIdentifier('@acme/foo')).toBe(false);
  });

  it('normalizes backslashes to forward slashes', () => {
    expect(isQualifiedPluginIdentifier('@acme\\camera-ui-foo')).toBe(true);
  });
});

describe('extractPluginScope', () => {
  it('returns the scope for scoped names', () => {
    expect(extractPluginScope('@acme/camera-ui-foo')).toBe('@acme');
  });

  it('returns undefined for unscoped names', () => {
    expect(extractPluginScope('camera-ui-foo')).toBeUndefined();
  });
});

describe('extractPluginName', () => {
  it('returns the bare plugin id', () => {
    expect(extractPluginName('@acme/camera-ui-foo-bar')).toBe('camera-ui-foo-bar');
    expect(extractPluginName('camera-ui-foo')).toBe('camera-ui-foo');
  });
});

describe('transformDisplaName', () => {
  it('title-cases the name without the camera-ui- prefix', () => {
    expect(transformDisplaName('camera-ui-my-plugin')).toBe('My Plugin');
    expect(transformDisplaName('@acme/camera-ui-foo')).toBe('Foo');
  });
});
