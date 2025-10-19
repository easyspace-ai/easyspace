// API 服务
class ApiService {
  constructor() {
    this.baseURL = '/api/v1';
  }

  // 获取认证头
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API请求失败 ${endpoint}:`, error);
      throw error;
    }
  }

  // 认证相关
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // 空间相关
  async getSpaces() {
    return this.request('/spaces');
  }

  async getSpace(spaceId) {
    return this.request(`/spaces/${spaceId}`);
  }

  // Base相关
  async getBases(spaceId) {
    return this.request(`/spaces/${spaceId}/bases`);
  }

  async getBase(baseId) {
    return this.request(`/bases/${baseId}`);
  }

  // 表相关
  async getTables(baseId) {
    return this.request(`/bases/${baseId}/tables`);
  }

  async getTable(tableId) {
    return this.request(`/tables/${tableId}`);
  }

  // 字段相关
  async getFields(tableId) {
    return this.request(`/tables/${tableId}/fields`);
  }

  async getField(fieldId) {
    return this.request(`/fields/${fieldId}`);
  }

  // 记录相关
  async getRecords(tableId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/tables/${tableId}/records?${queryString}` : `/tables/${tableId}/records`;
    return this.request(endpoint);
  }

  async getRecord(tableId, recordId) {
    return this.request(`/tables/${tableId}/records/${recordId}`);
  }

  // 创建记录
  async createRecord(tableId, data) {
    return this.request(`/tables/${tableId}/records`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 更新记录
  async updateRecord(tableId, recordId, data) {
    return this.request(`/tables/${tableId}/records/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // 删除记录
  async deleteRecord(tableId, recordId) {
    return this.request(`/tables/${tableId}/records/${recordId}`, {
      method: 'DELETE'
    });
  }

  // 创建字段
  async createField(tableId, data) {
    return this.request(`/tables/${tableId}/fields`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 更新字段
  async updateField(fieldId, data) {
    return this.request(`/fields/${fieldId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // 删除字段
  async deleteField(fieldId) {
    return this.request(`/fields/${fieldId}`, {
      method: 'DELETE'
    });
  }

  // 创建表
  async createTable(baseId, data) {
    return this.request(`/bases/${baseId}/tables`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 更新表
  async updateTable(tableId, data) {
    return this.request(`/tables/${tableId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // 删除表
  async deleteTable(tableId) {
    return this.request(`/tables/${tableId}`, {
      method: 'DELETE'
    });
  }
}

// 创建单例实例
const apiService = new ApiService();

export default apiService;
