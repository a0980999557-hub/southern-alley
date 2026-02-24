import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, X, Coffee, Cake, Soup, CheckCircle2, 
  Store, ChevronLeft, Image as ImageIcon, ClipboardList, Settings, 
  Leaf, Clock, Check, ChefHat, QrCode, Printer, Lock, LogOut, 
  Utensils, ShoppingBag, BarChart3, Receipt, Eye, Trash2, Smartphone, TrendingUp, Search, PackagePlus
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

const generatePoetry = (n) => {
  if (n.includes('拿鐵')) return "露染紅瓣映晨光，海鹽輕吻拿鐵香。";
  if (n.includes('茶')) return "菊香幽遠沁心脾，柚影搖曳綠波間。";
  if (n.includes('蛋糕')) return "紅蕊層疊映纖指，幽香透出半殘霞。";
  if (n.includes('鍋燒')) return "墨香引路尋珍味，海潮湧入暖心田。";
  return "ASA 職人手作，溫暖每一刻微光時分。";
};

export default function CafeSystem() {
  const [user, setUser] = useState(null);
  const [systemRole, setSystemRole] = useState('customer'); 
  const [adminTab, setAdminTab] = useState('reports');
  const [menuData, setMenuData] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('c1');
  const [orderStatus, setOrderStatus] = useState('ordering'); 
  const [lastOrder, setLastOrder] = useState(null);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  
  const [tableNumber, setTableNumber] = useState('');
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [orderType, setOrderType] = useState('dineIn'); 
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [newItem, setNewItem] = useState({ categoryId: 'c1', name: '', price: '', poetry: '', image: '', stock: 0 });

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const menuRef = collection(db, 'artifacts', appId, 'public', 'data', 'menu');
    onSnapshot(menuRef, (snap) => {
      setMenuData(snap.docs.map(doc => doc.data()).sort((a,b) => a.id.localeCompare(b.id)));
      setIsDataLoaded(true);
    });
    const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    onSnapshot(ordersRef, (snap) => setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
  }, [user]);

  // 熱銷邏輯
  const hotItems = useMemo(() => {
    const counts = {};
    orders.forEach(o => o.items.forEach(i => counts[i.id] = (counts[i.id] || 0) + i.quantity));
    const list = [];
    menuData.forEach(c => c.items.forEach(i => { if(counts[i.id]) list.push({id: i.id, name: i.name, count: counts[i.id]}); }));
    return list.sort((a,b)=>b.count-a.count).slice(0, 5);
  }, [orders, menuData]);

  // 當日商品銷售明細
  const salesDetail = useMemo(() => {
    const detail = {};
    orders.forEach(o => {
      o.items.forEach(i => {
        if (!detail[i.id]) detail[i.id] = { name: i.name, qty: 0, subtotal: 0 };
        detail[i.id].qty += i.quantity;
        detail[i.id].subtotal += (i.price * i.quantity);
      });
    });
    return Object.values(detail);
  }, [orders]);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    if (orderType === 'dineIn' && !tableNumber) return alert('內用請輸入桌號');
    if (orderType === 'takeout' && phoneSuffix.length !== 3) return alert('外帶請輸入手機末三碼');

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const orderId = `ASA-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = { id: orderId, table: orderType==='takeout'?`外帶-${phoneSuffix}`:`桌號 ${tableNumber}`, items: cart, total: cart.reduce((s,i)=>s+(i.price*i.quantity),0), status: 'pending', time: now.toLocaleTimeString(), timestamp: now.getTime() };
    
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), newOrder);
    setLastOrder(newOrder);
    setOrderStatus('success');
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-bold text-amber-800 tracking-widest">ASA 重機引擎發動中...</div>;

  if (systemRole === 'customer') {
    if (orderStatus === 'success') {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-amber-900">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center border border-amber-100 max-w-sm w-full animate-fade-in">
            <CheckCircle2 className="text-amber-600 mx-auto mb-4" size={80} />
            <h2 className="text-2xl font-black mb-2 uppercase">訂單成功</h2>
            <div className="bg-amber-50 p-4 rounded-2xl my-6 text-left space-y-2 font-bold">
              <div className="text-xs text-amber-800 border-b border-amber-200 pb-1">專屬單號：{lastOrder?.id}</div>
              {lastOrder?.items.map((i,idx)=><div key={idx} className="text-[10px] flex justify-between"><span>{i.name} x {i.quantity}</span><span>$ {i.price*i.quantity}</span></div>)}
              <div className="pt-2 border-t border-amber-200 text-right text-lg">$ {lastOrder?.total}</div>
            </div>
            <button onClick={()=>{setCart([]); setOrderStatus('ordering');}} className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all">返回首頁</button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#FDFBF7] font-sans pb-32 flex flex-col text-amber-900">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-amber-100 px-4 py-4">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-800 rounded-full flex items-center justify-center text-amber-50 shadow-inner"><Store size={20} /></div>
              <h1 className="text-xl font-black tracking-widest font-serif">ASA 南巷微光</h1>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={()=>setSearchResult('searching')} className="p-2 text-amber-400 hover:text-amber-800 flex items-center gap-1 text-xs font-bold"><Search size={16}/> 進度查詢</button>
               <button onClick={()=>setShowLoginModal(true)} className="p-2 text-amber-200"><Lock size={18}/></button>
            </div>
          </div>
        </header>

        {searchResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="absolute inset-0 bg-black/60" onClick={()=>setSearchResult(null)}></div>
            <div className="bg-white p-8 rounded-[2.5rem] relative z-10 w-full max-w-sm animate-zoom-in">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-xl">訂單狀態查詢</h3>
                  <X onClick={()=>setSearchResult(null)} className="cursor-pointer" />
               </div>
               <div className="flex gap-2 mb-6">
                 <input type="text" placeholder="輸入單號末四碼" value={searchId} onChange={e=>setSearchId(e.target.value)} className="flex-1 bg-amber-50 p-4 rounded-2xl outline-none font-bold" />
                 <button onClick={()=>{const f=orders.find(o=>o.id.includes(searchId)); setSearchResult(f||'none')}} className="bg-amber-800 text-white px-6 rounded-2xl"><Search size={20}/></button>
               </div>
               {searchResult === 'none' && <div className="text-red-500 font-bold text-center">找不到此單號，請檢查輸入</div>}
               {searchResult && searchResult !== 'searching' && searchResult !== 'none' && (
                 <div className="bg-amber-50 p-6 rounded-3xl border-2 border-amber-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-black text-sm">{searchResult.id}</span>
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black ${searchResult.status==='pending'?'bg-amber-200 text-amber-800':'bg-green-600 text-white'}`}>
                        {searchResult.status==='pending'?'製作中':'已完成'}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold space-y-2">
                      {searchResult.items.map((i,idx)=><div key={idx} className="flex justify-between"><span>{i.name} x {i.quantity}</span></div>)}
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:mr-96">
          <div className="col-span-full flex gap-3 overflow-x-auto no-scrollbar pb-4 md:justify-center mb-4">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-6 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all lg:scale-90 ${activeCategory === cat.id ? 'bg-amber-800 text-white shadow-lg' : 'bg-white text-amber-600 border border-amber-100'}`}>
                {cat.name}
              </button>
            ))}
          </div>

          {menuData.find(c => c.id === activeCategory)?.items.map(item => {
            const inCart = cart.find(c => c.id === item.id)?.quantity || 0;
            const stockLeft = item.stock !== undefined ? Math.max(0, item.stock - inCart) : null;
            const isHot = hotItems.some(h => h.id === item.id);
            return (
              <div key={item.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-amber-50 flex flex-col items-center text-center transition-transform hover:scale-[1.02]">
                <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-amber-50 mb-3 shadow-md" onClick={() => setZoomImage(item.image)}>
                  <img src={item.image} className="w-full h-full object-cover" />
                </div>
                <div className="mb-4 w-full flex items-center justify-center gap-3">
                  <span className="text-xl font-black text-amber-800">${item.price}</span>
                  <button onClick={() => { if(stockLeft === 0) return; setCart([...cart, {...item, quantity: 1}]); }} disabled={stockLeft===0} className="bg-amber-800 text-white px-5 py-2 rounded-full font-bold text-[10px] active:scale-90 disabled:opacity-30">加入</button>
                </div>
                <h3 className="text-lg font-bold">{isHot && <span className="text-orange-500 mr-1 animate-pulse">🔥 熱銷</span>}{item.name}</h3>
                <p className="text-[10px] text-amber-700/50 italic mt-2 border-t border-amber-50 pt-2 h-7">{item.poetry}</p>
                {stockLeft !== null && <div className={`text-[10px] font-black mt-2 ${stockLeft > 0 ? 'text-amber-400' : 'text-red-500'}`}>供應餘：{stockLeft}</div>}
              </div>
            );
          })}
        </main>

        {/* 手機版懸浮購物車 - 確保在手機上一定看的到 */}
        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
          <div className="bg-amber-900 rounded-full p-2.5 flex items-center justify-between shadow-2xl border border-amber-800 animate-slide-up">
            <div className="flex items-center gap-4 pl-4 text-white">
              <div className="relative">
                <ShoppingCart size={24} />
                {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-amber-100 text-amber-900 text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">{cart.reduce((s,i)=>s+i.quantity,0)}</span>}
              </div>
              <div className="font-black text-xl">$ {cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</div>
            </div>
            <button disabled={cart.length === 0} onClick={() => setIsCartOpen(true)} className="bg-white text-amber-900 px-8 py-3 rounded-full font-black text-sm active:scale-95 transition-transform">點單明細</button>
          </div>
        </div>

        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
            <div className="bg-white w-full rounded-t-[3rem] relative p-8 animate-slide-up shadow-2xl">
              <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black">點餐清單</h2><X onClick={()=>setIsCartOpen(false)} /></div>
              <div className="bg-amber-50 p-4 rounded-3xl space-y-4 mb-6">
                <div className="flex gap-2 bg-white p-1 rounded-xl">
                  <button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${orderType==='dineIn'?'bg-amber-800 text-white shadow-sm':'text-amber-300'}`}>內用</button>
                  <button onClick={()=>setOrderType('takeout')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${orderType==='takeout'?'bg-amber-800 text-white shadow-sm':'text-amber-300'}`}>外帶</button>
                </div>
                <input type="text" placeholder={orderType==='dineIn'?'請輸入桌號':'手機末三碼'} value={orderType==='dineIn'?tableNumber:phoneSuffix} onChange={e=>orderType==='dineIn'?setTableNumber(e.target.value):setPhoneSuffix(e.target.value)} className="w-full bg-white rounded-2xl p-4 text-sm font-bold shadow-sm outline-none" />
              </div>
              <div className="max-h-[35vh] overflow-y-auto space-y-4 mb-6">
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between items-center font-bold">
                    <span>{i.name} x {i.quantity}</span>
                    <div className="flex items-center gap-3">
                       <Minus size={16} onClick={()=>{const nc=[...cart]; const idx=nc.findIndex(x=>x.id===i.id); if(nc[idx].quantity>1)nc[idx].quantity--; else nc.splice(idx,1); setCart(nc);}} />
                       <span>{i.quantity}</span>
                       <Plus size={16} onClick={()=>{const nc=[...cart]; const idx=nc.findIndex(x=>x.id===i.id); nc[idx].quantity++; setCart(nc);}} />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleSubmitOrder} className="w-full py-5 bg-amber-800 text-white rounded-[2rem] font-black text-lg active:scale-95 shadow-xl">送出訂單</button>
            </div>
          </div>
        )}

        <aside className="hidden lg:flex w-96 bg-white border-l border-amber-100 fixed right-0 top-0 bottom-0 flex-col shadow-xl z-30">
          <div className="p-8 border-b border-amber-50 bg-[#FDFBF7] font-serif text-2xl font-black tracking-widest uppercase">ASA 購物車</div>
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="bg-amber-50 p-6 rounded-[2rem] space-y-4 shadow-inner">
              <div className="flex gap-2 bg-white p-1 rounded-xl">
                <button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${orderType==='dineIn'?'bg-amber-800 text-white':'text-amber-300'}`}>內用</button>
                <button onClick={()=>setOrderType('takeout')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${orderType==='takeout'?'bg-amber-800 text-white':'text-amber-300'}`}>外帶</button>
              </div>
              <input type="text" placeholder={orderType==='dineIn'?'輸入桌號 (如 A1)':'手機末三碼'} value={orderType==='dineIn'?tableNumber:phoneSuffix} onChange={e=>orderType==='dineIn'?setTableNumber(e.target.value):setPhoneSuffix(e.target.value)} className="w-full bg-white border-none rounded-2xl text-sm p-4 font-bold shadow-sm outline-none" />
            </div>
            {cart.map((i,idx) => (
              <div key={idx} className="flex justify-between items-center font-bold text-sm">
                <span>{i.name} x {i.quantity}</span>
                <div className="flex gap-2">
                   <Minus size={14} className="cursor-pointer" onClick={()=>setCart(prev=>prev.map(x=>x.id===i.id?{...x,quantity:Math.max(0,x.quantity-1)}:x).filter(x=>x.quantity>0))} />
                   <Plus size={14} className="cursor-pointer" onClick={()=>setCart(prev=>prev.map(x=>x.id===i.id?{...x,quantity:x.quantity+1}:x))} />
                </div>
              </div>
            ))}
          </div>
          <div className="p-8 bg-[#FDFBF7] border-t border-amber-100 font-black text-amber-900 text-4xl">
            $ {cart.reduce((s,i)=>s+(i.price*i.quantity),0)}
            <button disabled={cart.length===0} onClick={handleSubmitOrder} className="w-full mt-6 py-5 bg-amber-800 text-white rounded-[2rem] font-bold text-lg hover:bg-amber-900 active:scale-95 transition-all shadow-xl">送出訂單</button>
          </div>
        </aside>

        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="absolute inset-0 bg-amber-900/40" onClick={() => setShowLoginModal(false)}></div>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==='Aeon.1388'){setSystemRole('kitchen');setShowLoginModal(false);} else if(passwordInput==='$Asasouthernaelly,1388'){setSystemRole('admin');setShowLoginModal(false);} else alert('密碼錯誤'); }} className="bg-white p-8 rounded-[3rem] relative z-10 w-full max-w-sm">
              <h2 className="text-center font-bold mb-6 text-amber-900 uppercase tracking-widest">系統驗證</h2>
              <input type="password" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full border-2 border-amber-50 rounded-2xl p-4 text-center mb-4" autoFocus />
              <button className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold">進入系統</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
       <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/95 sticky top-0 z-20">
          <h1 className="font-bold text-lg flex items-center gap-2 text-amber-500 uppercase tracking-widest"><ChefHat /> ASA {systemRole==='kitchen'?'後廚看板':'店長主控'}</h1>
          <button onClick={() => setSystemRole('customer')} className="text-xs bg-slate-800 px-4 py-2 rounded-lg font-bold">登出系統</button>
       </header>

       <main className="p-6 flex-1 max-w-7xl mx-auto w-full overflow-y-auto">
          {systemRole === 'kitchen' && (
            <div className="space-y-8 animate-fade-in">
              {/* --- 熱銷與庫存管理 (後廚置頂) --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-slate-800 rounded-3xl border border-amber-500/20">
                   <h2 className="text-amber-500 font-black mb-6 flex items-center gap-2 tracking-widest uppercase"><TrendingUp size={24} /> 今日熱銷排行</h2>
                   <div className
