import pc from 'picocolors';

export function info(message: string): void {
  console.log(pc.blue('ℹ') + ' ' + message);
}

export function success(message: string): void {
  console.log(pc.green('✔') + ' ' + message);
}

export function warn(message: string): void {
  console.log(pc.yellow('⚠') + ' ' + message);
}

export function error(message: string): void {
  console.log(pc.red('✖') + ' ' + message);
}

export function debug(message: string): void {
  console.log(pc.dim(message));
}

export function step(current: number, total: number, message: string): void {
  const prefix = pc.dim(`[${current}/${total}]`);
  console.log(`${prefix} ${message}`);
}

export function fileOperation(type: 'file' | 'dir', path: string, copied: boolean): void {
  if (copied) {
    const icon = type === 'file' ? '📄' : '📁';
    console.log(`  ${icon} ${pc.dim(`Copied ${type}: ${path}`)}`);
  } else {
    console.log(`  ${pc.red('✖')} ${pc.dim(`Failed to copy ${path}`)}`);
  }
}

export function missingFile(file: string): void {
  console.log(`  ${pc.yellow('⚠')} ${pc.dim(`Missing file: ${file}`)}`);
}

export function outputFiles(files: string[]): void {
  console.log(pc.dim('\nGenerated files:'));
  for (const file of files) {
    console.log(`  ${pc.cyan('•')} ${file}`);
  }
}

export function buildSuccess(outDir: string, durationMs?: number): void {
  console.log();
  console.log(pc.green('✨ Build completed successfully!'));
  console.log(pc.dim(`Output directory: ${outDir}`));
  if (durationMs !== undefined) {
    console.log(pc.dim(`Duration: ${durationMs}ms`));
  }
  console.log();
}

export function buildError(err: Error | unknown): void {
  error('Build failed');
  console.error(pc.dim('\nError details:'));
  if (err instanceof Error) {
    console.error(pc.red(err.message));
    if ('frame' in err) {
      console.error('\n' + pc.yellow('Error location:'));
      console.error(pc.dim((err as { frame: string }).frame));
    }
  } else {
    console.error(pc.red(String(err)));
  }
}

export function bundleSize(sizeMb: number): void {
  console.log(pc.dim(`Bundle size: ${sizeMb.toFixed(2)} MB`));
}
