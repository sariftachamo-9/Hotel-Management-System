import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Product } from '../types';
import { Check, X, Edit2, Save, Trash2, Upload } from 'lucide-react';

export default function AdminDashboard() {
  const { currentUser, users, products, inquiries, appOffer, updateAppOffer, approveProduct, rejectProduct, updateProduct } = useAppContext();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'users' | 'inquiries' | 'offer'>('pending');
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  
  // Offer form state
  const [offerForm, setOfferForm] = useState(appOffer);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600 mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  const pendingProducts = products.filter(p => p.status === 'pending');
  const approvedProducts = products.filter(p => p.status === 'approved');

  const startEdit = (product: Product) => {
    setEditingProduct(product.id);
    setEditForm(product);
  };

  const saveEdit = () => {
    if (editingProduct && editForm) {
      updateProduct(editingProduct, editForm);
      setEditingProduct(null);
      setEditForm({});
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <button 
          onClick={() => {
            if ('Notification' in window && Notification.permission === 'granted') {
              const notif = new Notification('Second Hand Market Offer', {
                body: "🔥 Flash Sale! 50% off on Electronics for the next hour!",
                icon: '/favicon.ico'
              });
              notif.onclick = function() {
                window.focus();
                this.close();
              };
              alert('Push notification sent to all subscribed users!');
            } else {
              alert('Please enable push notifications in your browser first.');
            }
          }}
          className="bg-[#f85606] text-white px-4 py-2 rounded font-bold hover:bg-[#d04805] transition-colors text-sm"
        >
          Send Offer Notification
        </button>
      </div>

      <div className="flex overflow-x-auto border-b border-gray-200 mb-6 whitespace-nowrap scrollbar-hide">
        <button
          className={`px-4 sm:px-6 py-3 font-medium text-sm ${activeTab === 'pending' ? 'border-b-2 border-[#f85606] text-[#f85606]' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Approvals ({pendingProducts.length})
        </button>
        <button
          className={`px-4 sm:px-6 py-3 font-medium text-sm ${activeTab === 'approved' ? 'border-b-2 border-[#f85606] text-[#f85606]' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('approved')}
        >
          Manage Products ({approvedProducts.length})
        </button>
        <button
          className={`px-4 sm:px-6 py-3 font-medium text-sm ${activeTab === 'users' ? 'border-b-2 border-[#f85606] text-[#f85606]' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('users')}
        >
          Users ({users.length})
        </button>
        <button
          className={`px-4 sm:px-6 py-3 font-medium text-sm ${activeTab === 'inquiries' ? 'border-b-2 border-[#f85606] text-[#f85606]' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('inquiries')}
        >
          Inquiries ({inquiries.length})
        </button>
        <button
          className={`px-4 sm:px-6 py-3 font-medium text-sm ${activeTab === 'offer' ? 'border-b-2 border-[#f85606] text-[#f85606]' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('offer')}
        >
          App Offer
        </button>
      </div>

      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending products to approve.</p>
          ) : (
            pendingProducts.map(product => (
              <div key={product.id} className="bg-white p-4 rounded shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <img src={product.image} alt={product.title} className="w-full sm:w-20 h-40 sm:h-20 object-cover rounded" />
                <div className="flex-1 w-full">
                  <h3 className="font-bold text-gray-800 line-clamp-2">{product.title}</h3>
                  <p className="text-sm text-gray-500">Price: Rs. {product.price}</p>
                  <p className="text-xs text-gray-400">Seller ID: {product.sellerId}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <button onClick={() => approveProduct(product.id)} className="flex-1 sm:flex-none justify-center bg-green-500 text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-green-600">
                    <Check size={16} /> Approve
                  </button>
                  <button onClick={() => rejectProduct(product.id)} className="flex-1 sm:flex-none justify-center bg-red-500 text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-red-600">
                    <X size={16} /> Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'approved' && (
        <div className="space-y-4">
          {approvedProducts.map(product => (
            <div key={product.id} className="bg-white p-4 rounded shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {editingProduct === product.id ? (
                <div className="flex-1 space-y-4 w-full bg-gray-50 p-4 rounded border border-gray-200">
                  <h4 className="font-bold text-gray-700 border-b pb-2 mb-4">Edit Product Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Product Title</label>
                      <input type="text" value={editForm.title || ''} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full border border-gray-300 p-2 rounded focus:border-[#f85606] focus:ring-1 focus:ring-[#f85606] outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                      <input type="text" value={editForm.category || ''} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full border border-gray-300 p-2 rounded focus:border-[#f85606] focus:ring-1 focus:ring-[#f85606] outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                      <input type="text" value={editForm.location || ''} onChange={e => setEditForm({...editForm, location: e.target.value})} className="w-full border border-gray-300 p-2 rounded focus:border-[#f85606] focus:ring-1 focus:ring-[#f85606] outline-none" placeholder="e.g., Kathmandu" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Current Price (Rs.)</label>
                      <input type="number" value={editForm.price || 0} onChange={e => setEditForm({...editForm, price: Number(e.target.value)})} className="w-full border border-gray-300 p-2 rounded focus:border-[#f85606] focus:ring-1 focus:ring-[#f85606] outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Original Price (Rs.)</label>
                      <input type="number" value={editForm.originalPrice || 0} onChange={e => setEditForm({...editForm, originalPrice: Number(e.target.value)})} className="w-full border border-gray-300 p-2 rounded focus:border-[#f85606] focus:ring-1 focus:ring-[#f85606] outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Discount (%)</label>
                      <input type="number" value={editForm.discount || 0} onChange={e => setEditForm({...editForm, discount: Number(e.target.value)})} className="w-full border border-gray-300 p-2 rounded focus:border-[#f85606] focus:ring-1 focus:ring-[#f85606] outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <textarea value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full border border-gray-300 p-2 rounded h-24 focus:border-[#f85606] focus:ring-1 focus:ring-[#f85606] outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-2">Product Image</label>
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white p-3 rounded border border-gray-200">
                        <img src={editForm.image || ''} alt="Preview" className="w-20 h-20 object-cover rounded border border-gray-200" />
                        <div className="flex-1 w-full space-y-2">
                          <input type="text" value={editForm.image || ''} onChange={e => setEditForm({...editForm, image: e.target.value})} className="w-full border border-gray-300 p-2 rounded text-sm focus:border-[#f85606] focus:ring-1 focus:ring-[#f85606] outline-none" placeholder="Paste Image URL here" />
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 font-medium uppercase">or</span>
                            <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-4 py-1.5 rounded flex items-center gap-2 text-sm transition-colors">
                              <Upload size={14} />
                              Upload from Gallery
                              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                    <button onClick={saveEdit} className="flex-1 sm:flex-none justify-center bg-[#f85606] text-white px-6 py-2.5 rounded flex items-center gap-2 hover:bg-[#d04805] font-medium transition-colors">
                      <Save size={18} /> Save Changes
                    </button>
                    <button onClick={() => setEditingProduct(null)} className="flex-1 sm:flex-none justify-center bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded flex items-center gap-2 hover:bg-gray-50 font-medium transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <img src={product.image} alt={product.title} className="w-full sm:w-20 h-40 sm:h-20 object-cover rounded" />
                  <div className="flex-1 w-full">
                    <h3 className="font-bold text-gray-800 line-clamp-2">{product.title}</h3>
                    <p className="text-sm text-gray-500">Price: Rs. {product.price}</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <button onClick={() => startEdit(product)} className="flex-1 sm:flex-none justify-center bg-gray-100 text-gray-700 px-4 py-2 rounded flex items-center gap-1 hover:bg-gray-200 border border-gray-300">
                      <Edit2 size={16} /> Edit
                    </button>
                    <button onClick={() => rejectProduct(product.id)} className="flex-1 sm:flex-none justify-center bg-red-100 text-red-600 px-4 py-2 rounded flex items-center gap-1 hover:bg-red-200 border border-red-200">
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded shadow-sm overflow-hidden">
          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm mb-4 m-4">
            <strong>Security Warning:</strong> Passwords are shown here in plain text strictly for demonstration purposes as requested. In a real application, passwords must be hashed and never visible to anyone, including admins.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-medium text-gray-600">Name</th>
                  <th className="p-4 font-medium text-gray-600">Contact</th>
                  <th className="p-4 font-medium text-gray-600">DOB</th>
                  <th className="p-4 font-medium text-gray-600">Role</th>
                  <th className="p-4 font-medium text-gray-600">Verification</th>
                  <th className="p-4 font-medium text-gray-600">Status</th>
                  <th className="p-4 font-medium text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">{user.name}</td>
                    <td className="p-4 text-sm text-gray-600">
                      <div>{user.email}</div>
                      {user.phone && <div className="text-xs text-gray-500">+977 {user.phone}</div>}
                      <div className="text-xs text-gray-400 font-mono mt-1">Pwd: {user.password}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{user.dob || 'N/A'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : user.role === 'seller' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {user.verifiedPhoto && (
                            <img src={user.verifiedPhoto} alt="Face" className="w-8 h-8 rounded-full object-cover border border-gray-300" title="Verified Face" />
                          )}
                          {user.documentPhoto && (
                            <img src={user.documentPhoto} alt="Doc" className="w-8 h-8 rounded object-cover border border-gray-300" title={user.documentType} />
                          )}
                          {!user.verifiedPhoto && !user.documentPhoto && <span className="text-xs text-gray-400">N/A</span>}
                        </div>
                        {user.role === 'seller' && (
                          <div className="text-[10px] text-gray-500 flex gap-1">
                            <span title="Location Access" className="bg-gray-100 px-1 rounded">📍 Yes</span>
                            <span title="Mic Access" className="bg-gray-100 px-1 rounded">🎤 Yes</span>
                            <span title="Camera Access" className="bg-gray-100 px-1 rounded">📷 Yes</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.status === 'approved' ? 'bg-green-100 text-green-700' : 
                        user.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Approved'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {user.role !== 'admin' && (
                        <div className="flex justify-end gap-2">
                          {user.status !== 'approved' && (
                            <button 
                              onClick={() => useAppContext().updateUserStatus(user.id, 'approved')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Approve User"
                            >
                              <Check size={18} />
                            </button>
                          )}
                          {user.status !== 'rejected' && (
                            <button 
                              onClick={() => useAppContext().updateUserStatus(user.id, 'rejected')}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Reject/Suspend User"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'inquiries' && (
        <div className="bg-white rounded shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-medium text-gray-600">Date</th>
                  <th className="p-4 font-medium text-gray-600">Name</th>
                  <th className="p-4 font-medium text-gray-600">Email</th>
                  <th className="p-4 font-medium text-gray-600">Issue Type</th>
                  <th className="p-4 font-medium text-gray-600">Message</th>
                  <th className="p-4 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">No inquiries found.</td>
                  </tr>
                ) : (
                  inquiries.map(inquiry => (
                    <tr key={inquiry.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 text-sm text-gray-500">{new Date(inquiry.date).toLocaleDateString()}</td>
                      <td className="p-4">{inquiry.name}</td>
                      <td className="p-4 text-sm text-blue-600">{inquiry.email}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {inquiry.issueType}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={inquiry.message}>
                        {inquiry.message}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${inquiry.status === 'new' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {inquiry.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'offer' && (
        <div className="bg-white p-6 rounded shadow-sm max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Manage App Download Offer</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            updateAppOffer(offerForm);
            alert('App offer updated successfully!');
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Text (e.g., "20% discount", "Rs. 500 off")</label>
              <input 
                type="text" 
                value={offerForm.discount} 
                onChange={e => setOfferForm({...offerForm, discount: e.target.value})} 
                required 
                className="w-full border border-gray-300 p-2 rounded focus:border-[#f85606] focus:ring-1 focus:ring-[#f85606] outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
              <input 
                type="text" 
                value={offerForm.code} 
                onChange={e => setOfferForm({...offerForm, code: e.target.value})} 
                required 
                className="w-full border border-gray-300 p-2 rounded focus:border-[#f85606] focus:ring-1 focus:ring-[#f85606] outline-none font-mono uppercase" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
              <input 
                type="date" 
                value={offerForm.validUntil} 
                onChange={e => setOfferForm({...offerForm, validUntil: e.target.value})} 
                required 
                className="w-full border border-gray-300 p-2 rounded focus:border-[#f85606] focus:ring-1 focus:ring-[#f85606] outline-none" 
              />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input 
                type="checkbox" 
                id="offerActive" 
                checked={offerForm.isActive} 
                onChange={e => setOfferForm({...offerForm, isActive: e.target.checked})} 
                className="w-4 h-4 text-[#f85606] focus:ring-[#f85606] border-gray-300 rounded"
              />
              <label htmlFor="offerActive" className="text-sm font-medium text-gray-700">Offer is Active</label>
            </div>
            <button type="submit" className="w-full bg-[#f85606] text-white py-2.5 rounded font-bold hover:bg-[#d04805] transition-colors mt-6">
              SAVE OFFER
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
