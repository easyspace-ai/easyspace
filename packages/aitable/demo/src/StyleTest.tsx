import React from 'react';

export function StyleTest() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">样式测试</h2>
      
      <div className="flex items-center gap-2 mb-4">
        <button className="inline-flex items-center justify-center gap-2 h-8 px-3 rounded-md text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 active:bg-gray-100 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <span>撤销</span>
        </button>
        
        <button className="inline-flex items-center justify-center gap-2 h-8 px-3 rounded-md text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 active:bg-gray-100 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <span>重做</span>
        </button>
        
        <button className="inline-flex items-center justify-center gap-2 h-8 px-3 rounded-md text-sm font-medium bg-blue-500 border border-blue-600 text-white hover:bg-blue-600 hover:border-blue-700 active:bg-blue-700 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 shadow-sm hover:shadow-md">
          <span>+</span>
        </button>
        
        <select className="inline-flex items-center justify-center gap-2 h-8 px-3 rounded-md text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200">
          <option>中等</option>
          <option>紧凑</option>
          <option>宽松</option>
        </select>
      </div>
      
      <p className="text-sm text-gray-600">
        如果你看到这些按钮有正确的样式（圆角、悬停效果、阴影等），说明样式加载成功。
      </p>
    </div>
  );
}
