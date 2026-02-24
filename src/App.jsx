import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, X, Coffee, Cake, Soup, CheckCircle2, 
  Store, ChevronLeft, Image as ImageIcon, ClipboardList, Settings, 
  Leaf, Clock, Check, ChefHat, QrCode, Printer, Lock, LogOut, 
  Utensils, ShoppingBag, BarChart3, Receipt, Eye, Trash2, Smartphone
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

// 詩詞發想模組
const generatePoetry = (name) => {
  if (name.includes('咖啡') || name.includes('拿鐵')) return "露染紅瓣映晨光，餘香輕吻拿鐵芳。";
  if (name.includes('茶')) return "菊香幽遠沁心脾，柚影搖曳綠波間。";
  if (name.includes('蛋糕') || name.includes('千層')) return "紅蕊層疊映纖指，幽香透出半殘霞。";
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

  const hotItems = useMemo(() => {
    const counts = {};
    orders.forEach(o => o.items.forEach(i => counts[i.id] = (counts[i.id] || 0) + i.quantity));
    return Object.keys(counts).map(id => {
      let itemName = "未知商品";
      menuData.forEach(c => c.items.forEach(i => { if(i.id === id) itemName = i.name }));
      return { id, name: itemName, count: counts[id] };
    }).sort((a,b) => b.count - a.count).slice(0, 5);
  }, [orders, menuData]);

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !user) return;
    if (orderType === 'dineIn' && !tableNumber) return alert('內用請填寫桌號！');
    if (orderType === 'takeout' && phoneSuffix.length !== 3) return alert('外帶請輸入手機末三碼！');
    
    const ts = Date.now();
    const orderId = `ASA-${ts.toString().slice(-4)}`;
    const newOrder = { 
      id: orderId, 
      table: orderType === 'takeout' ? `外帶-${phoneSuffix}` : tableNumber, 
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

  const removeItem = async (catId, itemId) => {
    if(!confirm('確認要將此商品下架嗎？')) return;
    const category = menuData.find(c => c.id === catId);
    const updatedItems = category.items.filter(i => i.id !== itemId);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'menu', catId), { items: updatedItems });
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-bold text-amber-800">ASA 系統升級中...</div>;

  if (systemRole === 'customer') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] font-sans pb-24 lg:pb-0 flex flex-col text-amber-900 overflow-x-hidden">
        {zoomImage && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-fade-in" onClick={() => setZoomImage(null)}>
            <img src={zoomImage} className="max-w-full max-h-full rounded-2xl shadow-2xl scale-95 animate-zoom-in" />
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

        {/* 電腦版縮小圓框，手機版保持不變 */}
        <div className="bg-white/50 sticky top-[73px] z-10 border-b border-amber-50">
          <div className="max-w-5xl mx-auto px-4 py-4 flex gap-3 overflow-x-auto no-scrollbar justify-start md:justify-center">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-2 px-6 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all lg:scale-90 ${activeCategory === cat.id ? 'bg-amber-800 text-white shadow-lg' : 'bg-white text-amber-600 border border-amber-100'}`}>
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
                  <button onClick={() => setCart([...cart, {...item, quantity: 1}])} className="bg-amber-800 text-white px-4 py-1.5 rounded-full font-bold text-[10px] active:scale-90">加入</button>
                </div>

                <h3 className="text-lg font-bold text-amber-900 leading-tight">
                  {isHot && <span className="text-orange-500 mr-1">🔥 熱銷</span>}
                  {item.name}
                </h3>
                <p className="text-[10px] text-amber-700/60 mt-2 px-2 italic border-t border-amber-50 pt-2">{item.poetry}</p>
                {item.stock !== undefined && <div className="text-[9px] font-bold mt-2 text-amber-400">剩餘庫存：{item.stock}</div>}
              </div>
            );
          })}
        </main>

        <aside className="hidden lg:flex w-96 bg-white border-l border-amber-100 fixed right-0 top-0 bottom-0 flex-col shadow-xl z-30">
          <div className="p-8 border-b border-amber-50 bg-[#FDFBF7] font-serif text-2xl font-black">購物車明細</div>
          <div className="flex-1 overflow-y-auto p-8 space-y-4">
            <div className="bg-amber-50 p-4 rounded-2xl space-y-3 mb-4">
              <div className="flex gap-2 bg-white p-1 rounded-xl">
                <button onClick={()=>setOrderType('dineIn')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${orderType==='dineIn'?'bg-amber-800 text-white':'text-amber-300'}`}>內用</button>
                <button onClick={()=>setOrderType('takeout')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${orderType==='takeout'?'bg-amber-800 text-white':'text-amber-300'}`}>外帶</button>
              </div>
              {orderType==='dineIn' ? (
                <select value={tableNumber} onChange={e=>setTableNumber(e.target.value)} className="w-full bg-white border-amber-100 rounded-xl text-sm p-3 font-bold">
                  <option value="">選擇桌號</option>
                  <option value="A1">A1</option><option value="A2">A2</option><option value="VIP">VIP 包廂</option>
                </select>
              ) : (
                <input type="number" placeholder="手機末三碼" maxLength="3" value={phoneSuffix} onChange={e=>setPhoneSuffix(e.target.value)} className="w-full bg-white border-none rounded-xl text-sm p-3 font-bold placeholder-amber-200" />
              )}
            </div>
            {cart.map((i, idx) => (
              <div key={idx} className="flex justify-between font-bold text-sm"><span>{i.name} x {i.quantity}</span><span>${i.price * i.quantity}</span></div>
            ))}
          </div>
          <div className="p-8 bg-[#FDFBF7] border-t border-amber-100 font-black text-amber-900">
            <div className="text-4xl mb-6">${cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</div>
            <button onClick={handleSubmitOrder} className="w-full py-5 bg-amber-800 text-white rounded-[2rem] font-bold shadow-lg active:scale-95 transition-all">送出訂單</button>
          </div>
        </aside>

        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="absolute inset-0 bg-amber-900/40" onClick={() => setShowLoginModal(false)}></div>
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              if (passwordInput === 'Aeon.1388') { setSystemRole('kitchen'); setShowLoginModal(false); } 
              else if (passwordInput === '$Asasouthernaelly,1388') { setSystemRole('admin'); setShowLoginModal(false); }
              else alert('密碼錯誤');
            }} className="bg-white p-8 rounded-[2.5rem] relative z-10 w-full max-w-sm">
              <h2 className="text-center font-bold mb-6">ASA 內部驗證</h2>
              <input type="password" placeholder="輸入權限密碼" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full border-2 border-amber-50 rounded-2xl p-4 text-center mb-4" autoFocus />
              <button className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold">確認進入</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
       <header className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/95 z-20">
          <h1 className="font-bold flex items-center gap-2 text-amber-500 uppercase"><ChefHat /> ASA {systemRole==='kitchen'?'後廚看板':'店長後台'}</h1>
          <button onClick={() => setSystemRole('customer')} className="text-xs bg-slate-800 px-4 py-2 rounded-lg">登出</button>
       </header>

       <main className="p-6 flex-1 max-w-7xl mx-auto w-full">
          {systemRole === 'kitchen' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* 熱銷統計模塊 */}
                <div className="p-6 bg-slate-800 rounded-3xl border border-amber-500/30">
                  <h2 className="text-amber-500 font-bold mb-4 flex items-center gap-2"><BarChart3 size={18} /> 全店熱銷排行統計</h2>
                  <div className="space-y-3">
                    {hotItems.map((h, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border-l-4 border-amber-500">
                        <span className="font-bold text-sm">#{idx+1} {h.name}</span>
                        <span className="text-amber-400 font-black">{h.count} 份</span>
                      </div>
                    ))}
                  </div>
                </div>
                 {/* 甜點庫存模塊 */}
                <div className="p-6 bg-slate-800 rounded-3xl border border-amber-500/30">
                  <h2 className="text-amber-500 font-bold mb-4 flex items-center gap-2"><Utensils size={18} /> 甜點進貨庫存調整</h2>
                  <div className="grid grid-cols-1 gap-3">
                    {menuData.find(c => c.id === 'c3')?.items.map(i => (
                      <div key={i.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-xl">
                        <span className="text-sm font-bold">{i.name}</span>
                        <input type="number" value={i.stock} onChange={e=>updateStock('c3', i.id, e.target.value)} className="w-16 bg-slate-900 text-amber-400 rounded p-1 text-center font-bold" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-6">
                {orders.filter(o => o.status === 'pending').map(order => (
                  <div key={order.id} className="w-80 bg-slate-800 rounded-2xl border-t-4 border-amber-500 shadow-2xl flex flex-col shrink-0">
                    <div className="p-4 border-b border-slate-700 font-black flex justify-between items-center text-amber-500">
                      <span>{order.table}</span>
                      <span className="text-[10px] text-slate-500">#{order.id}</span>
                    </div>
                    <div className="p-4 flex-1 space-y-2 font-bold text-sm">
                       {order.items.map((it, idx) => <div key={idx} className="flex justify-between"><span>{it.name}</span><span>x{it.quantity}</span></div>)}
                    </div>
                    <div className="p-4"><button onClick={async()=>await updateDoc(doc(db,'artifacts',appId,'public','data','orders',order.id),{status:'completed'})} className="w-full py-4 bg-amber-500 text-slate-900 font-bold rounded-xl">出餐完成</button></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {systemRole === 'admin' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex gap-2 bg-slate-800 p-1 rounded-2xl w-fit">
                <button onClick={()=>setAdminTab('reports')} className={`px-6 py-2 rounded-xl text-xs font-bold ${adminTab==='reports'?'bg-blue-600':''}`}>營收報表</button>
                <button onClick={()=>setAdminTab('products')} className={`px-6 py-2 rounded-xl text-xs font-bold ${adminTab==='products'?'bg-blue-600':''}`}>商品上下架</button>
              </div>

              {adminTab === 'products' && (
                <div className="space-y-8">
                  <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-xl">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-blue-400 mb-6"><PackagePlus /> ASA 商品上架與智能詩詞</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <select value={newItem.categoryId} onChange={e=>setNewItem({...newItem, categoryId: e.target.value})} className="bg-slate-900 p-4 rounded-xl border-none">
                        {menuData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <input type="text" placeholder="輸入商品名" value={newItem.name} onChange={e=>{
                        const name = e.target.value;
                        setNewItem({...newItem, name: name, poetry: generatePoetry(name)});
                      }} className="bg-slate-900 p-4 rounded-xl border-none" />
                      <input type="number" placeholder="價格" value={newItem.price} onChange={e=>setNewItem({...newItem, price: e.target.value})} className="bg-slate-900 p-4 rounded-xl border-none" />
                      <div className="col-span-full">
                        <label className="text-xs text-slate-500 mb-2 block">AI 自動生成詩詞 (可自行修改)：</label>
                        <input type="text" value={newItem.poetry} onChange={e=>setNewItem({...newItem, poetry: e.target.value})} className="w-full bg-slate-900 p-4 rounded-xl border border-blue-900/50 italic text-blue-200" />
                      </div>
                      <input type="text" placeholder="照片 URL" value={newItem.image} onChange={e=>setNewItem({...newItem, image: e.target.value})} className="col-span-full bg-slate-900 p-4 rounded-xl border-none" />
                      <button onClick={handleAddItem} className="col-span-full bg-blue-600 py-4 rounded-xl font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all">正式上架商品</button>
                    </div>
                  </div>

                  <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><ClipboardList /> 已上架商品清單 (點擊垃圾桶下架)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {menuData.map(cat => cat.items.map(item => (
                         <div key={item.id} className="bg-slate-900 p-4 rounded-2xl flex justify-between items-center group border border-slate-700 hover:border-red-500 transition-colors">
                           <div className="flex items-center gap-3">
                             <img src={item.image} className="w-10 h-10 rounded-full object-cover" />
                             <div>
                               <div className="text-xs font-bold">{item.name}</div>
                               <div className="text-[10px] text-slate-500">${item.price}</div>
                             </div>
                           </div>
                           <button onClick={()=>removeItem(cat.id, item.id)} className="p-2 text-slate-600 hover:text-red-500"><Trash2 size={16} /></button>
                         </div>
                       )))}
                    </div>
                  </div>
                </div>
              )}
              {adminTab === 'reports' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-64">
                   <div className="bg-blue-600 p-8 rounded-3xl flex flex-col justify-between shadow-2xl">
                     <span className="font-bold text-blue-100 uppercase tracking-widest text-xs">ASA 累計總營收</span>
                     <h3 className="text-6xl font-black text-white">$ {orders.reduce((s,o)=>s+o.total, 0).toLocaleString()}</h3>
                   </div>
                   <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 flex flex-col justify-between">
                     <span className="font-bold text-slate-500 text-xs">今日處理單數統計</span>
                     <h3 className="text-6xl font-black text-amber-500">{orders.length} <span className="text-xl text-slate-600">單</span></h3>
                   </div>
                </div>
              )}
            </div>
          )}
       </main>
    </div>
  );
}
