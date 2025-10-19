/**
 * SDK Types Re-export
 * 从 @luckdb/sdk 重新导出类型，供 grid 包使用
 * 注意：避免与 grid 自己的类型冲突，使用命名空间或别名
 */

// 重新导出 SDK 的核心类型（使用别名以避免冲突）
export type {
  // 配置
  LuckDBConfig,
  
  // 实体（使用 SDK 前缀以区分）
  User as SDKUser,
  Space as SDKSpace,
  Base as SDKBase,
  Table as SDKTable,
  Field as SDKField,
  Record as SDKRecord,
  View as SDKView,
  
  // 请求类型
  LoginRequest,
  RegisterRequest,
  CreateSpaceRequest,
  CreateBaseRequest,
  CreateTableRequest,
  CreateFieldRequest,
  CreateRecordRequest,
  CreateViewRequest,
  
  // 响应类型
  AuthResponse,
  
  // 查询类型
  FilterExpression,
  SortExpression,
  
  // 视图相关（使用别名）
  ViewConfig,
  
  // 协作相关
  CollaborationSession,
  Presence,
  CursorPosition,
  WebSocketMessage,
  CollaborationMessage,
  RecordChangeMessage,
  
  // 工具类型
  JsonObject,
} from '@luckdb/sdk';

// 重新导出 SDK 主类
export { LuckDB, LuckDBSDK } from '@luckdb/sdk';

