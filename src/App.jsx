import React, { useState, useEffect } from 'react';
import { Camera, Upload, Trash2, DollarSign, Calendar, Tag, TrendingUp, PieChart, Search, AlertCircle, Receipt, X, Edit3, Check, Sparkles, Zap, BarChart3 } from 'lucide-react';
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

  const categoryGradients = {
    Groceries: 'from-emerald-400 to-green-600',
    Transport: 'from-blue-400 to-indigo-600',
    Dining: 'from-orange-400 to-red-600',
    Shopping: 'from-purple-400 to-pink-600',
    Healthcare: 'from-red-400 to-pink-600',
    Entertainment: 'from-pink-400 to-purple-600',
    Utilities: 'from-yellow-400 to-orange-600',
    Other: 'from-gray-400 to-slate-600'
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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-fuchsia-50 to-cyan-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Premium Header with Glassmorphism */}
      <div className="relative bg-white/70 backdrop-blur-xl shadow-2xl border-b border-white/20 sticky top-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-fuchsia-500/5 to-cyan-500/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-violet-600 via-fuchsia-600 to-purple-600 p-4 rounded-2xl shadow-2xl transform hover:scale-110 transition-transform duration-300">
                  <Receipt className="text-white" size={32} />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                  Receipt Scanner
                  <Sparkles className="text-fuchsia-500 animate-pulse" size={24} />
                </h1>
                <p className="text-sm text-gray-600 font-semibold flex items-center gap-2">
                  <Zap className="text-yellow-500" size={14} />
                  AI-Powered Expense Tracking
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Total Balance</div>
              <div className="text-4xl font-black bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 bg-clip-text text-transparent mb-1">
                ${stats.total.toFixed(2)}
              </div>
              <div className="text-xs text-gray-600 font-semibold flex items-center justify-end gap-1">
                <BarChart3 size={12} />
                {stats.count} receipts tracked
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Floating Navigation with Neon Effects */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-2 flex gap-3 border-2 border-white/50 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-purple-500/10"></div>
          <button
            onClick={() => setView('scan')}
            className={`relative flex-1 py-5 px-8 rounded-2xl font-bold text-lg transition-all duration-500 transform ${
              view === 'scan' 
                ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 text-white shadow-2xl scale-105 shadow-fuchsia-500/50' 
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-violet-50 hover:to-fuchsia-50 hover:scale-102'
            }`}
          >
            <Camera className="inline mr-3" size={24} />
            <span className="hidden sm:inline">Scan Receipt</span>
            <span className="sm:hidden">Scan</span>
            {view === 'scan' && (
              <div className="absolute inset-0 rounded-2xl animate-pulse bg-gradient-to-r from-violet-400/20 to-fuchsia-400/20"></div>
            )}
          </button>
          <button
            onClick={() => setView('list')}
            className={`relative flex-1 py-5 px-8 rounded-2xl font-bold text-lg transition-all duration-500 transform ${
              view === 'list' 
                ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 text-white shadow-2xl scale-105 shadow-fuchsia-500/50' 
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-violet-50 hover:to-fuchsia-50 hover:scale-102'
            }`}
          >
            <Tag className="inline mr-3" size={24} />
            <span className="hidden sm:inline">My Receipts</span>
            <span className="sm:hidden">List</span>
            {view === 'list' && (
              <div className="absolute inset-0 rounded-2xl animate-pulse bg-gradient-to-r from-violet-400/20 to-fuchsia-400/20"></div>
            )}
          </button>
          <button
            onClick={() => setView('analytics')}
            className={`relative flex-1 py-5 px-8 rounded-2xl font-bold text-lg transition-all duration-500 transform ${
              view === 'analytics' 
                ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 text-white shadow-2xl scale-105 shadow-fuchsia-500/50' 
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-violet-50 hover:to-fuchsia-50 hover:scale-102'
            }`}
          >
            <TrendingUp className="inline mr-3" size={24} />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Stats</span>
            {view === 'analytics' && (
              <div className="absolute inset-0 rounded-2xl animate-pulse bg-gradient-to-r from-violet-400/20 to-fuchsia-400/20"></div>
            )}
          </button>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Scan View - Premium Design */}
        {view === 'scan' && (
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-10 sm:p-16 border-2 border-white/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-purple-500/5"></div>
              <div className="relative">
                <div className="text-center mb-10">
                  <div className="relative inline-block mb-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full blur-3xl opacity-40 animate-pulse"></div>
                    <div className="relative bg-gradient-to-br from-violet-100 to-fuchsia-100 p-8 rounded-full">
                      <Upload className="text-violet-600" size={96} />
                    </div>
                  </div>
                  <h2 className="text-4xl font-black text-gray-800 mb-3 flex items-center justify-center gap-3">
                    Scan Your Receipt
                    <Sparkles className="text-fuchsia-500 animate-bounce" size={32} />
                  </h2>
                  <p className="text-xl text-gray-600 font-semibold">Upload a photo and watch the AI magic happen ✨</p>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 border-2 border-indigo-200 rounded-3xl p-8 mb-10 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-indigo-500 to-violet-500 p-3 rounded-2xl shadow-lg">
                      <AlertCircle className="text-white" size={28} />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-gray-800 mb-4 text-lg">📸 Pro Tips for Perfect Scans:</p>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-gray-700 font-semibold">
                          <span className="w-2 h-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full animate-pulse"></span>
                          Bright, even lighting works best
                        </li>
                        <li className="flex items-center gap-3 text-gray-700 font-semibold">
                          <span className="w-2 h-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full animate-pulse animation-delay-100"></span>
                          Keep receipt flat and centered
                        </li>
                        <li className="flex items-center gap-3 text-gray-700 font-semibold">
                          <span className="w-2 h-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full animate-pulse animation-delay-200"></span>
                          Avoid shadows and glare
                        </li>
                        <li className="flex items-center gap-3 text-gray-700 font-semibold">
                          <span className="w-2 h-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full animate-pulse animation-delay-300"></span>
                          Ensure all text is clearly visible
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <label className="block cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={scanning}
                  />
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                    <div className="relative bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 text-white px-12 py-7 rounded-3xl font-black text-xl shadow-2xl hover:shadow-fuchsia-500/50 transition-all duration-300 flex items-center justify-center gap-4 group-hover:scale-105 transform">
                      {scanning ? (
                        <>
                          <div className="relative">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
                            <div className="absolute inset-0 animate-ping rounded-full h-8 w-8 border-4 border-white opacity-20"></div>
                          </div>
                          <span>Processing... {scanProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Camera size={28} />
                          <span>Take Photo / Upload</span>
                          <Sparkles className="animate-pulse" size={24} />
                        </>
                      )}
                    </div>
                  </div>
                </label>

                {scanning && (
                  <div className="mt-10">
                    <div className="relative w-full bg-gray-200 rounded-full h-5 overflow-hidden shadow-inner">
                      <div 
                        className="h-5 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 transition-all duration-300 rounded-full relative overflow-hidden shadow-lg"
                        style={{ width: `${scanProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                      </div>
                    </div>
                    <p className="text-center text-gray-700 mt-5 font-bold text-lg flex items-center justify-center gap-2">
                      <span className="inline-block animate-bounce">🤖</span>
                      AI is scanning your receipt...
                      <span className="inline-block animate-bounce animation-delay-200">✨</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* List View - Premium Cards */}
        {view === 'list' && (
          <div>
            {/* Premium Filters */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 mb-8 border-2 border-white/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-violet-600 transition-colors" size={22} />
                  <input
                    type="text"
                    placeholder="Search receipts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-5 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-semibold text-gray-700 hover:border-violet-300"
                  />
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-5 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 font-bold text-gray-700 transition-all hover:border-violet-300 cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{categoryIcons[cat]} {cat}</option>
                  ))}
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-5 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 font-bold text-gray-700 transition-all hover:border-violet-300 cursor-pointer"
                >
                  <option value="all">📅 All Time</option>
                  <option value="week">📆 Last 7 Days</option>
                  <option value="month">📊 This Month</option>
                </select>
              </div>
            </div>

            {/* Premium Receipt Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {getFilteredReceipts().map(receipt => (
                <div 
                  key={receipt.id} 
                  className="group relative bg-white/80 backdrop-blur-2xl rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 border-2 border-white/50 hover:-translate-y-2 hover:border-violet-300"
                >
                  <div className="absolute inset-0 bg-gradient-to br from-violet-500/5 via-fuchsia-500/5 to-purple-500/5"></div>
                  <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-black text-xl text-gray-800 mb-2">{receipt.merchant}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 font-semibold">
                      <Calendar size={16} className="text-violet-500" />
                      {new Date(receipt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <span className={`bg-gradient-to-r ${categoryGradients[receipt.category]} text-white text-xs px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 transform group-hover:scale-110 transition-transform`}>
                    <span className="text-base">{categoryIcons[receipt.category]}</span>
                    <span className="hidden sm:inline">{receipt.category}</span>
                  </span>
                </div>
                
                <div className="relative bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl p-6 mb-5 shadow-xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative text-center">
                    <div className="text-xs text-white/90 font-bold uppercase tracking-wider mb-2">Total Amount</div>
                    <div className="text-4xl font-black text-white drop-shadow-lg">
                      ${receipt.total.toFixed(2)}
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                </div>
                
                <div className="mb-5">
                  <button
                    onClick={() => setExpandedReceipt(expandedReceipt === receipt.id ? null : receipt.id)}
                    className="w-full text-left font-bold text-violet-600 hover:text-fuchsia-600 mb-3 flex items-center gap-3 transition-colors group"
                  >
                    <span className="transform transition-transform group-hover:scale-110">
                      {expandedReceipt === receipt.id ? '▼' : '▶'}
                    </span>
                    <span>{receipt.items.length} item{receipt.items.length !== 1 ? 's' : ''} purchased</span>
                  </button>
                  
                  {expandedReceipt === receipt.id && (
                    <div className="space-y-2 max-h-60 overflow-y-auto bg-gradient-to-br from-gray-50 to-violet-50 rounded-2xl p-4 shadow-inner">
                      {receipt.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm py-3 border-b border-gray-200 last:border-0 hover:bg-white/50 px-2 rounded-lg transition-colors">
                          <div className="flex-1">
                            <span className="text-gray-800 font-bold">{item.name}</span>
                            {item.quantity > 1 && (
                              <span className="text-violet-600 ml-2 text-xs font-bold">×{item.quantity}</span>
                            )}
                          </div>
                          <span className="font-black text-gray-800">${item.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingReceipt(receipt)}
                    className="flex-1 bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-600 py-3 rounded-2xl hover:from-violet-100 hover:to-fuchsia-100 transition-all font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <Edit3 size={18} />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteReceipt(receipt.id)}
                    className="flex-1 bg-gradient-to-r from-red-50 to-pink-50 text-red-600 py-3 rounded-2xl hover:from-red-100 hover:to-pink-100 transition-all font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {getFilteredReceipts().length === 0 && (
          <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-20 text-center border-2 border-white/50">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full blur-2xl opacity-30 animate-pulse"></div>
              <Receipt className="relative mx-auto text-gray-300" size={100} />
            </div>
            <h3 className="text-3xl font-black text-gray-800 mb-3">No receipts found</h3>
            <p className="text-gray-600 mb-8 text-lg font-semibold">Start tracking your expenses by scanning your first receipt!</p>
            <button
              onClick={() => setView('scan')}
              className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 text-white px-10 py-4 rounded-2xl font-black text-lg hover:shadow-2xl transition-all transform hover:scale-105 inline-flex items-center gap-3"
            >
              <Camera size={24} />
              Scan First Receipt
              <Sparkles size={20} />
            </button>
          </div>
        )}
      </div>
    )}

    {/* Analytics View - Premium Stats */}
    {view === 'analytics' && (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="relative group bg-gradient-to-br from-violet-500 via-fuchsia-600 to-purple-600 rounded-3xl shadow-2xl p-10 text-white overflow-hidden transform hover:scale-105 transition-all duration-300">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"></div>
            <div className="relative">
              <p className="text-white/90 text-sm font-bold uppercase tracking-wider mb-3">Total Spent</p>
              <p className="text-6xl font-black mb-2 drop-shadow-lg">${stats.total.toFixed(2)}</p>
              <p className="text-white/80 text-sm font-semibold">All time expenses</p>
            </div>
            <DollarSign className="absolute bottom-5 right-5 opacity-20" size={80} />
          </div>
          
          <div className="relative group bg-gradient-to-br from-blue-500 via-cyan-600 to-teal-600 rounded-3xl shadow-2xl p-10 text-white overflow-hidden transform hover:scale-105 transition-all duration-300">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"></div>
            <div className="relative">
              <p className="text-white/90 text-sm font-bold uppercase tracking-wider mb-3">Total Receipts</p>
              <p className="text-6xl font-black mb-2 drop-shadow-lg">{stats.count}</p>
              <p className="text-white/80 text-sm font-semibold">Scanned & tracked</p>
            </div>
            <Tag className="absolute bottom-5 right-5 opacity-20" size={80} />
          </div>
          
          <div className="relative group bg-gradient-to-br from-orange-500 via-pink-600 to-rose-600 rounded-3xl shadow-2xl p-10 text-white overflow-hidden transform hover:scale-105 transition-all duration-300">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"></div>
            <div className="relative">
              <p className="text-white/90 text-sm font-bold uppercase tracking-wider mb-3">Average Spend</p>
              <p className="text-6xl font-black mb-2 drop-shadow-lg">${stats.count > 0 ? (stats.total / stats.count).toFixed(2) : '0.00'}</p>
              <p className="text-white/80 text-sm font-semibold">Per receipt</p>
            </div>
            <TrendingUp className="absolute bottom-5 right-5 opacity-20" size={80} />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-10 border-2 border-white/50">
          <h3 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-4">
            <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 p-3 rounded-2xl shadow-lg">
              <PieChart className="text-white" size={28} />
            </div>
            Spending by Category
          </h3>
          <div className="space-y-6">
            {Object.entries(stats.byCategory).length > 0 ? (
              Object.entries(stats.byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => {
                  const percentage = (amount / stats.total) * 100;
                  return (
                    <div key={category} className="group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <span className="text-3xl transform group-hover:scale-125 transition-transform">{categoryIcons[category]}</span>
                          <span className="font-black text-gray-800 text-lg">{category}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-gray-800 text-xl">${amount.toFixed(2)}</div>
                          <div className="text-sm text-gray-600 font-bold">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                      <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                        <div className={`h-4 rounded-full bg-gradient-to-r ${categoryGradients[category]} transition-all duration-1000 group-hover:shadow-2xl relative overflow-hidden`} style={{ width: `${percentage}%` }}>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-16 text-gray-500">
                <PieChart className="mx-auto mb-6 opacity-20" size={80} />
                <p className="font-bold text-lg">No spending data yet</p>
                <p className="text-sm">Scan receipts to see your analytics!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </div>

  {/* Image Preview Modal - Premium */}
  {previewImage && (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-fadeIn" onClick={() => setPreviewImage(null)}>
      <div className="relative max-w-5xl max-h-[95vh] bg-white rounded-3xl overflow-hidden shadow-2xl">
        <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-all z-10 shadow-xl transform hover:scale-110">
          <X size={28} className="text-gray-800" />
        </button>
        <img src={previewImage} alt="Receipt preview" className="w-full h-full object-contain" onClick={(e) => e.stopPropagation()} />
      </div>
    </div>
  )}

  {/* Edit Receipt Modal - Premium */}
  {editingReceipt && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-fadeIn">
      <div className="relative bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border-2 border-white/50" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-3xl font-black mb-8 text-gray-800 flex items-center gap-3">
          <Edit3 className="text-violet-600" size={32} />
          Edit Receipt
        </h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Merchant Name</label>
            <input type="text" value={editingReceipt.merchant} onChange={(e) => setEditingReceipt({...editingReceipt, merchant: e.target.value})} className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 font-semibold transition-all" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Date</label>
            <input type="date" value={editingReceipt.date} onChange={(e) => setEditingReceipt({...editingReceipt, date: e.target.value})} className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 font-semibold transition-all" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Total Amount</label>
            <input type="number" step="0.01" value={editingReceipt.total} onChange={(e) => setEditingReceipt({...editingReceipt, total: parseFloat(e.target.value)})} className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 font-semibold transition-all" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Category</label>
            <select value={editingReceipt.category} onChange={(e) => setEditingReceipt({...editingReceipt, category: e.target.value})} className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 font-bold transition-all cursor-pointer">
              {categories.map(cat => (
                <option key={cat} value={cat}>{categoryIcons[cat]} {cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button onClick={() => updateReceipt(editingReceipt.id, editingReceipt)} className="flex-1 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 text-white py-4 rounded-2xl font-black hover:shadow-2xl transition-all flex items-center justify-center gap-3 transform hover:scale-105">
            <Check size={22} />
            Save Changes
          </button>
          <button onClick={() => setEditingReceipt(null)} className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )}

  <style jsx>{`
    @keyframes blob {
      0%, 100% { transform: translate(0, 0) scale(1); }
      25% { transform: translate(20px, -50px) scale(1.1); }
      50% { transform: translate(-20px, 20px) scale(0.9); }
      75% { transform: translate(50px, 50px) scale(1.05); }
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .animate-blob {
      animation: blob 7s infinite;
    }
    .animation-delay-2000 {
      animation-delay: 2s;
    }
    .animation-delay-4000 {
      animation-delay: 4s;
    }
    .animation-delay-100 {
      animation-delay: 0.1s;
    }
    .animation-delay-200 {
      animation-delay: 0.2s;
    }
    .animation-delay-300 {
      animation-delay: 0.3s;
    }
    .animate-shimmer {
      animation: shimmer 2s infinite;
    }
  `}</style>
</div>
);
}

export default App;