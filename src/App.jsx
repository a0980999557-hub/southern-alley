import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, X, Coffee, Cake, Soup, CheckCircle2, 
  Store, ChevronLeft, Image as ImageIcon, ClipboardList, Settings, 
  Leaf, Clock, Check, ChefHat, QrCode, Printer, Lock, LogOut, 
  Utensils, ShoppingBag, BarChart3, Receipt, Eye, Trash2, Smartphone, TrendingUp, Search
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
  const [orderStatus, setOrderStatus] = useState('ordering'); // ordering, success
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

  const handleSearchOrder = () => {
    const found = orders.find(o => o.id.includes(searchId));
    setSearchResult(found || 'none');
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-bold text-amber-800">ASA 智聯系統啟動中...</div>;

  if (systemRole === 'customer') {
    if (orderStatus === 'success') {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-amber-900">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center border border-amber-100 max-w-sm w-full animate-fade-in">
            <CheckCircle2 className="text-amber-600 mx-auto mb-4" size={80} />
            <h2 className="text-2xl font-black mb-2">訂單已送出</h2>
            <div className="bg-amber-50 p-4 rounded-2xl my-6 text-left space-y-2">
              <div className="text-xs font-bold text-amber-800 border-b border-amber-200 pb-1">單號：{lastOrder?.id}</div>
              {lastOrder?.items.map((i,idx)=><div key={idx} className="text-xs flex justify-between"><span>{i.name} x {i.quantity}</span><span>$ {i.price*i.quantity}</span></div>)}
              <div className="pt-2 border-t border-amber-200 font-black text-right">$ {lastOrder?.total}</div>
            </div>
            <button onClick={()=>{setCart([]); setOrderStatus('ordering');}} className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold">返回首頁</button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#FDFBF7] font-sans pb-32 flex flex-col text-amber-900">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-amber-100 px-4 py-4">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-800 rounded-full flex items-center justify-center text-amber-50"><Store size={20} /></div>
              <h1 className="text-xl font-black tracking-widest font-serif">ASA 南巷微光</h1>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={()=>setSearchResult('searching')} className="p-2 text-amber-400 hover:text-amber-800 flex items-center gap-1 text-xs font-bold"><Search size={16}/> 查進度</button>
               <button onClick={()=>setShowLoginModal(true)} className="p-2 text-amber-200"><Lock size={18}/></button>
            </div>
          </div>
        </header>

        {searchResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setSearchResult(null)}></div>
            <div className="bg-white p-8 rounded-[2.5rem] relative z-10 w-full max-w-sm">
               <h3 className="font-black text-xl mb-6">訂單進度查詢</h3>
               <div className="flex gap-2 mb-6">
                 <input type="text" placeholder="輸入單號末四碼" value={searchId} onChange={e=>setSearchId(e.target.value)} className="flex-1 bg-amber-50 p-4 rounded-2xl outline-none" />
                 <button onClick={handleSearchOrder} className="bg-amber-800 text-white px-6 rounded-2xl"><Search size={20}/></button>
               </div>
               {searchResult === 'none' && <div className="text-red-500 font-bold text-center">找不到此訂單</div>}
               {searchResult && searchResult !== 'searching' && searchResult !== 'none' && (
                 <div className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold">{searchResult.id}</span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${searchResult.status==='pending'?'bg-amber-200 text-amber-800':'bg-green-500 text-white'}`}>
                        {searchResult.status==='pending'?'製作中':'已出餐'}
                      </span>
                    </div>
                    <div className="text-xs space-y-2">
                      {searchResult.items.map((i,idx)=><div key={idx} className="flex justify-between"><span>{i.name} x {i.quantity}</span></div>)}
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:mr-96">
          <div className="col-span-full flex gap-3 overflow-x-auto no-scrollbar justify-start md:justify-center mb-4">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-6 py-2 rounded-full whitespace-nowrap text-sm font-bold lg:scale-90 ${activeCategory === cat.id ? 'bg-amber-800 text-white shadow-lg' : 'bg-white text-amber-600 border border-amber-100'}`}>
                {cat.name}
              </button>
            ))}
          </div>

          {menuData.find(c => c.id === activeCategory)?.items.map(item => {
            const inCart = cart.find(c => c.id === item.id)?.quantity || 0;
            const stockLeft = item.stock !== undefined ? Math.max(0, item.stock - inCart) : null;
            const isHot = hotItems.some(h => h.id === item.id);
            return (
              <div key={item.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-amber-50 flex flex-col items-center text-center">
                <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-amber-50 mb-3" onClick={() => setZoomImage(item.image)}>
                  <img src={item.image} className="w-full h-full object-cover" />
                </div>
                <div className="mb-4 w-full flex items-center justify-center gap-3">
                  <span className="text-xl font-black text-amber-800">${item.price}</span>
                  <button onClick={() => { if(stockLeft === 0) return; setCart([...cart, {...item, quantity: 1}]); }} className="bg-amber-800 text-white px-5 py-2 rounded-full font-bold text-[10px] active:scale-90">加入</button>
                </div>
                <h3 className="text-lg font-bold">{isHot && <span className="text-orange-500 mr-1 animate-pulse">🔥 熱銷</span>}{item.name}</h3>
                <p className="text-[10px] text-amber-700/50 italic mt-2 border-t border-amber-50 pt-2 h-7">{item.poetry}</p>
                {stockLeft !== null && <div className={`text-[10px] font-bold mt-2 ${stockLeft > 0 ? 'text-amber-400' : 'text-red-500'}`}>今日剩餘：{stockLeft}</div>}
              </div>
            );
          })}
        </main>

        <aside className="hidden lg:flex w-96 bg-white border-l border-amber-100 fixed right-0 top-0 bottom-0 flex-col shadow-xl z-30">
          <div className="p-8 border-b border-amber-50 bg-[#FDFBF7] font-serif text-2xl font-black tracking-widest uppercase">ASA 購物車</div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="bg-amber-50 p-6 rounded-3xl space-y-4">
              <div className="flex gap-2 bg-white p-1 rounded-xl">
                <button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${orderType==='dineIn'?'bg-amber-800 text-white':'text-amber-300'}`}>內用</button>
                <button onClick={()=>setOrderType('takeout')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${orderType==='takeout'?'bg-amber-800 text-white':'text-amber-300'}`}>外帶</button>
              </div>
              <input type="text" placeholder={orderType==='dineIn'?'輸入桌號 (如 A1)':'手機末三碼'} value={orderType==='dineIn'?tableNumber:phoneSuffix} onChange={e=>orderType==='dineIn'?setTableNumber(e.target.value):setPhoneSuffix(e.target.value)} className="w-full bg-white border-none rounded-2xl text-sm p-4 font-bold shadow-sm outline-none" />
            </div>
            {cart.map((i,idx) => (
              <div key={idx} className="flex justify-between items-center font-bold text-sm"><span>{i.name} x {i.quantity}</span><span>$ {i.price*i.quantity}</span></div>
            ))}
          </div>
          <div className="p-8 bg-[#FDFBF7] border-t border-amber-100 font-black text-amber-900 text-4xl tracking-tighter">
            $ {cart.reduce((s,i)=>s+(i.price*i.quantity),0)}
            <button onClick={handleSubmitOrder} className="w-full mt-6 py-5 bg-amber-800 text-white rounded-[2rem] font-bold text-lg active:scale-95 transition-all">正式送出訂單</button>
          </div>
        </aside>

        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="absolute inset-0 bg-amber-900/40" onClick={() => setShowLoginModal(false)}></div>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==='Aeon.1388'){setSystemRole('kitchen');setShowLoginModal(false);} else if(passwordInput==='$Asasouthernaelly,1388'){setSystemRole('admin');setShowLoginModal(false);} else alert('密碼錯誤'); }} className="bg-white p-8 rounded-[2.5rem] relative z-10 w-full max-w-sm">
              <h2 className="text-center font-bold mb-6 text-amber-900 uppercase">內部驗證</h2>
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
          <h1 className="font-bold flex items-center gap-2 text-amber-500 uppercase tracking-widest"><ChefHat /> ASA {systemRole==='kitchen'?'後廚看板':'店長主控'}</h1>
          <button onClick={() => setSystemRole('customer')} className="text-xs bg-slate-800 px-4 py-2 rounded-lg font-bold">登出</button>
       </header>

       <main className="p-6 flex-1 max-w-7xl mx-auto w-full">
          {systemRole === 'kitchen' && (
            <div className="space-y-8 animate-fade-in">
              {/* --- 熱銷排行模組 (後廚置頂) --- */}
              <div className="p-8 bg-slate-800 rounded-3xl border border-amber-500/20 shadow-2xl">
                 <h2 className="text-amber-500 font-black mb-6 flex items-center gap-2 tracking-widest uppercase"><TrendingUp size={24} /> 今日熱銷單品排行榜</h2>
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                   {hotItems.map((h, i) => (
                     <div key={i} className="bg-slate-900 p-4 rounded-2xl border-l-4 border-amber-500 flex flex-col justify-center">
                       <span className="text-[10px] text-slate-500 font-bold uppercase">NO.{i+1}</span>
                       <span className="font-bold text-sm truncate">{h.name}</span>
                       <span className="text-amber-400 font-black text-xl">{h.count} 份</span>
                     </div>
                   ))}
                 </div>
              </div>

              <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar">
                {orders.filter(o => o.status === 'pending').map(order => (
                  <div key={order.id} className="w-85 bg-slate-800 rounded-3xl border-t-4 border-amber-500 shadow-2xl flex flex-col shrink-0">
                    <div className="p-5 border-b border-slate-700 font-black text-xl text-amber-500 flex justify-between">
                      <span>{order.table}</span>
                      <span className="text-[10px] text-slate-500">#{order.id.slice(-4)}</span>
                    </div>
                    <div className="p-5 flex-1 space-y-3">
                       {order.items.map((it, idx) => <div key={idx} className="flex justify-between font-bold border-b border-slate-700/50 pb-1"><span>{it.name}</span><span className="text-amber-400 px-2 rounded bg-slate-900">x{it.quantity}</span></div>)}
                    </div>
                    <div className="p-5 border-t border-slate-700"><button onClick={async()=>await updateDoc(doc(db,'artifacts',appId,'public', 'data', 'orders', order.id),{status:'completed'})} className="w-full py-4 bg-amber-500 text-slate-900 font-black rounded-2xl">出餐完成</button></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {systemRole === 'admin' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex gap-2 bg-slate-800 p-1 rounded-2xl w-fit">
                <button onClick={()=>setAdminTab('reports')} className={`px-8 py-2 rounded-xl text-xs font-bold ${adminTab==='reports'?'bg-blue-600 shadow-lg':''}`}>營收報表</button>
                <button onClick={()=>setAdminTab('products')} className={`px-8 py-2 rounded-xl text-xs font-bold ${adminTab==='products'?'bg-blue-600 shadow-lg':''}`}>商品上下架</button>
              </div>

              {adminTab === 'reports' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-blue-600 p-10 rounded-[2.5rem] shadow-2xl flex flex-col justify-between h-56">
                    <span className="font-bold text-blue-100 flex items-center gap-2"><BarChart3 size={20} /> 雲端累計營收 (NTD)</span>
                    <h3 className="text-6xl font-black text-white">$ {orders.reduce((s,o)=>s+o.total, 0).toLocaleString()}</h3>
                  </div>
                  <div className="bg-slate-800 p-10 rounded-[2.5rem] border border-slate-700 flex flex-col justify-between h-56">
                    <span className="font-bold text-slate-500 flex items-center gap-2"><Receipt size={20} /> 總單數統計</span>
                    <h3 className="text-6xl font-black text-amber-500">{orders.length} <span className="text-xl">單</span></h3>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 space-y-8">
                   <h2 className="text-xl font-bold flex items-center gap-2"><ImageIcon /> 已上架清單 (點選下架)</h2>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {menuData.map(c => c.items.map(i => (
                        <div key={i.id} className="bg-slate-900 p-4 rounded-2xl flex justify-between items-center group border border-slate-700 hover:border-red-500">
                          <span className="font-bold text-sm">{i.name}</span>
                          <button onClick={async()=>{ if(confirm('確認下架？')){ const u = c.items.filter(x=>x.id!==i.id); await updateDoc(doc(db,'artifacts',appId,'public','data','menu',c.id),{items:u}); }}} className="text-slate-600 group-hover:text-red-500"><Trash2 size={18} /></button>
                        </div>
                      )))}
                   </div>
                </div>
              )}
            </div>
          )}
       </main>
    </div>
  );
}
