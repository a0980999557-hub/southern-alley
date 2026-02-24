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

const INITIAL_MENU = [
  { id: 'c1', name: '手沖與咖啡', icon: 'coffee', items: [{ id: 'm1', name: '玫瑰海鹽拿鐵', price: 160, poetry: '露染紅瓣映晨光，海鹽輕吻拿鐵香。', image: 'https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?w=600' }] },
  { id: 'c3', name: '法式甜點', icon: 'cake', items: [{ id: 'd1', name: '草莓伯爵千層', price: 220, poetry: '紅蕊層疊映纖指，伯爵幽香透晚霞。', image: 'https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=600', stock: 10 }] }
];

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
      if (snap.size < 2) {
         INITIAL_MENU.forEach(async c => await setDoc(doc(menuRef, c.id), c));
         setMenuData(INITIAL_MENU);
      } else {
         setMenuData(snap.docs.map(doc => doc.data()).sort((a,b) => a.id.localeCompare(b.id)));
      }
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
        detail[i.id].qty += i.quantity; detail[i.id].subtotal += (i.price * i.quantity);
    });});
    return Object.values(detail);
  }, [orders]);

  const getDisplayStock = (item) => {
    if (item.stock === undefined) return null;
    const inCart = cart.find(c => c.id === item.id)?.quantity || 0;
    return Math.max(0, Number(item.stock) - inCart);
  };

  const addToCart = (item) => {
    const s = getDisplayStock(item);
    if (s !== null && s <= 0) return alert('抱歉，此商品已售罄！');
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

    try {
      for (const item of cart) {
        if (item.stock !== undefined) {
          const category = menuData.find(c => c.items.some(i => i.id === item.id));
          const updatedItems = category.items.map(i => i.id === item.id ? { ...i, stock: Number(i.stock) - item.quantity } : i);
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'menu', category.id), { items: updatedItems });
        }
      }
      const ts = Date.now();
      const orderId = `ASA-${ts.toString().slice(-4)}`;
      const newOrder = { id: orderId, table: orderType==='takeout'?`外帶-${phoneSuffix}`:`桌號 ${tableNumber}`, items: cart, total: cart.reduce((s,i)=>s+(i.price*i.quantity),0), status: 'pending', date: new Date().toLocaleDateString('zh-TW'), time: new Date().toLocaleTimeString('zh-TW'), timestamp: ts };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), newOrder);
      setLastOrder(newOrder); setOrderStatus('success'); setIsCartOpen(false);
    } catch (e) { alert('系統忙碌中，請重新嘗試'); }
  };

  // --- 重點修正：載入文字 ---
  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-black text-2xl text-amber-900 tracking-widest animate-pulse">ASA 南巷微光品味中.........</div>;

  if (systemRole === 'customer') {
    if (orderStatus === 'success') {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-amber-900">
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl text-center border border-amber-100 max-w-sm w-full">
            <CheckCircle2 className="text-amber-600 mx-auto mb-8" size={100} />
            <h2 className="text-4xl font-black mb-8 uppercase tracking-widest">點單成功</h2>
            <div className="bg-amber-50 p-8 rounded-[2rem] text-left space-y-4 mb-10 border border-amber-100 shadow-inner">
              <div className="text-sm text-amber-800 font-black border-b border-amber-200 pb-3">單號：{lastOrder?.id}</div>
              <div className="space-y-3">
                {lastOrder?.items.map((i,idx)=><div key={idx} className="text-lg font-black flex justify-between"><span>{i.name} x {i.quantity}</span><span>$ {i.price*i.quantity}</span></div>)}
              </div>
              <div className="border-t border-amber-200 mt-6 pt-6 text-right font-black text-4xl text-amber-900">$ {lastOrder?.total}</div>
            </div>
            <button onClick={()=>{setCart([]); setOrderStatus('ordering');}} className="w-full bg-amber-800 text-white py-6 rounded-[2.5rem] font-black text-2xl active:scale-95 shadow-xl">返回首頁</button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#FDFBF7] font-sans pb-44 flex flex-col text-amber-900 overflow-x-hidden">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-[100] border-b border-amber-100 px-6 py-6 shadow-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-5">
              {/* --- 重點修正：更換 Logo 圖片連結 --- */}
              <img src="https://i.postimg.cc/1tTJBrLd/Gemini-Generated-Image-7uf38w7uf38w7uf3.png" className="w-20 h-20 rounded-full object-cover shadow-2xl border-2 border-amber-900/10" alt="ASA Logo" />
              <h1 className="text-3xl md:text-5xl font-black font-serif tracking-tighter">ASA 南巷微光</h1>
            </div>
            <div className="flex items-center gap-5">
               <button onClick={()=>setSearchResult('searching')} className="p-5 text-amber-500 hover:text-amber-800 flex items-center gap-3 text-lg font-black bg-amber-50 rounded-[2rem] transition-all"><Search size={28}/> 查詢訂單</button>
               <button onClick={()=>{setPasswordInput(''); setShowLoginModal(true);}} className="p-5 bg-amber-800 text-white rounded-[1.8rem] shadow-xl active:scale-90 flex items-center justify-center transition-all"><Lock size={32}/></button>
            </div>
          </div>
        </header>

        {searchResult && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="absolute inset-0 bg-black/60" onClick={()=>setSearchResult(null)}></div>
            <div className="bg-white p-12 rounded-[3.5rem] relative z-[201] w-full max-w-sm shadow-2xl animate-zoom-in">
               <div className="flex justify-between items-center mb-10"><h3 className="font-black text-3xl tracking-widest uppercase">訂單進度</h3><X onClick={()=>setSearchResult(null)} className="cursor-pointer text-slate-300" size={40} /></div>
               <div className="flex gap-4 mb-10">
                 <input type="text" placeholder="單號末四碼" value={searchId} onChange={e=>setSearchId(e.target.value)} className="flex-1 bg-amber-50 p-6 rounded-3xl outline-none font-black text-2xl" />
                 <button onClick={()=>{const f=orders.find(o=>o.id.includes(searchId)); setSearchResult(f||'none')}} className="bg-amber-800 text-white px-10 rounded-3xl active:scale-90"><Search size={36}/></button>
               </div>
               {searchResult && searchResult !== 'searching' && searchResult !== 'none' && (
                 <div className="bg-amber-50 p-10 rounded-[3rem] border-2 border-amber-200">
                    <div className="flex justify-between items-center mb-8">
                      <span className="font-black text-xl text-amber-900">{searchResult.id}</span>
                      <span className={`px-6 py-2 rounded-full text-sm font-black ${searchResult.status==='pending'?'bg-amber-200 text-amber-800':'bg-green-600 text-white'}`}>{searchResult.status==='pending'?'製作中':'已出餐'}</span>
                    </div>
                    <div className="text-lg font-black space-y-4 border-t border-amber-100 pt-8">
                      {searchResult.items.map((i,idx)=><div key={idx} className="flex justify-between"><span>{i.name}</span><span>x {i.quantity}</span></div>)}
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* 分類按鈕：文字加大至 16px 以上，框架縮小 */}
        <div className="bg-white/30 sticky top-[125px] z-20 border-b border-amber-50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6 overflow-x-auto no-scrollbar justify-start md:justify-center">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center flex-col justify-center rounded-full transition-all shadow-lg shrink-0 ${activeCategory === cat.id ? 'bg-amber-800 text-white w-20 h-20 md:w-28 md:h-28 scale-110 ring-4 ring-amber-50' : 'bg-white text-amber-600 border border-amber-100 w-20 h-20 md:w-28 md:h-28 opacity-80 hover:opacity-100'}`}>
                <span className="text-base md:text-xl font-black px-4 text-center leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 max-w-7xl mx-auto px-6 py-16 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-16 lg:mr-[480px]">
          {menuData.find(c => c.id === activeCategory)?.items.map(item => {
            const currentLeft = getDisplayStock(item);
            const isHot = hotItems.some(h => h.name === item.name);
            return (
              <div key={item.id} className="bg-white rounded-[4rem] p-12 shadow-sm border border-amber-50 flex flex-col items-center text-center transition-all hover:shadow-2xl">
                <div className="relative w-56 h-56 rounded-full overflow-hidden border-8 border-[#FDFBF7] mb-12 shadow-2xl transition-transform hover:scale-105" onClick={() => setZoomImage(item.image)}><img src={item.image} className="w-full h-full object-cover" /></div>
                <div className="mb-10 w-full flex items-center justify-center gap-6">
                  <span className="text-5xl font-black text-amber-900 font-serif">${item.price}</span>
                  <button onClick={() => addToCart(item)} disabled={currentLeft===0} className={`px-12 py-5 rounded-[2rem] font-black text-xl shadow-xl active:scale-90 transition-all ${currentLeft===0?'bg-amber-100 text-amber-300':'bg-amber-800 text-white hover:bg-amber-900'}`}>{currentLeft===0?'售完':'加入'}</button>
                </div>
                <h3 className="text-3xl font-black tracking-tighter mb-4">{isHot && <span className="text-orange-500 mr-2">🔥</span>}{item.name}</h3>
                <p className="text-base text-amber-700/60 italic border-t border-amber-50 pt-8 h-20 leading-relaxed font-serif px-4">{item.poetry}</p>
                {/* 庫存顯示：醒目大紅色 */}
                {item.stock !== undefined && (
                  <div className={`text-xl font-black mt-10 px-10 py-4 rounded-[2rem] shadow-inner ${currentLeft > 0 ? 'bg-red-50 text-red-600 border-2 border-red-100' : 'bg-slate-50 text-slate-400'}`}>
                    供應餘額：{currentLeft}
                  </div>
                )}
              </div>
            );
          })}
        </main>

        <div className="lg:hidden fixed bottom-12 left-10 right-10 z-[150]">
          <div className="bg-amber-900 rounded-[3rem] p-6 flex items-center justify-between shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-amber-800">
            <div className="flex items-center gap-6 pl-6 text-white"><ShoppingCart size={36} /> <div className="font-black text-4xl tracking-tighter">$ {cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</div></div>
            <button onClick={() => setIsCartOpen(true)} className="bg-white text-amber-900 px-16 py-7 rounded-[2.5rem] font-black text-xl active:scale-95 shadow-2xl">結帳</button>
          </div>
        </div>

        {isCartOpen && (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)}></div>
            <div className="bg-white w-full rounded-t-[5rem] relative p-14 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-14"><h2 className="text-5xl font-black tracking-tighter uppercase text-amber-900">ASA ORDER</h2><X onClick={()=>setIsCartOpen(false)} className="text-amber-200" size={56} /></div>
              <div className="bg-amber-50 p-12 rounded-[4rem] space-y-10 mb-14 border border-amber-100 shadow-inner">
                <div className="flex gap-6 bg-white p-3 rounded-[2.5rem] shadow-md">
                  <button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-7 text-xl font-black rounded-[2rem] transition-all ${orderType==='dineIn'?'bg-amber-800 text-white shadow-xl':'text-amber-300'}`}>內用用餐</button>
                  <button onClick={()=>setOrderType('takeout')} className={`flex-1 py-7 text-xl font-black rounded-[2rem] transition-all ${orderType==='takeout'?'bg-amber-800 text-white shadow-xl':'text-amber-300'}`}>外帶打包</button>
                </div>
                <input type="text" placeholder={orderType==='dineIn'?'請輸入桌號':'手機末三碼'} value={orderType==='dineIn'?tableNumber:phoneSuffix} onChange={e=>orderType==='dineIn'?setTableNumber(e.target.value):setPhoneSuffix(e.target.value)} className="w-full bg-white rounded-[2.5rem] p-8 text-4xl font-black shadow-inner outline-none text-center placeholder-amber-100" />
              </div>
              <div className="space-y-12 mb-16 px-4">
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between items-center p-6 border-b border-amber-50">
                    <span className="text-3xl font-black text-amber-950">{i.name}</span>
                    <div className="flex items-center gap-10 bg-amber-50 px-8 py-4 rounded-full border border-amber-100 shadow-sm">
                       <Minus size={36} className="text-amber-800" onClick={()=>setCart(prev=>prev.map(x=>x.id===i.id?{...x,quantity:Math.max(0,x.quantity-1)}:x).filter(x=>x.quantity>0))} />
                       <span className="text-4xl font-black min-w-[40px] text-center">{i.quantity}</span>
                       <Plus size={36} className="text-amber-800" onClick={()=>addToCart(i)} />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleSubmitOrder} className="w-full py-10 bg-amber-800 text-white rounded-[3.5rem] font-black text-4xl active:scale-95 shadow-2xl">正式送出訂單</button>
            </div>
          </div>
        )}

        <aside className="hidden lg:flex w-[480px] bg-white border-l border-amber-100 fixed right-0 top-0 bottom-0 flex-col shadow-2xl z-[50]">
          <div className="p-16 border-b border-amber-50 bg-[#FDFBF7] font-serif text-5xl font-black tracking-widest uppercase text-amber-900 text-center">ASA CART</div>
          <div className="flex-1 overflow-y-auto p-12 space-y-14">
            <div className="bg-amber-50 p-12 rounded-[4rem] space-y-10 shadow-inner border border-amber-100">
               <div className="flex gap-6 bg-white p-3 rounded-[2.5rem] shadow-md">
                  <button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-6 text-base font-black rounded-[2rem] transition-all ${orderType==='dineIn'?'bg-amber-800 text-white shadow-xl':'text-amber-300'}`}>內用 (DINE-IN)</button>
                  <button onClick={()=>setOrderType('takeout')} className={`flex-1 py-6 text-base font-black rounded-[2rem] transition-all ${orderType==='takeout'?'bg-amber-800 text-white shadow-xl':'text-amber-300'}`}>外帶 (TAKE-OUT)</button>
               </div>
               <input type="text" placeholder={orderType==='dineIn'?'輸入桌號':'手機末三碼'} value={orderType==='dineIn'?tableNumber:phoneSuffix} onChange={e=>orderType==='dineIn'?setTableNumber(e.target.value):setPhoneSuffix(e.target.value)} className="w-full bg-white rounded-[2rem] p-8 text-center text-2xl font-black shadow-inner outline-none" />
            </div>
            <div className="space-y-12">
              {cart.map((i,idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-10 rounded-[3rem] border border-amber-100 shadow-sm transition-all hover:shadow-2xl">
                  <div className="flex-1">
                    <div className="font-black text-3xl text-amber-950">{i.name}</div>
                    <div className="text-lg text-amber-500 font-black mt-2">$ {i.price}</div>
                  </div>
                  <div className="flex items-center gap-8 bg-amber-50 px-8 py-4 rounded-full border border-amber-100">
                     <Minus size={28} className="cursor-pointer text-amber-800" onClick={()=>setCart(prev=>prev.map(x=>x.id===i.id?{...x,quantity:Math.max(0,x.quantity-1)}:x).filter(x=>x.quantity>0))} />
                     <span className="font-black text-3xl min-w-[40px] text-center">{i.quantity}</span>
                     <Plus size={28} className="cursor-pointer text-amber-800" onClick={()=>addToCart(i)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-16 bg-[#FDFBF7] border-t border-amber-100 font-black text-amber-900">
            <div className="flex justify-between items-end mb-14 text-8xl font-serif">
               <span className="text-sm font-black text-amber-400 uppercase tracking-[0.8em] mb-6">TOTAL</span>
               <span>$ {cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</span>
            </div>
            <button disabled={cart.length===0} onClick={handleSubmitOrder} className="w-full py-12 bg-amber-800 text-white rounded-[4rem] font-black text-4xl hover:bg-amber-900 active:scale-95 transition-all shadow-[0_25px_60px_rgba(0,0,0,0.3)] disabled:opacity-30 uppercase tracking-widest">CHECKOUT</button>
          </div>
        </aside>

        {showLoginModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-2xl">
            <div className="absolute inset-0 bg-amber-900/60" onClick={() => setShowLoginModal(false)}></div>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==='Aeon.1388'){setSystemRole('kitchen');setShowLoginModal(false);} else if(passwordInput==='$Asasouthernaelly,1388'){setSystemRole('admin');setShowLoginModal(false);} else alert('密碼錯誤'); }} className="bg-white p-16 rounded-[5rem] relative z-10 w-full max-w-2xl shadow-2xl border border-amber-100 animate-zoom-in">
              <h2 className="text-center font-black mb-14 text-amber-900 text-5xl tracking-widest uppercase">ACCESS</h2>
              <div className="relative mb-12">
                 <input type={showPassword?'text':'password'} placeholder="通行密碼" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full border-4 border-amber-50 rounded-[3rem] p-10 text-center text-4xl font-black outline-none focus:border-amber-800 transition-all pr-28 shadow-inner" autoFocus />
                 <div className="absolute right-10 top-1/2 -translate-y-1/2 text-amber-200 cursor-pointer hover:text-amber-800" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={56}/>:<Eye size={56}/>}</div>
              </div>
              <button className="w-full bg-amber-800 text-white py-10 rounded-[3rem] font-black text-4xl shadow-2xl hover:bg-amber-900 active:scale-95 transition-all uppercase">Enter System</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- 後廚系統 & 店長後台 (功能全面升級) ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
       <header className="p-12 border-b border-slate-800 flex justify-between items-center bg-slate-900/95 sticky top-0 z-50 shadow-2xl">
          <h1 className="font-black text-4xl flex items-center gap-6 text-amber-500 uppercase tracking-[0.4em]"><ChefHat size={60} /> ASA CONTROL</h1>
          <button onClick={() => setSystemRole('customer')} className="text-xs bg-slate-800 px-12 py-6 rounded-[2.5rem] font-black text-slate-400 hover:text-white transition-all border border-slate-700 uppercase tracking-widest">Logout</button>
       </header>
       <main className="p-12 flex-1 max-w-[2400px] mx-auto w-full overflow-y-auto">
          {systemRole === 'kitchen' ? (
            <div className="space-y-16 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div className="p-16 bg-slate-800/80 rounded-[5rem] border border-amber-500/20 shadow-2xl backdrop-blur-md">
                   <h2 className="text-amber-500 font-black mb-16 flex items-center gap-6 text-4xl uppercase tracking-widest"><TrendingUp size={56} /> 今日熱點 (HOT 5)</h2>
                   <div className="space-y-8">{hotItems.map((h, i) => (<div key={i} className="bg-slate-900 p-10 rounded-[3rem] border-l-[20px] border-amber-500 flex justify-between items-center shadow-2xl"><span className="font-black text-3xl">#{i+1} {h.name}</span><span className="text-amber-400 font-black text-5xl">{h.count} <span className="text-sm text-slate-600 font-sans">份</span></span></div>))}</div>
                </div>
                <div className="p-16 bg-slate-800/80 rounded-[5rem] border border-amber-500/20 shadow-2xl backdrop-blur-md">
                   <h2 className="text-amber-500 font-black mb-16 flex items-center gap-6 text-4xl uppercase tracking-widest"><PackagePlus size={56} /> 庫存即時管理</h2>
                   <div className="space-y-8">
                      {menuData.find(c=>c.id==='c3')?.items.map(i => (<div key={i.id} className="flex justify-between items-center bg-slate-700 p-10 rounded-[3.5rem] border border-slate-600 shadow-inner"><span className="font-black text-3xl">{i.name}</span><input type="number" value={i.stock} onChange={async(e)=>{ const u = menuData.find(c=>c.id==='c3').items.map(it=>it.id===i.id?{...it,stock:parseInt(e.target.value)}:it); await updateDoc(doc(db,'artifacts',appId,'public','data','menu','c3'),{items:u}); }} className="w-40 bg-slate-900 text-amber-400 rounded-[2.5rem] p-7 text-center font-black text-5xl border-none shadow-2xl" /></div>))}
                   </div>
                </div>
              </div>
              <div className="flex gap-16 overflow-x-auto pb-20 no-scrollbar">
                {orders.filter(o => o.status === 'pending').map(order => (
                  <div key={order.id} className="w-[600px] bg-slate-800 rounded-[6rem] border-t-[16px] border-amber-500 shadow-[0_40px_80px_rgba(0,0,0,0.6)] flex flex-col shrink-0 animate-fade-in hover:scale-105 transition-all">
                    <div className="p-14 border-b border-slate-700 font-black flex justify-between items-center text-amber-500">
                      <div><div className="text-5xl uppercase tracking-tighter">{order.table}</div><div className="text-sm text-slate-500 font-mono mt-5">{order.date} {order.time}</div></div>
                      <span className="bg-slate-900 px-8 py-4 rounded-3xl text-sm font-mono border border-slate-700 shadow-inner">#{order.id.slice(-4)}</span>
                    </div>
                    <div className="p-16 flex-1 space-y-10 font-black">
                       {order.items.map((it, idx) => <div key={idx} className="flex justify-between border-b border-slate-700/30 pb-6 text-3xl"><span>{it.name}</span><span className="text-amber-400 bg-slate-900 px-8 rounded-[2rem] shadow-lg">x {it.quantity}</span></div>)}
                    </div>
                    <div className="p-14 bg-slate-900/30 rounded-b-[6rem]"><button onClick={async()=>await updateDoc(doc(db,'artifacts',appId,'public', 'data', 'orders', order.id),{status:'completed'})} className="w-full py-12 bg-amber-500 text-slate-900 font-black rounded-[3.5rem] text-4xl shadow-2xl hover:bg-amber-400 active:scale-95 transition-all uppercase tracking-widest">出餐完成 (DONE)</button></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-16 animate-fade-in">
              {/* 店長後台：功能保持穩定 */}
              <div className="flex gap-8 bg-slate-800 p-4 rounded-[3rem] w-fit border border-slate-700 shadow-2xl">
                <button onClick={()=>setAdminTab('reports')} className={`px-20 py-6 rounded-[2rem] text-xl font-black transition-all ${adminTab==='reports'?'bg-blue-600 text-white shadow-2xl':'text-slate-400 hover:text-white'}`}>報表分析 (REPORTS)</button>
                <button onClick={()=>setAdminTab('products')} className={`px-20 py-6 rounded-[2rem] text-xl font-black transition-all ${adminTab==='products'?'bg-blue-600 text-white shadow-2xl':'text-slate-400 hover:text-white'}`}>商品管理 (STOCK)</button>
              </div>
              {adminTab === 'reports' ? (
                <div className="space-y-16">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-900 p-20 rounded-[6rem] shadow-2xl flex flex-col justify-between h-[500px] border-8 border-blue-500/20"><span className="font-black text-blue-100 uppercase tracking-[0.6em] text-sm">累積總營收</span><h3 className="text-[10rem] font-black text-white tracking-tighter">$ {orders.reduce((s,o)=>s+o.total, 0).toLocaleString()}</h3></div>
                    <div className="bg-slate-800 p-20 rounded-[6rem] border-8 border-slate-700 flex flex-col justify-between h-[500px] shadow-2xl"><span className="font-black text-slate-500 uppercase tracking-[0.6em] text-sm">結帳單數統計</span><h3 className="text-[10rem] font-black text-amber-500 tracking-tighter">{orders.length} <span className="text-4xl text-slate-600 font-sans">單</span></h3></div>
                  </div>
                  <div className="bg-slate-800 p-16 rounded-[5rem] border border-slate-700 shadow-2xl">
                     <h2 className="text-4xl font-black mb-16 text-blue-400 flex items-center gap-8 uppercase tracking-widest"><BarChart3 size={56} /> 銷售細目報表</h2>
                     <table className="w-full text-left font-black"><thead><tr className="text-slate-500 border-b border-slate-700 text-sm uppercase tracking-[0.3em]"><th className="pb-10 px-4">商品名稱 (ITEM)</th><th className="pb-10 px-4 text-center">總銷量 (QTY)</th><th className="pb-10 px-4 text-right">小計金額 (SUBTOTAL)</th></tr></thead><tbody>{salesDetail.map((s,i)=>(<tr key={i} className="border-b border-slate-700/30 text-3xl hover:bg-slate-700/40 transition-colors"><td className="py-12 px-4">{s.name}</td><td className="py-12 px-4 text-center text-amber-500">{s.qty} 份</td><td className="py-12 px-4 text-right text-blue-400">$ {s.subtotal.toLocaleString()}</td></tr>))}</tbody></table>
                  </div>
                </div>
              ) : (
                <div className="space-y-16">
                  {/* 商品上架模塊 */}
                  <div className="bg-slate-800 p-20 rounded-[6rem] border border-slate-700 shadow-2xl relative overflow-hidden">
                    <h2 className="text-4xl font-black mb-16 flex items-center gap-8 text-blue-400 uppercase tracking-widest"><PackagePlus size={64} /> 新增商品發佈</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-14">
                      <div className="space-y-5"><label className="text-sm font-black text-slate-500 ml-6 uppercase">分類</label><select value={newItem.categoryId} onChange={e=>setNewItem({...newItem, categoryId: e.target.value})} className="w-full bg-slate-900 p-10 rounded-[3rem] border-none font-black text-2xl shadow-inner shadow-black/50">{menuData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                      <div className="space-y-5"><label className="text-sm font-black text-slate-500 ml-6 uppercase">品名</label><input type="text" placeholder="名稱" value={newItem.name} onChange={e=>{const n = e.target.value; setNewItem({...newItem, name:n, poetry:generatePoetry(n)});}} className="w-full bg-slate-900 p-10 rounded-[3rem] border-none font-black text-2xl shadow-inner shadow-black/50" /></div>
                      <div className="space-y-5"><label className="text-sm font-black text-slate-500 ml-6 uppercase">價格</label><input type="number" placeholder="金額" value={newItem.price} onChange={e=>setNewItem({...newItem, price:e.target.value})} className="w-full bg-slate-900 p-10 rounded-[3rem] border-none font-black text-2xl shadow-inner shadow-black/50" /></div>
                      <div className="col-span-full space-y-5"><label className="text-sm font-black text-slate-500 ml-6 uppercase">AI 詩詞</label><input type="text" value={newItem.poetry} onChange={e=>setNewItem({...newItem, poetry:e.target.value})} className="w-full bg-slate-900 p-10 rounded-[3rem] border border-blue-900/50 italic text-blue-200 text-2xl shadow-inner font-serif" /></div>
                      <div className="col-span-full space-y-5"><label className="text-sm font-black text-slate-500 ml-6 uppercase">圖片網址</label><input type="text" placeholder="URL" value={newItem.image} onChange={e=>setNewItem({...newItem, image:e.target.value})} className="w-full bg-slate-900 p-10 rounded-[3rem] border-none font-black text-2xl shadow-inner shadow-black/50" /></div>
                      <button onClick={async()=>{ const cat = menuData.find(c=>c.id===newItem.categoryId); const it = { ...newItem, id: `m_${Date.now()}`, price: parseInt(newItem.price), stock: parseInt(newItem.stock) }; await updateDoc(doc(db,'artifacts',appId,'public','data','menu',newItem.categoryId), { items: [...cat.items, it] }); alert('新品發佈成功！'); setNewItem({...newItem, name:'', price:'', poetry:'', image:''}); }} className="col-span-full bg-blue-600 py-12 rounded-[4rem] font-black shadow-2xl active:scale-95 transition-all text-4xl mt-10 uppercase tracking-[0.2em]">正式發佈商品 (PUBLISH)</button>
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
