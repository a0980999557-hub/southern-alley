import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, X, Coffee, Cake, Soup, CheckCircle2, 
  Store, ChevronLeft, Image as ImageIcon, ClipboardList, Settings, 
  Leaf, Clock, Check, ChefHat, QrCode, Printer, Lock, LogOut, 
  Utensils, ShoppingBag, BarChart3, Receipt, Eye, EyeOff, Trash2, Smartphone, TrendingUp, Search, PackagePlus
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';

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
  if (n.includes('蛋糕') || n.includes('千層')) return "紅蕊層疊映纖指，幽香透出半殘霞。";
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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [tableNumber, setTableNumber] = useState('');
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [orderType, setOrderType] = useState('dineIn'); 
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const hotItems = useMemo(() => {
    const counts = {};
    orders.forEach(o => o.items.forEach(i => counts[i.id] = (counts[i.id] || 0) + i.quantity));
    const list = [];
    menuData.forEach(c => c.items.forEach(i => { if(counts[i.id]) list.push({name: i.name, count: counts[i.id]}); }));
    return list.sort((a,b)=>b.count-a.count).slice(0, 5);
  }, [orders, menuData]);

  const salesDetail = useMemo(() => {
    const detail = {};
    orders.forEach(o => { o.items.forEach(i => {
      if (!detail[i.id]) detail[i.id] = { name: i.name, qty: 0, subtotal: 0 };
      detail[i.id].qty += i.quantity;
      detail[i.id].subtotal += (i.price * i.quantity);
    });});
    return Object.values(detail);
  }, [orders]);

  // --- 重點：即時計算畫面上的「剩餘供應數」 ---
  const getDisplayStock = (item) => {
    if (item.stock === undefined) return null;
    const inCart = cart.find(c => c.id === item.id)?.quantity || 0;
    return Math.max(0, item.stock - inCart);
  };

  const addToCart = (item) => {
    const s = getDisplayStock(item);
    if (s !== null && s <= 0) return alert('此商品已達到今日供應上限！');
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id);
      if (ex) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return alert('您的購物車空空的喔！');
    if (orderType === 'dineIn' && !tableNumber) return alert('請輸入您的桌號');
    if (orderType === 'takeout' && phoneSuffix.length !== 3) return alert('請輸入手機末三碼');

    const ts = Date.now();
    const orderId = `ASA-${ts.toString().slice(-4)}`;
    
    try {
      // --- 重點：正式扣除雲端庫存數據 ---
      for (const item of cart) {
        if (item.stock !== undefined) {
          const cat = menuData.find(c => c.items.some(i => i.id === item.id));
          const updatedItems = cat.items.map(i => i.id === item.id ? { ...i, stock: i.stock - item.quantity } : i);
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'menu', cat.id), { items: updatedItems });
        }
      }

      const newOrder = { id: orderId, table: orderType==='takeout'?`外帶-${phoneSuffix}`:`桌號 ${tableNumber}`, items: cart, total: cart.reduce((s,i)=>s+(i.price*i.quantity),0), status: 'pending', date: new Date().toLocaleDateString('zh-TW'), time: new Date().toLocaleTimeString('zh-TW'), timestamp: ts };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), newOrder);
      setLastOrder(newOrder); setOrderStatus('success'); setIsCartOpen(false);
    } catch (e) { alert('送單失敗，請稍後再試'); }
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-bold text-amber-800 tracking-widest italic animate-pulse">ASA 空間載入中...</div>;

  if (systemRole === 'customer') {
    if (orderStatus === 'success') {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-amber-900">
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl text-center border border-amber-100 max-w-md w-full animate-fade-in">
            <CheckCircle2 className="text-amber-600 mx-auto mb-8" size={100} />
            <h2 className="text-4xl font-black mb-8 uppercase tracking-widest">點單成功</h2>
            <div className="bg-amber-50 p-8 rounded-[2rem] text-left space-y-4 mb-10 border border-amber-100 shadow-inner">
              <div className="text-sm text-amber-800 font-black border-b border-amber-200 pb-3">單號：{lastOrder?.id}</div>
              <div className="space-y-3">
                {lastOrder?.items.map((i,idx)=><div key={idx} className="text-base font-black flex justify-between"><span>{i.name} x {i.quantity}</span><span>$ {i.price*i.quantity}</span></div>)}
              </div>
              <div className="border-t border-amber-200 mt-6 pt-6 text-right font-black text-3xl text-amber-900 font-serif">$ {lastOrder?.total}</div>
            </div>
            <button onClick={()=>{setCart([]); setOrderStatus('ordering');}} className="w-full bg-amber-800 text-white py-6 rounded-[2rem] font-black text-xl active:scale-95 shadow-2xl">返回主選單</button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#FDFBF7] font-sans pb-40 flex flex-col text-amber-900 overflow-x-hidden">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-[100] border-b border-amber-100 px-6 py-5">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-amber-800 rounded-full flex items-center justify-center text-amber-50 shadow-2xl"><Store size={32} /></div>
              <h1 className="text-3xl md:text-4xl font-black font-serif tracking-tighter">ASA 南巷微光</h1>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={()=>setSearchResult('searching')} className="p-4 text-amber-400 hover:text-amber-800 flex items-center gap-2 text-sm font-black bg-amber-50 rounded-[1.5rem] transition-all"><Search size={22}/> 進度</button>
               <button onClick={()=>{setPasswordInput(''); setShowLoginModal(true);}} className="p-4 bg-amber-800 text-white rounded-[1.5rem] shadow-xl active:scale-90 flex items-center justify-center transition-all"><Lock size={28}/></button>
            </div>
          </div>
        </header>

        {searchResult && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="absolute inset-0 bg-black/60" onClick={()=>setSearchResult(null)}></div>
            <div className="bg-white p-10 rounded-[3rem] relative z-[201] w-full max-w-sm shadow-2xl animate-zoom-in">
               <div className="flex justify-between items-center mb-10"><h3 className="font-black text-2xl tracking-widest">訂單狀態</h3><X onClick={()=>setSearchResult(null)} className="cursor-pointer text-slate-300" size={32} /></div>
               <div className="flex gap-4 mb-8">
                 <input type="text" placeholder="單號末四碼" value={searchId} onChange={e=>setSearchId(e.target.value)} className="flex-1 bg-amber-50 p-6 rounded-3xl outline-none font-black text-xl" />
                 <button onClick={()=>{const f=orders.find(o=>o.id.includes(searchId)); setSearchResult(f||'none')}} className="bg-amber-800 text-white px-8 rounded-3xl active:scale-90 shadow-lg"><Search size={32}/></button>
               </div>
               {searchResult === 'none' && <div className="text-red-600 font-black text-center text-xl italic">找不到訂單，請檢查單號</div>}
               {searchResult && searchResult !== 'searching' && searchResult !== 'none' && (
                 <div className="bg-amber-50 p-8 rounded-[2.5rem] border-2 border-amber-200">
                    <div className="flex justify-between items-center mb-6">
                      <span className="font-black text-lg text-amber-900">{searchResult.id}</span>
                      <span className={`px-6 py-2 rounded-full text-xs font-black ${searchResult.status==='pending'?'bg-amber-200 text-amber-800 animate-pulse':'bg-green-600 text-white'}`}>{searchResult.status==='pending'?'製作中':'已出餐'}</span>
                    </div>
                    <div className="text-base font-black space-y-3 border-t border-amber-100 pt-6">
                      {searchResult.items.map((i,idx)=><div key={idx} className="flex justify-between"><span>{i.name}</span><span>x {i.quantity}</span></div>)}
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* 分類按鈕：針對手機版縮小框框，放大字體 */}
        <div className="bg-white/30 sticky top-[95px] z-20 border-b border-amber-50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6 overflow-x-auto no-scrollbar justify-start md:justify-center">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center flex-col justify-center rounded-full transition-all shadow-lg shrink-0 ${activeCategory === cat.id ? 'bg-amber-800 text-white w-20 h-20 md:w-28 md:h-28 scale-110 ring-4 ring-amber-100' : 'bg-white text-amber-600 border border-amber-100 w-20 h-20 md:w-28 md:h-28 opacity-80 hover:opacity-100'}`}>
                <span className="text-xs md:text-sm font-black px-3 text-center leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 max-w-7xl mx-auto px-6 py-16 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-14 lg:mr-[450px]">
          {menuData.find(c => c.id === activeCategory)?.items.map(item => {
            const currentLeft = getDisplayStock(item);
            const isHot = hotItems.some(h => h.name === item.name);
            return (
              <div key={item.id} className="bg-white rounded-[4rem] p-10 shadow-sm border border-amber-50 flex flex-col items-center text-center transition-all hover:shadow-2xl">
                <div className="relative w-48 h-48 rounded-full overflow-hidden border-8 border-[#FDFBF7] mb-10 shadow-2xl transition-transform hover:scale-105" onClick={() => setZoomImage(item.image)}><img src={item.image} className="w-full h-full object-cover" /></div>
                <div className="mb-10 w-full flex items-center justify-center gap-6">
                  <span className="text-4xl font-black text-amber-900 font-serif">${item.price}</span>
                  <button onClick={() => addToCart(item)} disabled={currentLeft===0} className={`px-10 py-4 rounded-[1.5rem] font-black text-base shadow-xl active:scale-90 transition-all ${currentLeft===0?'bg-amber-100 text-amber-300':'bg-amber-800 text-white hover:bg-amber-900'}`}>{currentLeft===0?'已售完':'加入'}</button>
                </div>
                <h3 className="text-3xl font-black tracking-tighter mb-4">{isHot && <span className="text-orange-500 mr-2">🔥 熱銷</span>}{item.name}</h3>
                <p className="text-sm text-amber-700/60 italic border-t border-amber-50 pt-6 h-16 leading-relaxed font-serif px-4">{item.poetry}</p>
                {/* 庫存顯示：超醒目大紅色 */}
                {item.stock !== undefined && (
                  <div className={`text-base font-black mt-8 px-8 py-3 rounded-full shadow-inner ${currentLeft > 0 ? 'bg-red-50 text-red-600 border-2 border-red-200' : 'bg-slate-50 text-slate-400'}`}>
                    庫存剩餘：{currentLeft}
                  </div>
                )}
              </div>
            );
          })}
        </main>

        {/* 手機版懸浮購物車 */}
        <div className="lg:hidden fixed bottom-12 left-8 right-8 z-[150]">
          <div className="bg-amber-900 rounded-[3rem] p-5 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-amber-800">
            <div className="flex items-center gap-6 pl-6 text-white"><ShoppingCart size={32} /> <div className="font-black text-3xl tracking-tighter">$ {cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</div></div>
            <button onClick={() => setIsCartOpen(true)} className="bg-white text-amber-900 px-14 py-6 rounded-[2rem] font-black text-lg active:scale-95 shadow-2xl">點餐明細</button>
          </div>
        </div>

        {isCartOpen && (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)}></div>
            <div className="bg-white w-full rounded-t-[5rem] relative p-12 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-12"><h2 className="text-4xl font-black tracking-tighter uppercase text-amber-900">ASA ORDER</h2><X onClick={()=>setIsCartOpen(false)} className="text-amber-200" size={40} /></div>
              <div className="bg-amber-50 p-10 rounded-[3rem] space-y-8 mb-12 border border-amber-100 shadow-inner">
                <div className="flex gap-4 bg-white p-2 rounded-[1.8rem] shadow-md">
                  <button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-5 text-sm font-black rounded-2xl transition-all ${orderType==='dineIn'?'bg-amber-800 text-white shadow-xl':'text-amber-300'}`}>內用</button>
                  <button onClick={()=>setOrderType('takeout')} className={`flex-1 py-5 text-sm font-black rounded-2xl transition-all ${orderType==='takeout'?'bg-amber-800 text-white shadow-xl':'text-amber-300'}`}>外帶</button>
                </div>
                <input type="text" placeholder={orderType==='dineIn'?'請輸入桌號':'手機末三碼'} value={orderType==='dineIn'?tableNumber:phoneSuffix} onChange={e=>orderType==='dineIn'?setTableNumber(e.target.value):setPhoneSuffix(e.target.value)} className="w-full bg-white rounded-[1.8rem] p-6 text-2xl font-black shadow-inner outline-none text-center placeholder-amber-100" />
              </div>
              <div className="space-y-10 mb-14">
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between items-center p-4 border-b border-amber-50">
                    <span className="text-2xl font-black text-amber-950">{i.name}</span>
                    <div className="flex items-center gap-8 bg-amber-50 px-6 py-3 rounded-full border border-amber-100">
                       <Minus size={28} className="text-amber-800" onClick={()=>setCart(prev=>prev.map(x=>x.id===i.id?{...x,quantity:Math.max(0,x.quantity-1)}:x).filter(x=>x.quantity>0))} />
                       <span className="text-3xl font-black min-w-[32px] text-center">{i.quantity}</span>
                       <Plus size={28} className="text-amber-800" onClick={()=>addToCart(i)} />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleSubmitOrder} className="w-full py-8 bg-amber-800 text-white rounded-[3rem] font-black text-3xl active:scale-95 shadow-2xl">正式送出訂單</button>
            </div>
          </div>
        )}

        <aside className="hidden lg:flex w-[450px] bg-white border-l border-amber-100 fixed right-0 top-0 bottom-0 flex-col shadow-2xl z-[50]">
          <div className="p-14 border-b border-amber-50 bg-[#FDFBF7] font-serif text-5xl font-black tracking-widest uppercase text-amber-900 text-center">ASA CART</div>
          <div className="flex-1 overflow-y-auto p-12 space-y-12">
            <div className="bg-amber-50 p-10 rounded-[3.5rem] space-y-8 shadow-inner border border-amber-100">
               <div className="flex gap-4 bg-white p-2 rounded-[2rem] shadow-md">
                  <button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-5 text-xs font-black rounded-2xl transition-all ${orderType==='dineIn'?'bg-amber-800 text-white shadow-xl':'text-amber-300'}`}>內用 (Dine-in)</button>
                  <button onClick={()=>setOrderType('takeout')} className={`flex-1 py-5 text-xs font-black rounded-2xl transition-all ${orderType==='takeout'?'bg-amber-800 text-white shadow-xl':'text-amber-300'}`}>外帶 (Take-out)</button>
               </div>
               <input type="text" placeholder={orderType==='dineIn'?'請輸入桌號':'手機末三碼'} value={orderType==='dineIn'?tableNumber:phoneSuffix} onChange={e=>orderType==='dineIn'?setTableNumber(e.target.value):setPhoneSuffix(e.target.value)} className="w-full bg-white rounded-2xl p-6 text-center text-xl font-black shadow-inner outline-none" />
            </div>
            <div className="space-y-10">
              {cart.map((i,idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-amber-100 shadow-sm transition-all hover:shadow-xl">
                  <div className="flex-1">
                    <div className="font-black text-2xl text-amber-950">{i.name}</div>
                    <div className="text-sm text-amber-500 font-black mt-1">$ {i.price}</div>
                  </div>
                  <div className="flex items-center gap-6 bg-amber-50 px-6 py-3 rounded-full border border-amber-100">
                     <Minus size={22} className="cursor-pointer text-amber-800" onClick={()=>setCart(prev=>prev.map(x=>x.id===i.id?{...x,quantity:Math.max(0,x.quantity-1)}:x).filter(x=>x.quantity>0))} />
                     <span className="font-black text-2xl min-w-[30px] text-center">{i.quantity}</span>
                     <Plus size={22} className="cursor-pointer text-amber-800" onClick={()=>addToCart(i)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-14 bg-[#FDFBF7] border-t border-amber-100 font-black text-amber-900">
            <div className="flex justify-between items-end mb-12 text-7xl font-serif">
               <span className="text-sm font-black text-amber-400 uppercase tracking-[0.6em] mb-4">TOTAL</span>
               <span>$ {cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</span>
            </div>
            <button disabled={cart.length===0} onClick={handleSubmitOrder} className="w-full py-10 bg-amber-800 text-white rounded-[3.5rem] font-black text-3xl hover:bg-amber-900 active:scale-95 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.3)] disabled:opacity-30">正式結帳送單</button>
          </div>
        </aside>

        {showLoginModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-2xl">
            <div className="absolute inset-0 bg-amber-900/60" onClick={() => setShowLoginModal(false)}></div>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==='Aeon.1388'){setSystemRole('kitchen');setShowLoginModal(false);} else if(passwordInput==='$Asasouthernaelly,1388'){setSystemRole('admin');setShowLoginModal(false);} else alert('密碼錯誤'); }} className="bg-white p-14 rounded-[5rem] relative z-10 w-full max-w-xl shadow-2xl border border-amber-100 animate-zoom-in">
              <h2 className="text-center font-black mb-12 text-amber-900 text-4xl tracking-widest uppercase">ASA ACCESS</h2>
              <div className="relative mb-10">
                 <input type={showPassword?'text':'password'} placeholder="請輸入通行密碼" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full border-4 border-amber-50 rounded-[2.5rem] p-9 text-center text-3xl font-black outline-none focus:border-amber-800 transition-all pr-24 shadow-inner" autoFocus />
                 <div className="absolute right-8 top-1/2 -translate-y-1/2 text-amber-200 cursor-pointer hover:text-amber-800" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={44}/>:<Eye size={44}/>}</div>
              </div>
              <button className="w-full bg-amber-800 text-white py-9 rounded-[2.5rem] font-black text-3xl shadow-2xl hover:bg-amber-900 active:scale-95 transition-all">正式進入 (ENTER)</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- 後廚系統 & 店長後台 (功能全面優化) ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
       <header className="p-10 border-b border-slate-800 flex justify-between items-center bg-slate-900/95 sticky top-0 z-50">
          <h1 className="font-black text-3xl flex items-center gap-5 text-amber-500 uppercase tracking-[0.3em]"><ChefHat size={48} /> ASA {systemRole==='kitchen'?'後廚看板':'店長主控室'}</h1>
          <button onClick={() => setSystemRole('customer')} className="text-xs bg-slate-800 px-10 py-5 rounded-3xl font-black text-slate-400 hover:text-white transition-all border border-slate-700">登出系統 (LOGOUT)</button>
       </header>
       <main className="p-10 flex-1 max-w-[2000px] mx-auto w-full overflow-y-auto">
          {systemRole === 'kitchen' ? (
            <div className="space-y-14 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="p-12 bg-slate-800/80 rounded-[4rem] border border-amber-500/20 shadow-2xl backdrop-blur-md">
                   <h2 className="text-amber-500 font-black mb-12 flex items-center gap-5 text-3xl uppercase tracking-widest"><TrendingUp size={40} /> 今日熱銷排行 (HOT 5)</h2>
                   <div className="space-y-5">{hotItems.map((h, i) => (<div key={i} className="bg-slate-900 p-8 rounded-3xl border-l-[16px] border-amber-500 flex justify-between items-center shadow-2xl"><span className="font-black text-2xl">#{i+1} {h.name}</span><span className="text-amber-400 font-black text-4xl">{h.count} <span className="text-sm text-slate-600 font-sans">份</span></span></div>))}</div>
                </div>
                <div className="p-12 bg-slate-800/80 rounded-[4rem] border border-amber-500/20 shadow-2xl backdrop-blur-md">
                   <h2 className="text-amber-500 font-black mb-12 flex items-center gap-5 text-3xl uppercase tracking-widest"><PackagePlus size={40} /> 甜點今日庫存管理</h2>
                   <div className="space-y-6">
                      {menuData.find(c=>c.id==='c3')?.items.map(i => (<div key={i.id} className="flex justify-between items-center bg-slate-700 p-8 rounded-3xl border border-slate-600"><span className="font-black text-xl">{i.name}</span><input type="number" value={i.stock} onChange={async(e)=>{ const u = menuData.find(c=>c.id==='c3').items.map(it=>it.id===i.id?{...it,stock:parseInt(e.target.value)}:it); await updateDoc(doc(db,'artifacts',appId,'public','data','menu','c3'),{items:u}); }} className="w-32 bg-slate-900 text-amber-400 rounded-2xl p-5 text-center font-black text-3xl border-none shadow-inner" /></div>))}
                   </div>
                </div>
              </div>
              <div className="flex gap-12 overflow-x-auto pb-14 no-scrollbar">
                {orders.filter(o => o.status === 'pending').map(order => (
                  <div key={order.id} className="w-[500px] bg-slate-800 rounded-[5rem] border-t-[12px] border-amber-500 shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex flex-col shrink-0 animate-fade-in hover:scale-105 transition-all">
                    <div className="p-10 border-b border-slate-700 font-black flex justify-between items-center text-amber-500">
                      <div><div className="text-4xl uppercase tracking-tighter">{order.table}</div><div className="text-xs text-slate-500 font-mono mt-3">{order.date} {order.time}</div></div>
                      <span className="bg-slate-900 px-6 py-3 rounded-2xl text-xs font-mono border border-slate-700 shadow-inner">#{order.id.slice(-4)}</span>
                    </div>
                    <div className="p-12 flex-1 space-y-8 font-black">
                       {order.items.map((it, idx) => <div key={idx} className="flex justify-between border-b border-slate-700/30 pb-4 text-2xl"><span>{it.name}</span><span className="text-amber-400 bg-slate-900 px-6 rounded-2xl shadow-lg">x {it.quantity}</span></div>)}
                    </div>
                    <div className="p-10 bg-slate-900/30 rounded-b-[5rem]"><button onClick={async()=>await updateDoc(doc(db,'artifacts',appId,'public', 'data', 'orders', order.id),{status:'completed'})} className="w-full py-10 bg-amber-500 text-slate-900 font-black rounded-[2.5rem] text-3xl shadow-2xl hover:bg-amber-400 active:scale-95 transition-all uppercase">出餐完成 (DONE)</button></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-14 animate-fade-in">
              {/* 報表系統 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                 <div className="bg-gradient-to-br from-blue-600 to-indigo-900 p-16 rounded-[5rem] shadow-2xl flex flex-col justify-between h-[400px] border-4 border-blue-500/20">
                    <span className="font-black text-blue-100 uppercase tracking-[0.5em] text-sm">CUMULATIVE REVENUE</span>
                    <h3 className="text-9xl font-black text-white tracking-tighter">$ {orders.reduce((s,o)=>s+o.total, 0).toLocaleString()}</h3>
                 </div>
                 <div className="bg-slate-800 p-16 rounded-[5rem] border-4 border-slate-700 shadow-2xl flex flex-col justify-between h-[400px]">
                    <span className="font-black text-slate-500 uppercase tracking-[0.5em] text-sm">TOTAL ORDERS</span>
                    <h3 className="text-9xl font-black text-amber-500 tracking-tighter">{orders.length} <span className="text-4xl text-slate-600">單</span></h3>
                 </div>
              </div>
            </div>
          )}
       </main>
    </div>
  );
}
