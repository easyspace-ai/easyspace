import { dashToPascalCase, relativeImport } from './utils';
export function generateAngularDirectivesFile(compilerCtx, components, outputTarget) {
    // Only create the file if it is defined in the stencil configuration
    if (!outputTarget.directivesArrayFile) {
        return Promise.resolve();
    }
    const proxyPath = relativeImport(outputTarget.directivesArrayFile, outputTarget.directivesProxyFile, '.ts');
    const directives = components
        .map((cmpMeta) => dashToPascalCase(cmpMeta.tagName))
        .map((className) => `d.${className}`)
        .join(',\n  ');
    const c = `
import * as d from '${proxyPath}';

export const DIRECTIVES = [
  ${directives}
];
`;
    return compilerCtx.fs.writeFile(outputTarget.directivesArrayFile, c);
}
