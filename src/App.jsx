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

export default function App() {
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
    onSnapshot(ordersRef, (snap) => {
      const fetchedOrders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedOrders.sort((a, b) => b.timestamp - a.timestamp);
      setOrders(fetchedOrders);
    });
  }, [user]);

  const { todayStats, monthStats } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    const todayOrders = orders.filter(o => o.timestamp >= startOfToday && o.timestamp <= endOfToday);
    const monthOrders = orders.filter(o => o.timestamp >= startOfMonth && o.timestamp <= endOfMonth);

    const calcStats = (filteredOrders) => {
      const counts = {};
      let totalRev = 0;
      filteredOrders.forEach(o => {
        totalRev += o.total;
        o.items.forEach(i => counts[i.id] = (counts[i.id] || 0) + i.quantity);
      });
      const list = [];
      menuData.forEach(c => c.items.forEach(i => { if(counts[i.id]) list.push({name: i.name, count: counts[i.id]}); }));
      return {
        totalRev,
        orderCount: filteredOrders.length,
        hot: list.sort((a,b) => b.count - a.count).slice(0, 5)
      };
    };

    return { todayStats: calcStats(todayOrders), monthStats: calcStats(monthOrders) };
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
    if (s !== null && s <= 0) return alert('庫存不足！');
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id);
      if (ex) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) return { ...item, quantity: Math.max(0, item.quantity + delta) };
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return alert('購物車是空的喔！');
    if (orderType === 'dineIn' && !tableNumber) return alert('請輸入桌號');
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
    } catch (e) { alert('系統連線繁忙，請重試'); }
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-black text-xl text-amber-900 tracking-widest italic animate-pulse">ASA 南巷微光品味中.........</div>;

  if (systemRole === 'customer') {
    const cartTotalAmount = cart.reduce((s,i)=>s+(i.price*i.quantity),0);
    const cartTotalItems = cart.reduce((s,i)=>s+i.quantity,0);

    if (orderStatus === 'success') {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-amber-900">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center border border-amber-100 max-w-sm w-full animate-fade-in">
            <CheckCircle2 className="text-amber-600 mx-auto mb-4" size={70} />
            <h2 className="text-2xl font-black mb-4 uppercase">點餐成功</h2>
            <div className="bg-amber-50 p-6 rounded-2xl text-left space-y-2 mb-6 border border-amber-100">
              {/* 修改：加大結帳成功單號與明細字體，增加對比度 */}
              <div className="text-sm font-black text-amber-900 border-b border-amber-200 pb-2 mb-2">單號：{lastOrder?.id}</div>
              {lastOrder?.items.map((i,idx)=>(
                <div key={idx} className="text-sm font-bold text-amber-950 flex justify-between py-1">
                  <span>{i.name} x {i.quantity}</span>
                  <span>$ {i.price*i.quantity}</span>
                </div>
              ))}
              <div className="border-t border-amber-200 mt-3 pt-3 text-right text-3xl font-black text-amber-900">
                $ {lastOrder?.total}
              </div>
            </div>
            <button onClick={()=>{setCart([]); setOrderStatus('ordering');}} className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold active:scale-95 shadow-lg">返回首頁</button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#FDFBF7] font-sans pb-32 flex flex-col text-amber-900 overflow-x-hidden relative">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-[100] border-b border-amber-100 px-6 py-4 shadow-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="https://i.postimg.cc/G2sP5yqd/Gemini-Generated-Image-7uf38w7uf38w7uf3.png" className="w-12 h-12 rounded-full object-cover shadow-xl border-2 border-amber-900/10" alt="ASA Logo" />
              <h1 className="text-xl md:text-2xl font-black font-serif tracking-tighter">ASA 南巷微光</h1>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={()=>setSearchResult('searching')} className="p-3 text-amber-400 hover:text-amber-800 flex items-center gap-2 text-[12px] font-black bg-amber-50 rounded-2xl transition-all"><Search size={16}/> 查進度</button>
               <button onClick={()=>{setPasswordInput(''); setShowLoginModal(true);}} className="p-3 bg-amber-800 text-white rounded-2xl shadow-lg active:scale-90 flex items-center justify-center transition-all"><Lock size={20}/></button>
            </div>
          </div>
        </header>

        {searchResult && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="absolute inset-0 bg-black/60" onClick={()=>setSearchResult(null)}></div>
            <div className="bg-white p-8 rounded-[2rem] relative z-201 w-full max-w-sm shadow-2xl">
               <div className="flex justify-between items-center mb-6"><h3 className="font-black text-lg tracking-widest uppercase">訂單狀態</h3><X onClick={()=>setSearchResult(null)} className="cursor-pointer text-slate-300" /></div>
               <div className="flex gap-2 mb-6"><input type="text" placeholder="末四碼" value={searchId} onChange={e=>setSearchId(e.target.value)} className="flex-1 bg-amber-50 p-4 rounded-xl outline-none font-bold text-sm shadow-inner" /><button onClick={()=>{const f=orders.find(o=>o.id.includes(searchId)); setSearchResult(f||'none')}} className="bg-amber-800 text-white px-6 rounded-xl active:scale-90 shadow-lg"><Search size={18}/></button></div>
               {searchResult && searchResult !== 'searching' && searchResult !== 'none' && (
                 <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200"><div className="flex justify-between items-center mb-4"><span className="font-black text-xs text-amber-900">{searchResult.id}</span><span className={`px-4 py-1 rounded-full text-[10px] font-black ${searchResult.status==='pending'?'bg-amber-200 text-amber-800 animate-pulse':'bg-green-600 text-white'}`}>{searchResult.status==='pending'?'製作中':'已完成'}</span></div></div>
               )}
            </div>
          </div>
        )}

        {/* 圖片放大 Modal */}
        {zoomImage && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 backdrop-blur-xl">
            <div className="absolute inset-0 bg-black/80" onClick={() => setZoomImage(null)}></div>
            <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
              <button onClick={() => setZoomImage(null)} className="absolute -top-14 right-0 text-white bg-white/20 hover:bg-white/40 rounded-full p-2 backdrop-blur-md transition-all active:scale-90">
                <X size={28} />
              </button>
              <img src={zoomImage} alt="放大商品照" className="w-full h-auto rounded-[2.5rem] shadow-2xl object-cover border-4 border-white/10" />
            </div>
          </div>
        )}

        <div className="bg-white/30 sticky top-[73px] z-20 border-b border-amber-50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4 overflow-x-auto no-scrollbar justify-start md:justify-center">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center flex-col justify-center rounded-full transition-all shadow-sm shrink-0 ${activeCategory === cat.id ? 'bg-amber-800 text-white w-20 h-20 md:w-22 md:h-22 scale-105 ring-4 ring-amber-50' : 'bg-white text-amber-900 border border-amber-200 w-20 h-20 md:w-22 md:h-22 opacity-80 hover:opacity-100'}`}>
                <span className="text-[14px] md:text-sm font-black px-2">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:mr-[380px] pb-32">
          {menuData.find(c => c.id === activeCategory)?.items.map(item => {
            const cartItem = cart.find(c => c.id === item.id);
            const quantity = cartItem ? cartItem.quantity : 0;
            const left = getDisplayStock(item);
            const isHot = todayStats.hot.some(h => h.name === item.name);
            
            return (
              <div key={item.id} className="bg-white rounded-[2rem] p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-amber-50 flex flex-col items-center text-center transition-all relative group">
                
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-amber-50 relative shrink-0 shadow-inner mb-4 border-4 border-white group-hover:border-amber-100 transition-colors cursor-pointer" onClick={() => setZoomImage(item.image)}>
                  <img src={item.image} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" alt={item.name} />
                </div>
                
                <div className="flex-1 flex flex-col w-full">
                  <div className="mb-3">
                    {/* 修改：無底色時文字加深至 amber-950，字體放大 */}
                    <h3 className="text-xl sm:text-2xl font-black text-amber-950 leading-tight mb-2">
                      {isHot && <span className="text-orange-500 mr-1 animate-bounce inline-block">🔥</span>}
                      {item.name}
                    </h3>
                    {/* 修改：詩詞字體加深加粗，行高增加 */}
                    <p className="text-xs sm:text-sm text-amber-900/80 font-bold italic leading-relaxed px-2 line-clamp-2 h-10">{item.poetry}</p>
                    {left !== null && <div className={`text-[11px] font-black mt-2 ${left > 0 ? 'text-red-600' : 'text-slate-400'}`}>限量餘額：{left}</div>}
                  </div>
                  
                  <div className="mt-auto flex flex-col gap-3 w-full">
                    {/* 修改：價格字體加深並放大 */}
                    <span className="text-2xl font-black text-amber-800 font-serif">${item.price}</span>
                    
                    {quantity === 0 ? (
                      <button onClick={() => addToCart(item)} disabled={left===0} className={`w-full py-3.5 rounded-full flex items-center justify-center font-black transition-all gap-2 shadow-lg active:scale-95 ${left===0 ? 'bg-gray-200 text-gray-400' : 'bg-gradient-to-r from-amber-600 to-amber-800 text-white hover:from-amber-700 hover:to-amber-900 shadow-[0_4px_15px_rgba(146,64,14,0.3)]'}`}>
                        <Plus size={20} /> {left===0 ? '本日完售' : '加入購物車'}
                      </button>
                    ) : (
                      <div className="flex items-center justify-between w-full bg-amber-50/80 rounded-full p-1.5 border border-amber-100 shadow-inner">
                        <button onClick={() => updateQuantity(item.id, -1)} className="bg-white text-amber-800 w-11 h-11 rounded-full flex items-center justify-center shadow-sm hover:bg-amber-100 transition-colors active:scale-90"><Minus size={20} /></button>
                        <span className="font-black text-amber-950 text-xl w-10 text-center">{quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} disabled={left===0} className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-colors active:scale-90 ${left===0 ? 'bg-gray-300 text-gray-500' : 'bg-amber-700 text-white hover:bg-amber-800'}`}><Plus size={20} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </main>

        <div className="lg:hidden fixed bottom-6 left-0 right-0 flex justify-center z-[150] pb-safe pointer-events-none px-4">
          <div className="bg-amber-950 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.4)] p-2 pr-3 flex items-center gap-4 sm:gap-6 border border-amber-900/50 backdrop-blur-xl pointer-events-auto animate-slide-up">
            <div className="flex items-center">
              <button onClick={() => setIsCartOpen(true)} className="relative p-3.5 bg-amber-900/80 rounded-full text-amber-400 ml-1 hover:bg-amber-800 transition-colors">
                <ShoppingCart size={24} />
                {cartTotalItems > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[12px] w-6 h-6 rounded-full flex items-center justify-center font-black border-2 border-amber-950 shadow-sm">{cartTotalItems}</span>}
              </button>
              <div className="flex flex-col items-start ml-3">
                <span className="text-amber-400/70 text-[11px] font-black tracking-wider mb-0.5 whitespace-nowrap">購物車總計</span>
                <span className="text-xl font-black text-white leading-none">${cartTotalAmount}</span>
              </div>
            </div>
            <button disabled={cart.length === 0} onClick={() => setIsCartOpen(true)} className={`px-5 py-3 rounded-full font-black text-sm transition-all shadow-md whitespace-nowrap ${cart.length === 0 ? 'bg-amber-900 text-amber-700' : 'bg-gradient-to-r from-amber-500 to-amber-700 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95'}`}>
              查看明細
            </button>
          </div>
        </div>

        {isCartOpen && (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartOpen(false)}></div>
            <div className="bg-white w-full rounded-t-[2.5rem] relative p-8 shadow-2xl animate-slide-up max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6"><h2 className="text-lg font-black uppercase text-amber-900 tracking-widest text-center">ORDER DETAILS</h2><X onClick={()=>setIsCartOpen(false)} size={24} className="text-amber-200" /></div>
              <div className="bg-amber-50 p-5 rounded-2xl space-y-4 mb-6 border border-amber-100 shadow-inner text-center font-bold">
                <div className="flex gap-2 bg-white p-1 rounded-xl shadow-inner"><button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-2 text-sm font-black rounded-lg transition-all ${orderType==='dineIn'?'bg-amber-800 text-white shadow-md':'text-amber-300'}`}>內用</button><button onClick={()=>setOrderType('takeout')} className={`flex-1 py-2 text-sm font-black rounded-lg transition-all ${orderType==='takeout'?'bg-amber-800 text-white shadow-md':'text-amber-300'}`}>外帶</button></div>
                <input type="text" placeholder={orderType==='dineIn'?'請輸入您的桌號':'手機末三碼'} value={orderType==='dineIn'?tableNumber:phoneSuffix} onChange={e=>orderType==='dineIn'?setTableNumber(e.target.value):setPhoneSuffix(e.target.value)} className="w-full bg-white rounded-xl p-3 text-xl font-black shadow-sm outline-none text-center placeholder-amber-200" />
              </div>
              <div className="space-y-4 mb-8">
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between items-center font-bold text-base p-2 border-b border-amber-50"><span>{i.name}</span>
                    <div className="flex items-center gap-4 bg-amber-50 px-3 py-1.5 rounded-full"><Minus size={18} className="text-amber-800 cursor-pointer" onClick={()=>updateQuantity(i.id, -1)} /><span className="font-black text-xl min-w-[30px] text-center">{i.quantity}</span><Plus size={18} className="text-amber-800 cursor-pointer" onClick={()=>updateQuantity(i.id, 1)} /></div>
                  </div>
                ))}
              </div>
              <button onClick={handleSubmitOrder} className="w-full py-5 bg-amber-800 text-white rounded-2xl font-black text-lg active:scale-95 shadow-xl">確認送出訂單 • ${cartTotalAmount}</button>
            </div>
          </div>
        )}

        <aside className="hidden lg:flex w-[380px] bg-white border-l border-amber-100 fixed right-0 top-0 bottom-0 flex-col shadow-2xl z-[50]">
          <div className="p-8 border-b border-amber-50 bg-[#FDFBF7] font-serif text-2xl font-black text-amber-900 text-center uppercase tracking-widest">ASA CART</div>
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="bg-amber-50 p-6 rounded-3xl space-y-4 border border-amber-100 shadow-inner">
               <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm"><button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-3 text-xs font-black rounded-lg transition-all ${orderType==='dineIn'?'bg-amber-800 text-white shadow-md':'text-amber-300'}`}>內用</button><button onClick={()=>setOrderType('takeout')} className={`flex-1 py-3 text-xs font-black rounded-lg transition-all ${orderType==='takeout'?'bg-amber-800 text-white shadow-md':'text-amber-300'}`}>外帶</button></div>
               <input type="text" placeholder={orderType==='dineIn'?'輸入桌號 (如 A1)':'手機末三碼'} value={orderType==='dineIn'?tableNumber:phoneSuffix} onChange={e=>orderType==='dineIn'?setTableNumber(e.target.value):setPhoneSuffix(e.target.value)} className="w-full bg-white rounded-xl p-4 text-center text-sm font-black shadow-sm outline-none" />
            </div>
            <div className="space-y-4">
              {cart.map((i,idx) => (
                <div key={idx} className="flex justify-between items-center font-bold text-sm bg-white p-5 rounded-2xl border border-amber-50 shadow-sm transition-all hover:shadow-md text-amber-900">
                  <div className="flex-1"><div>{i.name}</div><div className="text-[10px] text-amber-500 font-black mt-1">$ {i.price}</div></div>
                  <div className="flex items-center gap-4 bg-amber-50 px-3 py-1.5 rounded-full"><Minus size={14} className="cursor-pointer text-amber-800" onClick={()=>updateQuantity(i.id, -1)} /><span className="font-black text-base">{i.quantity}</span><Plus size={14} className="cursor-pointer text-amber-800" onClick={()=>updateQuantity(i.id, 1)} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-8 bg-[#FDFBF7] border-t border-amber-100 font-black text-amber-900">
            <div className="flex justify-between items-end mb-6 text-3xl font-serif font-black"><span className="text-[11px] font-black text-amber-400 uppercase tracking-widest mb-1">TOTAL</span><span>$ {cartTotalAmount}</span></div>
            <button disabled={cart.length===0} onClick={handleSubmitOrder} className="w-full py-5 bg-amber-800 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">正式送出訂單</button>
          </div>
        </aside>

        {showLoginModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-xl">
            <div className="absolute inset-0 bg-amber-900/60" onClick={() => setShowLoginModal(false)}></div>
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              if(passwordInput==='Aeon.1388'){ setSystemRole('kitchen'); setShowLoginModal(false); } 
              else if(passwordInput==='$Asasouthernaelly,1388'){ setSystemRole('admin'); setShowLoginModal(false); } 
              else alert('密碼錯誤'); 
            }} className="bg-white p-10 rounded-[2.5rem] relative z-10 w-full max-w-sm shadow-2xl border border-amber-100 animate-zoom-in">
              <h2 className="text-center font-black mb-8 text-amber-900 text-xl tracking-widest uppercase">ASA ACCESS</h2>
              <div className="relative mb-6">
                 <input type={showPassword?'text':'password'} placeholder="通行密碼" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full border-2 border-amber-50 rounded-[1.8rem] p-6 text-center text-xl font-black outline-none focus:border-amber-800 transition-all pr-14 shadow-inner" autoFocus />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-200 cursor-pointer hover:text-amber-800" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={22}/>:<Eye size={22}/>}</div>
              </div>
              <button className="w-full bg-amber-800 text-white py-4 rounded-2xl font-black text-base shadow-xl active:scale-95">確認登入 (LOGIN)</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- 主控系統與報表：精密微調比例 ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
       <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/95 sticky top-0 z-50">
          <h1 className="font-black text-lg md:text-xl flex items-center gap-3 text-amber-500 uppercase tracking-widest"><ChefHat size={28} /> ASA {systemRole==='kitchen'?'後廚系統':'店長主控台'}</h1>
          <button onClick={() => setSystemRole('customer')} className="text-[10px] bg-slate-800 px-6 py-2 rounded-xl font-black text-slate-400 border border-slate-700 hover:text-white transition-all uppercase">Logout</button>
       </header>
       <main className="p-6 flex-1 max-w-[1400px] mx-auto w-full overflow-y-auto">
          {systemRole === 'kitchen' ? (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-800/80 rounded-3xl border border-amber-500/20 shadow-2xl backdrop-blur-md flex flex-col">
                   <h2 className="text-amber-500 font-black mb-6 flex items-center gap-3 text-xl uppercase tracking-widest"><TrendingUp size={24} /> 今日排行 (HOT 5)</h2>
                   <div className="space-y-3 flex-1">
                     {todayStats.hot.length === 0 ? (
                       <div className="text-slate-400 font-bold p-4 text-center">今日尚未有銷售紀錄</div>
                     ) : (
                       todayStats.hot.map((h, i) => (
                         <div key={i} className="bg-slate-900 p-4 rounded-xl border-l-4 border-amber-500 flex justify-between items-center shadow-lg">
                           <span className="font-black text-sm">#{i+1} {h.name}</span>
                           <span className="text-amber-400 font-black text-xl">{h.count} 份</span>
                         </div>
                       ))
                     )}
                   </div>
                </div>
                <div className="p-6 bg-slate-800/80 rounded-3xl border border-blue-500/20 shadow-2xl backdrop-blur-md flex flex-col">
                   <h2 className="text-blue-400 font-black mb-6 flex items-center gap-3 text-xl uppercase tracking-widest"><BarChart3 size={24} /> 本月銷售統計</h2>
                   <div className="flex justify-between items-end mb-4 border-b border-slate-700 pb-4">
                     <div>
                       <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">本月累計營收</div>
                       <div className="text-2xl font-black text-white">$ {monthStats.totalRev.toLocaleString()}</div>
                     </div>
                     <div className="text-right">
                       <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">總單數</div>
                       <div className="text-xl font-black text-blue-400">{monthStats.orderCount} 單</div>
                     </div>
                   </div>
                   <div className="space-y-3 flex-1">
                     {monthStats.hot.length === 0 ? (
                       <div className="text-slate-400 font-bold p-4 text-center mt-4">本月尚未有銷售紀錄</div>
                     ) : (
                       monthStats.hot.map((h, i) => (
                         <div key={i} className="bg-slate-900 p-3 rounded-xl border-l-4 border-blue-500 flex justify-between items-center shadow-md">
                           <span className="font-black text-sm text-slate-200">#{i+1} {h.name}</span>
                           <span className="text-blue-400 font-black text-lg">{h.count} <span className="text-xs">份</span></span>
                         </div>
                       ))
                     )}
                   </div>
                </div>
                <div className="p-6 bg-slate-800/80 rounded-3xl border border-emerald-500/20 shadow-2xl backdrop-blur-md flex flex-col">
                   <h2 className="text-emerald-500 font-black mb-6 flex items-center gap-3 text-xl uppercase tracking-widest"><PackagePlus size={24} /> 庫存管理</h2>
                   <div className="space-y-3 flex-1">{menuData.find(c=>c.id==='c3')?.items.map(i => (<div key={i.id} className="flex justify-between items-center bg-slate-700 p-4 rounded-2xl border border-slate-600"><span className="font-black text-sm">{i.name}</span><input type="number" value={i.stock} onChange={async(e)=>{ const u = menuData.find(c=>c.id==='c3').items.map(it=>it.id===i.id?{...it,stock:parseInt(e.target.value)}:it); await updateDoc(doc(db,'artifacts',appId,'public','data','menu','c3'),{items:u}); }} className="w-20 bg-slate-900 text-emerald-400 rounded-xl p-2 text-center font-black text-lg border-none" /></div>))}</div>
                </div>
              </div>
              <div className="flex gap-6 overflow-x-auto pb-10 no-scrollbar mt-8">
                {orders.filter(o => o.status === 'pending').map(order => (
                  <div key={order.id} className="w-85 bg-slate-800 rounded-[2.5rem] border-t-8 border-amber-500 shadow-2xl flex flex-col shrink-0 animate-fade-in hover:scale-105 transition-transform">
                    <div className="p-6 border-b border-slate-700 font-black flex justify-between items-center text-amber-50">
                      <div><div className="text-xl uppercase tracking-tighter">{order.table}</div><div className="text-[9px] text-slate-500 mt-1 font-mono uppercase">{order.time}</div></div>
                      <span className="bg-slate-900 px-3 py-1 rounded-lg text-[9px] font-mono border border-slate-700">#{order.id.slice(-4)}</span>
                    </div>
                    <div className="p-8 flex-1 space-y-4 font-black text-amber-100">
                       {order.items.map((it, idx) => <div key={idx} className="flex justify-between border-b border-slate-700/30 pb-2 text-sm"><span>{it.name}</span><span className="text-amber-400 bg-slate-900 px-2 rounded-lg">x {it.quantity}</span></div>)}
                    </div>
                    <div className="p-6 bg-slate-900/30 rounded-b-[2.5rem]"><button onClick={async()=>await updateDoc(doc(db,'artifacts',appId,'public', 'data', 'orders', order.id),{status:'completed'})} className="w-full py-4 bg-amber-500 text-slate-900 font-black rounded-xl text-base shadow-xl active:scale-95 transition-all">出餐完成</button></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-10 animate-fade-in">
              <div className="flex flex-wrap gap-4 bg-slate-800 p-2.5 rounded-2xl w-fit border border-slate-700 shadow-xl">
                <button onClick={()=>setAdminTab('reports')} className={`px-6 md:px-10 py-3 rounded-xl text-base md:text-lg font-black transition-all ${adminTab==='reports'?'bg-blue-600 text-white shadow-lg':'text-slate-400 hover:text-white'}`}>今日與本月結算 (REPORTS)</button>
                <button onClick={()=>setAdminTab('salesDetail')} className={`px-6 md:px-10 py-3 rounded-xl text-base md:text-lg font-black transition-all ${adminTab==='salesDetail'?'bg-blue-600 text-white shadow-lg':'text-slate-400 hover:text-white'}`}>歷史總報表 (ANALYTICS)</button>
                <button onClick={()=>setAdminTab('products')} className={`px-6 md:px-10 py-3 rounded-xl text-base md:text-lg font-black transition-all ${adminTab==='products'?'bg-blue-600 text-white shadow-lg':'text-slate-400 hover:text-white'}`}>商品管理 (STOCK)</button>
              </div>

              {adminTab === 'reports' && (
                <div className="space-y-10">
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black text-amber-500 flex items-center gap-3 uppercase tracking-widest border-b border-slate-700 pb-4">
                      <BarChart3 size={28} /> 今日營收結算
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-gradient-to-br from-amber-600 to-amber-900 p-6 rounded-[2.5rem] shadow-2xl flex flex-col justify-between h-44 border-4 border-amber-500/20">
                         <span className="font-black text-amber-100 uppercase tracking-widest text-base">今日營收總額</span>
                         <h3 className="text-4xl font-black text-white tracking-tighter">$ {todayStats.totalRev.toLocaleString()}</h3>
                      </div>
                      <div className="bg-slate-800 p-6 rounded-[2.5rem] border-4 border-slate-700 flex flex-col justify-between h-44 shadow-xl">
                         <span className="font-black text-slate-500 uppercase tracking-widest text-base">今日總單數</span>
                         <h3 className="text-4xl font-black text-blue-400 tracking-tighter">{todayStats.orderCount} <span className="text-sm text-slate-600 uppercase">單</span></h3>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-slate-700">
                    <h2 className="text-2xl font-black text-blue-400 flex items-center gap-3 uppercase tracking-widest border-b border-slate-700 pb-4">
                      <BarChart3 size={28} /> 本月累計結算
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-gradient-to-br from-blue-600 to-indigo-900 p-6 rounded-[2.5rem] shadow-2xl flex flex-col justify-between h-44 border-4 border-blue-500/20">
                         <span className="font-black text-blue-100 uppercase tracking-widest text-base">本月營收總額</span>
                         <h3 className="text-4xl font-black text-white tracking-tighter">$ {monthStats.totalRev.toLocaleString()}</h3>
                      </div>
                      <div className="bg-slate-800 p-6 rounded-[2.5rem] border-4 border-slate-700 flex flex-col justify-between h-44 shadow-xl">
                         <span className="font-black text-slate-500 uppercase tracking-widest text-base">本月總單數</span>
                         <h3 className="text-4xl font-black text-amber-500 tracking-tighter">{monthStats.orderCount} <span className="text-sm text-slate-600 uppercase">單</span></h3>
                      </div>
                    </div>

                    <div className="bg-slate-800 p-10 rounded-[3rem] border border-slate-700 shadow-2xl mt-8">
                       <h2 className="text-2xl font-black mb-8 text-blue-400 flex items-center gap-3 uppercase tracking-widest">🏆 本月熱銷 HOT 5</h2>
                       {monthStats.hot.length === 0 ? (
                         <div className="text-slate-500 text-center py-6 font-bold">本月尚未有銷售紀錄</div>
                       ) : (
                         <div className="space-y-4">
                           {monthStats.hot.map((h, i) => (
                             <div key={i} className="bg-slate-900 p-5 rounded-2xl border-l-4 border-blue-500 flex justify-between items-center shadow-lg">
                               <span className="font-black text-lg text-slate-200">#{i+1} {h.name}</span>
                               <span className="text-blue-400 font-black text-2xl">{h.count} 份</span>
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              )}

              {adminTab === 'salesDetail' && (
                <div className="bg-slate-800 p-10 rounded-[3rem] border border-slate-700 shadow-2xl">
                   <h2 className="text-2xl font-black mb-10 text-blue-400 flex items-center gap-3 uppercase tracking-widest"><BarChart3 size={32} /> 歷史銷售總明細</h2>
                   <table className="w-full text-left font-black">
                      <thead>
                         <tr className="text-slate-500 border-b border-slate-700 text-base uppercase tracking-widest">
                            <th className="pb-6 px-4">商品名稱 (ITEM)</th>
                            <th className="pb-6 px-4 text-center">總銷量 (QTY)</th>
                            <th className="pb-6 px-4 text-right">合計金額 (TOTAL)</th>
                         </tr>
                      </thead>
                      <tbody>
                         {salesDetail.map((s,i)=>(
                           <tr key={i} className="border-b border-slate-700/30 text-xl hover:bg-slate-700/40 transition-colors">
                             <td className="py-6 px-4">{s.name}</td>
                             <td className="py-6 px-4 text-center text-amber-500">{s.qty} 份</td>
                             <td className="py-6 px-4 text-right text-blue-400">$ {s.subtotal.toLocaleString()}</td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
              )}

              {adminTab === 'products' && (
                <div className="space-y-8">
                  <div className="bg-slate-800 p-12 rounded-[4rem] border border-slate-700 shadow-2xl">
                    <h2 className="text-2xl font-black mb-10 flex items-center gap-3 text-blue-400 uppercase tracking-widest"><PackagePlus size={36} /> 新增 ASA 商品上架</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                      <select value={newItem.categoryId} onChange={e=>setNewItem({...newItem, categoryId: e.target.value})} className="bg-slate-900 p-6 rounded-3xl border-none font-black text-base shadow-inner text-slate-200">{menuData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                      <input type="text" placeholder="品名" value={newItem.name} onChange={e=>{const n=e.target.value; setNewItem({...newItem, name:n, poetry:generatePoetry(n)});}} className="bg-slate-900 p-6 rounded-3xl border-none font-black text-base shadow-inner text-slate-200" />
                      <input type="number" placeholder="單價" value={newItem.price} onChange={e=>setNewItem({...newItem, price:e.target.value})} className="bg-slate-900 p-6 rounded-3xl border-none font-black text-base shadow-inner text-slate-200" />
                      <input type="text" placeholder="自動詩詞" value={newItem.poetry} onChange={e=>setNewItem({...newItem, poetry:e.target.value})} className="col-span-full bg-slate-900 p-6 rounded-3xl border border-blue-900/50 italic text-blue-200 text-lg shadow-inner font-serif" />
                      <input type="text" placeholder="照片網址" value={newItem.image} onChange={e=>setNewItem({...newItem, image:e.target.value})} className="col-span-full bg-slate-900 p-6 rounded-3xl border-none font-black text-base shadow-inner text-slate-200" />
                      <button onClick={async()=>{ const cat = menuData.find(c=>c.id===newItem.categoryId); const it = { ...newItem, id: `m_${Date.now()}`, price: parseInt(newItem.price), stock: parseInt(newItem.stock) }; await updateDoc(doc(db,'artifacts',appId,'public','data','menu',newItem.categoryId), { items: [...cat.items, it] }); alert('上架成功！'); setNewItem({...newItem, name:'', price:'', poetry:'', image:'', stock:0}); }} className="col-span-full bg-blue-600 py-8 rounded-[3rem] font-black shadow-2xl active:scale-95 transition-all text-2xl mt-6 uppercase tracking-widest text-white">正式發佈商品 (PUBLISH)</button>
                    </div>
                  </div>
                  <div className="bg-slate-800 p-10 rounded-[3rem] border border-slate-700 shadow-xl">
                    <h2 className="text-2xl font-black mb-10 text-slate-300 uppercase tracking-widest"><ClipboardList size={32} /> 商品管理監看</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                       {menuData.map(c => c.items.map(i => (
                        <div key={i.id} className="bg-slate-900 p-6 rounded-[2.5rem] flex justify-between items-center group border border-slate-700 hover:border-red-500 transition-all shadow-xl">
                          <div className="flex items-center gap-5"><img src={i.image} className="w-16 h-16 rounded-full object-cover shadow-lg" /><div><div className="font-black text-base text-white">{i.name}</div><div className="text-[11px] text-slate-500 font-bold">$ {i.price}</div></div></div>
                          <button onClick={async()=>{if(confirm(`確定要下架【${i.name}】嗎？`)){ const u = c.items.filter(x=>x.id!==i.id); await updateDoc(doc(db,'artifacts',appId,'public','data','menu',c.id),{items:u}); }}} className="p-4 text-slate-700 hover:text-red-500 transition-all"><Trash2 size={24} /></button>
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
