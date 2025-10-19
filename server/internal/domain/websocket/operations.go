package websocket

import (
	"time"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
)

// OperationType 操作类型
type OperationType string

const (
	// 记录操作
	OperationTypeRecordCreate OperationType = "record_create"
	OperationTypeRecordUpdate OperationType = "record_update"
	OperationTypeRecordDelete OperationType = "record_delete"

	// 字段操作
	OperationTypeFieldCreate OperationType = "field_create"
	OperationTypeFieldUpdate OperationType = "field_update"
	OperationTypeFieldDelete OperationType = "field_delete"

	// 表操作
	OperationTypeTableUpdate OperationType = "table_update"

	// 视图操作
	OperationTypeViewCreate OperationType = "view_create"
	OperationTypeViewUpdate OperationType = "view_update"
	OperationTypeViewDelete OperationType = "view_delete"

	// 批量操作
	OperationTypeBatchUpdate OperationType = "batch_update"
)

// Operation 操作消息结构
// 用于在 WebSocket 上广播数据变更
type Operation struct {
	Type      OperationType `json:"type"`
	TableID   string        `json:"table_id"`
	Timestamp time.Time     `json:"timestamp"`
	UserID    string        `json:"user_id,omitempty"`
	Data      interface{}   `json:"data"`
	WindowID  string        `json:"window_id,omitempty"` // 用于过滤发起操作的客户端
}

// RecordCreateOp 记录创建操作
type RecordCreateOp struct {
	RecordID string                 `json:"record_id"`
	Fields   map[string]interface{} `json:"fields"`
}

// RecordUpdateOp 记录更新操作
type RecordUpdateOp struct {
	RecordID string                 `json:"record_id"`
	FieldID  string                 `json:"field_id,omitempty"`
	Fields   map[string]interface{} `json:"fields"` // 更新的字段
	OldValue interface{}            `json:"old_value,omitempty"`
	NewValue interface{}            `json:"new_value,omitempty"`
}

// RecordDeleteOp 记录删除操作
type RecordDeleteOp struct {
	RecordID string `json:"record_id"`
}

// BatchRecordUpdateOp 批量记录更新操作
type BatchRecordUpdateOp struct {
	Records []RecordUpdateOp `json:"records"`
}

// FieldCreateOp 字段创建操作
type FieldCreateOp struct {
	Field *FieldDTO `json:"field"`
}

// FieldUpdateOp 字段更新操作
type FieldUpdateOp struct {
	FieldID  string                 `json:"field_id"`
	OldField *FieldDTO              `json:"old_field,omitempty"`
	NewField *FieldDTO              `json:"new_field"`
	Changes  map[string]interface{} `json:"changes,omitempty"` // 变更的属性
}

// FieldDeleteOp 字段删除操作
type FieldDeleteOp struct {
	FieldID string `json:"field_id"`
}

