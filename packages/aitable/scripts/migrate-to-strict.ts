#!/usr/bin/env tsx

/**
 * TypeScript 严格模式迁移脚本
 * 
 * 这个脚本会：
 * 1. 分析当前代码中的类型问题
 * 2. 生成修复建议
 * 3. 自动修复一些简单的问题
 * 4. 生成迁移报告
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { glob } from 'glob';

interface TypeError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: string;
}

interface MigrationReport {
  totalFiles: number;
  errorsFound: number;
  autoFixed: number;
  manualRequired: number;
  filesWithErrors: string[];
  errorBreakdown: Record<string, number>;
}

class TypeScriptMigrator {
  private projectRoot: string;
  private report: MigrationReport;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.report = {
      totalFiles: 0,
      errorsFound: 0,
      autoFixed: 0,
      manualRequired: 0,
      filesWithErrors: [],
      errorBreakdown: {}
    };
  }

  async migrate(): Promise<void> {
    console.log('🚀 开始 TypeScript 严格模式迁移...\n');

    // 1. 备份当前配置
    await this.backupConfig();

    // 2. 启用严格模式
    await this.enableStrictMode();

    // 3. 分析类型错误
    const errors = await this.analyzeTypeErrors();

    // 4. 自动修复简单问题
    await this.autoFix(errors);

    // 5. 生成迁移报告
    await this.generateReport();

    console.log('\n✅ 迁移完成！查看 migration-report.md 了解详情。');
  }

  private async backupConfig(): Promise<void> {
    console.log('📁 备份当前 TypeScript 配置...');
    
    const tsconfigPath = join(this.projectRoot, 'tsconfig.json');
    const backupPath = join(this.projectRoot, 'tsconfig.json.backup');
    
    if (existsSync(tsconfigPath) && !existsSync(backupPath)) {
      const content = readFileSync(tsconfigPath, 'utf-8');
      writeFileSync(backupPath, content);
      console.log(`✅ 配置已备份到 ${backupPath}`);
    }
  }

  private async enableStrictMode(): Promise<void> {
    console.log('🔧 启用 TypeScript 严格模式...');
    
    const tsconfigPath = join(this.projectRoot, 'tsconfig.json');
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    
    // 启用严格模式
    tsconfig.compilerOptions = {
      ...tsconfig.compilerOptions,
      strict: true,
      noImplicitAny: true,
      strictNullChecks: true,
      strictFunctionTypes: true,
      strictPropertyInitialization: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      noUncheckedIndexedAccess: true,
      noImplicitOverride: true,
    };
    
    writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    console.log('✅ 严格模式已启用');
  }

  private async analyzeTypeErrors(): Promise<TypeError[]> {
    console.log('🔍 分析类型错误...');
    
    try {
      // 运行 TypeScript 编译器检查
      execSync('npx tsc --noEmit --pretty false', { 
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      
      console.log('✅ 没有发现类型错误！');
      return [];
    } catch (error) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      const errors = this.parseTypeScriptErrors(output);
      
      this.report.errorsFound = errors.length;
      console.log(`❌ 发现 ${errors.length} 个类型错误`);
      
      return errors;
    }
  }

  private parseTypeScriptErrors(output: string): TypeError[] {
    const errors: TypeError[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(.+)\((\d+),(\d+)\): error TS(\d+): (.+)$/);
      if (match) {
        const [, file, lineNum, column, code, message] = match;
        errors.push({
          file: file.trim(),
          line: parseInt(lineNum),
          column: parseInt(column),
          message: message.trim(),
          code: `TS${code}`
        });
        
        // 统计错误类型
        this.report.errorBreakdown[`TS${code}`] = (this.report.errorBreakdown[`TS${code}`] || 0) + 1;
      }
    }
    
    // 去重文件列表
    this.report.filesWithErrors = [...new Set(errors.map(e => e.file))];
    
    return errors;
  }

  private async autoFix(errors: TypeError[]): Promise<void> {
    console.log('🔧 开始自动修复...');
    
    let fixedCount = 0;
    
    for (const error of errors) {
      if (await this.canAutoFix(error)) {
        if (await this.autoFixError(error)) {
          fixedCount++;
        }
      }
    }
    
    this.report.autoFixed = fixedCount;
    this.report.manualRequired = errors.length - fixedCount;
    
    console.log(`✅ 自动修复了 ${fixedCount} 个错误`);
    console.log(`⚠️  需要手动修复 ${this.report.manualRequired} 个错误`);
  }

  private async canAutoFix(error: TypeError): Promise<boolean> {
    // 可以自动修复的错误类型
    const autoFixableCodes = [
      'TS7006', // Parameter implicitly has an 'any' type
      'TS7031', // Binding element implicitly has an 'any' type
      'TS7044', // Variable implicitly has an 'any' type
      'TS2322', // Type assignment errors (some cases)
    ];
    
    return autoFixableCodes.includes(error.code);
  }

  private async autoFixError(error: TypeError): Promise<boolean> {
    try {
      const filePath = join(this.projectRoot, error.file);
      if (!existsSync(filePath)) {
        return false;
      }
      
      let content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const lineIndex = error.line - 1;
      
      if (lineIndex >= lines.length) {
        return false;
      }
      
      const line = lines[lineIndex];
      
      // 简单的自动修复策略
      if (error.code === 'TS7006' || error.code === 'TS7031' || error.code === 'TS7044') {
        // 为参数添加类型注解
        const fixedLine = this.addTypeAnnotation(line, error.message);
        if (fixedLine !== line) {
          lines[lineIndex] = fixedLine;
          content = lines.join('\n');
          writeFileSync(filePath, content);
          return true;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }

  private addTypeAnnotation(line: string, errorMessage: string): string {
    // 简单的类型推断逻辑
    if (errorMessage.includes('implicitly has an \'any\' type')) {
      // 尝试推断类型
      if (line.includes('event') || line.includes('e:')) {
        return line.replace(/(\w+):/g, '$1: unknown');
      }
      
      if (line.includes('data') || line.includes('value')) {
        return line.replace(/(\w+):/g, '$1: unknown');
      }
      
      // 默认添加 unknown 类型
      return line.replace(/(\w+):/g, '$1: unknown');
    }
    
    return line;
  }

  private async generateReport(): Promise<void> {
    console.log('📊 生成迁移报告...');
    
    const reportContent = this.generateMarkdownReport();
    const reportPath = join(this.projectRoot, 'migration-report.md');
    writeFileSync(reportPath, reportContent);
    
    console.log(`📄 报告已生成: ${reportPath}`);
  }

  private generateMarkdownReport(): string {
    return `# TypeScript 严格模式迁移报告

## 迁移概览

- **总文件数**: ${this.report.totalFiles}
- **发现错误**: ${this.report.errorsFound}
- **自动修复**: ${this.report.autoFixed}
- **需要手动修复**: ${this.report.manualRequired}

## 错误类型分布

${Object.entries(this.report.errorBreakdown)
  .map(([code, count]) => `- ${code}: ${count} 个`)
  .join('\n')}

## 需要手动修复的文件

${this.report.filesWithErrors.map(file => `- ${file}`).join('\n')}

## 下一步操作

1. **查看具体错误**: 运行 \`npm run typecheck\` 查看详细错误信息
2. **逐步修复**: 从错误最少的文件开始修复
3. **使用类型守卫**: 使用 \`src/utils/type-guards.ts\` 中的工具函数
4. **测试验证**: 每次修复后运行测试确保功能正常

## 修复建议

### 常见错误修复方法

#### TS7006: Parameter implicitly has an 'any' type
\`\`\`typescript
// ❌ 错误
function handleClick(event) { }

// ✅ 修复
function handleClick(event: React.MouseEvent) { }
// 或者
function handleClick(event: unknown) { }
\`\`\`

#### TS2322: Type assignment errors
\`\`\`typescript
// ❌ 错误
const value: string = someValue;

// ✅ 修复
const value: string = String(someValue);
// 或者使用类型守卫
const value: string = isString(someValue) ? someValue : '';
\`\`\`

#### TS7031: Binding element implicitly has an 'any' type
\`\`\`typescript
// ❌ 错误
const { name, age } = data;

// ✅ 修复
const { name, age }: { name: string; age: number } = data;
// 或者
const { name, age } = data as { name: string; age: number };
\`\`\`

## 类型守卫使用指南

使用 \`src/utils/type-guards.ts\` 中的工具函数来安全地处理未知类型：

\`\`\`typescript
import { isString, safeString, assertIsString } from './utils/type-guards';

// 类型守卫
if (isString(value)) {
  // 这里 value 是 string 类型
  console.log(value.toUpperCase());
}

// 安全转换
const name = safeString(user.name, 'Unknown');

// 断言（开发环境）
assertIsString(user.id);
\`\`\`

---
生成时间: ${new Date().toLocaleString()}
`;
  }
}

// 主函数
async function main() {
  const projectRoot = process.cwd();
  const migrator = new TypeScriptMigrator(projectRoot);
  
  try {
    await migrator.migrate();
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { TypeScriptMigrator };
