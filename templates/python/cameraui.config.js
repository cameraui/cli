const mode = process.env.MODE || 'production';

const config = {
  input: ['src/index.js'],
  mode: mode === 'development' ? 'development' : 'production',
  external: [],
  additionalFiles: [],
};

export default config;
