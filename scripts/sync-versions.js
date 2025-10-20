#!/usr/bin/env node

/**
 * 版本同步脚本
 * 确保所有包使用统一的依赖版本
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VERSIONS_FILE = path.join(__dirname, '../versions.json');
const WORKSPACES = ['apps', 'packages', 'tooling'];

function readVersions() {
  if (!fs.existsSync(VERSIONS_FILE)) {
    console.error('❌ versions.json 文件不存在');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(VERSIONS_FILE, 'utf8'));
}

function findPackageJsonFiles() {
  const files = [];
  
  WORKSPACES.forEach(workspace => {
    const workspacePath = path.join(__dirname, '..', workspace);
    if (fs.existsSync(workspacePath)) {
      const items = fs.readdirSync(workspacePath);
      items.forEach(item => {
        const packageJsonPath = path.join(workspacePath, item, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          files.push(packageJsonPath);
        }
      });
    }
  });
  
  return files;
}

function updatePackageJson(packageJsonPath, versions) {
  const content = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  let updated = false;
  
  // 更新 dependencies
  if (content.dependencies) {
    Object.keys(versions).forEach(dep => {
      if (content.dependencies[dep] && content.dependencies[dep] !== versions[dep]) {
        console.log(`📦 ${path.basename(path.dirname(packageJsonPath))}: 更新 ${dep} ${content.dependencies[dep]} -> ${versions[dep]}`);
        content.dependencies[dep] = versions[dep];
        updated = true;
      }
    });
  }
  
  // 更新 devDependencies
  if (content.devDependencies) {
    Object.keys(versions).forEach(dep => {
      if (content.devDependencies[dep] && content.devDependencies[dep] !== versions[dep]) {
        console.log(`📦 ${path.basename(path.dirname(packageJsonPath))}: 更新 devDependency ${dep} ${content.devDependencies[dep]} -> ${versions[dep]}`);
        content.devDependencies[dep] = versions[dep];
        updated = true;
      }
    });
  }
  
  if (updated) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(content, null, 2) + '\n');
  }
  
  return updated;
}

function main() {
  console.log('🔄 开始同步依赖版本...');
  
  const versions = readVersions();
  const packageJsonFiles = findPackageJsonFiles();
  
  let totalUpdated = 0;
  
  packageJsonFiles.forEach(file => {
    if (updatePackageJson(file, versions)) {
      totalUpdated++;
    }
  });
  
  if (totalUpdated > 0) {
    console.log(`\n✅ 已更新 ${totalUpdated} 个包的依赖版本`);
    console.log('💡 建议运行: bun install 来安装更新的依赖');
  } else {
    console.log('\n✅ 所有包的依赖版本都已同步');
  }
}

if (require.main === module) {
  main();
}

module.exports = { readVersions, findPackageJsonFiles, updatePackageJson };
