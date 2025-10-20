import type { Config, OutputTargetCustom } from '@stencil/core/internal';
import type { OutputTargetAngular } from './types';
export declare const angularOutputTarget: (outputTarget: OutputTargetAngular) => OutputTargetCustom;
export declare function normalizeOutputTarget(config: Config, outputTarget: OutputTargetAngular): OutputTargetAngular;
