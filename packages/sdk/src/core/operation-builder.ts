/**
 * ShareDB 操作构建器
 * 提供便捷的方法来构建各种类型的操作
 */

import type { OTOperation } from './sharedb-client.js';

/**
 * 操作构建器类
 * 提供静态方法来构建不同类型的 ShareDB 操作
 */
export class OperationBuilder {
  /**
   * 设置记录字段值
   */
  static setRecordField(fieldId: string, value: any): OTOperation {
    return {
      p: ['fields', fieldId],
      oi: value,
    };
  }

  /**
   * 删除记录字段
   */
  static deleteRecordField(fieldId: string): OTOperation {
    return {
      p: ['fields', fieldId],
      od: null,
    };
  }

  /**
   * 更新记录字段值（先删除再插入）
   */
  static updateRecordField(fieldId: string, oldValue: any, newValue: any): OTOperation {
    return {
      p: ['fields', fieldId],
      od: oldValue,
      oi: newValue,
    };
  }

  /**
   * 设置字段属性
   */
  static setFieldProperty(key: string, value: any): OTOperation {
    return {
      p: [key],
      oi: value,
    };
  }

  /**
   * 删除字段属性
   */
  static deleteFieldProperty(key: string): OTOperation {
    return {
      p: [key],
      od: null,
    };
  }

  /**
   * 更新字段属性
   */
  static updateFieldProperty(key: string, oldValue: any, newValue: any): OTOperation {
    return {
      p: [key],
      od: oldValue,
      oi: newValue,
    };
  }

  /**
   * 设置视图属性
   */
  static setViewProperty(key: string, value: any): OTOperation {
    return {
      p: [key],
      oi: value,
    };
  }

  /**
   * 删除视图属性
   */
  static deleteViewProperty(key: string): OTOperation {
    return {
      p: [key],
      od: null,
    };
  }

  /**
   * 更新视图属性
   */
  static updateViewProperty(key: string, oldValue: any, newValue: any): OTOperation {
    return {
      p: [key],
      od: oldValue,
      oi: newValue,
    };
  }

  /**
   * 设置表格属性
   */
  static setTableProperty(key: string, value: any): OTOperation {
    return {
      p: [key],
      oi: value,
    };
  }

  /**
   * 删除表格属性
   */
  static deleteTableProperty(key: string): OTOperation {
    return {
      p: [key],
      od: null,
    };
  }

  /**
   * 更新表格属性
   */
  static updateTableProperty(key: string, oldValue: any, newValue: any): OTOperation {
    return {
      p: [key],
      od: oldValue,
      oi: newValue,
    };
  }

  /**
   * 在数组中插入元素
   */
  static insertArrayElement(path: (string | number)[], index: number, value: any): OTOperation {
    return {
      p: [...path, index],
      oi: value,
    };
  }

  /**
   * 从数组中删除元素
   */
  static deleteArrayElement(path: (string | number)[], index: number, value: any): OTOperation {
    return {
      p: [...path, index],
      od: value,
    };
  }

  /**
   * 移动数组元素
   */
  static moveArrayElement(
    path: (string | number)[],
    fromIndex: number,
    toIndex: number,
    value: any
  ): OTOperation[] {
    return [
      {
        p: [...path, fromIndex],
        od: value,
      },
      {
        p: [...path, toIndex],
        oi: value,
      },
    ];
  }

  /**
   * 设置嵌套对象属性
   */
  static setNestedProperty(path: (string | number)[], value: any): OTOperation {
    return {
      p: path,
      oi: value,
    };
  }

  /**
   * 删除嵌套对象属性
   */
  static deleteNestedProperty(path: (string | number)[]): OTOperation {
    return {
      p: path,
      od: null,
    };
  }

  /**
   * 更新嵌套对象属性
   */
  static updateNestedProperty(
    path: (string | number)[],
    oldValue: any,
    newValue: any
  ): OTOperation {
    return {
      p: path,
      od: oldValue,
      oi: newValue,
    };
  }

  /**
   * 批量设置记录字段
   */
  static batchSetRecordFields(fields: Record<string, any>): OTOperation[] {
    return Object.entries(fields).map(([fieldId, value]) => this.setRecordField(fieldId, value));
  }

  /**
   * 批量更新记录字段
   */
  static batchUpdateRecordFields(
    updates: Record<string, { oldValue: any; newValue: any }>
  ): OTOperation[] {
    return Object.entries(updates).map(([fieldId, { oldValue, newValue }]) =>
      this.updateRecordField(fieldId, oldValue, newValue)
    );
  }

  /**
   * 批量删除记录字段
   */
  static batchDeleteRecordFields(fieldIds: string[]): OTOperation[] {
    return fieldIds.map((fieldId) => this.deleteRecordField(fieldId));
  }

  /**
   * 设置记录名称
   */
  static setRecordName(name: string): OTOperation {
    return this.setRecordField('name', name);
  }

  /**
   * 设置记录描述
   */
  static setRecordDescription(description: string): OTOperation {
    return this.setRecordField('description', description);
  }

  /**
   * 设置字段名称
   */
  static setFieldName(name: string): OTOperation {
    return this.setFieldProperty('name', name);
  }

  /**
   * 设置字段类型
   */
  static setFieldType(type: string): OTOperation {
    return this.setFieldProperty('type', type);
  }

  /**
   * 设置字段选项
   */
  static setFieldOptions(options: any): OTOperation {
    return this.setFieldProperty('options', options);
  }

  /**
   * 设置视图名称
   */
  static setViewName(name: string): OTOperation {
    return this.setViewProperty('name', name);
  }

  /**
   * 设置视图类型
   */
  static setViewType(type: string): OTOperation {
    return this.setViewProperty('type', type);
  }

  /**
   * 设置视图配置
   */
  static setViewConfig(config: any): OTOperation {
    return this.setViewProperty('config', config);
  }

  /**
   * 设置视图过滤器
   */
  static setViewFilter(filter: any): OTOperation {
    return this.setViewProperty('filter', filter);
  }

  /**
   * 设置视图排序
   */
  static setViewSort(sort: any): OTOperation {
    return this.setViewProperty('sort', sort);
  }

  /**
   * 设置视图分组
   */
  static setViewGroup(group: any): OTOperation {
    return this.setViewProperty('group', group);
  }

  /**
   * 设置表格名称
   */
  static setTableName(name: string): OTOperation {
    return this.setTableProperty('name', name);
  }

  /**
   * 设置表格描述
   */
  static setTableDescription(description: string): OTOperation {
    return this.setTableProperty('description', description);
  }

  /**
   * 设置表格图标
   */
  static setTableIcon(icon: string): OTOperation {
    return this.setTableProperty('icon', icon);
  }

  /**
   * 设置表格颜色
   */
  static setTableColor(color: string): OTOperation {
    return this.setTableProperty('color', color);
  }

  /**
   * 创建操作组合
   */
  static combine(...operations: OTOperation[]): OTOperation[] {
    return operations;
  }

  /**
   * 创建条件操作
   */
  static conditional(
    condition: boolean,
    trueOperation: OTOperation,
    falseOperation?: OTOperation
  ): OTOperation[] {
    if (condition) {
      return [trueOperation];
    } else if (falseOperation) {
      return [falseOperation];
    }
    return [];
  }

  /**
   * 创建空操作（用于占位）
   */
  static noop(): OTOperation[] {
    return [];
  }
}
