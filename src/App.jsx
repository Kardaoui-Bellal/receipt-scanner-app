import React, { useState, useEffect } from 'react';
import { Camera, Upload, Trash2, DollarSign, Calendar, Tag, TrendingUp, PieChart, Search } from 'lucide-react';

const App = () => {
  const [receipts, setReceipts] = useState([]);
  const [view, setView] = useState('scan');
  const [scanning, setScanning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [expandedReceipt, setExpandedReceipt] = useState(null);

  const categories = ['Groceries', 'Transport', 'Dining', 'Shopping', 'Healthcare', 'Entertainment', 'Utilities', 'Other'];
  
  const colors = {
    Groceries: 'bg-green-500',
    Transport: 'bg-blue-500',
    Dining: 'bg-orange-500',
    Shopping: 'bg-purple-500',
    Healthcare: 'bg-red-500',
    Entertainment: 'bg-pink-500',
    Utilities: 'bg-yellow-500',
    Other: 'bg-gray-500'
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = () => {
    try {
      const data = localStorage.getItem('receipts');
      if (data) {
        setReceipts(JSON.parse(data));
      }
    } catch (error) {
      console.log('No existing receipts found');
    }
  };

  const saveReceipts = (newReceipts) => {
    try {
      localStorage.setItem('receipts', JSON.stringify(newReceipts));
      setReceipts(newReceipts);
    } catch (error) {
      console.error('Error saving receipts:', error);
    }
  };

  const processReceipt = async (file) => {
    setScanning(true);
    
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64,
          mediaType: file.type
        })
      });

      const data = await response.json();
      const text = data.content.map(c => c.text || '').join('');
      const cleanText = text.replace(/```json|```/g, '').trim();
      const receiptData = JSON.parse(cleanText);

      const newReceipt = {
        id: Date.now(),
        ...receiptData,
        image: URL.createObjectURL(file),
        addedDate: new Date().toISOString()
      };

      const updatedReceipts = [newReceipt, ...receipts];
      saveReceipts(updatedReceipts);
      setView('list');
    } catch (error) {
      console.error('Error processing receipt:', error);
      alert('Error processing receipt. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      processReceipt(file);
    }
  };

  const deleteReceipt = (id) => {
    const updatedReceipts = receipts.filter(r => r.id !== id);
    saveReceipts(updatedReceipts);
  };

  const getFilteredReceipts = () => {
    return receipts.filter(receipt => {
      const matchesCategory = selectedCategory === 'all' || receipt.category === selectedCategory;
      const matchesSearch = !searchTerm || 
        receipt.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const receiptDate = new Date(receipt.date);
        const now = new Date();
        if (dateFilter === 'week') {
          matchesDate = (now - receiptDate) / (1000 * 60 * 60 * 24) <= 7;
        } else if (dateFilter === 'month') {
          matchesDate = receiptDate.getMonth() === now.getMonth() && receiptDate.getFullYear() === now.getFullYear();
        }
      }
      
      return matchesCategory && matchesSearch && matchesDate;
    });
  };

  const getStats = () => {
    const filtered = getFilteredReceipts();
    const total = filtered.reduce((sum, r) => sum + r.total, 0);
    const byCategory = {};
    filtered.forEach(r => {
      byCategory[r.category] = (byCategory[r.category] || 0) + r.total;
    });
    return { total, byCategory, count: filtered.length };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <DollarSign className="text-white" size={24} />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Receipt Scanner</h1>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Expenses</div>
              <div className="text-2xl font-bold text-indigo-600">${stats.total.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="bg-white rounded-lg shadow-md p-2 flex gap-2">
          <button
            onClick={() => setView('scan')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              view === 'scan' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Camera className="inline mr-2" size={20} />
            Scan
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              view === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Tag className="inline mr-2" size={20} />
            Receipts
          </button>
          <button
            onClick={() => setView('analytics')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              view === 'analytics' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <TrendingUp className="inline mr-2" size={20} />
            Analytics
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-8">
        {view === 'scan' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mb-6">
                <Upload className="mx-auto text-indigo-600" size={64} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Scan Your Receipt</h2>
              <p className="text-gray-600 mb-8">Upload a photo and let AI extract the details</p>
              
              <label className="inline-block">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={scanning}
                />
                <div className="bg-indigo-600 text-white px-8 py-4 rounded-lg font-medium cursor-pointer hover:bg-indigo-700 transition-all inline-flex items-center gap-2">
                  {scanning ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Camera size={20} />
                      Take Photo / Choose Image
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>
        )}

        {view === 'list' && (
          <div>
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search receipts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  />
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredReceipts().map(receipt => (
                <div key={receipt.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
                  <img src={receipt.image} alt="Receipt" className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg text-gray-800">{receipt.merchant}</h3>
                      <span className={`${colors[receipt.category]} text-white text-xs px-2 py-1 rounded-full`}>
                        {receipt.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {receipt.date}
                      </div>
                      <div className="font-bold text-indigo-600 text-lg">
                        ${receipt.total.toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="mb-3 border-t pt-3">
                      <button
                        onClick={() => setExpandedReceipt(expandedReceipt === receipt.id ? null : receipt.id)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-2 flex items-center gap-1"
                      >
                        {expandedReceipt === receipt.id ? '▼' : '▶'} 
                        {receipt.items.length} items
                      </button>
                      
                      {expandedReceipt === receipt.id && (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {receipt.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-gray-100 last:border-0">
                              <div className="flex-1">
                                <span className="text-gray-700">{item.name}</span>
                                {item.quantity > 1 && (
                                  <span className="text-gray-500 ml-1">×{item.quantity}</span>
                                )}
                              </div>
                              <span className="font-medium text-gray-800">${item.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => deleteReceipt(receipt.id)}
                      className="w-full bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {getFilteredReceipts().length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Tag className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600">No receipts found. Start by scanning your first receipt!</p>
              </div>
            )}
          </div>
        )}

        {view === 'analytics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Spent</p>
                    <p className="text-3xl font-bold text-indigo-600">${stats.total.toFixed(2)}</p>
                  </div>
                  <DollarSign className="text-indigo-600" size={40} />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Receipts</p>
                    <p className="text-3xl font-bold text-indigo-600">{stats.count}</p>
                  </div>
                  <Tag className="text-indigo-600" size={40} />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Average</p>
                    <p className="text-3xl font-bold text-indigo-600">
                      ${stats.count > 0 ? (stats.total / stats.count).toFixed(2) : '0.00'}
                    </p>
                  </div>
                  <TrendingUp className="text-indigo-600" size={40} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PieChart size={24} className="text-indigo-600" />
                Spending by Category
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => {
                    const percentage = (amount / stats.total) * 100;
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${colors[category]}`}></div>
                            <span className="font-medium text-gray-700">{category}</span>
                          </div>
                          <span className="text-gray-600 font-medium">${amount.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${colors[category]}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;