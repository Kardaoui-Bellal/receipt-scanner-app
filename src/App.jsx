import React, { useState, useEffect } from 'react';
import { Camera, Upload, Trash2, DollarSign, Calendar, Tag, TrendingUp, PieChart, Search, AlertCircle, Receipt, X, Edit3, Check } from 'lucide-react';
import Tesseract from 'tesseract.js';

const App = () => {
  const [receipts, setReceipts] = useState([]);
  const [view, setView] = useState('scan');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [expandedReceipt, setExpandedReceipt] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [editingReceipt, setEditingReceipt] = useState(null);

  const categories = ['Groceries', 'Transport', 'Dining', 'Shopping', 'Healthcare', 'Entertainment', 'Utilities', 'Other'];
  
  const colors = {
    Groceries: 'bg-emerald-500',
    Transport: 'bg-blue-500',
    Dining: 'bg-orange-500',
    Shopping: 'bg-purple-500',
    Healthcare: 'bg-red-500',
    Entertainment: 'bg-pink-500',
    Utilities: 'bg-yellow-500',
    Other: 'bg-gray-500'
  };

  const categoryIcons = {
    Groceries: '🛒',
    Transport: '🚗',
    Dining: '🍽️',
    Shopping: '🛍️',
    Healthcare: '💊',
    Entertainment: '🎬',
    Utilities: '⚡',
    Other: '📦'
  };

  const merchantCategories = {
    'walmart': 'Groceries', 'target': 'Groceries', 'kroger': 'Groceries', 
    'safeway': 'Groceries', 'whole foods': 'Groceries', 'trader joe': 'Groceries',
    'costco': 'Groceries', 'aldi': 'Groceries', 'publix': 'Groceries',
    'mcdonald': 'Dining', 'burger king': 'Dining', 'subway': 'Dining',
    'starbucks': 'Dining', 'pizza': 'Dining', 'restaurant': 'Dining',
    'cafe': 'Dining', 'coffee': 'Dining', 'food': 'Dining',
    'uber': 'Transport', 'lyft': 'Transport', 'gas': 'Transport',
    'shell': 'Transport', 'chevron': 'Transport', 'exxon': 'Transport',
    'bp': 'Transport', 'parking': 'Transport',
    'amazon': 'Shopping', 'ebay': 'Shopping', 'best buy': 'Shopping',
    'macy': 'Shopping', 'nordstrom': 'Shopping', 'mall': 'Shopping',
    'pharmacy': 'Healthcare', 'cvs': 'Healthcare', 'walgreens': 'Healthcare',
    'clinic': 'Healthcare', 'hospital': 'Healthcare', 'medical': 'Healthcare',
    'cinema': 'Entertainment', 'theater': 'Entertainment', 'movie': 'Entertainment',
    'spotify': 'Entertainment', 'netflix': 'Entertainment', 'gym': 'Entertainment',
    'electric': 'Utilities', 'water': 'Utilities', 'utility': 'Utilities',
    'internet': 'Utilities', 'phone': 'Utilities'
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

  const categorizeByMerchant = (merchantName) => {
    const lowerMerchant = merchantName.toLowerCase();
    for (const [keyword, category] of Object.entries(merchantCategories)) {
      if (lowerMerchant.includes(keyword)) {
        return category;
      }
    }
    return 'Other';
  };

  const processReceipt = async (file) => {
    setScanning(true);
    setScanProgress(0);
    
    try {
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setScanProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      const text = result.data.text;
      const lines = text.split('\n').filter(line => line.trim().length > 2);
      
      let merchant = 'Unknown Store';
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i].trim();
        if (line.length > 3 && line.length < 50) {
          merchant = line;
          break;
        }
      }

      let date = new Date().toISOString().split('T')[0];
      const datePatterns = [
        /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
        /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/,
        /\w{3,9}\s+\d{1,2},?\s+\d{4}/i
      ];
      
      for (const line of lines) {
        for (const pattern of datePatterns) {
          const match = line.match(pattern);
          if (match) {
            try {
              const parsedDate = new Date(match[0]);
              if (!isNaN(parsedDate.getTime())) {
                date = parsedDate.toISOString().split('T')[0];
                break;
              }
            } catch (e) {}
          }
        }
      }

      let total = 0;
      const amountRegex = /\$?\s*(\d+[,.]?\d*\.?\d{2})/g;
      const totalKeywords = ['total', 'amount due', 'balance', 'grand total'];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        const hasKeyword = totalKeywords.some(keyword => line.includes(keyword));
        
        if (hasKeyword) {
          const amounts = [...line.matchAll(amountRegex)];
          if (amounts.length > 0) {
            const amount = amounts[amounts.length - 1][1].replace(/[,$]/g, '');
            total = parseFloat(amount);
            break;
          }
        }
      }

      if (total === 0) {
        const allAmounts = [];
        for (const line of lines) {
          const amounts = [...line.matchAll(amountRegex)];
          amounts.forEach(match => {
            const amount = parseFloat(match[1].replace(/[,$]/g, ''));
            if (!isNaN(amount) && amount > 0) {
              allAmounts.push(amount);
            }
          });
        }
        if (allAmounts.length > 0) {
          total = Math.max(...allAmounts);
        }
      }

      const items = [];
      for (const line of lines) {
        const amounts = [...line.matchAll(amountRegex)];
        if (amounts.length > 0) {
          const price = parseFloat(amounts[amounts.length - 1][1].replace(/[,$]/g, ''));
          if (!isNaN(price) && price > 0 && price <= total) {
            let itemName = line.substring(0, line.lastIndexOf(amounts[amounts.length - 1][0])).trim();
            itemName = itemName.replace(/^\d+\s*x?\s*/i, '');
            itemName = itemName.replace(/[^a-zA-Z0-9\s\-']/g, ' ').trim();
            
            if (itemName.length > 2 && itemName.length < 50) {
              const qtyMatch = line.match(/(\d+)\s*x/i);
              const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;
              
              items.push({
                name: itemName || 'Item',
                price: price,
                quantity: quantity
              });
            }
          }
        }
      }

      if (items.length === 0 && total > 0) {
        items.push({
          name: 'Purchase',
          price: total,
          quantity: 1
        });
      }

      const uniqueItems = [];
      const seenPrices = new Set();
      for (const item of items) {
        if (!seenPrices.has(item.price) || item.price < 1) {
          uniqueItems.push(item);
          seenPrices.add(item.price);
        }
      }

      const category = categorizeByMerchant(merchant);

      const newReceipt = {
        id: Date.now(),
        merchant: merchant,
        date: date,
        total: total || 0,
        items: uniqueItems.slice(0, 20),
        category: category,
        image: base64Image,
        addedDate: new Date().toISOString()
      };

      const updatedReceipts = [newReceipt, ...receipts];
      saveReceipts(updatedReceipts);
      setView('list');
    } catch (error) {
      console.error('Error processing receipt:', error);
      alert('Error processing receipt. Please try again or try a clearer photo.');
    } finally {
      setScanning(false);
      setScanProgress(0);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      processReceipt(file);
    }
  };

  const deleteReceipt = (id) => {
    if (window.confirm('Are you sure you want to delete this receipt?')) {
      const updatedReceipts = receipts.filter(r => r.id !== id);
      saveReceipts(updatedReceipts);
      setExpandedReceipt(null);
    }
  };

  const updateReceipt = (id, updates) => {
    const updatedReceipts = receipts.map(r => 
      r.id === id ? { ...r, ...updates } : r
    );
    saveReceipts(updatedReceipts);
    setEditingReceipt(null);
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-indigo-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-3 rounded-2xl shadow-lg">
                <Receipt className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Receipt Scanner
                </h1>
                <p className="text-xs text-gray-500">AI-Powered Expense Tracker</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Expenses</div>
              <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                ${stats.total.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">{stats.count} receipts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-2 flex gap-2 border border-indigo-100">
          <button
            onClick={() => setView('scan')}
            className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
              view === 'scan' 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105' 
                : 'text-gray-600 hover:bg-indigo-50'
            }`}
          >
            <Camera className="inline mr-2" size={22} />
            <span className="hidden sm:inline">Scan</span>
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
              view === 'list' 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105' 
                : 'text-gray-600 hover:bg-indigo-50'
            }`}
          >
            <Tag className="inline mr-2" size={22} />
            <span className="hidden sm:inline">Receipts</span>
          </button>
          <button
            onClick={() => setView('analytics')}
            className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
              view === 'analytics' 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105' 
                : 'text-gray-600 hover:bg-indigo-50'
            }`}
          >
            <TrendingUp className="inline mr-2" size={22} />
            <span className="hidden sm:inline">Analytics</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Scan View */}
        {view === 'scan' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 sm:p-12 border border-indigo-100">
              <div className="text-center">
                <div className="mb-8 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full blur-3xl opacity-20"></div>
                  <Upload className="mx-auto text-indigo-600 relative z-10" size={80} />
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-3">Scan Your Receipt</h2>
                <p className="text-gray-600 mb-8 text-lg">Upload a photo and let AI work its magic ✨</p>
                
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-8 text-left">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-indigo-600 flex-shrink-0 mt-1" size={24} />
                    <div>
                      <p className="font-semibold text-gray-800 mb-2">📸 Tips for Perfect Scans:</p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                          Use bright, even lighting
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                          Keep receipt flat and straight
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                          Avoid shadows and reflections
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                          Make sure all text is visible
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <label className="inline-block cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={scanning}
                  />
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 inline-flex items-center gap-3 group-hover:scale-105">
                    {scanning ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
                        Processing... {scanProgress}%
                      </>
                    ) : (
                      <>
                        <Camera size={24} />
                        Take Photo
                      </>
                    )}
                  </div>
                </label>

                {scanning && (
                  <div className="mt-8">
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 h-4 transition-all duration-300 rounded-full relative overflow-hidden"
                        style={{ width: `${scanProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-4 font-medium">🤖 AI is analyzing your receipt...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div>
            {/* Enhanced Filters */}
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-6 mb-6 border border-indigo-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search receipts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition-all"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{categoryIcons[cat]} {cat}</option>
                  ))}
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition-all"
                >
                  <option value="all">📅 All Time</option>
                  <option value="week">📆 Last 7 Days</option>
                  <option value="month">📊 This Month</option>
                </select>
              </div>
            </div>

            {/* Enhanced Receipts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredReceipts().map(receipt => (
                <div 
                  key={receipt.id} 
                  className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-indigo-100 group hover:-translate-y-1"
                >
                  <div className="relative h-48 overflow-hidden bg-gray-100 cursor-pointer" onClick={() => setPreviewImage(receipt.image)}>
                    <img 
                      src={receipt.image} 
                      alt="Receipt" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                      <span className="text-white text-sm font-medium">Click to view full image</span>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800 mb-1 line-clamp-1">{receipt.merchant}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar size={14} />
                          {new Date(receipt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <span className={`${colors[receipt.category]} text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-md flex items-center gap-1`}>
                        <span>{categoryIcons[receipt.category]}</span>
                        <span className="hidden sm:inline">{receipt.category}</span>
                      </span>
                    </div>
                    
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-600 font-medium mb-1">Total Amount</div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          ${receipt.total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Items List */}
                    <div className="mb-4">
                      <button
                        onClick={() => setExpandedReceipt(expandedReceipt === receipt.id ? null : receipt.id)}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 mb-2 flex items-center gap-2 transition-colors"
                      >
                        {expandedReceipt === receipt.id ? '▼' : '▶'} 
                        <span>{receipt.items.length} item{receipt.items.length !== 1 ? 's' : ''}</span>
                      </button>
                      
                      {expandedReceipt === receipt.id && (
                        <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 rounded-xl p-3">
                          {receipt.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-gray-200 last:border-0">
                              <div className="flex-1">
                                <span className="text-gray-800 font-medium">{item.name}</span>
                                {item.quantity > 1 && (
                                  <span className="text-gray-500 ml-2 text-xs">×{item.quantity}</span>
                                )}
                              </div>
                              <span className="font-bold text-gray-800">${item.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingReceipt(receipt)}
                        className="flex-1 bg-indigo-50 text-indigo-600 py-2.5 rounded-xl hover:bg-indigo-100 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <Edit3 size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteReceipt(receipt.id)}
                        className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-xl hover:bg-red-100 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {getFilteredReceipts().length === 0 && (
              <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-lg p-16 text-center border border-indigo-100">
                <Receipt className="mx-auto text-gray-300 mb-6" size={80} />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">No receipts found</h3>
                <p className="text-gray-600 mb-6">Start by scanning your first receipt!</p>
                <button
                  onClick={() => setView('scan')}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Scan Receipt
                </button>
              </div>
            )}
          </div>
        )}

        {/* Analytics View */}
        {view === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-100 text-sm font-medium mb-2">Total Spent</p>
                    <p className="text-5xl font-bold mb-1">${stats.total.toFixed(2)}</p>
                    <p className="text-indigo-100 text-xs">All time expenses</p>
                  </div>
                  <DollarSign className="opacity-20" size={64} />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-xl p-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-2">Total Receipts</p>
                    <p className="text-5xl font-bold mb-1">{stats.count}</p>
                    <p className="text-blue-100 text-xs">Scanned receipts</p>
                  </div>
                  <Tag className="opacity-20" size={64} />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl shadow-xl p-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium mb-2">Average</p>
                    <p className="text-5xl font-bold mb-1">${stats.count > 0 ? (stats.total / stats.count).toFixed(2) : '0.00'}</p>
                    <p className="text-orange-100 text-xs">Per receipt</p>
                  </div>
                  <TrendingUp className="opacity-20" size={64} />
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-indigo-100">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-xl">
                  <PieChart className="text-white" size={24} />
                </div>
                Spending by Category
              </h3>
              <div className="space-y-4">
                {Object.entries(stats.byCategory).length > 0 ? (
                  Object.entries(stats.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, amount]) => {
                      const percentage = (amount / stats.total) * 100;
                      return (
                        <div key={category} className="group">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{categoryIcons[category]}</span>
                              <span className="font-semibold text-gray-700">{category}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-800">${amount.toFixed(2)}</div>
                              <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                            <div className={`h-3 rounded-full ${colors[category]} transition-all duration-500 group-hover:shadow-lg`} style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <PieChart className="mx-auto mb-4 opacity-30" size={64} />
                    <p>No spending data yet. Scan receipts to see analytics!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl">
            <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors z-10">
              <X size={24} className="text-gray-800" />
            </button>
            <img src={previewImage} alt="Receipt preview" className="w-full h-full object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}

      {/* Edit Receipt Modal */}
      {editingReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Edit Receipt</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Merchant</label>
                <input type="text" value={editingReceipt.merchant} onChange={(e) => setEditingReceipt({...editingReceipt, merchant: e.target.value})} className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input type="date" value={editingReceipt.date} onChange={(e) => setEditingReceipt({...editingReceipt, date: e.target.value})} className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total</label>
                <input type="number" step="0.01" value={editingReceipt.total} onChange={(e) => setEditingReceipt({...editingReceipt, total: parseFloat(e.target.value)})} className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select value={editingReceipt.category} onChange={(e) => setEditingReceipt({...editingReceipt, category: e.target.value})} className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{categoryIcons[cat]} {cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => updateReceipt(editingReceipt.id, editingReceipt)} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2">
                <Check size={20} />
                Save Changes
              </button>
              <button onClick={() => setEditingReceipt(null)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;