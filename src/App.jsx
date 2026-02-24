import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, X, Coffee, Cake, Soup, CheckCircle2, 
  Store, ChevronLeft, Image as ImageIcon, ClipboardList, Settings, 
  Leaf, Clock, Check, ChefHat, QrCode, Printer, Lock, LogOut, 
  Utensils, ShoppingBag, BarChart3, Receipt, Eye
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';

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

const INITIAL_MENU = [
  {
    id: 'c1', name: '手沖與咖啡', icon: 'coffee',
    items: [
      { id: 'm1', name: '玫瑰海鹽拿鐵', price: 160, poetry: '露染紅瓣映晨光，海鹽輕吻拿鐵香。', image: 'https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?w=600' },
      { id: 'm2', name: '雲朵焦糖瑪奇朵', price: 180, poetry: '雲端起舞弄清影，焦糖如絲醉晚風。', image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600' },
    ]
  },
  {
    id: 'c2', name: '優雅花茶', icon: 'leaf',
    items: [
      { id: 'f1', name: '洋甘菊柚香綠茶', price: 150, poetry: '菊香幽遠沁心脾，柚影搖曳綠波間。', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600' },
    ]
  },
  {
    id: 'c3', name: '法式甜點', icon: 'cake',
    items: [
      { id: 'd1', name: '草莓伯爵千層', price: 220, poetry: '紅蕊層疊映纖指，伯爵幽香透晚霞。', image: 'https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=600', stock: 10 },
      { id: 'd2', name: '巴斯克乳酪蛋糕', price: 160, poetry: '焦色半熟鎖濃醇，入口溫柔化萬千。', image: 'https://images.unsplash.com/photo-1602351447937-745cb720612f?w=600', stock: 5 },
    ]
  },
  {
    id: 'c4', name: '暖心鍋燒', icon: 'soup',
    items: [
      { id: 'n1', name: '松露牛奶海鮮鍋燒', price: 280, poetry: '墨香引路尋珍味，海潮湧入奶香田。', image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600' },
    ]
  }
];

export default function CafeSystem() {
  const [user, setUser] = useState(null);
  const [systemRole, setSystemRole] = useState('customer'); 
  const [menuData, setMenuData] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  
  const [activeCategory, setActiveCategory] = useState('c1');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState('ordering');
  const [tableNumber] = useState('窗邊 A1');
  const [orderType, setOrderType] = useState('dineIn'); 
  const [passwordInput, setPasswordInput] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

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
    onSnapshot(ordersRef, (snap) => {
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user]);

  // 熱銷邏輯：銷量前三名
  const hotItems = useMemo(() => {
    const counts = {};
    orders.forEach(o => o.items.forEach(i => counts[i.id] = (counts[i.id] || 0) + i.quantity));
    return Object.keys(counts).sort((a,b) => counts[b] - counts[a]).slice(0, 3);
  }, [orders]);

  const updateStock = async (catId, itemId, newStock) => {
    const category = menuData.find(c => c.id === catId);
    const updatedItems = category.items.map(i => i.id === itemId ? { ...i, stock: parseInt(newStock) } : i);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'menu', catId), { items: updatedItems });
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-bold text-amber-800">ASA 暖心載入中...</div>;

  if (systemRole === 'customer') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] font-sans pb-24 lg:pb-0 flex flex-col text-amber-900">
        {/* 圖片放大燈箱 */}
        {zoomImage && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setZoomImage(null)}>
            <img src={zoomImage} className="max-w-full max-h-full rounded-3xl shadow-2xl animate-zoom-in" />
            <button className="absolute top-6 right-6 text-white bg-white/10 p-3 rounded-full"><X /></button>
          </div>
        )}

        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-amber-100 px-4 py-4">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-800 rounded-full flex items-center justify-center text-amber-50 shadow-inner"><Store size={20} /></div>
              <h1 className="text-xl font-black tracking-widest font-serif">ASA 南巷微光</h1>
            </div>
            <button onClick={() => setShowLoginModal(true)} className="p-2 text-amber-200 hover:text-amber-800"><Lock size={18} /></button>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:mr-96">
          <div className="col-span-full flex gap-3 overflow-x-auto no-scrollbar pb-4">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-2 px-5 py-2 lg:px-4 lg:py-1.5 rounded-full whitespace-nowrap text-sm font-bold transition-all ${activeCategory === cat.id ? 'bg-amber-800 text-white shadow-lg' : 'bg-white text-amber-600 border border-amber-100'}`}>
                {cat.name}
              </button>
            ))}
          </div>

          {menuData.find(c => c.id === activeCategory)?.items.map(item => {
            const quantity = cart.find(c => c.id === item.id)?.quantity || 0;
            const isHot = hotItems.includes(item.id);
            return (
              <div key={item.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-amber-50 flex flex-col items-center text-center">
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-amber-50 mb-4 cursor-zoom-in" onClick={() => setZoomImage(item.image)}>
                  <img src={item.image} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><Eye className="text-white" /></div>
                </div>
                
                <div className="mb-4 w-full flex items-center justify-center gap-3">
                  <span className="text-xl font-black text-amber-800">${item.price}</span>
                  <button onClick={() => { if(item.stock === 0) return; setCart([...cart, {...item, quantity: 1}]); }} disabled={item.stock === 0} className="bg-amber-800 text-white px-4 py-1.5 rounded-full font-bold text-[10px] active:scale-90 disabled:bg-amber-100">加入</button>
                </div>

                <h3 className="text-lg font-bold mb-1 text-amber-900">
                  {isHot && <span className="text-orange-500 mr-1 animate-pulse">🔥 熱銷</span>}
                  {item.name}
                </h3>
                <p className="text-[10px] text-amber-700/60 line-clamp-2 h-7 px-4 italic mb-2">{item.poetry}</p>
                {item.stock !== undefined && (
                  <div className={`text-[10px] font-bold ${item.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    今日庫存：{item.stock > 0 ? item.stock : '已售罄'}
                  </div>
                )}
              </div>
            );
          })}
        </main>

        <aside className="hidden lg:flex w-96 bg-white border-l border-amber-100 fixed right-0 top-0 bottom-0 flex-col shadow-xl z-30">
          <div className="p-8 border-b border-amber-50 bg-[#FDFBF7]"><h2 className="text-2xl font-black font-serif flex items-center gap-3 text-amber-900"><ShoppingCart /> 購物車</h2></div>
          <div className="flex-1 overflow-y-auto p-8 space-y-4">
            {cart.map((i, idx) => (
              <div key={idx} className="flex justify-between font-bold text-sm"><span>{i.name} x {i.quantity}</span><span>${i.price * i.quantity}</span></div>
            ))}
          </div>
          <div className="p-8 bg-[#FDFBF7] border-t border-amber-100">
            <div className="flex justify-between items-end mb-6 font-black text-3xl"><span>${cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</span></div>
            <button onClick={handleSubmitOrder} className="w-full py-5 bg-amber-800 text-white rounded-[2rem] font-bold">送出訂單</button>
          </div>
        </aside>

        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-amber-900/40 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}></div>
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              if (passwordInput === 'Aeon.1388') { setSystemRole('kitchen'); setShowLoginModal(false); } 
              else if (passwordInput === '$Asasouthernaelly,1388') { setSystemRole('admin'); setShowLoginModal(false); }
              else { alert('密碼錯誤'); }
            }} className="bg-white p-8 rounded-[2.5rem] relative z-10 w-full max-w-sm">
              <h2 className="text-center font-bold mb-6 text-amber-900">系統權限驗證</h2>
              <input type="password" placeholder="請輸入對應權限密碼" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full border-2 border-amber-50 rounded-2xl p-4 mb-4 text-center outline-none focus:border-amber-800" />
              <button className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold">確認進入</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- 後廚 & 管理系統 ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
       <header className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/90 z-10">
          <h1 className="font-bold text-lg flex items-center gap-2 text-amber-500 uppercase"><ChefHat /> ASA {systemRole === 'kitchen' ? '後廚系統' : '店長後台'}</h1>
          <div className="flex gap-2">
            {systemRole === 'kitchen' && (
              <button onClick={() => { setPasswordInput(''); setShowLoginModal(true); }} className="px-4 py-2 bg-blue-600 rounded-lg text-xs font-bold">進入管理層</button>
            )}
            <button onClick={() => setSystemRole('customer')} className="text-xs bg-slate-800 px-4 py-2 rounded-lg font-bold">登出</button>
          </div>
       </header>

       <main className="p-6 flex-1 overflow-x-auto">
          {systemRole === 'kitchen' && (
            <div className="mb-8 p-6 bg-slate-800 rounded-3xl border border-amber-500/20">
              <h2 className="text-amber-500 font-bold mb-4 flex items-center gap-2"><Cake size={18} /> 甜點今日進貨庫存管理</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {menuData.find(c => c.id === 'c3')?.items.map(item => (
                  <div key={item.id} className="bg-slate-700 p-4 rounded-2xl flex justify-between items-center">
                    <span className="font-bold">{item.name}</span>
                    <input type="number" value={item.stock} onChange={(e) => updateStock('c3', item.id, e.target.value)} className="w-20 bg-slate-900 text-amber-500 border-none rounded-lg p-2 text-center font-black" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-6 min-w-max">
            {orders.filter(o => o.status === 'pending').map(order => (
              <div key={order.id} className="w-80 bg-slate-800 rounded-2xl border-t-4 border-amber-500 shadow-2xl flex flex-col">
                <div className="p-4 border-b border-slate-700 font-black text-xl text-amber-500 flex justify-between">
                  <span>{order.table}</span>
                  <span className="text-[10px] text-slate-500">{order.time}</span>
                </div>
                <div className="p-4 flex-1 space-y-2 font-bold">
                   {order.items.map((item, idx) => (
                     <div key={idx} className="flex justify-between text-sm"><span>{item.name}</span><span className="text-amber-400">x{item.quantity}</span></div>
                   ))}
                </div>
                <div className="p-4"><button onClick={async () => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: 'completed' })} className="w-full py-4 bg-amber-500 text-slate-900 font-bold rounded-xl">出餐完成</button></div>
              </div>
            ))}
          </div>
       </main>
    </div>
  );
}
