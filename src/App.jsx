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

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    if (orderType === 'dineIn' && !tableNumber) return alert('請輸入桌號');
    if (orderType === 'takeout' && phoneSuffix.length !== 3) return alert('請輸入手機末三碼');
    const ts = Date.now();
    const orderId = `ASA-${ts.toString().slice(-4)}`;
    const newOrder = { id: orderId, table: orderType==='takeout'?`外帶-${phoneSuffix}`:`桌號 ${tableNumber}`, items: cart, total: cart.reduce((s,i)=>s+(i.price*i.quantity),0), status: 'pending', time: new Date().toLocaleTimeString(), timestamp: ts };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), newOrder);
    setLastOrder(newOrder); setOrderStatus('success'); setIsCartOpen(false);
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-bold text-amber-800 tracking-widest italic">ASA 引擎啟動中...</div>;

  if (systemRole === 'customer') {
    if (orderStatus === 'success') {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-amber-900">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center border border-amber-100 max-w-sm w-full animate-fade-in">
            <CheckCircle2 className="text-amber-600 mx-auto mb-4" size={80} />
            <h2 className="text-2xl font-black mb-6 uppercase">點餐成功</h2>
            <div className="bg-amber-50 p-6 rounded-3xl text-left space-y-2 mb-8 font-bold border border-amber-100">
              <div className="text-[10px] text-amber-800 font-black mb-2">單號：{lastOrder?.id}</div>
              {lastOrder?.items.map((i,idx)=><div key={idx} className="text-[11px] flex justify-between"><span>{i.name} x {i.quantity}</span><span>$ {i.price*i.quantity}</span></div>)}
              <div className="border-t border-amber-200 mt-2 pt-2 text-right font-black text-lg text-amber-900">$ {lastOrder?.total}</div>
            </div>
            <button onClick={()=>{setCart([]); setOrderStatus('ordering');}} className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold active:scale-95 shadow-lg">返回首頁</button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#FDFBF7] font-sans pb-32 flex flex-col text-amber-900">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-amber-100 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-800 rounded-full flex items-center justify-center text-amber-50 shadow-xl border border-amber-900/10"><Store size={24} /></div>
              <h1 className="text-2xl font-black font-serif tracking-tighter">ASA 南巷微光</h1>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={()=>setSearchResult('searching')} className="p-3 text-amber-400 hover:text-amber-800 flex items-center gap-2 text-sm font-bold bg-amber-50 rounded-2xl"><Search size={18}/> 查進度</button>
               <button onClick={()=>{setPasswordInput(''); setShowLoginModal(true);}} className="p-3 bg-amber-800 text-white rounded-2xl shadow-lg hover:bg-amber-900 transition-all"><Lock size={22}/></button>
            </div>
          </div>
        </header>

        {searchResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="absolute inset-0 bg-black/60" onClick={()=>setSearchResult(null)}></div>
            <div className="bg-white p-8 rounded-[2.5rem] relative z-10 w-full max-w-sm shadow-2xl">
               <div className="flex justify-between items-center mb-6"><h3 className="font-black text-xl">訂單狀態查詢</h3><X onClick={()=>setSearchResult(null)} className="cursor-pointer text-slate-300 hover:text-amber-800" /></div>
               <div className="flex gap-2 mb-6"><input type="text" placeholder="輸入單號末四碼" value={searchId} onChange={e=>setSearchId(e.target.value)} className="flex-1 bg-amber-50 p-4 rounded-2xl outline-none font-bold" /><button onClick={()=>{const f=orders.find(o=>o.id.includes(searchId)); setSearchResult(f||'none')}} className="bg-amber-800 text-white px-6 rounded-2xl"><Search size={20}/></button></div>
               {searchResult === 'none' && <div className="text-red-500 font-bold text-center italic">查無此單，請確認輸入無誤</div>}
               {searchResult && searchResult !== 'searching' && searchResult !== 'none' && (
                 <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-black text-xs">{searchResult.id}</span>
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black ${searchResult.status==='pending'?'bg-amber-200 text-amber-800':'bg-green-600 text-white'}`}>{searchResult.status==='pending'?'製作中':'已出餐'}</span>
                    </div>
                    <div className="text-[11px] font-bold space-y-2 border-t border-amber-100 pt-3">
                      {searchResult.items.map((i,idx)=><div key={idx} className="flex justify-between"><span>{i.name} x {i.quantity}</span></div>)}
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        <div className="bg-white/50 sticky top-[81px] z-10 border-b border-amber-50">
          <div className="max-w-7xl mx-auto px-4 py-6 flex gap-4 overflow-x-auto no-scrollbar justify-start md:justify-center">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-2 rounded-full whitespace-nowrap text-sm font-black transition-all shadow-sm ${activeCategory === cat.id ? 'bg-amber-800 text-white w-28 h-28 md:w-24 md:h-24 flex-col justify-center' : 'bg-white text-amber-600 border border-amber-100 w-28 h-28 md:w-24 md:h-24 flex-col justify-center opacity-70 hover:opacity-100'}`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-12 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 lg:mr-[400px]">
          {menuData.find(c => c.id === activeCategory)?.items.map(item => {
            const left = getStock(item);
            const isHot = hotItems.some(h => h.name === item.name);
            return (
              <div key={item.id} className="bg-white rounded-[3rem] p-8 shadow-sm border border-amber-50 flex flex-col items-center text-center transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="relative w-40 h-40 rounded-full overflow-hidden border-8 border-[#FDFBF7] mb-6 shadow-inner" onClick={() => setZoomImage(item.image)}>
                  <img src={item.image} className="w-full h-full object-cover" />
                </div>
                <div className="mb-6 w-full flex items-center justify-center gap-4">
                  <span className="text-2xl font-black text-amber-900 font-serif">${item.price}</span>
                  <button onClick={() => addToCart(item)} disabled={left===0} className={`px-6 py-2.5 rounded-full font-black text-xs shadow-md active:scale-90 ${left===0?'bg-amber-100 text-amber-300':'bg-amber-800 text-white hover:bg-amber-900'}`}>{left===0?'已售罄':'加入'}</button>
                </div>
                <h3 className="text-xl font-black tracking-tight">{isHot && <span className="text-orange-500 mr-2">🔥 熱銷</span>}{item.name}</h3>
                <p className="text-[11px] text-amber-700/60 italic mt-3 border-t border-amber-50 pt-3 h-10 leading-relaxed font-serif">{item.poetry}</p>
                {left !== null && <div className={`text-[10px] font-black mt-4 px-4 py-1 rounded-full ${left > 0 ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'}`}>今日供應：{left}</div>}
              </div>
            );
          })}
        </main>

        {/* 手機版購物車 */}
        <div className="lg:hidden fixed bottom-8 left-6 right-6 z-40">
          <div className="bg-amber-900 rounded-[2rem] p-3 flex items-center justify-between shadow-2xl border border-amber-800">
            <div className="flex items-center gap-4 pl-6 text-white"><ShoppingCart size={24} /> <div className="font-black text-2xl">$ {cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</div></div>
            <button onClick={() => setIsCartOpen(true)} className="bg-white text-amber-900 px-10 py-4 rounded-[1.5rem] font-black text-sm active:scale-95 shadow-xl">結帳</button>
          </div>
        </div>

        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)}></div>
            <div className="bg-white w-full rounded-t-[3.5rem] relative p-10 shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black tracking-widest">點餐明細</h2><X onClick={()=>setIsCartOpen(false)} /></div>
              <div className="bg-amber-50 p-6 rounded-3xl space-y-4 mb-8 border border-amber-100">
                <div className="flex gap-3 bg-white p-2 rounded-2xl shadow-sm">
                  <button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-3 text-xs font-black rounded-xl ${orderType==='dineIn'?'bg-amber-800 text-white shadow-md':'text-amber-300'}`}>內用</button>
                  <button onClick={()=>setOrderType('takeout')} className={`flex-1 py-3 text-xs font-black rounded-xl ${orderType==='takeout'?'bg-amber-800 text-white shadow-md':'text-amber-300'}`}>外帶</button>
                </div>
                <input type="text" placeholder={orderType==='dineIn'?'輸入桌號 (如 A1)':'手機末三碼'} value={orderType==='dineIn'?tableNumber:phoneSuffix} onChange={e=>orderType==='dineIn'?setTableNumber(e.target.value):setPhoneSuffix(e.target.value)} className="w-full bg-white rounded-2xl p-4 text-sm font-black shadow-inner outline-none text-center" />
              </div>
              <div className="space-y-6 mb-10">
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between items-center font-bold">
                    <span className="text-lg">{i.name}</span>
                    <div className="flex items-center gap-4 bg-amber-50 px-4 py-2 rounded-full border border-amber-100">
                       <Minus size={18} className="text-amber-800" onClick={()=>setCart(prev=>prev.map(x=>x.id===i.id?{...x,quantity:Math.max(0,x.quantity-1)}:x).filter(x=>x.quantity>0))} />
                       <span className="text-lg font-black">{i.quantity}</span>
                       <Plus size={18} className="text-amber-800" onClick={()=>addToCart(i)} />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleSubmitOrder} className="w-full py-6 bg-amber-800 text-white rounded-[2rem] font-black text-xl active:scale-95 shadow-2xl">正式送出訂單</button>
            </div>
          </div>
        )}

        {/* 電腦版側邊欄 */}
        <aside className="hidden lg:flex w-[400px] bg-white border-l border-amber-100 fixed right-0 top-0 bottom-0 flex-col shadow-2xl z-30">
          <div className="p-10 border-b border-amber-50 bg-[#FDFBF7] font-serif text-3xl font-black tracking-widest uppercase">ASA CART</div>
          <div className="flex-1 overflow-y-auto p-10 space-y-10">
            <div className="bg-amber-50 p-8 rounded-[2.5rem] space-y-6 shadow-inner border border-amber-100">
              <div className="flex gap-3 bg-white p-2 rounded-2xl shadow-sm">
                <button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${orderType==='dineIn'?'bg-amber-800 text-white shadow-md':'text-amber-300 hover:text-amber-500'}`}>內用 (Dine-in)</button>
                <button onClick={()=>setOrderType('takeout')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${orderType==='takeout'?'bg-amber-800 text-white shadow-md':'text-amber-300 hover:text-amber-500'}`}>外帶 (Take-out)</button>
              </div>
              <input type="text" placeholder={orderType==='dineIn'?'請輸入桌號 (如 A1)':'手機末三碼'} value={orderType==='dineIn'?tableNumber:phoneSuffix} onChange={e=>orderType==='dineIn'?setTableNumber(e.target.value):setPhoneSuffix(e.target.value)} className="w-full bg-white border-none rounded-2xl text-sm p-5 font-black shadow-sm outline-none text-center" />
            </div>
            <div className="space-y-6">
              {cart.map((i,idx) => (
                <div key={idx} className="flex justify-between items-center font-bold text-sm bg-[#FDFBF7] p-4 rounded-2xl">
                  <div className="flex-1"><div>{i.name}</div><div className="text-[10px] text-amber-500">$ {i.price}</div></div>
                  <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-amber-100 shadow-sm">
                     <Minus size={14} className="cursor-pointer text-amber-800" onClick={()=>setCart(prev=>prev.map(x=>x.id===i.id?{...x,quantity:Math.max(0,x.quantity-1)}:x).filter(x=>x.quantity>0))} />
                     <span className="font-black text-sm">{i.quantity}</span>
                     <Plus size={14} className="cursor-pointer text-amber-800" onClick={()=>addToCart(i)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-10 bg-[#FDFBF7] border-t border-amber-100 font-black text-amber-900">
            <div className="flex justify-between items-end mb-8 text-5xl font-serif">
               <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Total Amount</span>
               <span>$ {cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</span>
            </div>
            <button disabled={cart.length===0} onClick={handleSubmitOrder} className="w-full py-6 bg-amber-800 text-white rounded-[2rem] font-black text-xl hover:bg-amber-900 active:scale-95 transition-all shadow-2xl disabled:opacity-30">正式送出訂單</button>
          </div>
        </aside>

        {showLoginModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl">
            <div className="absolute inset-0 bg-amber-900/50" onClick={() => setShowLoginModal(false)}></div>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==='Aeon.1388'){setSystemRole('kitchen');setShowLoginModal(false);} else if(passwordInput==='$Asasouthernaelly,1388'){setSystemRole('admin');setShowLoginModal(false);} else alert('密碼錯誤'); }} className="bg-white p-10 rounded-[3rem] relative z-10 w-full max-w-md shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)]">
              <h2 className="text-center font-black mb-8 text-amber-900 text-2xl tracking-widest uppercase">ASA 內部驗證</h2>
              <div className="relative mb-6">
                 <input type={showPassword?'text':'password'} placeholder="請輸入通行密碼" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full border-2 border-amber-50 rounded-2xl p-5 text-center text-lg font-black outline-none focus:border-amber-800 transition-all pr-12" autoFocus />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-200 cursor-pointer hover:text-amber-800" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={24}/>:<Eye size={24}/>}</div>
              </div>
              <button className="w-full bg-amber-800 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-amber-900 active:scale-95 transition-all">進入系統</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- 後廚系統 & 店長後台 (保持穩定功能) ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
       <header className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/95 sticky top-0 z-50">
          <h1 className="font-black text-xl flex items-center gap-3 text-amber-500 uppercase tracking-widest"><ChefHat size={28} /> ASA {systemRole==='kitchen'?'後廚看板':'店長主控室'}</h1>
          <button onClick={() => setSystemRole('customer')} className="text-xs bg-slate-800 px-6 py-3 rounded-xl font-black text-slate-400 hover:text-white transition-colors border border-slate-700">登出系統</button>
       </header>
       <main className="p-8 flex-1 max-w-[1600px] mx-auto w-full overflow-y-auto">
          {systemRole === 'kitchen' ? (
            <div className="space-y-10 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 p-8 bg-slate-800/50 rounded-3xl border border-amber-500/20 backdrop-blur-md">
                   <h2 className="text-amber-500 font-black mb-8 flex items-center gap-3 uppercase tracking-widest"><TrendingUp size={24} /> 今日熱銷排行 (HOT 5)</h2>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {hotItems.map((h, i) => (
                       <div key={i} className="bg-slate-900 p-6 rounded-2xl border-l-8 border-amber-500 flex flex-col justify-center shadow-lg">
                         <span className="text-[10px] text-slate-500 font-black uppercase mb-1">Rank #{i+1}</span>
                         <span className="font-black text-sm truncate mb-2">{h.name}</span>
                         <span className="text-amber-400 font-black text-3xl">{h.count} <span className="text-xs text-slate-600">份</span></span>
                       </div>
                     ))}
                   </div>
                </div>
                <div className="p-8 bg-slate-800/50 rounded-3xl border border-amber-500/20 backdrop-blur-md">
                   <h2 className="text-amber-500 font-black mb-8 flex items-center gap-3 uppercase tracking-widest"><PackagePlus size={24} /> 甜點今日庫存管理</h2>
                   <div className="space-y-4">
                      {menuData.find(c=>c.id==='c3')?.items.map(i => (
                        <div key={i.id} className="flex justify-between items-center bg-slate-700 p-4 rounded-2xl border border-slate-600">
                           <span className="font-black text-sm">{i.name}</span>
                           <input type="number" value={i.stock} onChange={async(e)=>{ const u = menuData.find(c=>c.id==='c3').items.map(it=>it.id===i.id?{...it,stock:parseInt(e.target.value)}:it); await updateDoc(doc(db,'artifacts',appId,'public','data','menu','c3'),{items:u}); }} className="w-24 bg-slate-900 text-amber-500 rounded-xl p-3 text-center font-black text-lg border-none shadow-inner" />
                        </div>
                      ))}
                   </div>
                </div>
              </div>
              <div className="flex gap-8 overflow-x-auto pb-10 no-scrollbar">
                {orders.filter(o => o.status === 'pending').map(order => (
                  <div key={order.id} className="w-96 bg-slate-800 rounded-[2.5rem] border-t-8 border-amber-500 shadow-2xl flex flex-col shrink-0 animate-fade-in hover:scale-[1.02] transition-transform">
                    <div className="p-6 border-b border-slate-700 font-black flex justify-between items-center text-amber-500">
                      <div><div className="text-2xl uppercase tracking-tighter">{order.table}</div><div className="text-[10px] text-slate-500 font-mono mt-1">{order.date} {order.time}</div></div>
                      <span className="bg-slate-900 px-3 py-1 rounded-lg text-[10px] font-mono border border-slate-700">#{order.id.slice(-4)}</span>
                    </div>
                    <div className="p-8 flex-1 space-y-4 font-black">
                       {order.items.map((it, idx) => <div key={idx} className="flex justify-between border-b border-slate-700/30 pb-2 text-lg"><span>{it.name}</span><span className="text-amber-400 bg-slate-900 px-3 rounded-lg shadow-sm">x {it.quantity}</span></div>)}
                    </div>
                    <div className="p-8 border-t border-slate-700 bg-slate-900/30"><button onClick={async()=>await updateDoc(doc(db,'artifacts',appId,'public', 'data', 'orders', order.id),{status:'completed'})} className="w-full py-5 bg-amber-500 text-slate-900 font-black rounded-2xl text-xl shadow-xl hover:bg-amber-400 active:scale-95 transition-all">出餐完成 (Done)</button></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-10 animate-fade-in">
              <div className="flex gap-4 bg-slate-800 p-2 rounded-[1.5rem] w-fit border border-slate-700 shadow-xl">
                <button onClick={()=>setAdminTab('reports')} className={`px-10 py-3 rounded-xl text-sm font-black transition-all ${adminTab==='reports'?'bg-blue-600 text-white shadow-lg':'text-slate-400 hover:text-white'}`}>營收報表分析</button>
                <button onClick={()=>setAdminTab('products')} className={`px-10 py-3 rounded-xl text-sm font-black transition-all ${adminTab==='products'?'bg-blue-600 text-white shadow-lg':'text-slate-400 hover:text-white'}`}>商品上下架管理</button>
              </div>
              {adminTab === 'reports' ? (
                <div className="space-y-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-12 rounded-[3.5rem] shadow-2xl flex flex-col justify-between h-72 border-4 border-blue-500/20">
                      <span className="font-black text-blue-100 uppercase tracking-[0.2em] text-xs">當日雲端累計總營收</span>
                      <h3 className="text-7xl font-black text-white">$ {orders.reduce((s,o)=>s+o.total, 0).toLocaleString()}</h3>
                    </div>
                    <div className="bg-slate-800 p-12 rounded-[3.5rem] border-4 border-slate-700 flex flex-col justify-between h-72 shadow-xl">
                      <span className="font-black text-slate-500 uppercase tracking-[0.2em] text-xs">當日處理單數統計</span>
                      <h3 className="text-7xl font-black text-amber-500">{orders.length} <span className="text-2xl text-slate-600">單</span></h3>
                    </div>
                  </div>
                  <div className="bg-slate-800 p-10 rounded-[3rem] border border-slate-700 shadow-2xl">
                     <h2 className="text-2xl font-black mb-10 text-blue-400 flex items-center gap-3 uppercase tracking-widest"><BarChart3 /> 各品項銷量明細數據</h2>
                     <table className="w-full text-left font-black border-collapse"><thead><tr className="text-slate-500 border-b border-slate-700 text-xs uppercase tracking-widest"><th className="pb-6">商品名稱 (Product Name)</th><th className="pb-6 text-center">總銷量 (Qty)</th><th className="pb-6 text-right">小計金額 (Subtotal)</th></tr></thead><tbody>{salesDetail.map((s,i)=>(<tr key={i} className="border-b border-slate-700/30 text-lg hover:bg-slate-700/30 transition-colors"><td className="py-6">{s.name}</td><td className="py-6 text-center text-amber-500">{s.qty} <span className="text-xs">份</span></td><td className="py-6 text-right text-blue-400">$ {s.subtotal.toLocaleString()}</td></tr>))}</tbody></table>
                  </div>
                </div>
              ) : (
                <div className="space-y-10">
                  <div className="bg-slate-800 p-12 rounded-[3.5rem] border border-slate-700 shadow-2xl relative overflow-hidden"><div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -z-10"></div>
                    <h2 className="text-2xl font-black mb-10 flex items-center gap-3 text-blue-400 uppercase tracking-[0.2em]"><PackagePlus size={32} /> 新增 ASA 品牌商品上架</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 ml-2">分類選取</label><select value={newItem.categoryId} onChange={e=>setNewItem({...newItem, categoryId: e.target.value})} className="w-full bg-slate-900 p-5 rounded-2xl border-none font-black text-sm shadow-inner">{menuData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 ml-2">商品品名</label><input type="text" placeholder="商品名稱" value={newItem.name} onChange={e=>{const n = e.target.value; setNewItem({...newItem, name: n, poetry: generatePoetry(n)});}} className="w-full bg-slate-900 p-5 rounded-2xl border-none font-black text-sm shadow-inner" /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 ml-2">販售單價</label><input type="number" placeholder="單價 (NT$)" value={newItem.price} onChange={e=>setNewItem({...newItem, price: e.target.value})} className="w-full bg-slate-900 p-5 rounded-2xl border-none font-black text-sm shadow-inner" /></div>
                      <div className="col-span-full space-y-2"><label className="text-[10px] font-black text-slate-500 ml-2">AI 智能詩詞描述 (可自由編輯)</label><input type="text" value={newItem.poetry} onChange={e=>setNewItem({...newItem, poetry: e.target.value})} className="w-full bg-slate-900 p-5 rounded-2xl border border-blue-900/50 italic text-blue-200 text-sm shadow-inner font-serif" /></div>
                      <div className="col-span-full space-y-2"><label className="text-[10px] font-black text-slate-500 ml-2">商品形象圖 URL (建議使用 Unsplash)</label><input type="text" placeholder="照片網址 URL" value={newItem.image} onChange={e=>setNewItem({...newItem, image: e.target.value})} className="w-full bg-slate-900 p-5 rounded-2xl border-none font-black text-sm shadow-inner" /></div>
                      <button onClick={async()=>{ const cat = menuData.find(c=>c.id===newItem.categoryId); const it = { ...newItem, id: `m_${Date.now()}`, price: parseInt(newItem.price), stock: parseInt(newItem.stock) }; await updateDoc(doc(db,'artifacts',appId,'public','data','menu',newItem.categoryId), { items: [...cat.items, it] }); alert('ASA 新品上架成功！'); setNewItem({...newItem, name: '', price: '', poetry: '', image: ''}); }} className="col-span-full bg-blue-600 py-6 rounded-[2rem] font-black shadow-2xl shadow-blue-500/30 active:scale-95 transition-all text-xl mt-4">正式發佈商品 (Publish Product)</button>
                    </div>
                  </div>
                  <div className="bg-slate-800 p-10 rounded-[3rem] border border-slate-700 shadow-xl">
                    <h2 className="text-2xl font-black mb-10 flex items-center gap-3 text-slate-300 uppercase tracking-widest"><ClipboardList size={28} /> 已上架商品監控 (點選垃圾桶下架)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                       {menuData.map(c => c.items.map(i => (
                        <div key={i.id} className="bg-slate-900 p-6 rounded-[2rem] flex justify-between items-center group border border-slate-700 hover:border-red-500 transition-all hover:shadow-lg">
                          <div className="flex items-center gap-4"><img src={i.image} className="w-12 h-12 rounded-full object-cover shadow-md" /><div><div className="font-black text-sm">{i.name}</div><div className="text-[10px] text-slate-500">$ {i.price}</div></div></div>
                          <button onClick={async()=>{if(confirm(`確認要下架【${i.name}】嗎？`)){ const u = c.items.filter(x=>x.id!==i.id); await updateDoc(doc(db,'artifacts',appId,'public','data','menu',c.id),{items:u}); }}} className="p-3 text-slate-700 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"><Trash2 size={20} /></button>
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
