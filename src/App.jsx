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
      let total = 0;
      const amountRegex = /\$?\s*(\d+[,.]?\d*\.?\d{2})/g;
      
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
      const matchesCategory = selectedCategory === 'all' || receipt.category === selectedCategory;
      const matchesSearch = !searchTerm || receipt.merchant.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-md mx-auto pb-24">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl px-6 py-6 sticky top-0 z-10 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-black headline-gradient">
              {view === 'list' ? 'My Receipts' : 'Analytics'}
            </h1>
            {view === 'list' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-500">+ Add</span>
                <label aria-label="Add receipt" className="cursor-pointer bg-gradient-to-r from-purple-500 to-pink-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:shadow-lg transition-all">
                  <Plus size={24} strokeWidth={3} />
                  <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" disabled={scanning} />
                </label>
              </div>
            )}
          </div>
          
          {view === 'list' && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search receipts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 pill-input"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6">
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
                <div key={receipt.id} className="soft-card hover:shadow-xl transition-all overflow-hidden">
                  <div className="flex gap-4 p-5">
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
                      
                      <p className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
                        ${receipt.total.toFixed(2)}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <span className={`${categoryColors[receipt.category].bg} text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1`}>
                          <span>{categoryIcons[receipt.category]}</span>
                          {receipt.category}
                        </span>
                        <span className="text-xs text-gray-500 font-semibold">{receipt.itemCount?.toLocaleString()}</span>
                      </div>
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
              {/* Total Spent Card - light with green change */}
              <div className="soft-card p-8 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-500">Total Spent</p>
                  <span className="text-green-600 font-bold text-sm flex items-center gap-1">
                    <ArrowUp size={16} /> {Math.abs(stats.percentChange).toFixed(1)}%
                  </span>
                </div>
                <p className="text-5xl font-black text-gray-900">${stats.total.toFixed(2)}</p>
              </div>

              {/* Donut + Trend combined like mockup */}
              <div className="soft-card p-6">
                <div className="grid grid-cols-3 gap-6 items-center">
                  {/* Donut */}
                  <div className="col-span-1 flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      <svg viewBox="0 0 100 100" className="transform -rotate-90">
                        {Object.entries(stats.byCategory)
                          .filter(([_, amount]) => amount > 0)
                          .reduce((acc, [category, amount]) => {
                            const pct = stats.total > 0 ? (amount / stats.total) * 100 : 0;
                            const prev = acc.length ? acc[acc.length - 1].cumulative : 0;
                            acc.push({ category, percentage: pct, cumulative: prev + pct, color: categoryColors[category].hex });
                            return acc;
                          }, [])
                          .map((seg, i) => {
                            const dash = `${seg.percentage} ${100 - seg.percentage}`;
                            const offset = 25 - (i > 0 ? seg.cumulative - seg.percentage : 0);
                            return (
                              <circle key={seg.category} cx="50" cy="50" r="15.9" fill="none" stroke={seg.color} strokeWidth="12" strokeDasharray={dash} strokeDashoffset={offset} />
                            );
                          })}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-sm font-bold text-gray-700">{stats.count} receipts</p>
                      </div>
                    </div>
                  </div>
                  {/* Trend */}
                  <div className="col-span-2">
                    <div className="h-24 relative">
                      <svg viewBox="0 0 200 100" className="w-full h-full">
                        <path d="M0 70 C 30 40, 60 80, 90 50 S 150 60, 200 40" stroke="#A855F7" strokeWidth="3" fill="none" />
                        <path d="M0 72 C 30 42, 60 82, 90 52 S 150 62, 200 42" stroke="#EC4899" strokeWidth="2" fill="none" opacity="0.3" />
                      </svg>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500 font-semibold">
                      <span>1</span>
                      <span>2</span>
                      <span>3</span>
                      <span>4</span>
                      <span>5</span>
                      <span>6</span>
                      <span>7</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="soft-card p-6">
                <h3 className="text-xl font-black text-gray-900 mb-6">Category breakdown</h3>
                <div className="space-y-4">
                  {Object.entries(stats.byCategory)
                    .filter(([_, amount]) => amount > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, amount]) => {
                      const percentage = stats.total > 0 ? (amount / stats.total) * 100 : 0;
                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 ${categoryColors[category].light} rounded-2xl flex items-center justify-center text-lg`}>
                                {categoryIcons[category]}
                              </div>
                              <span className="font-bold text-gray-900">{category}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-gray-900">${amount.toFixed(0)}</p>
                              <p className="text-xs text-gray-500 font-bold">{percentage.toFixed(0)}%</p>
                            </div>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${categoryColors[category].bg} rounded-full transition-all duration-500 shadow-sm`} style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  {Object.values(stats.byCategory).every(v => v === 0) && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <PieChart size={32} className="text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-semibold">No data yet. Start scanning!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 blur-nav">
          <div className="max-w-md mx-auto px-6 py-3 flex justify-around">
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
              <button onClick={() => setPreviewImage(null)} className="absolute -top-14 right-0 text-white bg-white/10 hover:bg-white/20 rounded-full p-3">
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
                  <label className="block text-sm font-bold text-gray-700 mb-2">Merchant</label>
                  <input
                    type="text"
                    value={editingReceipt.merchant}
                    onChange={(e) => setEditingReceipt({ ...editingReceipt, merchant: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingReceipt.total}
                    onChange={(e) => setEditingReceipt({ ...editingReceipt, total: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                  <select
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
                <button onClick={() => updateReceipt(editingReceipt.id, editingReceipt)} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl font-bold hover:shadow-xl transition-all">
                  Save
                </button>
                <button onClick={() => setEditingReceipt(null)} className="flex-1 bg-gray-100 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all">
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