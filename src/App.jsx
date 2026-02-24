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
  if (n.includes('蛋糕') || n.includes('千層')) return "紅蕊層疊映纖指，幽香透出半殘霞。";
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
    }));
    return Object.values(detail);
  }, [orders]);

  const getDisplayStock = (item) => {
    if (item.stock === undefined) return null;
    const inCart = cart.find(c => c.id === item.id)?.quantity || 0;
    return Math.max(0, Number(item.stock) - inCart);
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
    } catch (e) { alert('系統忙碌中，請重新送出'); }
  };

  // --- 修改處：更新載入文字 ---
  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-black text-xl text-amber-900 tracking-widest italic animate-pulse">ASA 南巷微光品味中.........</div>;

  if (systemRole === 'customer') {
    if (orderStatus === 'success') {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-amber-900 animate-fade-in">
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl text-center border border-amber-100 max-w-md w-full animate-fade-in">
            <CheckCircle2 className="text-amber-600 mx-auto mb-8" size={100} />
            <h2 className="text-4xl font-black mb-8 uppercase tracking-widest">點餐成功</h2>
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
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-[100] border-b border-amber-100 px-6 py-5 shadow-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              {/* --- 修改處：更換 Logo --- */}
              <img src="https://i.postimg.cc/1tTJBrLd/Gemini-Generated-Image-7uf38w7uf38w7uf3.png" className="w-16 h-16 rounded-full object-cover shadow-2xl border-2 border-amber-900/20" alt="ASA Logo" />
              <h1 className="text-3xl md:text-4xl font-black font-serif tracking-tighter">ASA 南巷微光</h1>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={()=>setSearchResult('searching')} className="p-4 text-amber-500 hover:text-amber-800 flex items-center gap-2 text-sm font-black bg-amber-50 rounded-[1.5rem] transition-all shadow-sm"><Search size={22}/> 查進度</button>
               <button onClick={()=>{setPasswordInput(''); setShowLoginModal(true);}} className="p-4 bg-amber-800 text-white rounded-[1.5rem] shadow-xl active:scale-90 flex items-center justify-center transition-all"><Lock size={28}/></button>
            </div>
          </div>
        </header>

        {searchResult && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="absolute inset-0 bg-black/60" onClick={()=>setSearchResult(null)}></div>
            <div className="bg-white p-10 rounded-[3rem] relative z-[201] w-full max-w-sm shadow-2xl animate-zoom-in">
               <div className="flex justify-between items-center mb-10"><h3 className="font-black text-2xl tracking-widest uppercase">訂單狀態查詢</h3><X onClick={()=>setSearchResult(null)} className="cursor-pointer text-slate-300 hover:text-amber-800" size={32} /></div>
               <div className="flex gap-4 mb-8">
                 <input type="text" placeholder="單號末四碼" value={searchId} onChange={e=>setSearchId(e.target.value)} className="flex-1 bg-amber-50 p-6 rounded-3xl outline-none font-black text-xl" />
                 <button onClick={()=>{const f=orders.find(o=>o.id.includes(searchId)); setSearchResult(f||'none')}} className="bg-amber-800 text-white px-8 rounded-3xl active:scale-90 shadow-lg"><Search size={32}/></button>
               </div>
               {searchResult === 'none' && <div className="text-red-600 font-black text-center text-xl italic">找不到訂單，請檢查單號</div>}
               {searchResult && searchResult !== 'searching' && searchResult !== 'none' && (
                 <div className="bg-amber-50 p-8 rounded-[2.5rem] border-2 border-amber-200">
                    <div className="flex justify-between items-center mb-6">
                      <span className="font-black text-lg text-amber-900">{searchResult.id}</span>
                      <span className={`px-6 py-2 rounded-full text-xs font-black ${searchResult.status==='pending'?'bg-amber-200 text-amber-800 animate-pulse':'bg-green-600 text-white'}`}>{searchResult.status==='pending'?'製作中':'已完成'}</span>
                    </div>
                    <div className="text-base font-black space-y-3 border-t border-amber-100 pt-6">
                      {searchResult.items.map((i,idx)=><div key={idx} className="flex justify-between"><span>{i.name}</span><span>x {i.quantity}</span></div>)}
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        <div className="bg-white/30 sticky top-[95px] z-20 border-b border-amber-50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6 overflow-x-auto no-scrollbar justify-start md:justify-center">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center flex-col justify-center rounded-full transition-all shadow-lg shrink-0 ${activeCategory === cat.id ? 'bg-amber-800 text-white w-20 h-20 md:w-28 md:h-28 scale-110 ring-4 ring-amber-100' : 'bg-white text-amber-600 border border-amber-100 w-20 h-20 md:w-28 md:h-28 opacity-80 hover:opacity-100'}`}>
                <span className="text-xs md:text-sm font-black px-3 text-center leading-tight uppercase">{cat.name}</span>
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
                {item.stock !== undefined && (
                  <div className={`text-base font-black mt-8 px-8 py-3 rounded-full shadow-inner ${currentLeft > 0 ? 'bg-red-50 text-red-600 border-2 border-red-200' : 'bg-slate-50 text-slate-400'}`}>
                    庫存剩餘：{currentLeft}
                  </div>
                )}
              </div>
            );
          })}
        </main>

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
                  <button onClick={()=>setOrderType('takeout')} className={`flex-1 py-5 text-sm font-black rounded-2xl transition-all ${orderType==='takeout
