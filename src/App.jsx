import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, X, Coffee, Cake, Soup, CheckCircle2, 
  Store, ChevronLeft, Image as ImageIcon, ClipboardList, Settings, 
  Leaf, Clock, Check, ChefHat, QrCode, Printer, Lock, LogOut, 
  Utensils, ShoppingBag, BarChart3, Receipt
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';

// --- Firebase 設定 (ASA 專屬) ---
const userConfig = {
  apiKey: "AIzaSyDQ5mXUrQ1oJgdbeVMJEunDpCIJ5jWNuJM",
  authDomain: "aura-cafe-64b34.firebaseapp.com",
  projectId: "aura-cafe-64b34",
  storageBucket: "aura-cafe-64b34.firebasestorage.app",
  messagingSenderId: "653695103878",
  appId: "1:653695103878:web:242def6a9d94a0ca0bb207"
};

const isSandbox = typeof __firebase_config !== 'undefined';
const activeFirebaseConfig = isSandbox ? JSON.parse(__firebase_config) : userConfig;
const app = initializeApp(activeFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : "aura-cafe-64b34";

const INITIAL_MENU = [
  { id: 'c1', name: '手沖與咖啡', icon: 'coffee', items: [{ id: 'm1', name: '玫瑰海鹽拿鐵', price: 160, description: '微鹹甜的獨特風味。', image: 'https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?w=400' }, { id: 'm2', name: '雲朵焦糖瑪奇朵', price: 180, description: '綿密奶泡與手工焦糖。', image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400' }] },
  { id: 'c2', name: '優雅花茶', icon: 'leaf', items: [{ id: 'f1', name: '洋甘菊柚香綠茶', price: 150, description: '清爽韓國柚子醬。', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400' }] },
  { id: 'c3', name: '法式甜點', icon: 'cake', items: [{ id: 'd1', name: '草莓伯爵千層', price: 220, description: '新鮮草莓與伯爵鮮奶油。', image: 'https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=400' }] },
  { id: 'c4', name: '暖心鍋燒', icon: 'soup', items: [{ id: 'n1', name: '松露牛奶海鮮鍋燒', price: 280, description: '濃郁牛奶湯頭。', image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=400' }] }
];

const getCategoryIcon = (iconName) => {
  switch(iconName) {
    case 'coffee': return <Coffee size={18} />;
    case 'leaf': return <Leaf size={18} />;
    case 'cake': return <Cake size={18} />;
    case 'soup': return <Soup size={18} />;
    default: return <Utensils size={18} />;
  }
};

export default function CafeSystem() {
  const [user, setUser] = useState(null);
  const [systemRole, setSystemRole] = useState('customer'); // customer, kitchen, admin
  const [adminTab, setAdminTab] = useState('reports'); // reports, products, qrcodes
  const [menuData, setMenuData] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const tables = ['窗邊 A1', '窗邊 A2', '沙發 B1', '沙發 B2', '吧台 C1', '包廂 VIP'];
  
  const [activeCategory, setActiveCategory] = useState('c1');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState('ordering');
  const [tableNumber, setTableNumber] = useState(tables[0]);
  const [orderType, setOrderType] = useState('dineIn'); 

  const [passwordInput, setPasswordInput] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [newItem, setNewItem] = useState({ categoryId: 'c1', name: '', price: '', description: '', image: '' });

  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (e) { setMenuData(INITIAL_MENU); setIsDataLoaded(true); }
    };
    initAuth();
    const unsubAuth = onAuthStateChanged(auth, setUser);
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const menuRef = collection(db, 'artifacts', appId, 'public', 'data', 'menu');
    const unsubMenu = onSnapshot(menuRef, (snap) => {
      if (snap.size < 4) {
        INITIAL_MENU.forEach(async (cat) => await setDoc(doc(menuRef, cat.id), cat));
        setMenuData(INITIAL_MENU);
      } else {
        const fetched = snap.docs.map(doc => doc.data()).sort((a,b) => a.id.localeCompare(b.id));
        setMenuData(fetched);
      }
      setIsDataLoaded(true);
    });
    const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsubOrders = onSnapshot(ordersRef, (snap) => {
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => b.timestamp - a.timestamp));
    });
    return () => { unsubMenu(); unsubOrders(); };
  }, [user]);

  const reportStats = useMemo(() => {
    const totalRev = orders.reduce((sum, o) => sum + o.total, 0);
    return { totalRev, orderCount: orders.length };
  }, [orders]);

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !user) return;
    const ts = Date.now();
    const orderId = `ASA-${ts.toString().slice(-4)}`;
    const newOrder = { id: orderId, table: orderType === 'takeout' ? '外帶' : tableNumber, type: orderType, items: cart, total: cart.reduce((s,i) => s+(i.price*i.quantity),0), status: 'pending', time: new Date().toLocaleTimeString(), timestamp: ts };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), newOrder);
    setOrderStatus('success');
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-bold text-amber-800">載入 ASA 系統...</div>;

  // --- 顧客介面 (ASA 木質調) ---
  if (systemRole === 'customer') {
    if (orderStatus === 'success') {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-amber-900">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl text-center border border-amber-100 max-w-sm w-full">
            <CheckCircle2 className="text-amber-600 mx-auto mb-4" size={80} />
            <h2 className="text-2xl font-bold mb-6">訂單已成功送出</h2>
            <button onClick={() => {setCart([]); setOrderStatus('ordering');}} className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold">返回菜單</button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#FDFBF7] font-sans pb-24 lg:pb-0 flex flex-col text-amber-900">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-amber-100 px-4 py-4">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-800 rounded-full flex items-center justify-center text-amber-50 shadow-inner"><Store size={20} /></div>
              <h1 className="text-xl font-black tracking-widest font-serif">ASA 南巷微光</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-amber-50 p-1 rounded-full border border-amber-100 flex text-[10px] font-bold">
                <button onClick={() => setOrderType('dineIn')} className={`px-4 py-1.5 rounded-full ${orderType === 'dineIn' ? 'bg-white text-amber-800 shadow-sm' : 'text-amber-300'}`}>內用</button>
                <button onClick={() => setOrderType('takeout')} className={`px-4 py-1.5 rounded-full ${orderType === 'takeout' ? 'bg-white text-amber-800 shadow-sm' : 'text-amber-300'}`}>外帶</button>
              </div>
              <button onClick={() => setShowLoginModal(true)} className="p-2 text-amber-200 hover:text-amber-800"><Lock size={18} /></button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:mr-96">
          <div className="col-span-full flex gap-3 overflow-x-auto no-scrollbar pb-4 border-b border-amber-50 mb-4">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-2 px-6 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${activeCategory === cat.id ? 'bg-amber-800 text-white shadow-lg' : 'bg-white text-amber-600 border border-amber-100'}`}>
                {getCategoryIcon(cat.icon)} {cat.name}
              </button>
            ))}
          </div>
          {menuData.find(c => c.id === activeCategory)?.items.map(item => {
            const quantity = cart.find(c => c.id === item.id)?.quantity || 0;
            return (
              <div key={item.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-amber-50 flex flex-col items-center text-center group transition-all">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-amber-50 mb-3 group-hover:scale-105 transition-transform bg-amber-50"><img src={item.image} alt={item.name} className="w-full h-full object-cover" /></div>
                <div className="mb-4 w-full flex items-center justify-center gap-3">
                  <span className="text-xl font-black text-amber-800">${item.price}</span>
                  {quantity === 0 ? (
                    <button onClick={() => { setCart([...cart, { ...item, quantity: 1 }]); }} className="bg-amber-800 text-white px-5 py-2 rounded-full font-bold text-[10px] flex items-center gap-1 hover:bg-amber-900 active:scale-90"><Plus size={12} /> 加入</button>
                  ) : (
                    <div className="flex items-center bg-amber-50 rounded-full p-0.5 border border-amber-100">
                      <button onClick={() => { const nc = [...cart]; const i = nc.findIndex(x=>x.id===item.id); if(nc[i].quantity>1) nc[i].quantity--; else nc.splice(i,1); setCart(nc); }} className="bg-white w-7 h-7 rounded-full flex items-center justify-center text-amber-800 shadow-sm"><Minus size={14} /></button>
                      <span className="font-bold text-sm w-7">{quantity}</span>
                      <button onClick={() => { const nc = [...cart]; const i = nc.findIndex(x=>x.id===item.id); nc[i].quantity++; setCart(nc); }} className="bg-amber-800 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md"><Plus size={14} /></button>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold mb-1 text-amber-900">{item.name}</h3>
                <p className="text-[10px] text-amber-700/50 line-clamp-2 h-7 px-2 italic">{item.description}</p>
              </div>
            );
          })}
        </main>

        <aside className="hidden lg:flex w-96 bg-white border-l border-amber-100 fixed right-0 top-0 bottom-0 flex-col shadow-xl z-30">
          <div className="p-8 border-b border-amber-50 bg-[#FDFBF7]"><h2 className="text-2xl font-black font-serif flex items-center gap-3 text-amber-900"><ShoppingCart /> 您的餐點</h2></div>
          <div className="flex-1 overflow-y-auto p-8 space-y-4">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm font-bold border-b border-amber-50 pb-2"><span className="text-amber-900">{item.name} x {item.quantity}</span><span className="text-amber-800">${item.price * item.quantity}</span></div>
            ))}
          </div>
          <div className="p-8 bg-[#FDFBF7] border-t border-amber-100">
            <div className="flex justify-between items-end mb-6 font-black text-amber-900 text-3xl"><span className="text-sm font-bold text-amber-700/60 font-sans">總計</span><span>${cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</span></div>
            <button disabled={cart.length === 0} onClick={handleSubmitOrder} className="w-full py-5 bg-amber-800 text-white rounded-[2rem] font-bold text-lg hover:bg-amber-900 disabled:opacity-30 active:scale-95 transition-all">送出訂單</button>
          </div>
        </aside>

        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-amber-900/40 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}></div>
            <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === 'Aeon.1388') { setSystemRole('admin'); setShowLoginModal(false); } else { alert('密碼錯誤'); } }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-sm border border-amber-100">
              <h2 className="text-2xl font-bold text-center mb-6 text-amber-900 font-serif uppercase">管理登入</h2>
              <input type="password" placeholder="請輸入密碼" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full border-2 border-amber-50 rounded-2xl p-4 mb-4 text-center text-lg outline-none focus:border-amber-800" />
              <button className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold">進入後台</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- 員工後台 (ASA 旗艦版：含後廚與管理) ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
       <header className="p-6 border-b border-slate-800 flex flex-wrap justify-between items-center bg-slate-900/50 sticky top-0 z-10 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 w-8 h-8 rounded-lg flex items-center justify-center text-slate-900 shadow-lg shadow-amber-500/20"><ChefHat size={18} /></div>
            <h1 className="font-black tracking-widest text-lg uppercase">ASA {systemRole === 'kitchen' ? '後廚看板' : '店長後台'}</h1>
          </div>
          <div className="flex gap-2 bg-slate-800 p-1 rounded-xl">
            <button onClick={() => setSystemRole('kitchen')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${systemRole === 'kitchen' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>後廚系統</button>
            <button onClick={() => setSystemRole('admin')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${systemRole === 'admin' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>後台管理</button>
            <div className="w-px h-4 bg-slate-700 mx-2 self-center"></div>
            <button onClick={() => setSystemRole('customer')} className="px-4 py-2 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white flex items-center gap-2"><LogOut size={14} /> 登出</button>
          </div>
       </header>

       {systemRole === 'kitchen' ? (
         <main className="p-6 flex-1 overflow-x-auto">
            <div className="flex gap-6 min-w-max h-full">
              {orders.filter(o => o.status === 'pending').map(order => (
                <div key={order.id} className="w-80 bg-slate-800 rounded-2xl border-t-4 border-amber-500 shadow-2xl flex flex-col animate-fade-in">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center"><span className="font-black text-xl text-amber-500">{order.table}</span><span className="text-[10px] text-slate-500">#{order.id}</span></div>
                  <div className="p-4 flex-1 space-y-3">
                     {order.items.map((item, idx) => (
                       <div key={idx} className="flex justify-between border-b border-slate-700/30 pb-2 font-bold"><span className="text-lg">{item.name}</span><span className="text-amber-400 bg-slate-700 px-2 rounded">x{item.quantity}</span></div>
                     ))}
                  </div>
                  <div className="p-4"><button onClick={async () => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: 'completed' })} className="w-full py-4 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 active:scale-95 transition-all">完成出餐</button></div>
                </div>
              ))}
              {orders.filter(o => o.status === 'pending').length === 0 && <div className="w-full flex flex-col items-center justify-center text-slate-600 opacity-20 py-20"><Clock size={64} /><div className="text-xl font-bold mt-4">目前無待製作訂單</div></div>}
            </div>
         </main>
       ) : (
         <main className="p-6 max-w-5xl mx-auto w-full flex-1">
            <div className="flex gap-2 mb-8 bg-slate-800 p-1 rounded-2xl w-fit">
              <button onClick={() => setAdminTab('reports')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${adminTab === 'reports' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>今日結算</button>
              <button onClick={() => setAdminTab('products')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${adminTab === 'products' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>商品上架</button>
              <button onClick={() => setAdminTab('qrcodes')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${adminTab === 'qrcodes' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>桌位碼</button>
            </div>
            {adminTab === 'reports' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl shadow-xl flex flex-col justify-between h-48">
                  <span className="font-bold text-blue-100 flex items-center gap-2"><BarChart3 size={18} /> 雲端累計營收</span>
                  <h3 className="text-5xl font-black text-white">$ {reportStats.totalRev.toLocaleString()}</h3>
                </div>
                <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 flex flex-col justify-between h-48">
                  <span className="font-bold text-slate-400 flex items-center gap-2"><Receipt size={18} /> 今日總單數</span>
                  <h3 className="text-5xl font-black text-amber-500">{reportStats.orderCount} <span className="text-lg text-slate-500">單</span></h3>
                </div>
              </div>
            )}
            {adminTab === 'products' && <div className="bg-slate-800 p-10 rounded-3xl border border-slate-700 text-center py-20 text-slate-500 italic">商品上架模組已啟動，可透過 INITIAL_MENU 或 Firebase 後台編輯商品數據。</div>}
            {adminTab === 'qrcodes' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {tables.map(t => (
                  <div key={t} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col items-center gap-4 group hover:border-blue-500 transition-all">
                    <span className="font-bold text-lg">{t}</span>
                    <div className="bg-white p-2 rounded-xl"><QrCode size={100} className="text-slate-900" /></div>
                    <button className="text-[10px] bg-slate-700 px-4 py-1 rounded-full text-slate-400 group-hover:bg-blue-600 group-hover:text-white">下載 QR</button>
                  </div>
                ))}
              </div>
            )}
         </main>
       )}
    </div>
  );
}
