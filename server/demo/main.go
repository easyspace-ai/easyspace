package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/easyspace-ai/luckdb/server/pkg/yjs"
	"github.com/gorilla/websocket"
)

// WebSocket升级器
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // 允许跨域
	},
}

// 房间管理
type Room struct {
	ID      string
	Clients map[*websocket.Conn]bool
	Doc     *yjs.Doc
	mutex   sync.RWMutex
}

// 服务器结构
type Server struct {
	rooms map[string]*Room
	mutex sync.RWMutex
}

// 消息类型
type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// 创建新服务器
func NewServer() *Server {
	return &Server{
		rooms: make(map[string]*Room),
	}
}

// 获取或创建房间
func (s *Server) GetRoom(roomID string) *Room {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	room, exists := s.rooms[roomID]
	if !exists {
		room = &Room{
			ID:      roomID,
			Clients: make(map[*websocket.Conn]bool),
			Doc:     yjs.NewDoc(roomID, true, yjs.DefaultGCFilter, nil, false),
		}
		s.rooms[roomID] = room
		log.Printf("创建新房间: %s", roomID)
	}

	return room
}

// 处理WebSocket连接
func (s *Server) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket升级失败: %v", err)
		return
	}
	defer conn.Close()

	// 获取房间ID
	roomID := r.URL.Query().Get("room")
	if roomID == "" {
		roomID = "default"
	}

	room := s.GetRoom(roomID)

	// 添加客户端到房间
	room.mutex.Lock()
	room.Clients[conn] = true
	room.mutex.Unlock()

	log.Printf("客户端连接到房间 %s，当前客户端数: %d", roomID, len(room.Clients))

	// 发送欢迎消息
	welcomeMsg := Message{
		Type: "welcome",
		Data: map[string]interface{}{
			"roomID":  roomID,
			"message": "欢迎连接到YJS服务器！",
		},
	}
	conn.WriteJSON(welcomeMsg)

	// 发送当前文档状态
	// 安全地获取文档状态
	docState := Message{
		Type: "doc_state",
		Data: map[string]interface{}{
			"text":  "",
			"array": []interface{}{},
			"map":   map[string]interface{}{},
		},
	}

	// 获取文本
	if text, err := room.Doc.Get("text", yjs.NewYTextType); err == nil {
		if yText, ok := text.(*yjs.YText); ok {
			docState.Data.(map[string]interface{})["text"] = yText.ToString()
		}
	}

	// 获取数组
	if array, err := room.Doc.Get("array", yjs.NewYArrayType); err == nil {
		if yArray, ok := array.(*yjs.YArray); ok {
			docState.Data.(map[string]interface{})["array"] = yArray.ToArray()
		}
	}

	// 获取Map
	if yMap, err := room.Doc.Get("map", yjs.NewYMapType); err == nil {
		docState.Data.(map[string]interface{})["map"] = yMap.ToJson()
	}
	conn.WriteJSON(docState)

	// 处理消息
	for {
		var msg Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("读取消息失败: %v", err)
			break
		}

		log.Printf("收到消息类型: %s", msg.Type)

		// 处理不同类型的消息
		switch msg.Type {
		case "update":
			s.handleUpdate(room, conn, msg.Data)
		case "sync":
			s.handleSync(room, conn, msg.Data)
		case "ping":
			conn.WriteJSON(Message{Type: "pong", Data: "pong"})
		default:
			log.Printf("未知消息类型: %s", msg.Type)
		}
	}

	// 移除客户端
	room.mutex.Lock()
	delete(room.Clients, conn)
	room.mutex.Unlock()

	log.Printf("客户端断开连接，房间 %s 剩余客户端数: %d", roomID, len(room.Clients))
}

