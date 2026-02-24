import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, X, Coffee, Cake, Soup, CheckCircle2, 
  Store, ChevronLeft, Image as ImageIcon, ClipboardList, Settings, 
  Leaf, Clock, Check, ChefHat, QrCode, Printer, Lock, LogOut, 
  Utensils, ShoppingBag, BarChart3, Receipt, Eye, Trash2, Smartphone, TrendingUp
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
  { id: 'c1', name: '手沖與咖啡', icon: 'coffee', items: [{ id: 'm1', name: '玫瑰海鹽拿鐵', price: 160, poetry: '露染紅瓣映晨光，海鹽輕吻拿鐵香。', image: 'https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?w=600' }, { id: 'm2', name: '雲朵焦糖瑪奇朵', price: 180, poetry: '雲端起舞弄清影，焦糖如絲醉晚風。', image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600' }] },
  { id: 'c2', name: '優雅花茶', icon: 'leaf', items: [{ id: 'f1', name: '洋甘菊柚香綠茶', price: 150, poetry: '菊香幽遠沁心脾，柚影搖曳綠波間。', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600' }] },
  { id: 'c3', name: '法式甜點', icon: 'cake', items: [{ id: 'd1', name: '草莓伯爵千層', price: 220, poetry: '紅蕊層疊映纖指，伯爵幽香透晚霞。', image: 'https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=600', stock: 10 }, { id: 'd2', name: '巴斯克乳酪蛋糕', price: 160, poetry: '焦色半熟鎖濃醇，入口溫柔化萬千。', image: 'https://images.unsplash.com/photo-1602351447937-745cb720612f?w=600', stock: 5 }] },
  { id: 'c4', name: '暖心鍋燒', icon: 'soup', items: [{ id: 'n1', name: '松露牛奶海鮮鍋燒', price: 280, poetry: '墨香引路尋珍味，海潮湧入奶香田。', image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600' }] }
];

export default function CafeSystem() {
  const [user, setUser] = useState(null);
  const [systemRole, setSystemRole] = useState('customer'); 
  const [menuData, setMenuData] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [activeCategory, setActiveCategory] = useState('c1');
  const [cart, setCart] = useState([]);
  const [orderStatus, setOrderStatus] = useState('ordering');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [orderType, setOrderType] = useState('dineIn'); 
  const [passwordInput, setPasswordInput] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

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
    onSnapshot(ordersRef, (snap) => setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
  }, [user]);

  // 熱銷邏輯
  const hotItems = useMemo(() => {
    const counts = {};
    orders.forEach(o => o.items.forEach(i => counts[i.id] = (counts[i.id] || 0) + i.quantity));
    return Object.keys(counts).sort((a,b) => counts[b] - counts[a]).slice(0, 3);
  }, [orders]);

  // 即時計算庫存 (原始庫存 - 購物車內數量)
  const getDisplayStock = (item) => {
    if (item.stock === undefined) return null;
    const inCart = cart.find(c => c.id === item.id)?.quantity || 0;
    return Math.max(0, item.stock - inCart);
  };

  const addToCart = (item) => {
    const available = getDisplayStock(item);
    if (available !== null && available <= 0) return alert('抱歉，此品項今日庫存已不足！');
    
    setCart(prev => {
      const exist = prev.find(c => c.id === item.id);
      if (exist) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    const itemInMenu = menuData.flatMap(c => c.items).find(i => i.id === id);
    const inCart = cart.find(c => c.id === id)?.quantity || 0;
    
    if (delta > 0 && itemInMenu.stock !== undefined && (itemInMenu.stock - inCart) <= 0) {
      return alert('已達今日供應上限');
    }

    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    if (orderType === 'dineIn' && !tableNumber) return alert('內用請輸入桌號');
    if (orderType === 'takeout' && phoneSuffix.length !== 3) return alert('外帶請輸入手機末三碼');

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const orderId = `ASA-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const newOrder = {
      id: orderId,
      date: now.toLocaleDateString('zh-TW'),
      time: now.toLocaleTimeString('zh-TW'),
      table: orderType === 'takeout' ? `外帶-${phoneSuffix}` : `桌號 ${tableNumber}`,
      items: cart,
      total: cart.reduce((s,i)=>s+(i.price*i.quantity),0),
      status: 'pending',
      timestamp: now.getTime()
    };

    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), newOrder);
    setOrderStatus('success');
    setIsCartOpen(false);
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-bold text-amber-800 tracking-widest">ASA 暖心載入中...</div>;

  if (systemRole === 'customer') {
    if (orderStatus === 'success') {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-amber-900">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center border border-amber-100 max-w-sm w-full">
            <CheckCircle2 className="text-amber-600 mx-auto mb-4" size={80} />
            <h2 className="text-2xl font-black mb-2">訂單已成功送出</h2>
            <p className="text-amber-700/50 text-sm mb-8">職人正為您用心製作中</p>
            <button onClick={() => {setCart([]); setOrderStatus('ordering');}} className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold shadow-lg">再點一份</button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#FDFBF7] font-sans pb-32 flex flex-col text-amber-900 overflow-x-hidden">
        {zoomImage && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomImage(null)}>
            <img src={zoomImage} className="max-w-full max-h-full rounded-2xl animate-zoom-in shadow-2xl" />
          </div>
        )}

        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-amber-100 px-4 py-4">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-800 rounded-full flex items-center justify-center text-amber-50 shadow-inner"><Store size={20} /></div>
              <h1 className="text-xl font-black tracking-widest font-serif">ASA 南巷微光</h1>
            </div>
            <button onClick={() => {setPasswordInput(''); setShowLoginModal(true);}} className="p-2 text-amber-200 hover:text-amber-800"><Lock size={18} /></button>
          </div>
        </header>

        <div className="bg-white/50 sticky top-[73px] z-10 border-b border-amber-50">
          <div className="max-w-5xl mx-auto px-4 py-4 flex gap-3 overflow-x-auto no-scrollbar justify-start md:justify-center">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-2 px-6 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all lg:scale-90 ${activeCategory === cat.id ? 'bg-amber-800 text-white shadow-lg' : 'bg-white text-amber-600 border border-amber-100'}`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:mr-96">
          {menuData.find(c => c.id === activeCategory)?.items.map(item => {
            const isHot = hotItems.includes(item.id);
            const stockLeft = getDisplayStock(item);
            return (
              <div key={item.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-amber-50 flex flex-col items-center text-center transition-all hover:shadow-md">
                <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-amber-50 mb-3 cursor-zoom-in group" onClick={() => setZoomImage(item.image)}>
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Eye className="text-white" /></div>
                </div>
                
                <div className="mb-4 w-full flex items-center justify-center gap-3">
                  <span className="text-xl font-black text-amber-800">${item.price}</span>
                  <button 
                    onClick={() => addToCart(item)} 
                    disabled={stockLeft === 0}
                    className={`px-5 py-2 rounded-full font-bold text-[10px] shadow-sm active:scale-90 transition-all ${stockLeft === 0 ? 'bg-amber-100 text-amber-300' : 'bg-amber-800 text-white hover:bg-amber-900'}`}
                  >
                    {stockLeft === 0 ? '售罄' : '加入'}
                  </button>
                </div>

                <h3 className="text-lg font-bold text-amber-900 leading-tight">
                  {isHot && <span className="text-orange-500 mr-1 animate-pulse">🔥 熱銷</span>}
                  {item.name}
                </h3>
                <p className="text-[10px] text-amber-700/60 mt-2 px-2 italic h-7">{item.poetry}</p>
                {item.stock !== undefined && (
                  <div className={`text-[10px] font-bold mt-2 ${stockLeft > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    今日供應餘額：{stockLeft}
                  </div>
                )}
              </div>
            );
          })}
        </main>

        {/* 手機版懸浮購物車 */}
        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
          <div className="bg-amber-900 rounded-full p-2.5 flex items-center justify-between shadow-2xl border border-amber-700">
            <div className="flex items-center gap-4 pl-4">
              <div className="relative">
                <ShoppingCart className="text-amber-100" size={24} />
                {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-amber-100 text-amber-900 text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{cart.reduce((s,i)=>s+i.quantity,0)}</span>}
              </div>
              <div className="text-white font-black text-xl">${cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</div>
            </div>
            <button onClick={() => setIsCartOpen(true)} className="bg-white text-amber-900 px-8 py-3 rounded-full font-black text-sm active:scale-95 shadow-md">查看明細</button>
          </div>
        </div>

        {/* 手機版明細 Modal (支援即時加減餐) */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
            <div className="bg-white w-full rounded-t-[3rem] relative p-8 space-y-6 shadow-2xl animate-slide-up">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-black">點餐清單</h2><X onClick={()=>setIsCartOpen(false)} /></div>
              <div className="bg-amber-50 p-4 rounded-2xl flex gap-3 mb-4">
                <select value={orderType} onChange={e=>setOrderType(e.target.value)} className="bg-white rounded-xl p-2 text-xs font-bold border-none shadow-sm flex-1">
                  <option value="dineIn">內用</option>
                  <option value="takeout">外帶</option>
                </select>
                {orderType==='dineIn' ? (
                  <input type="text" placeholder="輸入桌號" value={tableNumber} onChange={e=>setTableNumber(e.target.value)} className="bg-white rounded-xl p-2 text-xs font-bold w-24 border-none shadow-sm" />
                ) : (
                  <input type="number" placeholder="手機末三碼" value={phoneSuffix} onChange={e=>setPhoneSuffix(e.target.value)} className="bg-white rounded-xl p-2 text-xs font-bold w-24 border-none shadow-sm" />
                )}
              </div>
              <div className="max-h-[40vh] overflow-y-auto space-y-6">
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm">{i.name}</div>
                      <div className="text-amber-800 text-xs font-black">$ {i.price * i.quantity}</div>
                    </div>
                    <div className="flex items-center bg-amber-50 rounded-full p-1 border border-amber-100">
                      <button onClick={()=>updateQuantity(i.id, -1)} className="bg-white w-7 h-7 rounded-full flex items-center justify-center text-amber-800 shadow-sm"><Minus size={14}/></button>
                      <span className="w-8 text-center font-bold">{i.quantity}</span>
                      <button onClick={()=>updateQuantity(i.id, 1)} className="bg-amber-800 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md"><Plus size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleSubmitOrder} className="w-full py-5 bg-amber-800 text-white rounded-3xl font-bold text-lg active:scale-95 shadow-xl">確認送出訂單 (${cart.reduce((s,i)=>s+(i.price*i.quantity),0)})</button>
            </div>
          </div>
        )}

        <aside className="hidden lg:flex w-96 bg-white border-l border-amber-100 fixed right-0 top-0 bottom-0 flex-col shadow-xl z-30">
          <div className="p-8 border-b border-amber-50 bg-[#FDFBF7] font-serif text-2xl font-black">您的 ASA 餐點</div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 space-y-4">
              <div className="flex gap-2 bg-white p-1 rounded-xl">
                <button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${orderType==='dineIn'?'bg-amber-800 text-white shadow-sm':'text-amber-300'}`}>內用</button>
                <button onClick={()=>setOrderType('takeout')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${orderType==='takeout'?'bg-amber-800 text-white shadow-sm':'text-amber-300'}`}>外帶</button>
              </div>
              {orderType==='dineIn' ? (
                <input type="text" placeholder="輸入桌號 (如 A1)" value={tableNumber} onChange={e=>setTableNumber(e.target.value)} className="w-full bg-white border-none rounded-2xl text-sm p-4 font-bold shadow-sm outline-none" />
              ) : (
                <input type="number" placeholder="手機末三碼" value={phoneSuffix} onChange={e=>setPhoneSuffix(e.target.value)} className="w-full bg-white border-none rounded-2xl text-sm p-4 font-bold shadow-sm outline-none" />
              )}
            </div>
            {cart.map(i => (
              <div key={i.id} className="flex justify-between items-center group">
                <div className="flex-1">
                  <div className="font-bold text-sm text-amber-900">{i.name}</div>
                  <div className="text-[10px] text-amber-500 font-bold">$ {i.price}</div>
                </div>
                <div className="flex items-center bg-amber-50 rounded-full p-1 border border-amber-100">
                  <button onClick={()=>updateQuantity(i.id, -1)} className="bg-white w-6 h-6 rounded-full flex items-center justify-center text-amber-800 shadow-sm"><Minus size={12}/></button>
                  <span className="w-6 text-center font-bold text-xs">{i.quantity}</span>
                  <button onClick={()=>updateQuantity(i.id, 1)} className="bg-amber-800 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md"><Plus size={12}/></button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-8 bg-[#FDFBF7] border-t border-amber-100 font-black text-amber-900">
            <div className="flex justify-between items-end mb-6 text-4xl">
              <span className="text-sm font-bold text-amber-300">總計</span>
              <span>$ {cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</span>
            </div>
            <button disabled={cart.length === 0} onClick={handleSubmitOrder} className="w-full py-5 bg-amber-800 text-white rounded-[2rem] font-bold text-lg hover:bg-amber-900 active:scale-95 transition-all disabled:opacity-30 shadow-xl">送出訂單</button>
          </div>
        </aside>

        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="absolute inset-0 bg-amber-900/40" onClick={() => setShowLoginModal(false)}></div>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==='Aeon.1388'){setSystemRole('kitchen');setShowLoginModal(false);} else if(passwordInput==='$Asasouthernaelly,1388'){setSystemRole('admin');setShowLoginModal(false);} else alert('密碼錯誤'); }} className="bg-white p-8 rounded-[3rem] relative z-10 w-full max-w-sm shadow-2xl">
              <h2 className="text-center font-bold mb-6 text-amber-900 uppercase tracking-widest">ASA 權限驗證</h2>
              <input type="password" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full border-2 border-amber-50 rounded-2xl p-4 text-center mb-4 outline-none focus:border-amber-800 transition-all" autoFocus />
              <button className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold">進入系統</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
       <header className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
          <h1 className="font-bold text-lg flex items-center gap-2 text-amber-500 uppercase tracking-widest"><ChefHat /> ASA {systemRole==='kitchen'?'後廚看板':'店長主控'}</h1>
          <button onClick={() => setSystemRole('customer')} className="text-xs bg-slate-800 px-4 py-2 rounded-lg font-bold">登出</button>
       </header>
       <main className="p-6 flex-1 max-w-7xl mx-auto w-full">
          {systemRole === 'kitchen' ? (
            <div className="space-y-8 animate-fade-in">
              <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar">
                {orders.filter(o => o.status === 'pending').map(order => (
                  <div key={order.id} className="w-80 bg-slate-800 rounded-2xl border-t-4 border-amber-500 shadow-2xl flex flex-col shrink-0">
                    <div className="p-4 border-b border-slate-700 font-black flex justify-between items-center text-amber-500">
                      <div>
                        <div className="text-xl uppercase">{order.table}</div>
                        <div className="text-[10px] text-slate-500">{order.date} {order.time}</div>
                      </div>
                      <span className="text-[10px] font-mono">#{order.id.slice(-4)}</span>
                    </div>
                    <div className="p-4 flex-1 space-y-3 font-bold">
                       {order.items.map((it, idx) => (
                         <div key={idx} className="flex justify-between border-b border-slate-700/30 pb-1">
                           <span>{it.name}</span>
                           <span className="text-amber-400">x{it.quantity}</span>
                         </div>
                       ))}
                    </div>
                    <div className="p-4 text-xs font-bold text-slate-400 border-t border-slate-700">總額: $ {order.total}</div>
                    <div className="p-4"><button onClick={async()=>await updateDoc(doc(db,'artifacts',appId,'public', 'data', 'orders', order.id),{status:'completed'})} className="w-full py-4 bg-amber-500 text-slate-900 font-bold rounded-xl active:scale-95 transition-transform">完成出餐</button></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 text-center text-slate-500 italic">
               報表與管理功能連線中... 點擊左側導航切換
            </div>
          )}
       </main>
    </div>
  );
}
