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

// --- 智能詩詞發想模組 ---
const generatePoetry = (name) => {
  if (name.includes('拿鐵') || name.includes('咖啡')) return "露染紅瓣映晨光，餘香輕吻拿鐵芳。";
  if (name.includes('茶')) return "菊香幽遠沁心脾，柚影搖曳綠波間。";
  if (name.includes('蛋糕') || name.includes('千層') || name.includes('布丁')) return "紅蕊層疊映纖指，幽香透出半殘霞。";
  if (name.includes('鍋燒')) return "墨香引路尋珍味，海潮湧入暖心田。";
  return "ASA 職人手作，溫暖每一刻微光時分。";
};

const INITIAL_MENU = [
  { id: 'c1', name: '手沖與咖啡', icon: 'coffee', items: [{ id: 'm1', name: '玫瑰海鹽拿鐵', price: 160, poetry: '露染紅瓣映晨光，海鹽輕吻拿鐵香。', image: 'https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?w=600' }, { id: 'm2', name: '雲朵焦糖瑪奇朵', price: 180, poetry: '雲端起舞弄清影，焦糖如絲醉晚風。', image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600' }] },
  { id: 'c2', name: '優雅花茶', icon: 'leaf', items: [{ id: 'f1', name: '洋甘菊柚香綠茶', price: 150, poetry: '菊香幽遠沁心脾，柚影搖曳綠波間。', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600' }] },
  { id: 'c3', name: '法式甜點', icon: 'cake', items: [{ id: 'd1', name: '草莓伯爵千層', price: 220, poetry: '紅蕊層疊映纖指，伯爵幽香透晚霞。', image: 'https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=600', stock: 10 }] },
  { id: 'c4', name: '暖心鍋燒', icon: 'soup', items: [{ id: 'n1', name: '松露牛奶海鮮鍋燒', price: 280, poetry: '墨香引路尋珍味，海潮湧入奶香田。', image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600' }] }
];

export default function CafeSystem() {
  const [user, setUser] = useState(null);
  const [systemRole, setSystemRole] = useState('customer'); 
  const [adminTab, setAdminTab] = useState('reports');
  const [menuData, setMenuData] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  
  const [activeCategory, setActiveCategory] = useState('c1');
  const [cart, setCart] = useState([]);
  const [orderStatus, setOrderStatus] = useState('ordering');
  const [tableNumber, setTableNumber] = useState('');
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [orderType, setOrderType] = useState('dineIn'); 
  const [passwordInput, setPasswordInput] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [newItem, setNewItem] = useState({ categoryId: 'c1', name: '', price: '', poetry: '', image: '', stock: 0 });

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

  // --- 熱銷統計分析 (顯示在前 5 名) ---
  const hotItems = useMemo(() => {
    const counts = {};
    orders.forEach(o => o.items.forEach(i => counts[i.id] = (counts[i.id] || 0) + i.quantity));
    const allProducts = [];
    menuData.forEach(c => c.items.forEach(i => allProducts.push(i)));
    
    return Object.keys(counts).map(id => {
      const p = allProducts.find(x => x.id === id);
      return { id, name: p?.name || '未知品項', count: counts[id] };
    }).sort((a,b) => b.count - a.count).slice(0, 5);
  }, [orders, menuData]);

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !user) return;
    if (orderType === 'dineIn' && !tableNumber) return alert('內用請輸入桌號！');
    if (orderType === 'takeout' && phoneSuffix.length !== 3) return alert('外帶請輸入手機末三碼！');
    
    const ts = Date.now();
    const orderId = `ASA-${ts.toString().slice(-4)}`;
    const newOrder = { 
      id: orderId, 
      table: orderType === 'takeout' ? `外帶-${phoneSuffix}` : `桌號 ${tableNumber}`, 
      type: orderType, 
      items: cart, 
      total: cart.reduce((s,i)=>s+(i.price*i.quantity),0), 
      status: 'pending', 
      time: new Date().toLocaleTimeString(), 
      timestamp: ts 
    };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), newOrder);
    setOrderStatus('success');
  };

  const updateStock = async (catId, itemId, newStock) => {
    const category = menuData.find(c => c.id === catId);
    const updatedItems = category.items.map(i => i.id === itemId ? { ...i, stock: parseInt(newStock) } : i);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'menu', catId), { items: updatedItems });
  };

  const removeItem = async (catId, itemId) => {
    if(!confirm('確認要將此商品從菜單下架嗎？')) return;
    const category = menuData.find(c => c.id === catId);
    const updatedItems = category.items.filter(i => i.id !== itemId);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'menu', catId), { items: updatedItems });
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-bold text-amber-800">ASA 智聯系統啟動中...</div>;

  if (systemRole === 'customer') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] font-sans pb-24 lg:pb-0 flex flex-col text-amber-900 overflow-x-hidden">
        {zoomImage && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-fade-in" onClick={() => setZoomImage(null)}>
            <img src={zoomImage} className="max-w-full max-h-full rounded-2xl shadow-2xl scale-95 animate-zoom-in" />
            <X className="absolute top-6 right-6 text-white cursor-pointer" />
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

        {/* 電腦版縮小圓框分類，手機版保持原本尺寸 */}
        <div className="bg-white/50 sticky top-[73px] z-10 border-b border-amber-50">
          <div className="max-w-5xl mx-auto px-4 py-4 flex gap-3 overflow-x-auto no-scrollbar justify-start md:justify-center">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-2 px-6 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all lg:max-w-[150px] lg:scale-90 ${activeCategory === cat.id ? 'bg-amber-800 text-white shadow-lg' : 'bg-white text-amber-600 border border-amber-100'}`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:mr-96">
          {menuData.find(c => c.id === activeCategory)?.items.map(item => {
            const quantity = cart.find(c => c.id === item.id)?.quantity || 0;
            const isHot = hotItems.some(h => h.id === item.id);
            return (
              <div key={item.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-amber-50 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-amber-50 mb-3 cursor-zoom-in group" onClick={() => setZoomImage(item.image)}>
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center"><Eye className="text-white" /></div>
                </div>
                
                <div className="mb-4 w-full flex items-center justify-center gap-3">
                  <span className="text-xl font-black text-amber-800">${item.price}</span>
                  <button onClick={() => setCart([...cart, {...item, quantity: 1}])} className="bg-amber-800 text-white px-4 py-1.5 rounded-full font-bold text-[10px] active:scale-90 shadow-sm">加入</button>
                </div>

                <h3 className="text-lg font-bold text-amber-900 leading-tight">
                  {isHot && <span className="text-orange-500 mr-1">🔥 熱銷</span>}
                  {item.name}
                </h3>
                {/* 顯示自動發想的優美詩詞 */}
                <p className="text-[10px] text-amber-700/60 mt-2 px-4 italic border-t border-amber-50 pt-2 leading-relaxed">
                  {item.poetry}
                </p>
                {item.stock !== undefined && <div className="text-[9px] font-bold mt-2 text-amber-400">當日供應：{item.stock > 0 ? item.stock : '售完'}</div>}
              </div>
            );
          })}
        </main>

        <aside className="hidden lg:flex w-96 bg-white border-l border-amber-100 fixed right-0 top-0 bottom-0 flex-col shadow-xl z-30">
          <div className="p-8 border-b border-amber-50 bg-[#FDFBF7] font-serif text-2xl font-black">您的 ASA 餐點</div>
          <div className="flex-1 overflow-y-auto p-8 space-y-4">
            <div className="bg-amber-50/50 p-4 rounded-2xl space-y-3 mb-6 border border-amber-100">
              <div className="flex gap-2 bg-white p-1 rounded-xl">
                <button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${orderType==='dineIn'?'bg-amber-800 text-white':'text-amber-300'}`}>內用</button>
                <button onClick={()=>setOrderType('takeout')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${orderType==='takeout'?'bg-amber-800 text-white':'text-amber-300'}`}>外帶</button>
              </div>
              {orderType==='dineIn' ? (
                <input type="text" placeholder="請填寫桌號 (如 A1)" value={tableNumber} onChange={e=>setTableNumber(e.target.value)} className="w-full bg-white border-none rounded-xl text-sm p-3 font-bold placeholder-amber-200 shadow-sm" />
              ) : (
                <input type="number" placeholder="手機末三碼" value={phoneSuffix} onChange={e=>setPhoneSuffix(e.target.value)} className="w-full bg-white border-none rounded-xl text-sm p-3 font-bold placeholder-amber-200 shadow-sm" />
              )}
            </div>
            {cart.map((i, idx) => (
              <div key={idx} className="flex justify-between font-bold text-sm"><span>{i.name} x {i.quantity}</span><span>${i.price * i.quantity}</span></div>
            ))}
          </div>
          <div className="p-8 bg-[#FDFBF7] border-t border-amber-100 font-black text-amber-900">
            <div className="flex justify-between items-end mb-6 text-4xl">
              <span className="text-sm font-bold text-amber-300">總計</span>
              <span>${cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</span>
            </div>
            <button onClick={handleSubmitOrder} className="w-full py-5 bg-amber-800 text-white rounded-[2rem] font-bold shadow-xl active:scale-95 transition-all">正式送出訂單</button>
          </div>
        </aside>

        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="absolute inset-0 bg-amber-900/40" onClick={() => setShowLoginModal(false)}></div>
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              if (passwordInput === 'Aeon.1388') { setSystemRole('kitchen'); setShowLoginModal(false); } 
              else if (passwordInput === '$Asasouthernaelly,1388') { setSystemRole('admin'); setShowLoginModal(false); }
              else alert('驗證失敗，請重新輸入');
            }} className="bg-white p-8 rounded-[2.5rem] relative z-10 w-full max-w-sm shadow-2xl border border-amber-100">
              <h2 className="text-center font-bold mb-6 text-amber-900 tracking-widest uppercase">ASA 權限驗證</h2>
              <input type="password" placeholder="請輸入通行密碼" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full border-2 border-amber-50 rounded-2xl p-4 text-center mb-4 focus:border-amber-800 outline-none" autoFocus />
              <button className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold hover:bg-amber-900">進入系統</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- 後廚系統 & 店長後台 ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
       <header className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/95 z-20">
          <h1 className="font-bold flex items-center gap-2 text-amber-500 uppercase tracking-widest"><ChefHat /> ASA {systemRole==='kitchen'?'後廚系統':'店長主控'}</h1>
          <button onClick={() => setSystemRole('customer')} className="text-xs bg-slate-800 px-4 py-2 rounded-lg font-bold text-slate-400 hover:text-white">登出</button>
       </header>

       <main className="p-6 flex-1 max-w-7xl mx-auto w-full">
          {systemRole === 'kitchen' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* --- 今日熱銷排行 (置頂顯示) --- */}
                <div className="p-6 bg-slate-800/80 rounded-3xl border border-amber-500/30 shadow-lg">
                  <h2 className="text-amber-500 font-black mb-4 flex items-center gap-2"><TrendingUp size={18} /> 今日熱銷單品排行統計</h2>
                  <div className="space-y-3">
                    {hotItems.length > 0 ? hotItems.map((h, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border-l-4 border-amber-500">
                        <span className="font-bold text-sm tracking-wide">#{idx+1} {h.name}</span>
                        <span className="text-amber-400 font-black text-lg">{h.count} 份</span>
                      </div>
                    )) : (
                      <div className="text-slate-600 text-sm italic py-4">目前尚無點餐數據...</div>
                    )}
                  </div>
                </div>

                 {/* 甜點進貨管理 */}
                <div className="p-6 bg-slate-800/80 rounded-3xl border border-amber-500/30 shadow-lg">
                  <h2 className="text-amber-500 font-black mb-4 flex items-center gap-2"><Utensils size={18} /> 甜點今日進貨數調整</h2>
                  <div className="grid grid-cols-1 gap-3">
                    {menuData.find(c => c.id === 'c3')?.items.map(i => (
                      <div key={i.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-xl">
                        <span className="text-sm font-bold">{i.name}</span>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] text-slate-400">庫存量：</span>
                           <input type="number" value={i.stock} onChange={e=>updateStock('c3', i.id, e.target.value)} className="w-20 bg-slate-900 text-amber-400 rounded-lg p-2 text-center font-black border-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 訂單看板 */}
              <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar">
                {orders.filter(o => o.status === 'pending').map(order => (
                  <div key={order.id} className="w-80 bg-slate-800 rounded-2xl border-t-4 border-amber-500 shadow-2xl flex flex-col shrink-0 animate-slide-up">
                    <div className="p-4 border-b border-slate-700 font-black flex justify-between items-center text-amber-500 text-lg uppercase">
                      <span>{order.table}</span>
                      <span className="text-[10px] text-slate-500 font-mono">#{order.id}</span>
                    </div>
                    <div className="p-4 flex-1 space-y-3 font-bold">
                       {order.items.map((it, idx) => <div key={idx} className="flex justify-between border-b border-slate-700/30 pb-1"><span>{it.name}</span><span className="text-amber-400">x{it.quantity}</span></div>)}
                    </div>
                    <div className="p-4"><button onClick={async()=>await updateDoc(doc(db,'artifacts',appId,'public', 'data', 'orders', order.id),{status:'completed'})} className="w-full py-4 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 transition-colors">出餐完成</button></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {systemRole === 'admin' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex gap-2 bg-slate-800 p-1 rounded-2xl w-fit">
                <button onClick={()=>setAdminTab('reports')} className={`px-8 py-2 rounded-xl text-xs font-bold transition-all ${adminTab==='reports'?'bg-blue-600 shadow-lg':''}`}>營收報表</button>
                <button onClick={()=>setAdminTab('products')} className={`px-8 py-2 rounded-xl text-xs font-bold transition-all ${adminTab==='products'?'bg-blue-600 shadow-lg':''}`}>商品上下架管理</button>
              </div>

              {adminTab === 'products' && (
                <div className="space-y-10">
                  <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-xl">
                    <h2 className="text-xl font-black flex items-center gap-2 text-blue-400 mb-6"><PackagePlus /> ASA 智能商品上架</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <select value={newItem.categoryId} onChange={e=>setNewItem({...newItem, categoryId: e.target.value})} className="bg-slate-900 p-4 rounded-xl border-none font-bold text-sm">
                        {menuData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <input type="text" placeholder="輸入商品名稱" value={newItem.name} onChange={e=>{
                        const n = e.target.value;
                        setNewItem({...newItem, name: n, poetry: generatePoetry(n)});
                      }} className="bg-slate-900 p-4 rounded-xl border-none font-bold text-sm" />
                      <input type="number" placeholder="單價 (NT$)" value={newItem.price} onChange={e=>setNewItem({...newItem, price: e.target.value})} className="bg-slate-900 p-4 rounded-xl border-none font-bold text-sm" />
                      <div className="col-span-full">
                        <label className="text-[10px] text-slate-500 mb-2 block font-bold uppercase tracking-widest">AI 自動生成的優美詩詞 (可自行修改)：</label>
                        <input type="text" value={newItem.poetry} onChange={e=>setNewItem({...newItem, poetry: e.target.value})} className="w-full bg-slate-900 p-4 rounded-xl border border-blue-900/50 italic text-blue-200 font-serif" />
                      </div>
                      <input type="text" placeholder="照片網址 (建議使用 Unsplash)" value={newItem.image} onChange={e=>setNewItem({...newItem, image: e.target.value})} className="col-span-full bg-slate-900 p-4 rounded-xl border-none font-bold text-sm" />
                      <button onClick={async () => {
                        const cat = menuData.find(c => c.id === newItem.categoryId);
                        const it = { ...newItem, id: `m_${Date.now()}`, price: parseInt(newItem.price), stock: parseInt(newItem.stock) };
                        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'menu', newItem.categoryId), { items: [...cat.items, it] });
                        alert('ASA 商品已成功上架！');
                        setNewItem({...newItem, name: '', price: '', poetry: '', image: '', stock: 0});
                      }} className="col-span-full bg-blue-600 py-4 rounded-xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-500 active:scale-95 transition-all">正式發佈商品</button>
                    </div>
                  </div>

                  <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
                    <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-300 uppercase tracking-widest"><ClipboardList /> 已上架商品清單 (點擊垃圾桶下架)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {menuData.map(cat => cat.items.map(item => (
                         <div key={item.id} className="bg-slate-900 p-4 rounded-2xl flex justify-between items-center group border border-slate-700 hover:border-red-500/50 transition-all">
                           <div className="flex items-center gap-4">
                             <img src={item.image} className="w-12 h-12 rounded-full object-cover shadow-lg" />
                             <div>
                               <div className="text-sm font-black text-slate-100">{item.name}</div>
                               <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">${item.price} • {cat.name}</div>
                             </div>
                           </div>
                           <button onClick={()=>removeItem(cat.id, item.id)} className="p-3 text-slate-700 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"><Trash2 size={18} /></button>
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
