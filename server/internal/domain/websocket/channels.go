package websocket

import (
	"fmt"
)

// ChannelType 频道类型
type ChannelType string

const (
	// 表级别频道 - 订阅表的所有变更
	ChannelTypeTable ChannelType = "table"

	// 记录级别频道 - 订阅特定记录的变更
	ChannelTypeRecord ChannelType = "record"

	// 字段级别频道 - 订阅特定字段的变更
	ChannelTypeField ChannelType = "field"

	// 视图级别频道 - 订阅视图的变更
	ChannelTypeView ChannelType = "view"

	// 用户级别频道 - 订阅用户相关的通知
	ChannelTypeUser ChannelType = "user"

	// 协作级别频道 - 订阅协作相关的事件（光标、选择等）
	ChannelTypeCollaboration ChannelType = "collaboration"
)

// ChannelName 频道名称构建器
type ChannelName struct {
	Type       ChannelType
	Identifier string
	SubPath    string // 可选的子路径
}

// String 生成频道名称字符串
func (cn *ChannelName) String() string {
	if cn.SubPath != "" {
		return fmt.Sprintf("%s:%s:%s", cn.Type, cn.Identifier, cn.SubPath)
	}
	return fmt.Sprintf("%s:%s", cn.Type, cn.Identifier)
}

// ChannelManager 频道管理器
type ChannelManager struct{}

// NewChannelManager 创建频道管理器
func NewChannelManager() *ChannelManager {
	return &ChannelManager{}
}

// GetTableChannel 获取表级别频道名称
// 格式: table:{tableID}
// 用于订阅表的所有变更（记录、字段、视图等）
func (cm *ChannelManager) GetTableChannel(tableID string) string {
	return (&ChannelName{
		Type:       ChannelTypeTable,
		Identifier: tableID,
	}).String()
}

// GetRecordChannel 获取记录级别频道名称
// 格式: record:{tableID}:{recordID}
// 用于订阅特定记录的变更
func (cm *ChannelManager) GetRecordChannel(tableID, recordID string) string {
	return (&ChannelName{
		Type:       ChannelTypeRecord,
		Identifier: tableID,
		SubPath:    recordID,
	}).String()
}

// GetFieldChannel 获取字段级别频道名称
// 格式: field:{tableID}:{fieldID}
// 用于订阅特定字段的变更
func (cm *ChannelManager) GetFieldChannel(tableID, fieldID string) string {
	return (&ChannelName{
		Type:       ChannelTypeField,
		Identifier: tableID,
		SubPath:    fieldID,
	}).String()
}

// GetViewChannel 获取视图级别频道名称
// 格式: view:{tableID}:{viewID}
// 用于订阅特定视图的变更
func (cm *ChannelManager) GetViewChannel(tableID, viewID string) string {
	return (&ChannelName{
		Type:       ChannelTypeView,
		Identifier: tableID,
		SubPath:    viewID,
	}).String()
}

// GetUserChannel 获取用户级别频道名称
// 格式: user:{userID}
// 用于订阅用户相关的通知
func (cm *ChannelManager) GetUserChannel(userID string) string {
	return (&ChannelName{
		Type:       ChannelTypeUser,
		Identifier: userID,
	}).String()
}

// GetCollaborationChannel 获取协作级别频道名称
// 格式: collaboration:{tableID}
// 用于订阅表的协作事件（光标、选择等）
func (cm *ChannelManager) GetCollaborationChannel(tableID string) string {
	return (&ChannelName{
		Type:       ChannelTypeCollaboration,
		Identifier: tableID,
	}).String()
}

