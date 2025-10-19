import React, { useState, useEffect, useRef } from 'react';
import { GoWebSocketProvider } from '../yjs/GoWebSocketProvider';
import * as Y from 'yjs';
import './PerformanceTest.css';

function PerformanceTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [currentTest, setCurrentTest] = useState(null);
  const [stats, setStats] = useState({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    averageLatency: 0,
    totalMessages: 0
  });

  const providerRef = useRef(null);
  const testStartTime = useRef(0);
  const messageCount = useRef(0);
  const latencySum = useRef(0);
  const latencyCount = useRef(0);

  const addTestResult = (testName, status, details = {}) => {
    const result = {
      id: Date.now(),
      testName,
      status,
      timestamp: new Date().toLocaleTimeString(),
      details
    };
    
    setTestResults(prev => [...prev, result]);
    
    setStats(prev => ({
      ...prev,
      totalTests: prev.totalTests + 1,
      passedTests: prev.status === 'passed' ? prev.passedTests + 1 : prev.passedTests,
      failedTests: prev.status === 'failed' ? prev.failedTests + 1 : prev.failedTests
    }));
  };

  const updateStats = () => {
    setStats(prev => ({
      ...prev,
      totalMessages: messageCount.current,
      averageLatency: latencyCount.current > 0 ? latencySum.current / latencyCount.current : 0
    }));
  };

  const connectToServer = async () => {
    return new Promise((resolve, reject) => {
      setCurrentTest('连接测试');
      
      const provider = new GoWebSocketProvider('perf-test', {
        userId: `perf_user_${Date.now()}`,
        maxReconnectAttempts: 1
      });

      providerRef.current = provider;

      const timeout = setTimeout(() => {
        reject(new Error('连接超时'));
      }, 5000);

      provider.on('status', (event) => {
        if (event.status === 'connected') {
          clearTimeout(timeout);
          resolve(provider);
        }
      });

      provider.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  };

  const testConnectionLatency = async () => {
    setCurrentTest('延迟测试');
    
    const latencies = [];
    const testCount = 10;
    
    for (let i = 0; i < testCount; i++) {
      const startTime = Date.now();
      
      return new Promise((resolve) => {
        const provider = providerRef.current;
        const testMessage = {
          type: 'ping',
          timestamp: startTime,
          testId: i
        };
        
        provider.sendMessage(testMessage);
        
        const timeout = setTimeout(() => {
          latencies.push(1000); // 超时设为1秒
          resolve();
        }, 1000);
        
        const originalOnMessage = provider.ws.onmessage;
        provider.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'pong' || message.type === 'ping') {
              clearTimeout(timeout);
              const latency = Date.now() - startTime;
              latencies.push(latency);
              latencySum.current += latency;
              latencyCount.current++;
              provider.ws.onmessage = originalOnMessage;
              resolve();
            }
          } catch (error) {
            provider.ws.onmessage = originalOnMessage;
            resolve();
          }
        };
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);
    
    addTestResult('延迟测试', 'passed', {
      average: averageLatency.toFixed(2),
      max: maxLatency,
      min: minLatency,
      samples: latencies.length
    });
  };

  const testMessageThroughput = async () => {
    setCurrentTest('吞吐量测试');
    
    const messageCount = 100;
    const startTime = Date.now();
    let receivedCount = 0;
    
    return new Promise((resolve) => {
      const provider = providerRef.current;
      const doc = provider.getDoc();
      const yText = doc.getText('throughput-test');
      
      // 监听接收到的更新
      const handleUpdate = () => {
        receivedCount++;
        if (receivedCount >= messageCount) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const throughput = (messageCount / duration) * 1000; // 消息/秒
          
          addTestResult('吞吐量测试', 'passed', {
            messages: messageCount,
            duration: duration,
            throughput: throughput.toFixed(2)
          });
          
          yText.unobserve(handleUpdate);
          resolve();
        }
      };
      
      yText.observe(handleUpdate);
      
      // 发送测试消息
      for (let i = 0; i < messageCount; i++) {
        yText.insert(0, `消息 ${i} - ${Date.now()}\n`);
      }
      
      // 超时处理
      setTimeout(() => {
        addTestResult('吞吐量测试', 'failed', {
          reason: '超时',
          received: receivedCount,
          expected: messageCount
        });
        yText.unobserve(handleUpdate);
        resolve();
      }, 10000);
    });
  };

  const testConcurrentUsers = async () => {
    setCurrentTest('并发用户测试');
    
    const userCount = 5;
    const messagesPerUser = 10;
    const providers = [];
    const results = [];
    
    try {
      // 创建多个连接
      for (let i = 0; i < userCount; i++) {
        const provider = new GoWebSocketProvider(`concurrent-test-${i}`, {
          userId: `concurrent_user_${i}`,
          maxReconnectAttempts: 1
        });
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('连接超时')), 5000);
          
          provider.on('status', (event) => {
            if (event.status === 'connected') {
              clearTimeout(timeout);
              resolve();
            }
          });
          
          provider.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
        
        providers.push(provider);
      }
      
      // 每个用户发送消息
      const startTime = Date.now();
      
      for (let i = 0; i < userCount; i++) {
        const provider = providers[i];
        const doc = provider.getDoc();
        const yText = doc.getText('concurrent-test');
        
        for (let j = 0; j < messagesPerUser; j++) {
          yText.insert(0, `用户${i}消息${j} - ${Date.now()}\n`);
        }
      }
      
      // 等待所有消息同步
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const totalMessages = userCount * messagesPerUser;
      
      addTestResult('并发用户测试', 'passed', {
        users: userCount,
        messagesPerUser,
        totalMessages,
        duration,
        messagesPerSecond: (totalMessages / duration * 1000).toFixed(2)
      });
      
    } catch (error) {
      addTestResult('并发用户测试', 'failed', {
        reason: error.message
      });
    } finally {
      // 清理连接
      providers.forEach(provider => provider.destroy());
    }
  };

  const testDataConsistency = async () => {
    setCurrentTest('数据一致性测试');
    
    try {
      const provider = providerRef.current;
      const doc = provider.getDoc();
      const yText = doc.getText('consistency-test');
      const yArray = doc.getArray('consistency-array');
      const yMap = doc.getMap('consistency-map');
      
      // 写入测试数据
      const testData = {
        text: `一致性测试数据 ${Date.now()}`,
        array: ['项目1', '项目2', '项目3'],
        map: { key1: 'value1', key2: 'value2' }
      };
      
      yText.delete(0, yText.length);
      yText.insert(0, testData.text);
      
      yArray.delete(0, yArray.length);
      yArray.push(testData.array);
      
      yMap.clear();
      Object.entries(testData.map).forEach(([key, value]) => {
        yMap.set(key, value);
      });
      
      // 等待同步
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 验证数据
      const receivedText = yText.toString();
      const receivedArray = yArray.toArray();
      const receivedMap = yMap.toJSON();
      
      const textMatch = receivedText === testData.text;
      const arrayMatch = JSON.stringify(receivedArray) === JSON.stringify(testData.array);
      const mapMatch = JSON.stringify(receivedMap) === JSON.stringify(testData.map);
      
      if (textMatch && arrayMatch && mapMatch) {
        addTestResult('数据一致性测试', 'passed', {
          textMatch,
          arrayMatch,
          mapMatch
        });
      } else {
        addTestResult('数据一致性测试', 'failed', {
          textMatch,
          arrayMatch,
          mapMatch,
          expected: testData,
          received: { text: receivedText, array: receivedArray, map: receivedMap }
        });
      }
      
    } catch (error) {
      addTestResult('数据一致性测试', 'failed', {
        reason: error.message
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setStats({
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      averageLatency: 0,
      totalMessages: 0
    });
    
    messageCount.current = 0;
    latencySum.current = 0;
    latencyCount.current = 0;
    
    try {
      // 连接测试
      await connectToServer();
      addTestResult('连接测试', 'passed');
      
      // 延迟测试
      await testConnectionLatency();
      
      // 吞吐量测试
      await testMessageThroughput();
      
      // 并发用户测试
      await testConcurrentUsers();
      
      // 数据一致性测试
      await testDataConsistency();
      
    } catch (error) {
      addTestResult('测试套件', 'failed', { reason: error.message });
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
      updateStats();
      
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setStats({
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      averageLatency: 0,
      totalMessages: 0
    });
  };

  const exportResults = () => {
    const results = {
      timestamp: new Date().toISOString(),
      stats,
      tests: testResults
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yjs-performance-test-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="performance-test">
      <div className="test-header">
        <h2>⚡ YJS 性能测试</h2>
        <p>测试 YJS 服务器的性能和稳定性</p>
      </div>

      {/* 测试控制 */}
      <div className="control-section">
        <div className="control-buttons">
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="btn btn-primary"
          >
            {isRunning ? '🔄 测试中...' : '🚀 开始测试'}
          </button>
          <button
            onClick={clearResults}
            disabled={isRunning}
            className="btn btn-warning"
          >
            🧹 清空结果
          </button>
          <button
            onClick={exportResults}
            disabled={testResults.length === 0}
            className="btn btn-info"
          >
            📥 导出结果
          </button>
        </div>
        
        {isRunning && currentTest && (
          <div className="current-test">
            <span>当前测试: {currentTest}</span>
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
          </div>
        )}
      </div>

      {/* 统计信息 */}
      <div className="stats-section">
        <h3>测试统计</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">总测试数</div>
            <div className="stat-value">{stats.totalTests}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">通过测试</div>
            <div className="stat-value success">{stats.passedTests}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">失败测试</div>
            <div className="stat-value error">{stats.failedTests}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">平均延迟</div>
            <div className="stat-value">{stats.averageLatency.toFixed(2)}ms</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">总消息数</div>
            <div className="stat-value">{stats.totalMessages}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">成功率</div>
            <div className="stat-value">
              {stats.totalTests > 0 ? ((stats.passedTests / stats.totalTests) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* 测试结果 */}
      <div className="results-section">
        <h3>测试结果</h3>
        <div className="results-container">
          {testResults.length === 0 ? (
            <div className="results-empty">
              暂无测试结果，点击"开始测试"运行性能测试
            </div>
          ) : (
            testResults.map((result) => (
              <div key={result.id} className={`result-item ${result.status}`}>
                <div className="result-header">
                  <span className="result-name">{result.testName}</span>
                  <span className="result-status">
                    {result.status === 'passed' ? '✅ 通过' : '❌ 失败'}
                  </span>
                  <span className="result-time">{result.timestamp}</span>
                </div>
                {Object.keys(result.details).length > 0 && (
                  <div className="result-details">
                    <pre>{JSON.stringify(result.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default PerformanceTest;
