import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, X, Coffee, Cake, Soup, CheckCircle2, 
  Store, ChevronLeft, Image as ImageIcon, ClipboardList, Settings, 
  Leaf, Clock, Check, ChefHat, QrCode, Printer, Lock, LogOut, 
  Utensils, ShoppingBag, BarChart3, Receipt, Eye, PackagePlus
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';

const userConfig = {
  apiKey: "AIzaSyDQ5mXUrQ1oJgdbeVMJEunDpCIJ5jWNuJM",
  authDomain: "aura-cafe-64b34.firebaseapp.com",
  projectId: "aura-cafe-64b34",
  storageBucket: "aura-cafe-64b34.firebasestorage.app",
  messagingSenderId: "653695103878",
  appId: "1:653695103878:web:242def6a9d94a0ca0bb207"
};

const app = initializeApp(userConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "aura-cafe-64b34";

const INITIAL_MENU = [
  {
    id: 'c1', name: '手沖與咖啡', icon: 'coffee',
    items: [
      { id: 'm1', name: '玫瑰海鹽拿鐵', price: 160, poetry: '露染紅瓣映晨光，海鹽輕吻拿鐵香。', image: 'https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?w=600' },
      { id: 'm2', name: '雲朵焦糖瑪奇朵', price: 180, poetry: '雲端起舞弄清影，焦糖如絲醉晚風。', image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600' },
    ]
  },
  {
    id: 'c2', name: '優雅花茶', icon: 'leaf',
    items: [
      { id: 'f1', name: '洋甘菊柚香綠茶', price: 150, poetry: '菊香幽遠沁心脾，柚影搖曳綠波間。', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600' },
    ]
  },
  {
    id: 'c3', name: '法式甜點', icon: 'cake',
    items: [
      { id: 'd1', name: '草莓伯爵千層', price: 220, poetry: '紅蕊層疊映纖指，伯爵幽香透晚霞。', image: 'https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=600', stock: 10 },
      { id: 'd2', name: '巴斯克乳酪蛋糕', price: 160, poetry: '焦色半熟鎖濃醇，入口溫柔化萬千。', image: 'https://images.unsplash.com/photo-1602351447937-745cb720612f?w=600', stock: 5 },
    ]
  },
  {
    id: 'c4', name: '暖心鍋燒', icon: 'soup',
    items: [
      { id: 'n1', name: '松露牛奶海鮮鍋燒', price: 280, poetry: '墨香引路尋珍味，海潮湧入奶香田。', image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600' },
    ]
  }
];

export default function CafeSystem() {
  const [user, setUser] = useState(null);
  const [systemRole, setSystemRole] = useState('customer'); 
  const [adminTab, setAdminTab] = useState('reports');
  const [menuData, setMenuData] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  
  const [activeCategory, setActiveCategory] = useState('c1');
  const [cart, setCart] = useState([]);
  const [orderStatus, setOrderStatus] = useState('ordering');
  const [orderType, setOrderType] = useState('dineIn'); 
  const [passwordInput, setPasswordInput] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 上架新商品狀態
  const [newItem, setNewItem] = useState({ categoryId: 'c1', name: '', price: '', poetry: '', image: '', stock: 0 });

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const menuRef = collection(db, 'artifacts', appId, 'public', 'data', 'menu');
    onSnapshot(menuRef, (snap) => {
      if (snap.size < 4) {
        INITIAL_MENU.forEach(async (cat) => await setDoc(doc(menuRef, cat.id), cat));
        setMenuData(INITIAL_MENU);
      } else {
        setMenuData(snap.docs.map(doc => doc.data()).sort((a,b) => a.id.localeCompare(b.id)));
      }
      setIsDataLoaded(true);
    });
    const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    onSnapshot(ordersRef, (snap) => {
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user]);

  // 熱銷統計
  const hotItems = useMemo(() => {
    const counts = {};
    orders.forEach(o => o.items.forEach(i => counts[i.id] = (counts[i.id] || 0) + i.quantity));
    return Object.keys(counts).sort((a,b) => counts[b] - counts[a]).slice(0, 3);
  }, [orders]);

  const updateStock = async (catId, itemId, newStock) => {
    const category = menuData.find(c => c.id === catId);
    const updatedItems = category.items.map(i => i.id === itemId ? { ...i, stock: parseInt(newStock) } : i);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'menu', catId), { items: updatedItems });
  };

  const handleAddItem = async () => {
    const category = menuData.find(c => c.id === newItem.categoryId);
    const itemToAdd = { ...newItem, id: `m_${Date.now()}`, price: parseInt(newItem.price), stock: parseInt(newItem.stock) };
    const updatedItems = [...category.items, itemToAdd];
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'menu', newItem.categoryId), { items: updatedItems });
    alert('商品已成功上架！');
    setNewItem({ ...newItem, name: '', price: '', poetry: '', image: '', stock: 0 });
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !user) return;
    const ts = Date.now();
    const orderId = `ASA-${ts.toString().slice(-4)}`;
    const newOrder = { id: orderId, table: '預設桌', type: orderType, items: cart, total: cart.reduce((s,i)=>s+(i.price*i.quantity),0), status: 'pending', time: new Date().toLocaleTimeString(), timestamp: ts };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), newOrder);
    setOrderStatus('success');
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-bold text-amber-800">ASA 旗艦系統載入中...</div>;

  if (systemRole === 'customer') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] font-sans pb-24 lg:pb-0 flex flex-col text-amber-900">
        {zoomImage && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomImage(null)}>
            <img src={zoomImage} className="max-w-full max-h-full rounded-3xl animate-zoom-in shadow-2xl" />
            <X className="absolute top-6 right-6 text-white cursor-pointer" />
          </div>
        )}

        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-amber-100 px-4 py-4">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-800 rounded-full flex items-center justify-center text-amber-50"><Store size={20} /></div>
              <h1 className="text-xl font-black tracking-widest font-serif">ASA 南巷微光</h1>
            </div>
            <button onClick={() => setShowLoginModal(true)} className="p-2 text-amber-200 hover:text-amber-800"><Lock size={18} /></button>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:mr-96">
          <div className="col-span-full flex gap-3 overflow-x-auto no-scrollbar pb-4 justify-center">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeCategory === cat.id ? 'bg-amber-800 text-white' : 'bg-white text-amber-600 border border-amber-100'}`}>
                {cat.name}
              </button>
            ))}
          </div>

          {menuData.find(c => c.id === activeCategory)?.items.map(item => {
            const quantity = cart.find(c => c.id === item.id)?.quantity || 0;
            const isHot = hotItems.includes(item.id);
            return (
              <div key={item.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-amber-50 flex flex-col items-center text-center">
                <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-amber-50 mb-4 cursor-zoom-in" onClick={() => setZoomImage(item.image)}>
                  <img src={item.image} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/5 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"><Eye className="text-white" /></div>
                </div>
                <div className="mb-4 w-full flex items-center justify-center gap-3">
                  <span className="text-xl font-black text-amber-800">${item.price}</span>
                  <button onClick={() => { if(item.stock === 0) return; setCart([...cart, {...item, quantity: 1}]); }} disabled={item.stock === 0} className="bg-amber-800 text-white px-5 py-1.5 rounded-full font-bold text-[10px] active:scale-90 disabled:bg-amber-100">加入</button>
                </div>
                <h3 className="text-lg font-bold text-amber-900">{isHot && <span className="text-orange-500 mr-1 animate-pulse">🔥 熱銷</span>}{item.name}</h3>
                <p className="text-[10px] text-amber-700/60 h-7 italic mt-2">{item.poetry}</p>
                {item.stock !== undefined && <div className={`text-[10px] font-bold mt-2 ${item.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>今日庫存：{item.stock}</div>}
              </div>
            );
          })}
        </main>

        <aside className="hidden lg:flex w-96 bg-white border-l border-amber-100 fixed right-0 top-0 bottom-0 flex-col shadow-xl z-30">
          <div className="p-8 border-b border-amber-50 bg-[#FDFBF7] font-serif text-2xl font-black">您的餐點</div>
          <div className="flex-1 overflow-y-auto p-8 space-y-4">
            {cart.map((i, idx) => (
              <div key={idx} className="flex justify-between font-bold text-sm"><span>{i.name} x {i.quantity}</span><span>${i.price * i.quantity}</span></div>
            ))}
          </div>
          <div className="p-8 bg-[#FDFBF7] border-t border-amber-100">
            <div className="text-4xl font-black text-amber-900 mb-6">${cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</div>
            <button onClick={handleSubmitOrder} className="w-full py-5 bg-amber-800 text-white rounded-[2rem] font-bold hover:bg-amber-900 active:scale-95 transition-all">送出訂單</button>
          </div>
        </aside>

        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-amber-900/40 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}></div>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==='Aeon.1388'){setSystemRole('kitchen');setShowLoginModal(false);} else if(passwordInput==='$Asasouthernaelly,1388'){setSystemRole('admin');setShowLoginModal(false);setIsAdminVerified(true);} else alert('密碼錯誤'); }} className="bg-white p-8 rounded-[2.5rem] relative z-10 w-full max-w-sm">
              <h2 className="text-center font-bold mb-6 text-amber-900">權限驗證</h2>
              <input type="password" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full border-2 border-amber-50 rounded-2xl p-4 mb-4 text-center outline-none focus:border-amber-800" autoFocus />
              <button className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold">確認進入</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- 後廚 & 管理系統 ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
       <header className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/90 z-10">
          <h1 className="font-bold text-lg flex items-center gap-2 text-amber-500 uppercase"><ChefHat /> ASA {systemRole === 'kitchen' ? '後廚系統' : '店長後台'}</h1>
          <button onClick={() => {setSystemRole('customer'); setIsAdminVerified(false);}} className="text-xs bg-slate-800 px-4 py-2 rounded-lg">登出系統</button>
       </header>

       <main className="p-6 flex-1 overflow-x-auto">
          {systemRole === 'kitchen' ? (
            <div className="space-y-8">
              <div className="p-6 bg-slate-800 rounded-3xl border border-amber-500/20">
                <h2 className="text-amber-500 font-bold mb-4 flex items-center gap-2"><PackagePlus size={18} /> 甜點進貨庫存管理</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {menuData.find(c => c.id === 'c3')?.items.map(item => (
                    <div key={item.id} className="bg-slate-700 p-4 rounded-2xl flex justify-between items-center">
                      <span className="font-bold">{item.name}</span>
                      <input type="number" value={item.stock} onChange={(e) => updateStock('c3', item.id, e.target.value)} className="w-20 bg-slate-900 text-amber-500 rounded-lg p-2 text-center font-black" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-6 min-w-max">
                {orders.filter(o => o.status === 'pending').map(order => (
                  <div key={order.id} className="w-80 bg-slate-800 rounded-2xl border-t-4 border-amber-500 shadow-2xl flex flex-col">
                    <div className="p-4 border-b border-slate-700 font-black text-xl text-amber-500">{order.table} <span className="text-[10px] text-slate-500 font-normal">#{order.id}</span></div>
                    <div className="p-4 flex-1 space-y-2 font-bold">
                       {order.items.map((item, idx) => (
                         <div key={idx} className="flex justify-between text-sm"><span>{item.name}</span><span className="text-amber-400">x{item.quantity}</span></div>
                       ))}
                    </div>
                    <div className="p-4"><button onClick={async () => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: 'completed' })} className="w-full py-4 bg-amber-500 text-slate-900 font-bold rounded-xl">完成出餐</button></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="flex gap-2 bg-slate-800 p-1 rounded-2xl w-fit">
                <button onClick={() => setAdminTab('reports')} className={`px-6 py-2 rounded-xl text-xs font-bold ${adminTab === 'reports' ? 'bg-blue-600' : ''}`}>報表結算</button>
                <button onClick={() => setAdminTab('products')} className={`px-6 py-2 rounded-xl text-xs font-bold ${adminTab === 'products' ? 'bg-blue-600' : ''}`}>商品管理</button>
              </div>

              {adminTab === 'reports' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-600 p-8 rounded-3xl h-48 flex flex-col justify-between shadow-xl">
                    <span className="font-bold flex items-center gap-2"><BarChart3 size={20} /> 總累計營收</span>
                    <h3 className="text-5xl font-black text-white">$ {orders.reduce((s,o)=>s+o.total, 0).toLocaleString()}</h3>
                  </div>
                  <div className="bg-slate-800 p-8 rounded-3xl h-48 flex flex-col justify-between border border-slate-700">
                    <span className="font-bold flex items-center gap-2"><Receipt size={20} /> 總處理單數</span>
                    <h3 className="text-5xl font-black text-amber-500">{orders.length} <span className="text-lg">單</span></h3>
                  </div>
                </div>
              )}

              {adminTab === 'products' && (
                <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 space-y-6">
                   <h2 className="text-xl font-bold flex items-center gap-2"><PackagePlus /> 新增商品上架</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select value={newItem.categoryId} onChange={(e)=>setNewItem({...newItem, categoryId: e.target.value})} className="bg-slate-900 border-none rounded-xl p-4">
                         {menuData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <input type="text" placeholder="商品名稱" value={newItem.name} onChange={(e)=>setNewItem({...newItem, name: e.target.value})} className="bg-slate-900 border-none rounded-xl p-4" />
                      <input type="number" placeholder="價格" value={newItem.price} onChange={(e)=>setNewItem({...newItem, price: e.target.value})} className="bg-slate-900 border-none rounded-xl p-4" />
                      <input type="text" placeholder="詩詞描述" value={newItem.poetry} onChange={(e)=>setNewItem({...newItem, poetry: e.target.value})} className="bg-slate-900 border-none rounded-xl p-4" />
                      <input type="text" placeholder="照片網址 (Unsplash)" value={newItem.image} onChange={(e)=>setNewItem({...newItem, image: e.target.value})} className="bg-slate-900 border-none rounded-xl p-4" />
                      <button onClick={handleAddItem} className="bg-blue-600 py-4 rounded-xl font-bold shadow-lg">確認上架</button>
                   </div>
                </div>
              )}
            </div>
          )}
       </main>
    </div>
  );
}
