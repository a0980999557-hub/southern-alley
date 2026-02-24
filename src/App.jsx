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
    menuData.forEach(c => c.items.forEach(i => { if(counts[i.id]) list.push({id: i.id, name: i.name, count: counts[i.id]}); }));
    return list.sort((a,b)=>b.count-a.count).slice(0, 5);
  }, [orders, menuData]);

  const salesDetail = useMemo(() => {
    const detail = {};
    orders.forEach(o => o.items.forEach(i => {
        if (!detail[i.id]) detail[i.id] = { name: i.name, qty: 0, subtotal: 0 };
        detail[i.id].qty += i.quantity; detail[i.id].subtotal += (i.price * i.quantity);
    }));
    return Object.values(detail);
  }, [orders]);

  const getStock = (item) => {
    if (item.stock === undefined) return null;
    const inCart = cart.find(c => c.id === item.id)?.quantity || 0;
    return Math.max(0, item.stock - inCart);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return alert('購物車是空的喔！');
    if (orderType === 'dineIn' && !tableNumber) return alert('請輸入桌號');
    if (orderType === 'takeout' && phoneSuffix.length !== 3) return alert('請輸入手機末三碼');

    try {
      // --- 重點：更新雲端庫存 ---
      for (const item of cart) {
        if (item.stock !== undefined) {
          const category = menuData.find(c => c.items.some(i => i.id === item.id));
          const updatedItems = category.items.map(i => i.id === item.id ? { ...i, stock: i.stock - item.quantity } : i);
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'menu', category.id), { items: updatedItems });
        }
      }

      const ts = Date.now();
      const orderId = `ASA-${ts.toString().slice(-4)}`;
      const newOrder = { id: orderId, table: orderType==='takeout'?`外帶-${phoneSuffix}`:`桌號 ${tableNumber}`, items: cart, total: cart.reduce((s,i)=>s+(i.price*i.quantity),0), status: 'pending', time: new Date().toLocaleTimeString(), timestamp: ts };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), newOrder);
      setLastOrder(newOrder); setOrderStatus('success'); setIsCartOpen(false);
    } catch (e) { alert('系統連線繁忙，請重試'); }
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-bold text-amber-800 tracking-widest italic">ASA 調校中...</div>;

  if (systemRole === 'customer') {
    if (orderStatus === 'success') {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-amber-900">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center border border-amber-100 max-w-sm w-full animate-fade-in">
            <CheckCircle2 className="text-amber-600 mx-auto mb-4" size={70} />
            <h2 className="text-2xl font-black mb-4 uppercase">點餐成功</h2>
            <div className="bg-amber-50 p-6 rounded-2xl text-left space-y-2 mb-6 border border-amber-100">
              <div className="text-[10px] text-amber-800 font-black mb-2 border-b border-amber-200 pb-1">單號：{lastOrder?.id}</div>
              {lastOrder?.items.map((i,idx)=><div key={idx} className="text-[11px] font-bold flex justify-between"><span>{i.name} x {i.quantity}</span><span>$ {i.price*i.quantity}</span></div>)}
              <div className="border-t border-amber-200 mt-2 pt-2 text-right font-black text-xl text-amber-900">$ {lastOrder?.total}</div>
            </div>
            <button onClick={()=>{setCart([]); setOrderStatus('ordering');}} className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold active:scale-95 shadow-lg transition-all">返回首頁</button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#FDFBF7] font-sans pb-32 flex flex-col text-amber-900 overflow-x-hidden">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-[100] border-b border-amber-100 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-800 rounded-full flex items-center justify-center text-amber-50 shadow-inner"><Store size={20} /></div>
              <h1 className="text-xl font-black font-serif">ASA 南巷微光</h1>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={()=>setSearchResult('searching')} className="p-2 text-amber-400 hover:text-amber-800 flex items-center gap-1 text-[10px] font-black uppercase"><Search size={14}/> 查進度</button>
               <button onClick={()=>{setPasswordInput(''); setShowLoginModal(true);}} className="p-3 bg-amber-800 text-white rounded-xl shadow-lg active:scale-90 flex items-center justify-center"><Lock size={18}/></button>
            </div>
          </div>
        </header>

        {searchResult && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="absolute inset-0 bg-black/60" onClick={()=>setSearchResult(null)}></div>
            <div className="bg-white p-8 rounded-[2rem] relative z-[201] w-full max-w-sm shadow-2xl">
               <div className="flex justify-between items-center mb-6"><h3 className="font-black text-lg tracking-widest uppercase">訂單狀態</h3><X onClick={()=>setSearchResult(null)} className="cursor-pointer text-slate-300" /></div>
               <div className="flex gap-2 mb-6"><input type="text" placeholder="單號末四碼" value={searchId} onChange={e=>setSearchId(e.target.value)} className="flex-1 bg-amber-50 p-4 rounded-xl outline-none font-bold text-sm" /><button onClick={()=>{const f=orders.find(o=>o.id.includes(searchId)); setSearchResult(f||'none')}} className="bg-amber-800 text-white px-6 rounded-xl"><Search size={18}/></button></div>
               {searchResult && searchResult !== 'searching' && searchResult !== 'none' && (
                 <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200"><div className="flex justify-between items-center mb-4"><span className="font-black text-xs">{searchResult.id}</span><span className={`px-4 py-1 rounded-full text-[10px] font-black ${searchResult.status==='pending'?'bg-amber-200 text-amber-800':'bg-green-600 text-white'}`}>{searchResult.status==='pending'?'製作中':'已完成'}</span></div></div>
               )}
            </div>
          </div>
        )}

        {/* 分類按鈕：專業縮放，手機精緻化 */}
        <div className="bg-white/30 sticky top-[73px] z-20 border-b border-amber-50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4 overflow-x-auto no-scrollbar justify-start md:justify-center">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center flex-col justify-center rounded-full transition-all shadow-sm shrink-0 ${activeCategory === cat.id ? 'bg-amber-800 text-white w-18 h-18 md:w-20 md:h-20 scale-105' : 'bg-white text-amber-600 border border-amber-100 w-18 h-18 md:w-20 md:h-20 opacity-70 hover:opacity-100'}`}>
                <span className="text-[10px] md:text-xs font-black text-center leading-tight uppercase px-2">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:mr-[380px]">
          {menuData.find(c => c.id === activeCategory)?.items.map(item => {
            const left = getStock(item);
            const isHot = hotItems.some(h => h.id === item.id);
            return (
              <div key={item.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-amber-50 flex flex-col items-center text-center transition-all hover:shadow-lg">
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-amber-50 mb-4 shadow-md" onClick={() => setZoomImage(item.image)}><img src={item.image} className="w-full h-full object-cover" /></div>
                <div className="mb-4 w-full flex items-center justify-center gap-3">
                  <span className="text-xl font-black text-amber-900 font-serif">${item.price}</span>
                  <button onClick={() => addToCart(item)} disabled={left===0} className={`px-4 py-1.5 rounded-full font-black text-[10px] shadow-sm active:scale-90 ${left===0?'bg-amber-100 text-amber-300':'bg-amber-800 text-white'}`}>{left===0?'完售':'加入'}</button>
                </div>
                <h3 className="text-base font-black tracking-tight">{isHot && <span className="text-orange-500 mr-1">🔥</span>}{item.name}</h3>
                <p className="text-[9px] text-amber-700/50 italic mt-2 border-t border-amber-50 pt-2 h-7 leading-relaxed">{item.poetry}</p>
                {/* 庫存顯示：醒目紅字，比例均衡 */}
                {left !== null && <div className={`text-[10px] font-black mt-2 ${left > 0 ? 'text-red-600' : 'text-slate-400'}`}>今日剩餘：{left}</div>}
              </div>
            );
          })}
        </main>

        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-[150]">
          <div className="bg-amber-900 rounded-2xl p-3 flex items-center justify-between shadow-2xl border border-amber-800">
            <div className="flex items-center gap-3 pl-4 text-white"><ShoppingCart size={20} /> <div className="font-black text-lg">$ {cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</div></div>
            <button onClick={() => setIsCartOpen(true)} className="bg-white text-amber-900 px-8 py-2.5 rounded-xl font-black text-xs active:scale-95">點餐明細</button>
          </div>
        </div>

        {isCartOpen && (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)}></div>
            <div className="bg-white w-full rounded-t-[2.5rem] relative p-8 shadow-2xl animate-slide-up max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6"><h2 className="text-lg font-black uppercase text-amber-900">ORDER DETAILS</h2><X onClick={()=>setIsCartOpen(false)} size={24} /></div>
              <div className="bg-amber-50 p-4 rounded-2xl space-y-3 mb-6 border border-amber-100">
                <div className="flex gap-2 bg-white p-1 rounded-xl shadow-inner"><button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${orderType==='dineIn'?'bg-amber-800 text-white shadow-md':'text-amber-300'}`}>內用</button><button onClick={()=>setOrderType('takeout')} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${orderType==='takeout'?'bg-amber-800 text-white shadow-md':'text-amber-300'}`}>外帶</button></div>
                <input type="text" placeholder={orderType==='dineIn'?'輸入桌號':'手機末三碼'} value={orderType==='dineIn'?tableNumber:phoneSuffix} onChange={e=>orderType==='dineIn'?setTableNumber(e.target.value):setPhoneSuffix(e.target.value)} className="w-full bg-white rounded-xl p-3 text-sm font-black shadow-sm outline-none text-center" />
              </div>
              <div className="space-y-4 mb-8">
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between items-center font-bold text-sm"><span>{i.name}</span>
                    <div className="flex items-center gap-3 bg-amber-50 px-3 py-1 rounded-full"><Minus size={14} className="text-amber-800" onClick={()=>setCart(prev=>prev.map(x=>x.id===i.id?{...x,quantity:Math.max(0,x.quantity-1)}:x).filter(x=>x.quantity>0))} /><span className="font-black text-sm">{i.quantity}</span><Plus size={14} className="text-amber-800" onClick={()=>addToCart(i)} /></div>
                  </div>
                ))}
              </div>
              <button onClick={handleSubmitOrder} className="w-full py-4 bg-amber-800 text-white rounded-xl font-black text-base active:scale-95 shadow-xl">確認送出訂單</button>
            </div>
          </div>
        )}

        <aside className="hidden lg:flex w-[380px] bg-white border-l border-amber-100 fixed right-0 top-0 bottom-0 flex-col shadow-2xl z-[50]">
          <div className="p-8 border-b border-amber-50 bg-[#FDFBF7] font-serif text-2xl font-black text-amber-900 text-center uppercase tracking-widest">ASA CART</div>
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="bg-amber-50 p-6 rounded-3xl space-y-4 border border-amber-100">
               <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm"><button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${orderType==='dineIn'?'bg-amber-800 text-white shadow-md':'text-amber-300'}`}>內用</button><button onClick={()=>setOrderType('takeout')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${orderType==='takeout'?'bg-amber-800 text-white shadow-md':'text-amber-300'}`}>外帶</button></div>
               <input type="text" placeholder={orderType==='dineIn'?'輸入桌號 (如 A1)':'手機末三碼'} value={orderType==='dineIn'?tableNumber:phoneSuffix} onChange={e=>orderType==='dineIn'?setTableNumber(e.target.value):setPhoneSuffix(e.target.value)} className="w-full bg-white rounded-xl p-3 text-center text-xs font-black shadow-sm outline-none" />
            </div>
            <div className="space-y-4">
              {cart.map((i,idx) => (
                <div key={idx} className="flex justify-between items-center font-bold text-xs bg-white p-4 rounded-2xl border border-amber-50 shadow-sm">
                  <div className="flex-1"><div>{i.name}</div><div className="text-[9px] text-amber-500 mt-1">$ {i.price}</div></div>
                  <div className="flex items-center gap-3 bg-amber-50 px-2 py-1 rounded-full"><Minus size={12} className="cursor-pointer text-amber-800" onClick={()=>setCart(prev=>prev.map(x=>x.id===i.id?{...x,quantity:Math.max(0,x.quantity-1)}:x).filter(x=>x.quantity>0))} /><span className="font-black text-xs">{i.quantity}</span><Plus size={12} className="cursor-pointer text-amber-800" onClick={()=>addToCart(i)} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-8 bg-[#FDFBF7] border-t border-amber-100 font-black text-amber-900">
            <div className="flex justify-between items-end mb-6 text-3xl font-serif"><span className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">TOTAL</span><span>$ {cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</span></div>
            <button onClick={handleSubmitOrder} className="w-full py-5 bg-amber-800 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">正式送出訂單</button>
          </div>
        </aside>

        {showLoginModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-xl">
            <div className="absolute inset-0 bg-amber-900/60" onClick={() => setShowLoginModal(false)}></div>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==='Aeon.1388'){setSystemRole('kitchen');setShowLoginModal(false);} else if(passwordInput==='$Asasouthernaelly,1388'){setSystemRole('admin');setShowLoginModal(false);} else alert('密碼錯誤'); }} className="bg-white p-10 rounded-[2.5rem] relative z-10 w-full max-w-sm shadow-2xl border border-amber-100 animate-zoom-in">
              <h2 className="text-center font-black mb-8 text-amber-900 text-xl tracking-widest uppercase">ASA ACCESS</h2>
              <div className="relative mb-6">
                 <input type={showPassword?'text':'password'} placeholder="請輸入通行密碼" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full border-2 border-amber-50 rounded-2xl p-4 text-center text-lg font-black outline-none focus:border-amber-800 transition-all pr-14 shadow-inner" autoFocus />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-200 cursor-pointer hover:text-amber-800" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={22}/>:<Eye size={22}/>}</div>
              </div>
              <button className="w-full bg-amber-800 text-white py-4 rounded-2xl font-black text-base shadow-xl active:scale-95">確認登入 (LOGIN)</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- 後廚與管理者 (保持專業主控介面) ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
       <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/95 sticky top-0 z-50">
          <h1 className="font-black text-lg flex items-center gap-3 text-amber-500 uppercase tracking-widest"><ChefHat size={24} /> ASA 主控室</h1>
          <button onClick={() => setSystemRole('customer')} className="text-[10px] bg-slate-800 px-6 py-2 rounded-xl font-black text-slate-400 border border-slate-700 hover:text-white">退出系統 (LOGOUT)</button>
       </header>
       <main className="p-6 flex-1 max-w-[1400px] mx-auto w-full overflow-y-auto">
          {systemRole === 'kitchen' ? (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-800/80 rounded-3xl border border-amber-500/20 shadow-2xl backdrop-blur-md">
                   <h2 className="text-amber-500 font-black mb-6 flex items-center gap-3 text-lg uppercase tracking-widest"><TrendingUp size={24} /> 今日排行 (HOT 5)</h2>
                   <div className="space-y-3">{hotItems.map((h, i) => (<div key={i} className="bg-slate-900 p-4 rounded-xl border-l-4 border-amber-500 flex justify-between items-center"><span className="font-black text-sm">#{i+1} {h.name}</span><span className="text-amber-400 font-black text-xl">{h.count} 份</span></div>))}</div>
                </div>
                <div className="p-6 bg-slate-800/80 rounded-3xl border border-amber-500/20 shadow-2xl backdrop-blur-md">
                   <h2 className="text-amber-500 font-black mb-6 flex items-center gap-3 text-lg uppercase tracking-widest"><PackagePlus size={24} /> 庫存管理</h2>
                   <div className="space-y-3">{menuData.find(c=>c.id==='c3')?.items.map(i => (<div key={i.id} className="flex justify-between items-center bg-slate-700 p-4 rounded-2xl border border-slate-600"><span className="font-black text-sm">{i.name}</span><input type="number" value={i.stock} onChange={async(e)=>{ const u = menuData.find(c=>c.id==='c3').items.map(it=>it.id===i.id?{...it,stock:parseInt(e.target.value)}:it); await updateDoc(doc(db,'artifacts',appId,'public','data','menu','c3'),{items:u}); }} className="w-20 bg-slate-900 text-amber-400 rounded-xl p-2 text-center font-black text-lg border-none" /></div>))}</div>
                </div>
              </div>
              <div className="flex gap-6 overflow-x-auto pb-10 no-scrollbar">
                {orders.filter(o => o.status === 'pending').map(order => (
                  <div key={order.id} className="w-85 bg-slate-800 rounded-[2.5rem] border-t-8 border-amber-500 shadow-2xl flex flex-col shrink-0 animate-fade-in">
                    <div className="p-6 border-b border-slate-700 font-black flex justify-between items-center text-amber-500">
                      <div><div className="text-xl uppercase tracking-tighter">{order.table}</div><div className="text-[9px] text-slate-500 mt-1 font-mono">{order.time}</div></div>
                      <span className="bg-slate-900 px-3 py-1 rounded-lg text-[9px] font-mono border border-slate-700">#{order.id.slice(-4)}</span>
                    </div>
                    <div className="p-8 flex-1 space-y-4 font-black">
                       {order.items.map((it, idx) => <div key={idx} className="flex justify-between border-b border-slate-700/30 pb-2 text-sm"><span>{it.name}</span><span className="text-amber-400 bg-slate-900 px-2 rounded-lg">x {it.quantity}</span></div>)}
                    </div>
                    <div className="p-6 bg-slate-900/30 rounded-b-[2.5rem]"><button onClick={async()=>await updateDoc(doc(db,'artifacts',appId,'public', 'data', 'orders', order.id),{status:'completed'})} className="w-full py-4 bg-amber-500 text-slate-900 font-black rounded-xl text-base shadow-xl active:scale-95 transition-all">出餐完成</button></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              <div className="flex gap-4 bg-slate-800 p-2 rounded-2xl w-fit border border-slate-700 shadow-xl">
                <button onClick={()=>setAdminTab('reports')} className={`px-10 py-2 rounded-xl text-[10px] font-black transition-all ${adminTab==='reports'?'bg-blue-600 text-white shadow-lg':'text-slate-400 hover:text-white'}`}>報表分析 (ANALYTICS)</button>
                <button onClick={()=>setAdminTab('products')} className={`px-10 py-2 rounded-xl text-[10px] font-black transition-all ${adminTab==='products'?'bg-blue-600 text-white shadow-lg':'text-slate-400 hover:text-white'}`}>商品管理 (INVENTORY)</button>
              </div>
              {adminTab === 'reports' ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-10 rounded-[3rem] shadow-2xl flex flex-col justify-between h-56 border-4 border-blue-500/20"><span className="font-black text-blue-100 uppercase tracking-widest text-[10px]">當日營收總結</span><h3 className="text-6xl font-black text-white tracking-tighter">$ {orders.reduce((s,o)=>s+o.total, 0).toLocaleString()}</h3></div>
                    <div className="bg-slate-800 p-10 rounded-[3rem] border-4 border-slate-700 flex flex-col justify-between h-56 shadow-xl"><span className="font-black text-slate-500 uppercase tracking-widest text-[10px]">總結帳單數</span><h3 className="text-6xl font-black text-amber-500 tracking-tighter">{orders.length} <span className="text-xl text-slate-600">單</span></h3></div>
                  </div>
                  <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-slate-700 shadow-2xl">
                     <h2 className="text-xl font-black mb-8 text-blue-400 flex items-center gap-3 uppercase tracking-widest"><BarChart3 size={24} /> 品項銷售細目報表</h2>
                     <table className="w-full text-left font-black"><thead><tr className="text-slate-500 border-b border-slate-700 text-[10px] uppercase tracking-widest"><th className="pb-4 px-2">商品名稱</th><th className="pb-4 px-2 text-center">總銷量</th><th className="pb-4 px-2 text-right">小計金額</th></tr></thead><tbody>{salesDetail.map((s,i)=>(<tr key={i} className="border-b border-slate-700/30 text-sm hover:bg-slate-700/40 transition-colors"><td className="py-5 px-2">{s.name}</td><td className="py-5 px-2 text-center text-amber-500">{s.qty} 份</td><td className="py-5 px-2 text-right text-blue-400">$ {s.subtotal.toLocaleString()}</td></tr>))}</tbody></table>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* 商品上架模塊 */}
                  <div className="bg-slate-800 p-10 rounded-[3rem] border border-slate-700 shadow-2xl relative overflow-hidden">
                    <h2 className="text-xl font-black mb-10 flex items-center gap-3 text-blue-400 uppercase tracking-widest"><PackagePlus size={28} /> 新增商品發佈</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <select value={newItem.categoryId} onChange={e=>setNewItem({...newItem, categoryId: e.target.value})} className="bg-slate-900 p-4 rounded-xl border-none font-black text-xs shadow-inner">{menuData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                      <input type="text" placeholder="商品名稱" value={newItem.name} onChange={e=>{const n = e.target.value; setNewItem({...newItem, name:n, poetry:generatePoetry(n)});}} className="bg-slate-900 p-4 rounded-xl border-none font-black text-xs shadow-inner" />
                      <input type="number" placeholder="販售單價" value={newItem.price} onChange={e=>setNewItem({...newItem, price:e.target.value})} className="bg-slate-900 p-4 rounded-xl border-none font-black text-xs shadow-inner" />
                      <input type="text" placeholder="自動發想詩詞" value={newItem.poetry} onChange={e=>setNewItem({...newItem, poetry:e.target.value})} className="col-span-full bg-slate-900 p-4 rounded-xl border border-blue-900/50 italic text-blue-200 text-xs shadow-inner" />
                      <input type="text" placeholder="照片 URL" value={newItem.image} onChange={e=>setNewItem({...newItem, image:e.target.value})} className="col-span-full bg-slate-900 p-4 rounded-xl border-none font-black text-xs shadow-inner" />
                      <button onClick={async()=>{ const cat = menuData.find(c=>c.id===newItem.categoryId); const it = { ...newItem, id: `m_${Date.now()}`, price: parseInt(newItem.price), stock: parseInt(newItem.stock) }; await updateDoc(doc(db,'artifacts',appId,'public','data','menu',newItem.categoryId), { items: [...cat.items, it] }); alert('ASA 新品發佈成功！'); setNewItem({...newItem, name:'', price:'', poetry:'', image:''}); }} className="col-span-full bg-blue-600 py-5 rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all text-lg mt-4 uppercase">正式發佈商品 (Publish)</button>
                    </div>
                  </div>
                  {/* 已上架商品清單 */}
                  <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-slate-700 shadow-xl">
                    <h2 className="text-xl font-black mb-8 text-slate-300 uppercase tracking-widest"><ClipboardList size={28} /> 商品監修清單</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                       {menuData.map(c => c.items.map(i => (
                        <div key={i.id} className="bg-slate-900 p-4 rounded-2xl flex justify-between items-center group border border-slate-700 hover:border-red-500 transition-all shadow-lg">
                          <div className="flex items-center gap-3"><img src={i.image} className="w-10 h-10 rounded-full object-cover shadow-md" /><div><div className="font-black text-[10px]">{i.name}</div><div className="text-[8px] text-slate-500 font-bold">$ {i.price}</div></div></div>
                          <button onClick={async()=>{if(confirm(`確定要下架【${i.name}】嗎？`)){ const u = c.items.filter(x=>x.id!==i.id); await updateDoc(doc(db,'artifacts',appId,'public','data','menu',c.id),{items:u}); }}} className="p-2 text-slate-700 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
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