// FieldDTO 字段数据传输对象
// 简化版的字段信息，用于WebSocket传输
type FieldDTO struct {
	ID          string                 `json:"id"`
	TableID     string                 `json:"table_id"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"`
	DBFieldName string                 `json:"db_field_name"`
	Description string                 `json:"description,omitempty"`
	Options     map[string]interface{} `json:"options,omitempty"`
	IsRequired  bool                   `json:"is_required"`
	IsUnique    bool                   `json:"is_unique"`
	Order       float64                `json:"order"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// TableUpdateOp 表更新操作
type TableUpdateOp struct {
	TableID string                 `json:"table_id"`
	Changes map[string]interface{} `json:"changes"`
}

// ViewCreateOp 视图创建操作
type ViewCreateOp struct {
	ViewID string                 `json:"view_id"`
	View   map[string]interface{} `json:"view"`
}

// ViewUpdateOp 视图更新操作
type ViewUpdateOp struct {
	ViewID  string                 `json:"view_id"`
	Changes map[string]interface{} `json:"changes"`
}

// ViewDeleteOp 视图删除操作
type ViewDeleteOp struct {
	ViewID string `json:"view_id"`
}

// NewOperation 创建操作消息
func NewOperation(opType OperationType, tableID string, data interface{}) *Operation {
	return &Operation{
		Type:      opType,
		TableID:   tableID,
		Timestamp: time.Now(),
		Data:      data,
	}
}

// NewRecordCreateOperation 创建记录创建操作
func NewRecordCreateOperation(tableID, recordID string, fields map[string]interface{}) *Operation {
	return NewOperation(OperationTypeRecordCreate, tableID, &RecordCreateOp{
		RecordID: recordID,
		Fields:   fields,
	})
}

// NewRecordUpdateOperation 创建记录更新操作
func NewRecordUpdateOperation(tableID, recordID string, fields map[string]interface{}) *Operation {
	return NewOperation(OperationTypeRecordUpdate, tableID, &RecordUpdateOp{
		RecordID: recordID,
		Fields:   fields,
	})
}

// NewRecordDeleteOperation 创建记录删除操作
func NewRecordDeleteOperation(tableID, recordID string) *Operation {
	return NewOperation(OperationTypeRecordDelete, tableID, &RecordDeleteOp{
		RecordID: recordID,
	})
}

// NewFieldCreateOperation 创建字段创建操作
func NewFieldCreateOperation(tableID string, field *entity.Field) *Operation {
	fieldDTO := convertFieldToDTO(field)
	return NewOperation(OperationTypeFieldCreate, tableID, &FieldCreateOp{
		Field: fieldDTO,
	})
}

// NewFieldUpdateOperation 创建字段更新操作
func NewFieldUpdateOperation(tableID string, oldField, newField *entity.Field) *Operation {
	oldDTO := convertFieldToDTO(oldField)
	newDTO := convertFieldToDTO(newField)

	return NewOperation(OperationTypeFieldUpdate, tableID, &FieldUpdateOp{
		FieldID:  newField.ID().String(),
		OldField: oldDTO,
		NewField: newDTO,
	})
}

// NewFieldDeleteOperation 创建字段删除操作
func NewFieldDeleteOperation(tableID, fieldID string) *Operation {
	return NewOperation(OperationTypeFieldDelete, tableID, &FieldDeleteOp{
		FieldID: fieldID,
	})
}

// NewBatchRecordUpdateOperation 创建批量记录更新操作
func NewBatchRecordUpdateOperation(tableID string, records []RecordUpdateOp) *Operation {
	return NewOperation(OperationTypeBatchUpdate, tableID, &BatchRecordUpdateOp{
		Records: records,
	})
}

// convertFieldToDTO 将字段实体转换为DTO
func convertFieldToDTO(field *entity.Field) *FieldDTO {
	if field == nil {
		return nil
	}

	dto := &FieldDTO{
		ID:          field.ID().String(),
		TableID:     field.TableID(),
		Name:        field.Name().String(),
		Type:        field.Type().String(),
		DBFieldName: field.DBFieldName().String(),
		IsRequired:  field.IsRequired(),
		IsUnique:    field.IsUnique(),
		Order:       field.Order(),
		CreatedAt:   field.CreatedAt(),
		UpdatedAt:   field.UpdatedAt(),
	}

	if desc := field.Description(); desc != nil {
		dto.Description = *desc
	}

	// 将 Options 转换为 map（简化处理）
	// TODO: 根据实际需求完善 Options 的序列化
	//
	// 实现步骤：
	// 1. 使用json.Marshal/Unmarshal进行转换
	//    if options := field.Options(); options != nil {
	//        data, err := json.Marshal(options)
	//        if err == nil {
	//            var optionsMap map[string]interface{}
	//            json.Unmarshal(data, &optionsMap)
	//            dto.Options = optionsMap
	//        }
	//    }
	//
	// 2. 或者根据字段类型手动转换：
	//    switch field.Type() {
	//    case "formula":
	//        dto.Options = map[string]interface{}{
	//            "expression": options.Formula.Expression,
	//            "formatting": options.Formula.Formatting,
	//        }
	//    case "select":
	//        dto.Options = map[string]interface{}{
	//            "choices": options.Select.Choices,
	//        }
	//    // ... 其他字段类型
	//    }
	//
	if options := field.Options(); options != nil {
		dto.Options = make(map[string]interface{})
		// 这里需要根据实际的 FieldOptions 结构进行转换
	}

	return dto
}

// WithUserID 设置操作的用户ID
func (op *Operation) WithUserID(userID string) *Operation {
	op.UserID = userID
	return op
}

// WithWindowID 设置操作的窗口ID
func (op *Operation) WithWindowID(windowID string) *Operation {
	op.WindowID = windowID
	return op
}

// ShouldBroadcastToClient 判断是否应该广播给指定客户端
// 如果操作有 WindowID 且与客户端的 WindowID 相同，则不广播（避免重复）
func (op *Operation) ShouldBroadcastToClient(clientWindowID string) bool {
	// 如果操作没有 WindowID，广播给所有客户端
	if op.WindowID == "" {
		return true
	}
	// 如果客户端没有 WindowID，接收所有操作
	if clientWindowID == "" {
		return true
	}
	// 只有不同窗口的客户端才接收操作
	return op.WindowID != clientWindowID
}
