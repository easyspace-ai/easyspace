import type { OutputTargetAngular } from './types';
import type { CompilerCtx, ComponentCompilerMeta } from '@stencil/core/internal';
export declare function generateAngularDirectivesFile(compilerCtx: CompilerCtx, components: ComponentCompilerMeta[], outputTarget: OutputTargetAngular): Promise<any>;
