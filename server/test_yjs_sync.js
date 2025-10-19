const WebSocket = require('ws');

// 创建WebSocket连接
const ws = new WebSocket('ws://localhost:8888/yjs/ws?document=room:test-room&user=test-user-1');

ws.on('open', () => {
    console.log('✅ WebSocket连接已建立');
    
    // 发送同步请求
    const syncRequest = {
        type: 'sync',
        document: 'room:test-room',
        user: 'test-user-1'
    };
    
    console.log('📤 发送同步请求:', syncRequest);
    ws.send(JSON.stringify(syncRequest));
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        console.log('📨 收到服务器消息:', message);
        
        if (message.type === 'sync' && message.state) {
            console.log('🔄 收到状态向量，长度:', message.state.length);
            
            // 发送更新消息测试
            const updateMessage = {
                type: 'update',
                document: 'room:test-room',
                user: 'test-user-1',
                update: [1, 2, 3, 4, 5] // 模拟更新数据
            };
            
            console.log('📤 发送更新消息:', updateMessage);
            ws.send(JSON.stringify(updateMessage));
        }
    } catch (error) {
        console.error('❌ 解析消息失败:', error);
    }
});

ws.on('close', () => {
    console.log('❌ WebSocket连接已关闭');
});

ws.on('error', (error) => {
    console.error('❌ WebSocket错误:', error);
});

// 5秒后关闭连接
setTimeout(() => {
    console.log('⏰ 5秒后关闭连接');
    ws.close();
}, 5000);