// 处理文档更新
func (s *Server) handleUpdate(room *Room, sender *websocket.Conn, data interface{}) {
	updateData, ok := data.(map[string]interface{})
	if !ok {
		log.Printf("无效的更新数据格式")
		return
	}

	log.Printf("收到更新: %+v", updateData)

	// 根据更新类型处理数据
	updateType, ok := updateData["type"].(string)
	if !ok {
		log.Printf("无效的更新类型")
		return
	}

	// 更新Go服务器的CRDT文档
	defer func() {
		if r := recover(); r != nil {
			log.Printf("处理更新时发生panic: %v", r)
		}
	}()

	room.Doc.Transact(func(trans *yjs.Transaction) {
		switch updateType {
		case "text":
			if content, ok := updateData["content"].(string); ok {
				// 尝试获取或创建文本类型
				text, err := room.Doc.Get("text", yjs.NewYTextType)
				if err != nil {
					log.Printf("获取文本类型失败: %v", err)
					return
				}

				yText, ok := text.(*yjs.YText)
				if !ok {
					log.Printf("类型断言失败，不是YText类型")
					return
				}

				// 安全地清空和插入文本
				defer func() {
					if r := recover(); r != nil {
						log.Printf("文本操作时发生panic: %v", r)
					}
				}()

				// 检查YText对象是否有效
				if yText == nil {
					log.Printf("YText对象为nil")
					return
				}

				// 获取当前长度
				currentLength := yText.Length()
				if currentLength > 0 {
					yText.Delete(0, currentLength)
				}
				if len(content) > 0 {
					yText.Insert(0, content, nil)
				}
				log.Printf("更新文本: %s (长度: %d)", content, len(content))
			}
		case "array":
			if content, ok := updateData["content"].([]interface{}); ok {
				// 尝试获取或创建数组类型
				array, err := room.Doc.Get("array", yjs.NewYArrayType)
				if err != nil {
					log.Printf("获取数组类型失败: %v", err)
					return
				}

				yArray, ok := array.(*yjs.YArray)
				if !ok {
					log.Printf("类型断言失败，不是YArray类型")
					return
				}

				// 安全地清空数组
				defer func() {
					if r := recover(); r != nil {
						log.Printf("数组操作时发生panic: %v", r)
					}
				}()

				currentLength := yArray.GetLength()
				if currentLength > 0 {
					yArray.Delete(0, currentLength)
				}
				// 安全地添加项目
				for _, item := range content {
					if item != nil {
						yArray.Push([]interface{}{item})
					}
				}
				log.Printf("更新数组: %+v (长度: %d)", content, len(content))
			}
		case "map":
			if content, ok := updateData["content"].(map[string]interface{}); ok {
				// 尝试获取或创建Map类型
				yMap, err := room.Doc.Get("map", yjs.NewYMapType)
				if err != nil {
					log.Printf("获取Map类型失败: %v", err)
					return
				}

				// 清空现有内容
				defer func() {
					if r := recover(); r != nil {
						log.Printf("Map操作时发生panic: %v", r)
					}
				}()

				// 安全地清空Map
				mapData := yMap.GetMap()
				if mapData != nil {
					for key := range mapData {
						yjs.TypeMapDelete(trans, yMap, key)
					}
				}
				// 设置新内容
				for key, value := range content {
					yjs.TypeMapSet(trans, yMap, key, value)
				}
				log.Printf("更新Map: %+v", content)
			}
		}
	}, nil)

	// 广播更新给房间内所有其他客户端
	room.mutex.RLock()
	defer room.mutex.RUnlock()

	for conn := range room.Clients {
		if conn != sender {
			msg := Message{
				Type: "update",
				Data: updateData,
			}
			if err := conn.WriteJSON(msg); err != nil {
				log.Printf("发送更新失败: %v", err)
				delete(room.Clients, conn)
			} else {
				log.Printf("已广播更新给客户端")
			}
		}
	}
}

// 处理同步请求
func (s *Server) handleSync(room *Room, conn *websocket.Conn, data interface{}) {
	// 发送当前文档状态
	// 安全地获取文档状态
	docState := Message{
		Type: "doc_state",
		Data: map[string]interface{}{
			"text":  "",
			"array": []interface{}{},
			"map":   map[string]interface{}{},
		},
	}

	// 获取文本
	if text, err := room.Doc.Get("text", yjs.NewYTextType); err == nil {
		if yText, ok := text.(*yjs.YText); ok {
			docState.Data.(map[string]interface{})["text"] = yText.ToString()
		}
	}

	// 获取数组
	if array, err := room.Doc.Get("array", yjs.NewYArrayType); err == nil {
		if yArray, ok := array.(*yjs.YArray); ok {
			docState.Data.(map[string]interface{})["array"] = yArray.ToArray()
		}
	}

	// 获取Map
	if yMap, err := room.Doc.Get("map", yjs.NewYMapType); err == nil {
		docState.Data.(map[string]interface{})["map"] = yMap.ToJson()
	}
	conn.WriteJSON(docState)
}

// 处理HTTP请求
func (s *Server) HandleHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	response := map[string]interface{}{
		"message": "YJS WebSocket服务器",
		"version": "1.0.0",
		"rooms":   len(s.rooms),
		"endpoints": map[string]string{
			"websocket": "/ws",
			"status":    "/status",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// 处理状态请求
func (s *Server) HandleStatus(w http.ResponseWriter, r *http.Request) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	roomStats := make(map[string]interface{})
	for roomID, room := range s.rooms {
		room.mutex.RLock()
		roomStats[roomID] = map[string]interface{}{
			"clients": len(room.Clients),
			"doc_id":  room.Doc.Guid,
		}
		room.mutex.RUnlock()
	}

	response := map[string]interface{}{
		"status":      "running",
		"rooms":       roomStats,
		"total_rooms": len(s.rooms),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func main() {
	server := NewServer()

	// 设置路由
	http.HandleFunc("/ws", server.HandleWebSocket)
	http.HandleFunc("/status", server.HandleStatus)

	// 静态文件服务（React build目录）
	buildDir := "./demo/build"
	if _, err := os.Stat(buildDir); os.IsNotExist(err) {
		log.Printf("⚠️  React Build目录不存在: %s", buildDir)
		log.Printf("💡 请先运行 './run.sh' 自动构建")
	} else {
		http.Handle("/demo/", http.StripPrefix("/demo/", http.FileServer(http.Dir(buildDir))))
		log.Printf("✅ React Build目录已加载: %s", buildDir)
	}

	// 根路径处理
	http.HandleFunc("/", server.HandleHTTP)

	port := ":8080"
	log.Printf("🚀 YJS WebSocket服务器启动在端口 %s", port)
	log.Printf("📡 WebSocket端点: ws://localhost%s/ws", port)
	log.Printf("🌐 HTTP端点: http://localhost%s", port)
	log.Printf("📊 状态端点: http://localhost%s/status", port)
	log.Printf("🎮 演示页面: http://localhost%s/demo/", port)

	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal("服务器启动失败:", err)
	}
}
