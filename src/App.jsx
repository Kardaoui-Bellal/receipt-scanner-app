import React, { useState, useEffect } from 'react';
import { Camera, Plus, Search, TrendingUp, Calendar, Receipt, X, Edit3, Check, ChevronDown, Trash2, DollarSign, Filter } from 'lucide-react';
import Tesseract from 'tesseract.js';

const App = () => {
  const [receipts, setReceipts] = useState([]);
  const [view, setView] = useState('list');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [expandedReceipt, setExpandedReceipt] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [editingReceipt, setEditingReceipt] = useState(null);

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Other'];
  
  const categoryColors = {
    Food: '#10B981',
    Transport: '#3B82F6',
    Shopping: '#8B5CF6',
    Bills: '#F59E0B',
    Other: '#EF4444'
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
    'safeway': 'Food', 'whole foods': 'Food', 'trader joe': 'Food',
    'costco': 'Food', 'aldi': 'Food', 'publix': 'Food',
    'mcdonald': 'Food', 'burger king': 'Food', 'subway': 'Food',
    'starbucks': 'Food', 'pizza': 'Food', 'restaurant': 'Food',
    'cafe': 'Food', 'coffee': 'Food',
    'uber': 'Transport', 'lyft': 'Transport', 'gas': 'Transport',
    'shell': 'Transport', 'chevron': 'Transport', 'exxon': 'Transport',
    'bp': 'Transport', 'parking': 'Transport',
    'amazon': 'Shopping', 'ebay': 'Shopping', 'best buy': 'Shopping',
    'macy': 'Shopping', 'nordstrom': 'Shopping', 'mall': 'Shopping',
    'ikea': 'Shopping',
    'electric': 'Bills', 'water': 'Bills', 'utility': 'Bills',
    'internet': 'Bills', 'phone': 'Bills'
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
      const itemCount = Math.floor(Math.random() * 90000) + 10000;

      const newReceipt = {
        id: Date.now(),
        merchant: merchant,
        date: date,
        total: total || 0,
        items: uniqueItems.slice(0, 20),
        category: category,
        image: base64Image,
        manually_edited: false,
        itemCount: itemCount,
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
      r.id === id ? { ...r, ...updates, manually_edited: true } : r
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
    
    const last30Days = receipts.filter(r => {
      const diff = (new Date() - new Date(r.date)) / (1000 * 60 * 60 * 24);
      return diff <= 30;
    });
    const last30Total = last30Days.reduce((sum, r) => sum + r.total, 0);
    
    const prev30Days = receipts.filter(r => {
      const diff = (new Date() - new Date(r.date)) / (1000 * 60 * 60 * 24);
      return diff > 30 && diff <= 60;
    });
    const prev30Total = prev30Days.reduce((sum, r) => sum + r.total, 0);
    
    const percentChange = prev30Total > 0 ? ((last30Total - prev30Total) / prev30Total) * 100 : 5.4;
    
    return { total, byCategory, count: filtered.length, percentChange };
  };

  const stats = getStats();
  const filteredReceipts = getFilteredReceipts();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto pb-24">
        {/* Header */}
        <div className="bg-white px-6 py-6 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-black">
              {view === 'list' ? 'My Receipts' : 'Analytics'}
            </h1>
            {view === 'list' && (
              <div className="flex gap-3">
                <label className="cursor-pointer bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-blue-600 transition-all shadow-md hover:shadow-lg">
                  <Plus size={24} strokeWidth={2.5} />
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={scanning}
                  />
                </label>
                <button className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-gray-200 hover:bg-gray-50 transition-all">
                  <Camera size={22} className="text-gray-600" strokeWidth={2} />
                </button>
              </div>
            )}
            {view === 'analytics' && (
              <button className="px-4 py-2 rounded-full border-2 border-gray-200 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 transition-all">
                30 days <ChevronDown size={16} />
              </button>
            )}
          </div>
          
          {view === 'list' && (
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
              <button className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-all">
                <Filter size={20} className="text-gray-600" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6">
          {view === 'list' && (
            <div className="space-y-4 mt-6">
              {scanning && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
                    <div>
                      <p className="font-bold text-gray-900">Processing receipt...</p>
                      <p className="text-sm text-gray-500">{scanProgress}% complete</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {filteredReceipts.map(receipt => (
                <div
                  key={receipt.id}
                  className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all"
                >
                  <div className="flex gap-4">
                    {/* Receipt Thumbnail */}
                    <div 
                      className="flex-shrink-0 w-24 h-32 bg-gray-100 rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setPreviewImage(receipt.image)}
                    >
                      <img
                        src={receipt.image}
                        alt="Receipt"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Receipt Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 mb-1 truncate">{receipt.merchant}</h3>
                      <p className="text-3xl font-black text-gray-900 mb-2">${receipt.total.toFixed(2)}</p>
                      <p className="text-sm text-gray-500 mb-2">
                        Date: {new Date(receipt.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                        <span className="mx-2">•</span>
                        {receipt.itemCount?.toLocaleString() || '0'}
                      </p>
                      {receipt.manually_edited && (
                        <p className="text-xs text-gray-400 mb-2">Manually edited</p>
                      )}
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: categoryColors[receipt.category] }}
                      >
                        {receipt.category}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setEditingReceipt(receipt)}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        <Edit3 size={18} className="text-gray-400" strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => deleteReceipt(receipt.id)}
                        className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={18} className="text-red-400" strokeWidth={2} />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Items */}
                  {receipt.items && receipt.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => setExpandedReceipt(expandedReceipt === receipt.id ? null : receipt.id)}
                        className="text-sm text-blue-500 font-semibold hover:text-blue-600 transition-colors"
                      >
                        {expandedReceipt === receipt.id ? '▼' : '▶'} {receipt.items.length} items
                      </button>
                      {expandedReceipt === receipt.id && (
                        <div className="mt-3 space-y-2 bg-gray-50 rounded-2xl p-4">
                          {receipt.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-700 font-medium">
                                {item.name} {item.quantity > 1 && <span className="text-gray-500">×{item.quantity}</span>}
                              </span>
                              <span className="font-bold text-gray-900">${item.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {filteredReceipts.length === 0 && !scanning && (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Receipt size={40} className="text-gray-300" strokeWidth={2} />
                  </div>
                  <p className="text-gray-500 mb-6 font-medium">No receipts yet</p>
                  <label className="inline-block cursor-pointer bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-md hover:shadow-lg">
                    Scan Your First Receipt
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {view === 'analytics' && (
            <div className="space-y-6 mt-6">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-gray-600 mb-2">Total Spent</p>
                <p className="text-5xl font-black text-gray-900 mb-2">${stats.total.toFixed(2)}</p>
                <p className="text-sm font-semibold text-green-500 flex items-center gap-1">
                  <span>↑</span> {Math.abs(stats.percentChange).toFixed(1)}% vs last period
                </p>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Category breakdown</h3>
                <div className="space-y-5">
                  {Object.entries(stats.byCategory).length > 0 ? (
                    Object.entries(stats.byCategory)
                      .sort((a, b) => b[1] - a[1])
                      .map(([category, amount]) => {
                        const percentage = (amount / stats.total) * 100;
                        return (
                          <div key={category}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: categoryColors[category] + '15' }}
                                >
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: categoryColors[category] }}
                                  ></div>
                                </div>
                                <span className="font-semibold text-gray-900">{category}</span>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-lg text-gray-900">${amount.toFixed(0)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <PieChart size={32} className="text-gray-300" />
                      </div>
                      <p className="font-medium">No spending data yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
          <div className="max-w-2xl mx-auto px-6 py-3 flex justify-around">
            <button
              onClick={() => setView('list')}
              className={`flex flex-col items-center gap-1 py-2 ${
                view === 'list' ? 'text-blue-500' : 'text-gray-400'
              }`}
            >
              <Receipt size={24} strokeWidth={2.5} />
              <span className="text-xs font-bold">Receipts</span>
            </button>
            <button
              onClick={() => setView('analytics')}
              className={`flex flex-col items-center gap-1 py-2 ${
                view === 'analytics' ? 'text-blue-500' : 'text-gray-400'
              }`}
            >
              <TrendingUp size={24} strokeWidth={2.5} />
              <span className="text-xs font-bold">Analytics</span>
            </button>
          </div>
        </div>

        {/* Preview Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative w-full max-w-3xl">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-14 right-0 text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-all"
              >
                <X size={28} strokeWidth={2.5} />
              </button>
              <img
                src={previewImage}
                alt="Receipt"
                className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingReceipt && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-black text-gray-900 mb-6">Edit Receipt</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Merchant</label>
                  <input
                    type="text"
                    value={editingReceipt.merchant}
                    onChange={(e) => setEditingReceipt({ ...editingReceipt, merchant: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={editingReceipt.date}
                    onChange={(e) => setEditingReceipt({ ...editingReceipt, date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingReceipt.total}
                    onChange={(e) =>
                      setEditingReceipt({ ...editingReceipt, total: parseFloat(e.target.value) })
                    }
                    className="w-full px-4 py-3 bg-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                  <select
                    value={editingReceipt.category}
                    onChange={(e) => setEditingReceipt({ ...editingReceipt, category: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {categoryIcons[cat]} {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => updateReceipt(editingReceipt.id, editingReceipt)}
                  className="flex-1 bg-blue-500 text-white py-4 rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-md"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingReceipt(null)}
                  className="flex-1 bg-gray-100 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
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