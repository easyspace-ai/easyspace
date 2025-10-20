import type { CompilerCtx, ComponentCompilerMeta, Config } from '@stencil/core/internal';
import type { OutputTargetAngular, PackageJSON } from './types';
export declare function angularDirectiveProxyOutput(compilerCtx: CompilerCtx, outputTarget: OutputTargetAngular, components: ComponentCompilerMeta[], config: Config): Promise<void>;
export declare function generateProxies(components: ComponentCompilerMeta[], pkgData: PackageJSON, outputTarget: OutputTargetAngular, rootDir: string): string;
