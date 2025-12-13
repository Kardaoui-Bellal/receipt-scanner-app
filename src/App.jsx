import React, { useState, useEffect } from 'react';
import { Camera, Plus, Search, TrendingUp, Calendar, Receipt, X, Edit3, Trash2, DollarSign, Filter, ArrowUp, ArrowDown, BarChart3, PieChart } from 'lucide-react';
import Tesseract from 'tesseract.js';

const App = () => {
  const [receipts, setReceipts] = useState([]);
  const [view, setView] = useState('list');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedReceipt, setExpandedReceipt] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [editingReceipt, setEditingReceipt] = useState(null);

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Other'];
  
  const categoryColors = {
    Food: { bg: 'bg-green-500', text: 'text-green-500', light: 'bg-green-50', hex: '#10B981' },
    Transport: { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-50', hex: '#3B82F6' },
    Shopping: { bg: 'bg-purple-500', text: 'text-purple-500', light: 'bg-purple-50', hex: '#8B5CF6' },
    Bills: { bg: 'bg-orange-500', text: 'text-orange-500', light: 'bg-orange-50', hex: '#F59E0B' },
    Other: { bg: 'bg-pink-500', text: 'text-pink-500', light: 'bg-pink-50', hex: '#EC4899' }
  };

  const categoryIcons = {
    Food: '🍔',
    Transport: '🚗',
    Shopping: '🛍️',
    Bills: '💡',
    Other: '📦'
  };

  const merchantCategories = {
    'walmart': 'Food', 'target': 'Food', 'kroger': 'Food', 'carrefour': 'Food',
    'mcdonald': 'Food', 'starbucks': 'Food',
    'uber': 'Transport', 'lyft': 'Transport', 'gas': 'Transport',
    'amazon': 'Shopping', 'ikea': 'Shopping',
    'electric': 'Bills', 'water': 'Bills'
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = () => {
    try {
      const data = localStorage.getItem('receipts');
      if (data) setReceipts(JSON.parse(data));
    } catch (error) {
      console.log('No receipts found');
    }
  };

  const saveReceipts = (newReceipts) => {
    localStorage.setItem('receipts', JSON.stringify(newReceipts));
    setReceipts(newReceipts);
  };

  const categorizeByMerchant = (merchantName) => {
    const lowerMerchant = merchantName.toLowerCase();
    for (const [keyword, category] of Object.entries(merchantCategories)) {
      if (lowerMerchant.includes(keyword)) return category;
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

      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setScanProgress(Math.round(m.progress * 100));
          }
        }
      });

      const text = result.data.text;
      const lines = text.split('\n').map(l => l.trim()).filter(line => line.length > 2);
      
      let merchant = 'Unknown Store';
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i].trim();
        if (line.length > 3 && line.length < 50) {
          merchant = line;
          break;
        }
      }

      let date = new Date().toISOString().split('T')[0];
      let total = 0;
      const amountRegex = /\$?\s*(\d+[,.]?\d*\.?\d{2})/g;
      const singleAmountRegex = /\$?\s*(\d+(?:[,.]\d{2})?)/;

      // Extract probable line items: name + price on line
      const items = [];
      lines.forEach(line => {
        // skip lines that look like totals or headers
        const lower = line.toLowerCase();
        const isTotaly = lower.includes('total') || lower.includes('subtotal') || lower.includes('tax');
        if (isTotaly) return;
        const m = line.match(singleAmountRegex);
        if (m) {
          const price = parseFloat(m[1].replace(/[,$]/g, ''));
          if (!isNaN(price) && price > 0) {
            // name is line without price token
            const name = line.replace(m[0], '').replace(/\s{2,}/g, ' ').trim();
            if (name && name.length > 1 && name.length < 50) {
              items.push({ name, price });
            }
          }
        }
      });
      
      for (const line of lines) {
        if (line.toLowerCase().includes('total')) {
          const amounts = [...line.matchAll(amountRegex)];
          if (amounts.length > 0) {
            total = parseFloat(amounts[amounts.length - 1][1].replace(/[,$]/g, ''));
            break;
          }
        }
      }

      if (total === 0) {
        const allAmounts = [];
        lines.forEach(line => {
          [...line.matchAll(amountRegex)].forEach(match => {
            const amount = parseFloat(match[1].replace(/[,$]/g, ''));
            if (!isNaN(amount) && amount > 0) allAmounts.push(amount);
          });
        });
        if (allAmounts.length > 0) total = Math.max(...allAmounts);
      }

      const category = categorizeByMerchant(merchant);
      const itemCount = Math.floor(Math.random() * 90000) + 10000;

      const newReceipt = {
        id: Date.now(),
        merchant,
        date,
        total: total || 0,
        category,
        image: base64Image,
        itemCount,
        items,
        addedDate: new Date().toISOString()
      };

      saveReceipts([newReceipt, ...receipts]);
      setView('list');
    } catch (error) {
      alert('Error processing receipt');
    } finally {
      setScanning(false);
      setScanProgress(0);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) processReceipt(file);
  };

  const deleteReceipt = (id) => {
    if (window.confirm('Delete this receipt?')) {
      saveReceipts(receipts.filter(r => r.id !== id));
      setExpandedReceipt(null);
    }
  };

  const updateReceipt = (id, updates) => {
    saveReceipts(receipts.map(r => r.id === id ? { ...r, ...updates } : r));
    setEditingReceipt(null);
  };

  const getFilteredReceipts = () => {
    return receipts.filter(receipt => {
      const matchesSearch = !searchTerm || receipt.merchant.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  };

  const getFilteredItems = () => {
    const items = [];
    receipts.forEach(receipt => {
      if (selectedCategory === 'all' || receipt.category === selectedCategory) {
        if (Array.isArray(receipt.items)) {
          receipt.items.forEach(item => {
            items.push({ ...item, category: receipt.category, merchantName: receipt.merchant });
          });
        }
      }
    });
    return items;
  };

  const getStats = () => {
    const total = receipts.reduce((sum, r) => sum + r.total, 0);
    const byCategory = {};
    categories.forEach(cat => byCategory[cat] = 0);
    receipts.forEach(r => {
      byCategory[r.category] = (byCategory[r.category] || 0) + r.total;
    });
    
    const last30 = receipts.filter(r => (new Date() - new Date(r.date)) / (1000 * 60 * 60 * 24) <= 30);
    const last30Total = last30.reduce((sum, r) => sum + r.total, 0);
    const prev30 = receipts.filter(r => {
      const diff = (new Date() - new Date(r.date)) / (1000 * 60 * 60 * 24);
      return diff > 30 && diff <= 60;
    });
    const prev30Total = prev30.reduce((sum, r) => sum + r.total, 0);
    const percentChange = prev30Total > 0 ? ((last30Total - prev30Total) / prev30Total) * 100 : 5.4;
    
    return { total, byCategory, count: receipts.length, percentChange };
  };

  const stats = getStats();
  const filteredReceipts = getFilteredReceipts();
  const filteredItems = getFilteredItems();

  const getItemStats = () => {
    const byCategory = {};
    categories.forEach(cat => byCategory[cat] = []);
    filteredItems.forEach(item => {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    });
    const topItems = filteredItems.sort((a, b) => b.price - a.price).slice(0, 15);
    const totalSpentOnItems = filteredItems.reduce((sum, i) => sum + i.price, 0);
    return { byCategory, topItems, totalSpentOnItems, itemCount: filteredItems.length };
  };
  const itemStats = getItemStats();

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto pb-24 px-4">
        {/* Header */}
        <div className="bg-white px-0 py-4 sticky top-0 z-10 shadow-lg border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-gray-900">
              {view === 'list' ? 'Receipts' : 'Analytics'}
            </h1>
            {view === 'list' && (
              <label aria-label="Add receipt" className="cursor-pointer bg-gradient-to-r from-purple-500 to-pink-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:shadow-lg transition-all">
                <Plus size={24} strokeWidth={3} />
                <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" disabled={scanning} />
              </label>
            )}
          </div>
          
          {view === 'list' && (
            <div className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 pill-input"
                />
              </div>
              <div className="filter-pills">
                <button className={`pill ${selectedCategory === 'all' ? 'pill-active' : ''}`} onClick={() => setSelectedCategory('all')}>All</button>
                {categories.map(cat => (
                  <button key={cat} className={`pill ${selectedCategory === cat ? 'pill-active' : ''}`} onClick={() => setSelectedCategory(cat)}>{cat}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-0">
          {view === 'list' && (
            <div className="space-y-4 mt-6">
              {scanning && (
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-6 shadow-xl text-white">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
                    <div>
                      <p className="font-bold">✨ AI Processing...</p>
                      <p className="text-sm opacity-90">{scanProgress}% complete</p>
                    </div>
                  </div>
                  <div className="w-full bg-white/30 rounded-full h-3">
                    <div className="bg-white h-3 rounded-full transition-all shadow-lg" style={{ width: `${scanProgress}%` }}></div>
                  </div>
                </div>
              )}

              {filteredReceipts.map(receipt => (
                <div key={receipt.id} className="tile overflow-hidden">
                  <div className="tile-body flex gap-4">
                    {/* Smaller Thumbnail */}
                    <div 
                      className="flex-shrink-0 w-20 h-28 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-md"
                      onClick={() => setPreviewImage(receipt.image)}
                    >
                      <img src={receipt.image} alt="Receipt" className="w-full h-full object-cover" style={{ maxWidth: '80px', maxHeight: '112px', objectFit: 'cover' }} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-black text-gray-900 truncate">{receipt.merchant}</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-2">
                            <Calendar size={14} />
                            {new Date(receipt.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingReceipt(receipt)} className="p-2 hover:bg-purple-50 rounded-xl transition-colors">
                            <Edit3 size={16} className="text-purple-500" strokeWidth={2} />
                          </button>
                          <button onClick={() => deleteReceipt(receipt.id)} className="p-2 hover:bg-red-50 rounded-xl transition-colors">
                            <Trash2 size={16} className="text-red-500" strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-2xl font-extrabold text-gray-900 mb-3">
                        ${receipt.total.toFixed(2)}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <span className={`badge ${categoryColors[receipt.category].light} ${categoryColors[receipt.category].text.replace('text-', 'text-')} border`}>
                          <span>{categoryIcons[receipt.category]}</span>
                          <span className="font-bold">{receipt.category}</span>
                        </span>
                        <span className="text-xs text-gray-500 font-semibold">{receipt.itemCount?.toLocaleString()}</span>
                        {Array.isArray(receipt.items) && receipt.items.length > 0 && (
                          <button onClick={() => setExpandedReceipt(expandedReceipt === receipt.id ? null : receipt.id)} className="text-xs font-bold text-gray-500 underline ml-auto">
                            {expandedReceipt === receipt.id ? 'Hide items' : 'View items'}
                          </button>
                        )}
                      </div>
                      {expandedReceipt === receipt.id && Array.isArray(receipt.items) && receipt.items.length > 0 && (
                        <div className="list-bordered mt-2">
                          {receipt.items.slice(0, 6).map((it, idx) => (
                            <div key={idx} className="list-item">
                              <span className="text-sm font-medium text-gray-700 truncate">{it.name}</span>
                              <span className="text-sm font-bold text-gray-900">${Number(it.price).toFixed(2)}</span>
                            </div>
                          ))}
                          {receipt.items.length > 6 && (
                            <div className="px-4 py-2 text-xs text-gray-500">+ {receipt.items.length - 6} more</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredReceipts.length === 0 && !scanning && (
                <div className="py-16">
                  <div className="soft-card p-8 text-center">
                    <div className="w-28 h-28 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Receipt size={52} className="text-purple-500" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-3xl font-black headline-gradient mb-2">ReceiptScan</h2>
                    <p className="text-gray-500 font-semibold mb-8">Scan, Save & Track Your Expenses</p>
                    <label className="inline-block cursor-pointer bg-gradient-to-r from-purple-500 to-pink-500 text-white px-10 py-4 rounded-2xl font-bold hover:shadow-xl transition-all">
                      Get Started
                      <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <p className="text-sm text-gray-400 mt-4">Already have receipts? Add one to begin.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'analytics' && (
            <div className="space-y-6 mt-6">
              {/* KPI Tiles */}
              <div className="grid grid-cols-4 gap-3">
                <div className="kpi">
                  <span className="text-xs font-bold text-gray-500">Items</span>
                  <span className="text-2xl font-black text-gray-900">{itemStats.itemCount}</span>
                </div>
                <div className="kpi">
                  <span className="text-xs font-bold text-gray-500">Spent</span>
                  <span className="text-2xl font-black text-gray-900">${itemStats.totalSpentOnItems.toFixed(2)}</span>
                </div>
                <div className="kpi">
                  <span className="text-xs font-bold text-gray-500">Avg/Item</span>
                  <span className="text-2xl font-black text-gray-900">${itemStats.itemCount > 0 ? (itemStats.totalSpentOnItems / itemStats.itemCount).toFixed(2) : '0.00'}</span>
                </div>
                <div className="kpi">
                  <span className="text-xs font-bold text-gray-500">Receipts</span>
                  <span className="text-2xl font-black text-gray-900">{stats.count}</span>
                </div>
              </div>

              {/* Top Items Chart */}
              <div className="tile">
                <div className="tile-header">
                  <h3 className="section-title">Top Items</h3>
                </div>
                <div className="tile-body">
                  {itemStats.topItems.length > 0 ? (
                    <div className="list-bordered">
                      {itemStats.topItems.map((item, idx) => {
                        const maxPrice = itemStats.topItems[0].price;
                        const percentage = maxPrice > 0 ? (item.price / maxPrice) * 100 : 0;
                        return (
                          <div key={idx} className="list-item">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                              <p className="text-xs text-gray-500">{item.merchantName}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                              </div>
                              <span className="text-sm font-bold text-gray-900 w-16 text-right">${item.price.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">No items to display</p>
                  )}
                </div>
              </div>

              {/* Category Distribution */}
              <div className="tile">
                <div className="tile-header">
                  <h3 className="section-title">By Category</h3>
                </div>
                <div className="tile-body">
                  {Object.entries(itemStats.byCategory).some(([_, items]) => items.length > 0) ? (
                    <div className="list-bordered">
                      {Object.entries(itemStats.byCategory)
                        .filter(([_, items]) => items.length > 0)
                        .sort((a, b) => b[1].length - a[1].length)
                        .map(([category, items]) => {
                          const categoryTotal = items.reduce((sum, i) => sum + i.price, 0);
                          const percentage = itemStats.totalSpentOnItems > 0 ? (categoryTotal / itemStats.totalSpentOnItems) * 100 : 0;
                          return (
                            <div key={category} className="list-item">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">{category}</p>
                                <p className="text-xs text-gray-500">{items.length} items</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div className={`h-2 rounded-full ${categoryColors[category].bg}`} style={{ width: `${percentage}%` }}></div>
                                </div>
                                <span className="text-sm font-bold text-gray-900 w-20 text-right">${categoryTotal.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">No data</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 blur-nav">
          <div className="max-w-5xl mx-auto px-4 py-3 flex justify-around">
            <button onClick={() => setView('list')} className={`flex flex-col items-center gap-1 py-2 ${view === 'list' ? 'text-purple-500' : 'text-gray-400'}`}>
              <Receipt size={26} strokeWidth={2.5} />
              <span className="text-xs font-black">Receipts</span>
            </button>
            <button onClick={() => setView('analytics')} className={`flex flex-col items-center gap-1 py-2 ${view === 'analytics' ? 'text-purple-500' : 'text-gray-400'}`}>
              <TrendingUp size={26} strokeWidth={2.5} />
              <span className="text-xs font-black">Analytics</span>
            </button>
          </div>
        </div>

        {/* Preview Modal */}
        {previewImage && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
            <div className="relative w-full max-w-2xl">
              <button onClick={() => setPreviewImage(null)} aria-label="Close preview" className="absolute -top-14 right-0 text-white bg-white/10 hover:bg-white/20 rounded-full p-3 focus:ring-2 focus:ring-white/50">
                <X size={28} strokeWidth={2.5} />
              </button>
              <img src={previewImage} alt="Receipt" className="w-full h-auto max-h-[85vh] object-contain rounded-2xl" onClick={(e) => e.stopPropagation()} />
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingReceipt && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">Edit Receipt</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="merchant">Merchant</label>
                  <input
                    id="merchant"
                    type="text"
                    value={editingReceipt.merchant}
                    onChange={(e) => setEditingReceipt({ ...editingReceipt, merchant: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="amount">Amount</label>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={editingReceipt.total}
                    onChange={(e) => setEditingReceipt({ ...editingReceipt, total: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="category">Category</label>
                  <select
                    id="category"
                    value={editingReceipt.category}
                    onChange={(e) => setEditingReceipt({ ...editingReceipt, category: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{categoryIcons[cat]} {cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => updateReceipt(editingReceipt.id, editingReceipt)} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl font-bold hover:shadow-xl transition-all focus:ring-2 focus:ring-purple-300">
                  Save
                </button>
                <button onClick={() => setEditingReceipt(null)} className="flex-1 bg-gray-100 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all focus:ring-2 focus:ring-gray-300">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;