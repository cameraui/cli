import { cancel, intro, outro } from '@clack/prompts';
import pc from 'picocolors';

const defaultBanner = 'camera.ui - Plugin Development CLI';

const gradientBanner =
  // eslint-disable-next-line @stylistic/max-len
  '\x1B[38;2;223;42;76mc\x1B[39m\x1B[38;2;223;42;76ma\x1B[39m\x1B[38;2;223;42;76mm\x1B[39m\x1B[38;2;223;42;76me\x1B[39m\x1B[38;2;223;48;82mr\x1B[39m\x1B[38;2;224;54;87ma\x1B[39m\x1B[38;2;224;59;92m.\x1B[39m\x1B[38;2;225;65;97mu\x1B[39m\x1B[38;2;225;71;102mi\x1B[39m \x1B[38;2;226;77;107m-\x1B[39m \x1B[38;2;226;82;112mP\x1B[39m\x1B[38;2;227;88;117ml\x1B[39m\x1B[38;2;227;94;122mu\x1B[39m\x1B[38;2;228;100;127mg\x1B[39m\x1B[38;2;228;105;132mi\x1B[39m\x1B[38;2;229;111;137mn\x1B[39m \x1B[38;2;229;117;142mD\x1B[39m\x1B[38;2;230;123;147me\x1B[39m\x1B[38;2;230;128;152mv\x1B[39m\x1B[38;2;231;134;157me\x1B[39m\x1B[38;2;231;140;162ml\x1B[39m\x1B[38;2;232;144;164mo\x1B[39m\x1B[38;2;232;144;164mp\x1B[39m\x1B[38;2;232;144;164mm\x1B[39m\x1B[38;2;232;144;164me\x1B[39m\x1B[38;2;232;144;164mn\x1B[39m\x1B[38;2;232;144;164mt\x1B[39m \x1B[38;2;232;144;164mC\x1B[39m\x1B[38;2;232;144;164mL\x1B[39m\x1B[38;2;232;144;164mI\x1B[39m';

function useGradient(): boolean {
  return process.stdout.isTTY && process.stdout.getColorDepth() > 8;
}

export function showIntro(): void {
  const banner = useGradient() ? gradientBanner : defaultBanner;
  intro(banner);
}

export function showOutro(message: string): void {
  outro(message);
}

export function showCancel(message?: string): void {
  cancel(pc.red('✖') + (message ? ` ${message}` : ' Operation cancelled'));
}

export function getBanner(): string {
  return useGradient() ? gradientBanner : defaultBanner;
}