// GetOperationChannels 获取操作应该广播到的所有频道
// 根据操作类型返回相应的频道列表
func (cm *ChannelManager) GetOperationChannels(op *Operation) []string {
	channels := []string{}

	// 所有操作都广播到表级别频道
	if op.TableID != "" {
		channels = append(channels, cm.GetTableChannel(op.TableID))
	}

	// 根据操作类型添加特定频道
	switch op.Type {
	case OperationTypeRecordCreate, OperationTypeRecordUpdate, OperationTypeRecordDelete:
		// 记录操作：广播到记录级别频道
		if recordOp, ok := op.Data.(*RecordCreateOp); ok {
			channels = append(channels, cm.GetRecordChannel(op.TableID, recordOp.RecordID))
		} else if recordOp, ok := op.Data.(*RecordUpdateOp); ok {
			channels = append(channels, cm.GetRecordChannel(op.TableID, recordOp.RecordID))
			// 如果有字段ID，也广播到字段频道
			if recordOp.FieldID != "" {
				channels = append(channels, cm.GetFieldChannel(op.TableID, recordOp.FieldID))
			}
		} else if recordOp, ok := op.Data.(*RecordDeleteOp); ok {
			channels = append(channels, cm.GetRecordChannel(op.TableID, recordOp.RecordID))
		}

	case OperationTypeFieldCreate, OperationTypeFieldUpdate, OperationTypeFieldDelete:
		// 字段操作：广播到字段级别频道
		if fieldOp, ok := op.Data.(*FieldCreateOp); ok {
			if fieldOp.Field != nil {
				channels = append(channels, cm.GetFieldChannel(op.TableID, fieldOp.Field.ID))
			}
		} else if fieldOp, ok := op.Data.(*FieldUpdateOp); ok {
			channels = append(channels, cm.GetFieldChannel(op.TableID, fieldOp.FieldID))
		} else if fieldOp, ok := op.Data.(*FieldDeleteOp); ok {
			channels = append(channels, cm.GetFieldChannel(op.TableID, fieldOp.FieldID))
		}

	case OperationTypeViewCreate, OperationTypeViewUpdate, OperationTypeViewDelete:
		// 视图操作：广播到视图级别频道
		if viewOp, ok := op.Data.(*ViewCreateOp); ok {
			channels = append(channels, cm.GetViewChannel(op.TableID, viewOp.ViewID))
		} else if viewOp, ok := op.Data.(*ViewUpdateOp); ok {
			channels = append(channels, cm.GetViewChannel(op.TableID, viewOp.ViewID))
		} else if viewOp, ok := op.Data.(*ViewDeleteOp); ok {
			channels = append(channels, cm.GetViewChannel(op.TableID, viewOp.ViewID))
		}

	case OperationTypeBatchUpdate:
		// 批量更新：广播到所有相关记录的频道
		if batchOp, ok := op.Data.(*BatchRecordUpdateOp); ok {
			for _, recordOp := range batchOp.Records {
				channels = append(channels, cm.GetRecordChannel(op.TableID, recordOp.RecordID))
			}
		}
	}

	return channels
}

// ParseChannelName 解析频道名称
// 返回频道类型和标识符
func (cm *ChannelManager) ParseChannelName(channelName string) (ChannelType, string, string, error) {
	// 简单的字符串解析
	// 格式: type:identifier[:subpath]
	var channelType ChannelType
	var identifier string
	var subPath string

	// 这里简化处理，实际可能需要更复杂的解析逻辑
	// TODO: 实现完整的频道名称解析
	//
	// 改进方向：
	// 1. 支持更多频道格式：
	//    - "space:{id}:bases" - 空间的Base列表
	//    - "base:{id}:tables" - Base的Table列表
	//    - "table:{id}:records" - Table的Record列表
	//    - "user:{id}:notifications" - 用户通知
	// 2. 添加频道格式验证
	// 3. 返回结构化的频道信息:
	//    type ChannelInfo struct {
	//        Type       string
	//        ResourceID string
	//        SubPath    string
	//        IsValid    bool
	//    }

	return channelType, identifier, subPath, nil
}

// ValidateChannelAccess 验证用户是否有权访问指定频道
// 根据频道类型和用户权限判断
func (cm *ChannelManager) ValidateChannelAccess(userID string, channelName string) bool {
	// TODO: 实现权限验证逻辑
	//
	// 实现步骤：
	// 1. 解析频道名称
	//    channelType, resourceID, _, err := cm.ParseChannelName(channelName)
	//    if err != nil {
	//        return false
	//    }
	//
	// 2. 根据频道类型查询权限
	//    switch channelType {
	//    case "space":
	//        return cm.permissionService.CanAccessSpace(ctx, userID, resourceID)
	//    case "base":
	//        return cm.permissionService.CanAccessBase(ctx, userID, resourceID)
	//    case "table":
	//        return cm.permissionService.CanAccessTable(ctx, userID, resourceID)
	//    case "view":
	//        return cm.permissionService.CanAccessView(ctx, userID, resourceID)
	//    case "user":
	//        return userID == resourceID  // 用户只能访问自己的频道
	//    default:
	//        return false
	//    }
	//
	// 3. 考虑添加权限缓存以提升性能
	//
	// 暂时允许所有访问
	return true
}
