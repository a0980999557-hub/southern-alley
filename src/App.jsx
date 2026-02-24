import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, X, Coffee, Cake, Soup, CheckCircle2, 
  Store, ChevronLeft, Image as ImageIcon, ClipboardList, Settings, 
  Leaf, Clock, Check, ChefHat, QrCode, Printer, Lock, LogOut, 
  Utensils, ShoppingBag, BarChart3, Receipt, Eye, EyeOff, Trash2, Smartphone, TrendingUp, Search, PackagePlus
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
    orders.forEach(o => {
      o.items.forEach(i => {
        if (!detail[i.id]) detail[i.id] = { name: i.name, qty: 0, subtotal: 0 };
        detail[i.id].qty += i.quantity;
        detail[i.id].subtotal += (i.price * i.quantity);
      });
    });
    return Object.values(detail);
  }, [orders]);

  const getStock = (item) => {
    if (item.stock === undefined) return null;
    const inCart = cart.find(c => c.id === item.id)?.quantity || 0;
    return Math.max(0, item.stock - inCart);
  };

  const addToCart = (item) => {
    const s = getStock(item);
    if (s !== null && s <= 0) return alert('此商品今日已售罄！');
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id);
      if (ex) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return alert('購物車是空的喔！');
    if (orderType === 'dineIn' && !tableNumber) return alert('請輸入您的桌號');
    if (orderType === 'takeout' && phoneSuffix.length !== 3) return alert('請輸入手機末三碼');
    const ts = Date.now();
    const orderId = `ASA-${ts.toString().slice(-4)}`;
    const newOrder = { id: orderId, table: orderType==='takeout'?`外帶-${phoneSuffix}`:`桌號 ${tableNumber}`, items: cart, total: cart.reduce((s,i)=>s+(i.price*i.quantity),0), status: 'pending', date: new Date().toLocaleDateString('zh-TW'), time: new Date().toLocaleTimeString('zh-TW'), timestamp: ts };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), newOrder);
    setLastOrder(newOrder); setOrderStatus('success'); setIsCartOpen(false);
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-bold text-amber-800 tracking-widest italic">ASA 質感空間載入中...</div>;

  if (systemRole === 'customer') {
    if (orderStatus === 'success') {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-amber-900">
          <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl text-center border border-amber-100 max-w-sm w-full animate-fade-in">
            <CheckCircle2 className="text-amber-600 mx-auto mb-6" size={90} />
            <h2 className="text-3xl font-black mb-6 uppercase tracking-widest">訂單成功</h2>
            <div className="bg-amber-50 p-6 rounded-3xl text-left space-y-4 mb-8 border border-amber-100">
              <div className="text-sm text-amber-800 font-black border-b border-amber-200 pb-2">單號：{lastOrder?.id}</div>
              <div className="space-y-2">
                {lastOrder?.items.map((i,idx)=><div key={idx} className="text-sm font-bold flex justify-between"><span>{i.name} x {i.quantity}</span><span>$ {i.price*i.quantity}</span></div>)}
              </div>
              <div className="border-t border-amber-200 mt-4 pt-4 text-right font-black text-2xl text-amber-900">$ {lastOrder?.total}</div>
            </div>
            <button onClick={()=>{setCart([]); setOrderStatus('ordering');}} className="w-full bg-amber-800 text-white py-5 rounded-2xl font-black text-lg active:scale-95 shadow-xl">返回首頁</button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#FDFBF7] font-sans pb-32 flex flex-col text-amber-900">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-[100] border-b border-amber-100 px-6 py-5">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-800 rounded-full flex items-center justify-center text-amber-50 shadow-2xl border border-amber-900/20"><Store size={28} /></div>
              <h1 className="text-2xl md:text-3xl font-black font-serif tracking-tighter">ASA 南巷微光</h1>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={()=>setSearchResult('searching')} className="p-4 text-amber-400 hover:text-amber-800 flex items-center gap-2 text-sm font-black bg-amber-50 rounded-2xl transition-all"><Search size={20}/> 進度查詢</button>
               <button onClick={()=>{setPasswordInput(''); setShowLoginModal(true);}} className="p-4 bg-amber-800 text-white rounded-2xl shadow-xl hover:bg-amber-900 transition-all flex items-center justify-center"><Lock size={24}/></button>
            </div>
          </div>
        </header>

        {searchResult && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="absolute inset-0 bg-black/60" onClick={()=>setSearchResult(null)}></div>
            <div className="bg-white p-10 rounded-[3rem] relative z-[201] w-full max-w-md shadow-2xl animate-zoom-in">
               <div className="flex justify-between items-center mb-8"><h3 className="font-black text-2xl tracking-widest">訂單進度</h3><X onClick={()=>setSearchResult(null)} className="cursor-pointer text-slate-300 hover:text-amber-800" size={32} /></div>
               <div className="flex gap-3 mb-8">
                 <input type="text" placeholder="末四碼" value={searchId} onChange={e=>setSearchId(e.target.value)} className="flex-1 bg-amber-50 p-5 rounded-2xl outline-none font-black text-lg" />
                 <button onClick={()=>{const f=orders.find(o=>o.id.includes(searchId)); setSearchResult(f||'none')}} className="bg-amber-800 text-white px-8 rounded-2xl shadow-lg active:scale-90"><Search size={28}/></button>
               </div>
               {searchResult === 'none' && <div className="text-red-600 font-black text-center text-lg italic">查無此訂單單號</div>}
               {searchResult && searchResult !== 'searching' && searchResult !== 'none' && (
                 <div className="bg-amber-50 p-8 rounded-[2rem] border border-amber-200 shadow-inner">
                    <div className="flex justify-between items-center mb-6">
                      <span className="font-black text-lg text-amber-900">{searchResult.id}</span>
                      <span className={`px-5 py-2 rounded-full text-xs font-black ${searchResult.status==='pending'?'bg-amber-200 text-amber-800 animate-pulse':'bg-green-600 text-white'}`}>{searchResult.status==='pending'?'職人製作中':'餐點已完成'}</span>
                    </div>
                    <div className="text-sm font-bold space-y-3 border-t border-amber-100 pt-5">
                      {searchResult.items.map((i,idx)=><div key={idx} className="flex justify-between"><span>{i.name}</span><span>x {i.quantity}</span></div>)}
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* 分類按鈕：針對手機版縮小框框，放大字體 */}
        <div className="bg-white/30 sticky top-[92px] z-20 border-b border-amber-50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-6 flex gap-4 overflow-x-auto no-scrollbar justify-start md:justify-center">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center flex-col justify-center rounded-full whitespace-nowrap transition-all shadow-md shrink-0 ${activeCategory === cat.id ? 'bg-amber-800 text-white w-20 h-20 md:w-24 md:h-24 scale-105' : 'bg-white text-amber-600 border border-amber-100 w-20 h-20 md:w-24 md:h-24 opacity-80 hover:opacity-100'}`}>
                <span className="text-xs md:text-sm font-black px-2 text-center leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 lg:mr-[420px]">
          {menuData.find(c => c.id === activeCategory)?.items.map(item => {
            const left = getStock(item);
            const isHot = hotItems.some(h => h.name === item.name);
            return (
              <div key={item.id} className="bg-white rounded-[3.5rem] p-8 shadow-sm border border-amber-50 flex flex-col items-center text-center transition-all hover:shadow-2xl">
                <div className="relative w-44 h-44 rounded-full overflow-hidden border-8 border-[#FDFBF7] mb-8 shadow-xl" onClick={() => setZoomImage(item.image)}><img src={item.image} className="w-full h-full object-cover" /></div>
                <div className="mb-8 w-full flex items-center justify-center gap-5">
                  <span className="text-3xl font-black text-amber-900 font-serif">${item.price}</span>
                  <button onClick={() => addToCart(item)} disabled={left===0} className={`px-8 py-3 rounded-full font-black text-sm shadow-lg active:scale-90 transition-all ${left===0?'bg-amber-100 text-amber-300':'bg-amber-800 text-white hover:bg-amber-900'}`}>{left===0?'售完':'加入'}</button>
                </div>
                <h3 className="text-2xl font-black tracking-tighter mb-2">{isHot && <span className="text-orange-500 mr-2">🔥 熱銷</span>}{item.name}</h3>
                <p className="text-xs text-amber-700/60 italic mt-3 border-t border-amber-50 pt-4 h-12 leading-relaxed font-serif px-2">{item.poetry}</p>
                {/* 庫存顯示優化：紅色且大字 */}
                {left !== null && <div className={`text-xs font-black mt-6 px-5 py-2 rounded-full shadow-inner ${left > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-400'}`}>今日庫存餘額：{left}</div>}
              </div>
            );
          })}
        </main>

        {/* 手機版底部購物車 */}
        <div className="lg:hidden fixed bottom-10 left-6 right-6 z-[150]">
          <div className="bg-amber-900 rounded-[2.5rem] p-4 flex items-center justify-between shadow-2xl border border-amber-800">
            <div className="flex items-center gap-5 pl-6 text-white"><ShoppingCart size={28} /> <div className="font-black text-2xl tracking-tighter">$ {cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</div></div>
            <button onClick={() => setIsCartOpen(true)} className="bg-white text-amber-900 px-12 py-5 rounded-[1.8rem] font-black text-base active:scale-95 shadow-2xl">點餐明細</button>
          </div>
        </div>

        {isCartOpen && (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)}></div>
            <div className="bg-white w-full rounded-t-[4rem] relative p-10 shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-10"><h2 className="text-3xl font-black tracking-tighter uppercase text-amber-900">ASA ORDER</h2><X onClick={()=>setIsCartOpen(false)} className="text-amber-200" size={32} /></div>
              <div className="bg-amber-50 p-8 rounded-[2.5rem] space-y-6 mb-10 border border-amber-100 shadow-inner">
                <div className="flex gap-4 bg-white p-2 rounded-2xl shadow-sm">
                  <button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-4 text-sm font-black rounded-xl transition-all ${orderType==='dineIn'?'bg-amber-800 text-white shadow-md':'text-amber-300'}`}>內用</button>
                  <button onClick={()=>setOrderType('takeout')} className={`flex-1 py-4 text-sm font-black rounded-xl transition-all ${orderType==='takeout'?'bg-amber-800 text-white shadow-md':'text-amber-300'}`}>外帶</button>
                </div>
                <input type="text" placeholder={orderType==='dineIn'?'請輸入您的桌號':'手機末三碼'} value={orderType==='dineIn'?tableNumber:phoneSuffix} onChange={e=>orderType==='dineIn'?setTableNumber(e.target.value):setPhoneSuffix(e.target.value)} className="w-full bg-white rounded-2xl p-5 text-lg font-black shadow-sm outline-none text-center placeholder-amber-200" />
              </div>
              <div className="space-y-8 mb-12 px-2">
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between items-center">
                    <span className="text-xl font-black text-amber-950">{i.name}</span>
                    <div className="flex items-center gap-6 bg-amber-50 px-5 py-2 rounded-full border border-amber-100 shadow-sm">
                       <Minus size={22} className="text-amber-800 cursor-pointer" onClick={()=>setCart(prev=>prev.map(x=>x.id===i.id?{...x,quantity:Math.max(0,x.quantity-1)}:x).filter(x=>x.quantity>0))} />
                       <span className="text-xl font-black min-w-[24px] text-center">{i.quantity}</span>
                       <Plus size={22} className="text-amber-800 cursor-pointer" onClick={()=>addToCart(i)} />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleSubmitOrder} className="w-full py-7 bg-amber-800 text-white rounded-[2.5rem] font-black text-2xl active:scale-95 shadow-2xl">正式送出訂單</button>
            </div>
          </div>
        )}

        {/* 電腦版側邊欄 */}
        <aside className="hidden lg:flex w-[420px] bg-white border-l border-amber-100 fixed right-0 top-0 bottom-0 flex-col shadow-2xl z-[50]">
          <div className="p-12 border-b border-amber-50 bg-[#FDFBF7] font-serif text-4xl font-black tracking-widest uppercase text-amber-900 text-center">ASA CART</div>
          <div className="flex-1 overflow-y-auto p-12 space-y-12">
            <div className="bg-amber-50 p-8 rounded-[3rem] space-y-6 shadow-inner border border-amber-100">
               <div className="flex gap-4 bg-white p-2 rounded-[1.5rem] shadow-sm">
                  <button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-4 text-xs font-black rounded-xl transition-all ${orderType==='dineIn'?'bg-amber-800 text-white shadow-md':'text-amber-300'}`}>內用 (Dine-in)</button>
                  <button onClick={()=>setOrderType('takeout')} className={`flex-1 py-4 text-xs font-black rounded-xl transition-all ${orderType==='takeout'?'bg-amber-800 text-white shadow-md':'text-amber-300'}`}>外帶 (Take-out)</button>
               </div>
               <input type="text" placeholder={orderType==='dineIn'?'請輸入桌號':'手機末三碼'} value={orderType==='dineIn'?tableNumber:phoneSuffix} onChange={e=>orderType==='dineIn'?setTableNumber(e.target.value):setPhoneSuffix(e.target.value)} className="w-full bg-white rounded-2xl p-5 text-center text-sm font-black shadow-sm outline-none" />
            </div>
            <div className="space-y-8">
              {cart.map((i,idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-6 rounded-3xl border border-amber-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex-1">
                    <div className="font-black text-lg text-amber-950">{i.name}</div>
                    <div className="text-xs text-amber-500 font-bold">$ {i.price}</div>
                  </div>
                  <div className="flex items-center gap-4 bg-amber-50 px-4 py-2 rounded-full border border-amber-100">
                     <Minus size={18} className="cursor-pointer text-amber-800" onClick={()=>setCart(prev=>prev.map(x=>x.id===i.id?{...x,quantity:Math.max(0,x.quantity-1)}:x).filter(x=>x.quantity>0))} />
                     <span className="font-black text-lg">{i.quantity}</span>
                     <Plus size={18} className="cursor-pointer text-amber-800" onClick={()=>addToCart(i)} />
                  </div>
                </div>
              ))}
              {cart.length === 0 && <div className="text-center text-amber-200 py-16 italic font-black text-sm uppercase tracking-widest">Cart is empty</div>}
            </div>
          </div>
          <div className="p-12 bg-[#FDFBF7] border-t border-amber-100 font-black text-amber-900">
            <div className="flex justify-between items-end mb-10 text-6xl font-serif">
               <span className="text-xs font-black text-amber-400 uppercase tracking-[0.4em] mb-3">Total</span>
               <span>$ {cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</span>
            </div>
            <button disabled={cart.length===0} onClick={handleSubmitOrder} className="w-full py-8 bg-amber-800 text-white rounded-[2.5rem] font-black text-2xl hover:bg-amber-900 active:scale-95 transition-all shadow-2xl disabled:opacity-30">正式結帳送單</button>
          </div>
        </aside>

        {showLoginModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-xl">
            <div className="absolute inset-0 bg-amber-900/60" onClick={() => setShowLoginModal(false)}></div>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==='Aeon.1388'){setSystemRole('kitchen');setShowLoginModal(false);} else if(passwordInput==='$Asasouthernaelly,1388'){setSystemRole('admin');setShowLoginModal(false);} else alert('密碼錯誤'); }} className="bg-white p-12 rounded-[4rem] relative z-10 w-full max-w-lg shadow-2xl border border-amber-100 animate-zoom-in">
              <h2 className="text-center font-black mb-10 text-amber-900 text-3xl tracking-widest uppercase">ASA 權限驗證</h2>
              <div className="relative mb-8">
                 <input type={showPassword?'text':'password'} placeholder="請輸入通行密碼" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full border-4 border-amber-50 rounded-[2rem] p-7 text-center text-2xl font-black outline-none focus:border-amber-800 transition-all pr-20 shadow-inner" autoFocus />
                 <div className="absolute right-6 top-1/2 -translate-y-1/2 text-amber-200 cursor-pointer hover:text-amber-800" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={32}/>:<Eye size={32}/>}</div>
              </div>
              <button className="w-full bg-amber-800 text-white py-7 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-amber-900 active:scale-95 transition-all">正式登入 (LOGIN)</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- 後廚與管理者 (保持原本精準功能) ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
       <header className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/95 sticky top-0 z-50">
          <h1 className="font-black text-2xl flex items-center gap-4 text-amber-500 uppercase tracking-[0.2em]"><ChefHat size={36} /> ASA {systemRole==='kitchen'?'後廚看板':'店長主控室'}</h1>
          <button onClick={() => setSystemRole('customer')} className="text-xs bg-slate-800 px-8 py-4 rounded-2xl font-black text-slate-400 hover:text-white transition-all border border-slate-700">登出系統 (LOGOUT)</button>
       </header>
       <main className="p-8 flex-1 max-w-[1800px] mx-auto w-full overflow-y-auto">
          {systemRole === 'kitchen' ? (
            <div className="space-y-12 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="p-10 bg-slate-800/80 rounded-[3rem] border border-amber-500/20 shadow-2xl backdrop-blur-md">
                   <h2 className="text-amber-500 font-black mb-10 flex items-center gap-4 text-2xl uppercase tracking-widest"><TrendingUp size={32} /> 今日熱銷排行 (HOT 5)</h2>
                   <div className="space-y-4">{hotItems.map((h, i) => (<div key={i} className="bg-slate-900 p-6 rounded-2xl border-l-[12px] border-amber-500 flex justify-between items-center shadow-lg"><span className="font-black text-xl">#{i+1} {h.name}</span><span className="text-amber-400 font-black text-3xl">{h.count} <span className="text-xs text-slate-600">份</span></span></div>))}</div>
                </div>
                <div className="p-10 bg-slate-800/80 rounded-[3rem] border border-amber-500/20 shadow-2xl backdrop-blur-md">
                   <h2 className="text-amber-500 font-black mb-10 flex items-center gap-4 text-2xl uppercase tracking-widest"><PackagePlus size={32} /> 甜點庫存管理</h2>
                   <div className="space-y-5">{menuData.find(c=>c.id==='c3')?.items.map(i => (<div key={i.id} className="flex justify-between items-center bg-slate-700 p-6 rounded-2xl border border-slate-600"><span className="font-black text-lg">{i.name}</span><input type="number" value={i.stock} onChange={async(e)=>{ const u = menuData.find(c=>c.id==='c3').items.map(it=>it.id===i.id?{...it,stock:parseInt(e.target.value)}:it); await updateDoc(doc(db,'artifacts',appId,'public','data','menu','c3'),{items:u}); }} className="w-28 bg-slate-900 text-amber-400 rounded-xl p-4 text-center font-black text-2xl border-none shadow-inner" /></div>))}</div>
                </div>
              </div>
              <div className="flex gap-10 overflow-x-auto pb-12 no-scrollbar">
                {orders.filter(o => o.status === 'pending').map(order => (
                  <div key={order.id} className="w-[420px] bg-slate-800 rounded-[4rem] border-t-[10px] border-amber-500 shadow-2xl flex flex-col shrink-0 animate-fade-in hover:scale-105 transition-transform">
                    <div className="p-8 border-b border-slate-700 font-black flex justify-between items-center text-amber-500">
                      <div><div className="text-3xl uppercase tracking-tighter">{order.table}</div><div className="text-xs text-slate-500 font-mono mt-2">{order.date} {order.time}</div></div>
                      <span className="bg-slate-900 px-4 py-2 rounded-xl text-xs font-mono border border-slate-700 shadow-inner">#{order.id.slice(-4)}</span>
                    </div>
                    <div className="p-10 flex-1 space-y-5 font-black">
                       {order.items.map((it, idx) => <div key={idx} className="flex justify-between border-b border-slate-700/30 pb-3 text-xl"><span>{it.name}</span><span className="text-amber-400 bg-slate-900 px-4 rounded-xl shadow-md">x {it.quantity}</span></div>)}
                    </div>
                    <div className="p-8 bg-slate-900/30 rounded-b-[4rem]"><button onClick={async()=>await updateDoc(doc(db,'artifacts',appId,'public', 'data', 'orders', order.id),{status:'completed'})} className="w-full py-7 bg-amber-500 text-slate-900 font-black rounded-3xl text-2xl shadow-2xl hover:bg-amber-400 active:scale-95 transition-all uppercase">出餐完成 (DONE)</button></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-12 animate-fade-in">
              <div className="flex gap-6 bg-slate-800 p-3 rounded-[2.5rem] w-fit border border-slate-700 shadow-2xl">
                <button onClick={()=>setAdminTab('reports')} className={`px-14 py-4 rounded-2xl text-base font-black transition-all ${adminTab==='reports'?'bg-blue-600 text-white shadow-2xl':'text-slate-400 hover:text-white'}`}>報表分析 (ANALYTICS)</button>
                <button onClick={()=>setAdminTab('products')} className={`px-14 py-4 rounded-2xl text-base font-black transition-all ${adminTab==='products'?'bg-blue-600 text-white shadow-2xl':'text-slate-400 hover:text-white'}`}>商品管理 (INVENTORY)</button>
              </div>
              {adminTab === 'reports' ? (
                <div className="space-y-12">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-900 p-16 rounded-[4rem] shadow-2xl flex flex-col justify-between h-80 border-4 border-blue-500/20"><span className="font-black text-blue-100 uppercase tracking-[0.3em] text-xs">累計營業收入</span><h3 className="text-8xl font-black text-white tracking-tighter">$ {orders.reduce((s,o)=>s+o.total, 0).toLocaleString()}</h3></div>
                    <div className="bg-slate-800 p-16 rounded-[4rem] border-4 border-slate-700 flex flex-col justify-between h-80 shadow-2xl"><span className="font-black text-slate-500 uppercase tracking-[0.3em] text-xs">總結帳單數</span><h3 className="text-8xl font-black text-amber-500 tracking-tighter">{orders.length} <span className="text-3xl text-slate-600">單</span></h3></div>
                  </div>
                  <div className="bg-slate-800 p-12 rounded-[4rem] border border-slate-700 shadow-2xl">
                     <h2 className="text-3xl font-black mb-12 text-blue-400 flex items-center gap-5 uppercase tracking-widest"><BarChart3 size={36} /> 品項銷量數據明細報表</h2>
                     <table className="w-full text-left font-black"><thead><tr className="text-slate-500 border-b border-slate-700 text-sm uppercase tracking-[0.2em]"><th className="pb-8">商品名稱 (NAME)</th><th className="pb-8 text-center">總銷量 (QTY)</th><th className="pb-8 text-right">小計金額 (SUBTOTAL)</th></tr></thead><tbody>{salesDetail.map((s,i)=>(<tr key={i} className="border-b border-slate-700/30 text-2xl hover:bg-slate-700/40 transition-colors"><td className="py-8">{s.name}</td><td className="py-8 text-center text-amber-500">{s.qty} <span className="text-sm">份</span></td><td className="py-8 text-right text-blue-400">$ {s.subtotal.toLocaleString()}</td></tr>))}</tbody></table>
                  </div>
                </div>
              ) : (
                <div className="space-y-12">
                  <div className="bg-slate-800 p-16 rounded-[4rem] border border-slate-700 shadow-2xl">
                    <h2 className="text-3xl font-black mb-12 flex items-center gap-5 text-blue-400 uppercase tracking-[0.2em]"><PackagePlus size={44} /> 新增 ASA 品牌商品上架</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                      <div className="space-y-3"><label className="text-xs font-black text-slate-500 ml-4">分類類別</label><select value={newItem.categoryId} onChange={e=>setNewItem({...newItem, categoryId: e.target.value})} className="w-full bg-slate-900 p-6 rounded-3xl border-none font-black text-lg shadow-inner">{menuData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                      <div className="space-y-3"><label className="text-xs font-black text-slate-500 ml-4">商品品名</label><input type="text" placeholder="輸入名稱" value={newItem.name} onChange={e=>{const n=e.target.value; setNewItem({...newItem, name:n, poetry:generatePoetry(n)});}} className="w-full bg-slate-900 p-6 rounded-3xl border-none font-black text-lg shadow-inner" /></div>
                      <div className="space-y-3"><label className="text-xs font-black text-slate-500 ml-4">商品單價</label><input type="number" placeholder="單價" value={newItem.price} onChange={e=>setNewItem({...newItem, price:e.target.value})} className="w-full bg-slate-900 p-6 rounded-3xl border-none font-black text-lg shadow-inner" /></div>
                      <div className="col-span-full space-y-3"><label className="text-xs font-black text-slate-500 ml-4">AI 智能詩詞發想 (可編輯)</label><input type="text" value={newItem.poetry} onChange={e=>setNewItem({...newItem, poetry:e.target.value})} className="w-full bg-slate-900 p-6 rounded-3xl border border-blue-900/50 italic text-blue-200 text-lg shadow-inner font-serif" /></div>
                      <div className="col-span-full space-y-3"><label className="text-xs font-black text-slate-500 ml-4">商品照片 URL (建議 Unsplash 網址)</label><input type="text" placeholder="網址" value={newItem.image} onChange={e=>setNewItem({...newItem, image:e.target.value})} className="w-full bg-slate-900 p-6 rounded-3xl border-none font-black text-lg shadow-inner" /></div>
                      <button onClick={async()=>{ const cat = menuData.find(c=>c.id===newItem.categoryId); const it = { ...newItem, id: `m_${Date.now()}`, price: parseInt(newItem.price), stock: parseInt(newItem.stock) }; await updateDoc(doc(db,'artifacts',appId,'public','data','menu',newItem.categoryId), { items: [...cat.items, it] }); alert('上架成功！'); setNewItem({...newItem, name:'', price:'', poetry:'', image:''}); }} className="col-span-full bg-blue-600 py-8 rounded-[3rem] font-black shadow-2xl active:scale-95 transition-all text-2xl mt-6 uppercase tracking-widest">發佈新品 (PUBLISH NOW)</button>
                    </div>
                  </div>
                  <div className="bg-slate-800 p-12 rounded-[4rem] border border-slate-700 shadow-2xl">
                    <h2 className="text-3xl font-black mb-12 text-slate-300 uppercase tracking-widest"><ClipboardList size={36} /> 商品狀態監控</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                       {menuData.map(c => c.items.map(i => (
                        <div key={i.id} className="bg-slate-900 p-8 rounded-[3rem] flex justify-between items-center group border border-slate-700 hover:border-red-500 transition-all shadow-xl">
                          <div className="flex items-center gap-5"><img src={i.image} className="w-16 h-16 rounded-full object-cover shadow-2xl" /><div><div className="font-black text-lg">{i.name}</div><div className="text-xs text-slate-500 font-bold">$ {i.price}</div></div></div>
                          <button onClick={async()=>{if(confirm(`確定要將【${i.name}】下架嗎？`)){ const u = c.items.filter(x=>x.id!==i.id); await updateDoc(doc(db,'artifacts',appId,'public','data','menu',c.id),{items:u}); }}} className="p-4 text-slate-700 hover:text-red-500 transition-all"><Trash2 size={24} /></button>
                        </div>
                      )))}
                   </div>
                  </div>
                </div>
              )}
            </div>
          )}
       </main>
    </div>
  );
}
