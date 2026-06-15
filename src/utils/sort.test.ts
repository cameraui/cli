import { describe, expect, it } from 'vitest';

import { sortDependencies, sortScripts } from './sort.js';

describe('sortDependencies', () => {
  it('sorts each dependency block alphabetically', () => {
    const pkg = {
      name: 'x',
      dependencies: { zebra: '1', alpha: '2', mike: '3' },
      devDependencies: { yak: '1', ant: '2' },
    };
    const out = sortDependencies(pkg);
    expect(Object.keys(out.dependencies)).toEqual(['alpha', 'mike', 'zebra']);
    expect(Object.keys(out.devDependencies)).toEqual(['ant', 'yak']);
  });

  it('preserves other fields and the version values', () => {
    const pkg = { name: 'x', version: '1.0.0', dependencies: { b: '^1', a: '^2' } };
    const out = sortDependencies(pkg);
    expect(out.name).toBe('x');
    expect(out.version).toBe('1.0.0');
    expect(out.dependencies.a).toBe('^2');
  });

  it('leaves a package without dependency blocks unchanged', () => {
    expect(sortDependencies({ name: 'x' })).toEqual({ name: 'x' });
  });
});

describe('sortScripts', () => {
  it('returns the scripts sorted by key', () => {
    const pkg = { scripts: { test: 't', build: 'b', lint: 'l' } };
    expect(Object.keys(sortScripts(pkg))).toEqual(['build', 'lint', 'test']);
  });

  it('returns an empty object when there are no scripts', () => {
    expect(sortScripts({ name: 'x' })).toEqual({});
  });
});
