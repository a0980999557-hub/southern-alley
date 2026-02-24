import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, X, Coffee, Cake, Soup, CheckCircle2, 
  Store, ChevronLeft, Image as ImageIcon, ClipboardList, Settings, 
  Leaf, Clock, Check, ChefHat, QrCode, Printer, Lock, LogOut, 
  Utensils, ShoppingBag, BarChart3, Receipt
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';

const userConfig = {
  apiKey: "AIzaSyDQ5mXUrQ1oJgdbeVMJEunDpCIJ5jWNuJM",
  authDomain: "aura-cafe-64b34.firebaseapp.com",
  projectId: "aura-cafe-64b34",
  storageBucket: "aura-cafe-64b34.firebasestorage.app",
  messagingSenderId: "653695103878",
  appId: "1:653695103878:web:242def6a9d94a0ca0bb207"
};

const isSandbox = typeof __firebase_config !== 'undefined';
const activeFirebaseConfig = isSandbox ? JSON.parse(__firebase_config) : userConfig;
const app = initializeApp(activeFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : "aura-cafe-64b34";

const INITIAL_MENU = [
  {
    id: 'c1', name: '手沖與咖啡', icon: 'coffee',
    items: [
      { id: 'm1', name: '玫瑰海鹽拿鐵', price: 160, description: '撒上可食用玫瑰花瓣，微鹹甜的獨特風味。', image: 'https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?auto=format&fit=crop&w=400&q=80' },
      { id: 'm2', name: '雲朵焦糖瑪奇朵', price: 180, description: '頂部覆蓋綿密現打奶泡與手工焦糖醬。', image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=400&q=80' },
    ]
  },
  {
    id: 'c2', name: '優雅花茶', icon: 'leaf',
    items: [
      { id: 'f1', name: '洋甘菊柚香綠茶', price: 150, description: '舒緩身心的洋甘菊搭配清爽韓國柚子醬。', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80' },
      { id: 'f2', name: '英式玫瑰伯爵', price: 160, description: '經典伯爵茶底，帶有淡淡玫瑰與佛手柑香氣。', image: 'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?auto=format&fit=crop&w=400&q=80' },
    ]
  },
  {
    id: 'c3', name: '法式甜點', icon: 'cake',
    items: [
      { id: 'd1', name: '草莓伯爵千層', price: 220, description: '20層職人手工法式薄餅，夾入新鮮草莓與伯爵鮮奶油。', image: 'https://images.unsplash.com/photo-1603532648955-039310d9ed75?auto=format&fit=crop&w=400&q=80' },
      { id: 'd2', name: '巴斯克乳酪蛋糕', price: 160, description: '半熟焦糖外皮與綿密化口的乳酪內餡。', image: 'https://images.unsplash.com/photo-1602351447937-745cb720612f?auto=format&fit=crop&w=400&q=80' },
    ]
  },
  {
    id: 'c4', name: '暖心鍋燒', icon: 'soup',
    items: [
      { id: 'n1', name: '松露牛奶海鮮鍋燒', price: 280, description: '濃郁牛奶湯頭點綴黑松露醬，搭配每日直送海鮮。', image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=400&q=80' },
      { id: 'n2', name: '川香麻辣豬肉鍋燒', price: 250, description: '獨家秘製麻辣醬底，香麻過癮不嗆喉。', image: 'https://images.unsplash.com/photo-1548943487-a2e4d43b4850?auto=format&fit=crop&w=400&q=80' },
    ]
  }
];

const getCategoryIcon = (iconName) => {
  switch(iconName) {
    case 'coffee': return <Coffee size={18} />;
    case 'leaf': return <Leaf size={18} />;
    case 'cake': return <Cake size={18} />;
    case 'soup': return <Soup size={18} />;
    default: return <Utensils size={18} />;
  }
};

export default function CafeSystem() {
  const [user, setUser] = useState(null);
  const [systemRole, setSystemRole] = useState('customer');
  const [menuData, setMenuData] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const tables = ['窗邊 A1', '窗邊 A2', '沙發 B1', '沙發 B2', '吧台 C1', '包廂 VIP'];
  
  const [activeCategory, setActiveCategory] = useState('c1');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState('ordering');
  const [tableNumber, setTableNumber] = useState(tables[0]);
  const [orderType, setOrderType] = useState('dineIn'); 

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isSandbox && typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        setMenuData(INITIAL_MENU);
        setIsDataLoaded(true);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const menuRef = collection(db, 'artifacts', appId, 'public', 'data', 'menu');
    const unsubMenu = onSnapshot(menuRef, (snapshot) => {
      if (snapshot.size < 4) {
        INITIAL_MENU.forEach(async (cat) => {
          await setDoc(doc(menuRef, cat.id), cat);
        });
        setMenuData(INITIAL_MENU);
      } else {
        const fetchedMenu = snapshot.docs.map(doc => doc.data());
        fetchedMenu.sort((a, b) => a.id.localeCompare(b.id));
        setMenuData(fetchedMenu);
      }
      setIsDataLoaded(true);
    });
    const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsubOrders = onSnapshot(ordersRef, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedOrders.sort((a, b) => b.timestamp - a.timestamp);
      setOrders(fetchedOrders);
    });
    return () => { unsubMenu(); unsubOrders(); };
  }, [user]);

  const addToCart = (item) => {
    setCart(prev => {
      const exist = prev.find(c => c.id === item.id);
      if (exist) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) return { ...item, quantity: Math.max(0, item.quantity + delta) };
      return item;
    }).filter(item => item.quantity > 0));
  };

  const totalAmount = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !user) return;
    const timestamp = Date.now();
    const orderId = `ORD-${timestamp.toString().slice(-4)}`;
    const newOrder = {
      id: orderId,
      table: orderType === 'takeout' ? '外帶自取' : tableNumber,
      type: orderType,
      items: cart.map(item => ({ ...item, completed: false })),
      total: totalAmount,
      status: 'pending', 
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      timestamp: timestamp
    };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), newOrder);
    setOrderStatus('success');
    setIsCartOpen(false);
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-bold text-amber-800">載入 ASA 空間...</div>;

  if (systemRole === 'customer') {
    if (orderStatus === 'success') {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-amber-900">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-sm w-full text-center border border-amber-100">
            <CheckCircle2 className="text-amber-600 mx-auto mb-4" size={80} />
            <h2 className="text-2xl font-bold mb-2">訂單已送出</h2>
            <button onClick={() => {setCart([]); setOrderStatus('ordering');}} className="w-full bg-amber-800 text-white font-bold py-4 rounded-2xl mt-6">返回菜單</button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#FDFBF7] font-sans pb-24 lg:pb-0 flex flex-col text-amber-900">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-amber-100 px-4 py-4">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-800 rounded-full flex items-center justify-center shadow-inner border border-amber-900/10 overflow-hidden">
                <Store size={20} className="text-amber-50" />
              </div>
              <h1 className="text-xl font-black tracking-widest font-serif text-amber-900">ASA 南巷微光</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-amber-50 p-1 rounded-full border border-amber-100 flex">
                <button onClick={() => setOrderType('dineIn')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${orderType === 'dineIn' ? 'bg-white text-amber-800 shadow-sm' : 'text-amber-400'}`}>內用</button>
                <button onClick={() => setOrderType('takeout')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${orderType === 'takeout' ? 'bg-white text-amber-800 shadow-sm' : 'text-amber-400'}`}>外帶</button>
              </div>
              <button onClick={() => setShowLoginModal(true)} className="p-2 text-amber-200 hover:text-amber-800 transition-colors"><Lock size={18} /></button>
            </div>
          </div>
        </header>

        <div className="bg-white/50 sticky top-[73px] z-10 border-b border-amber-50">
          <div className="max-w-5xl mx-auto px-4 py-4 flex gap-3 overflow-x-auto no-scrollbar">
            {menuData.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-2 px-6 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${activeCategory === cat.id ? 'bg-amber-800 text-white shadow-lg' : 'bg-white text-amber-600 border border-amber-100 hover:bg-amber-50'}`}>
                {getCategoryIcon(cat.icon)} {cat.name}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:mr-96">
          {menuData.find(c => c.id === activeCategory)?.items.map(item => {
            const quantity = cart.find(c => c.id === item.id)?.quantity || 0;
            return (
              <div key={item.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-amber-50 flex flex-col items-center text-center group transition-all">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-amber-50 mb-3 group-hover:scale-105 transition-transform bg-amber-50">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                
                {/* 調整：價格在前，按鈕在後並縮小 */}
                <div className="mb-4 w-full flex items-center justify-center gap-3">
                  <span className="text-xl font-black text-amber-800 leading-none">${item.price}</span>
                  {quantity === 0 ? (
                    <button onClick={() => addToCart(item)} className="bg-amber-800 text-white px-5 py-2 rounded-full font-bold text-[10px] flex items-center justify-center gap-1 hover:bg-amber-900 shadow-sm active:scale-90 transition-all">
                      <Plus size={12} /> 加入
                    </button>
                  ) : (
                    <div className="flex items-center bg-amber-50 rounded-full p-0.5 border border-amber-100">
                      <button onClick={() => updateQuantity(item.id, -1)} className="bg-white w-7 h-7 rounded-full flex items-center justify-center shadow-sm text-amber-800"><Minus size={14} /></button>
                      <span className="font-bold text-sm w-7 text-center">{quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="bg-amber-800 w-7 h-7 rounded-full flex items-center justify-center shadow-md text-white"><Plus size={14} /></button>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold mb-1 text-amber-900 leading-tight">{item.name}</h3>
                <p className="text-[10px] text-amber-700/50 line-clamp-2 h-7 px-2 italic">{item.description}</p>
              </div>
            );
          })}
        </main>

        <aside className="hidden lg:flex w-96 bg-white border-l border-amber-100 fixed right-0 top-0 bottom-0 flex-col shadow-xl z-30">
          <div className="p-8 border-b border-amber-50 bg-[#FDFBF7]">
            <h2 className="text-2xl font-black font-serif flex items-center gap-3"><ShoppingCart className="text-amber-800" /> 您的餐點</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm font-bold">
                <span className="text-amber-900">{item.name} x {item.quantity}</span>
                <span className="text-amber-800">${item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="p-8 bg-[#FDFBF7] border-t border-amber-100">
            <div className="flex justify-between items-end mb-6 font-black text-amber-900 text-3xl">
              <span className="text-sm font-bold text-amber-700/60">總計</span>
              <span>${totalAmount}</span>
            </div>
            <button disabled={cart.length === 0} onClick={handleSubmitOrder} className="w-full py-5 bg-amber-800 text-white rounded-[2rem] font-bold text-lg hover:bg-amber-900 disabled:opacity-30">送出訂單</button>
          </div>
        </aside>

        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-amber-900/40 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}></div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (passwordInput === 'Aeon.1388') { setSystemRole('kitchen'); setShowLoginModal(false); }
              else { setLoginError('密碼錯誤'); }
            }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-sm border border-amber-100">
              <h2 className="text-2xl font-bold text-center mb-6 text-amber-900 font-serif uppercase">管理登入</h2>
              <input type="password" placeholder="請輸入密碼" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full border-2 border-amber-50 rounded-2xl p-4 mb-4 text-center text-lg outline-none focus:border-amber-800" />
              <button className="w-full bg-amber-800 text-white py-4 rounded-2xl font-bold">進入後廚</button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
       <header className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/90 backdrop-blur-md">
          <h1 className="font-bold tracking-widest text-lg flex items-center gap-2 text-amber-500 uppercase"><ChefHat /> ASA 後廚看板</h1>
          <button onClick={() => setSystemRole('customer')} className="text-xs bg-slate-800 px-4 py-2 rounded-lg font-bold">登出系統</button>
       </header>

       <main className="p-6 flex-1 overflow-x-auto">
          <div className="flex gap-6 min-w-max h-full">
            {orders.filter(o => o.status === 'pending').map(order => (
              <div key={order.id} className="w-80 bg-slate-800 rounded-2xl border-t-4 border-amber-500 shadow-2xl flex flex-col">
                <div className="p-4 border-b border-slate-700 font-black text-xl text-amber-500 flex justify-between">
                  <span>{order.table}</span>
                  <span className="text-[10px] text-slate-500">#{order.id}</span>
                </div>
                <div className="p-4 flex-1 space-y-3 font-bold">
                   {order.items.map((item, idx) => (
                     <div key={idx} className="flex justify-between border-b border-slate-700/50 pb-1">
                        <span>{item.name}</span>
                        <span className="text-amber-400">x{item.quantity}</span>
                     </div>
                   ))}
                </div>
                <div className="p-4">
                   <button 
                    onClick={async () => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: 'completed' })}
                    className="w-full py-4 bg-amber-500 text-slate-900 font-bold rounded-xl active:scale-95 transition-transform"
                   >
                     完成出餐
                   </button>
                </div>
              </div>
            ))}
          </div>
       </main>
    </div>
  );
}
