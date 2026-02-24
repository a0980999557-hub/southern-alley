import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, X, Coffee, Cake, Soup, CheckCircle2, 
  Store, ChevronLeft, Image as ImageIcon, ClipboardList, Settings, 
  Leaf, Clock, Check, ChefHat, QrCode, Printer, Lock, LogOut, 
  Utensils, ShoppingBag, BarChart3, Receipt
} from 'lucide-react';

// --- 引入 Firebase 雲端模組 ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';

// --- Firebase 初始化設定 ---
// 這是您專屬的 Firebase 設定
const userConfig = {
  apiKey: "AIzaSyDQ5mXUrQ1oJgdbeVMJEunDpCIJ5jWNuJM",
  authDomain: "aura-cafe-64b34.firebaseapp.com",
  projectId: "aura-cafe-64b34",
  storageBucket: "aura-cafe-64b34.firebasestorage.app",
  messagingSenderId: "653695103878",
  appId: "1:653695103878:web:242def6a9d94a0ca0bb207"
};

// 自動判斷：如果在 AI 預覽環境中就使用測試設定，如果在您自己的網域就使用您的設定
const isSandbox = typeof __firebase_config !== 'undefined';
const activeFirebaseConfig = isSandbox ? JSON.parse(__firebase_config) : userConfig;

const app = initializeApp(activeFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : "aura-cafe-64b34";

// --- 預設菜單資料 (當雲端沒資料時的初始寫入用) ---
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
  
  // 雲端同步狀態
  const [menuData, setMenuData] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [tables] = useState(['窗邊 A1', '窗邊 A2', '沙發 B1', '沙發 B2', '吧台 C1', '包廂 VIP']);
  
  // 顧客端狀態
  const [activeCategory, setActiveCategory] = useState('c1');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState('ordering');
  const [tableNumber, setTableNumber] = useState(tables[0]);
  const [orderType, setOrderType] = useState('dineIn'); 

  // 解析網址參數 (客人掃描QR Code時自動帶入桌號)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tableParam = params.get('table');
      if (tableParam && tables.includes(tableParam)) {
        setTableNumber(tableParam);
        setOrderType('dineIn'); 
      }
    }
  }, [tables]);

  // 登入相關狀態
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // 後台管理端狀態
  const [adminTab, setAdminTab] = useState('reports'); 
  const [newItem, setNewItem] = useState({ categoryId: 'c1', name: '', price: '', description: '', image: '' });
  const [previewImage, setPreviewImage] = useState(null);

  // 列印單據狀態
  const [printingOrder, setPrintingOrder] = useState(null);

  // ================= Firebase 驗證與資料連線 =================
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isSandbox && typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          // 在正式環境中，需要 Firebase 控制台開啟「匿名登入 (Anonymous)」
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase 驗證失敗 (可能是尚未在 Firebase 控制台啟用「匿名登入」):", error);
        // 如果驗證失敗，直接載入預設菜單並將狀態設為完成，避免畫面永遠卡在連線中
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

    // 1. 訂閱雲端訂單資料庫
    const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsubOrders = onSnapshot(ordersRef, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 確保最新下單的排在最前面
      fetchedOrders.sort((a, b) => b.timestamp - a.timestamp);
      setOrders(fetchedOrders);
    }, (error) => console.error("訂單載入失敗:", error));

    // 2. 訂閱雲端菜單資料庫
    const menuRef = collection(db, 'artifacts', appId, 'public', 'data', 'menu');
       const unsubMenu = onSnapshot(menuRef, (snapshot) => {
      if (snapshot.size < 4) {
        // 如果雲端完全沒資料，寫入初始預設菜單
        INITIAL_MENU.forEach(async (cat) => {

          await setDoc(doc(menuRef, cat.id), cat);
        });
        setMenuData(INITIAL_MENU);
        setIsDataLoaded(true);
      } else {
        const fetchedMenu = snapshot.docs.map(doc => doc.data());
        // 依據分類 ID 排序確保顯示順序正常
        fetchedMenu.sort((a, b) => a.id.localeCompare(b.id));
        setMenuData(fetchedMenu);
        if(fetchedMenu.length > 0) {
          setActiveCategory(fetchedMenu[0].id);
          setNewItem(prev => ({ ...prev, categoryId: fetchedMenu[0].id }));
        }
        setIsDataLoaded(true);
      }
    }, (error) => console.error("菜單載入失敗:", error));

    return () => {
      unsubOrders();
      unsubMenu();
    };
  }, [user]);

  // ================= 顧客點餐系統邏輯 =================
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
    if (cart.length === 0 || !user) {
      if (!user) alert("尚未連線到資料庫，無法送出訂單。");
      return;
    }
    
    // 生成精準的訂單編號與時間戳
    const timestamp = Date.now();
    const orderId = `ORD-${timestamp.toString().slice(-4)}${Math.floor(Math.random() * 100)}`;
    
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

    try {
      // 寫入 Firebase 雲端資料庫
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), newOrder);
      setOrderStatus('success');
      setIsCartOpen(false);
    } catch (error) {
      console.error("送出訂單失敗:", error);
      alert("連線不穩，請重新送出！");
    }
  };

  const resetOrder = () => {
    setCart([]);
    setOrderStatus('ordering');
  };

  // ================= 後廚/列印邏輯 =================
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const completedOrders = orders.filter(o => o.status === 'completed');

  const markOrderCompleted = async (orderId) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), { status: 'completed' });
    } catch (e) { console.error("更新狀態失敗", e); }
  };

  const toggleItemCompleted = async (orderId, itemId) => {
    if (!user) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const updatedItems = order.items.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), { items: updatedItems });
    } catch (e) { console.error("更新項目狀態失敗", e); }
  };

  const handlePrint = (order) => setPrintingOrder(order);

  // ================= 結算報表邏輯 =================
  const reportStats = useMemo(() => {
    // 實務上可透過 timestamp 過濾今日訂單，這裡簡單加總所有歷史訂單做展示
    const totalRev = orders.reduce((sum, o) => sum + o.total, 0);
    
    const itemStats = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        if(!itemStats[item.id]) itemStats[item.id] = { name: item.name, quantity: 0, revenue: 0 };
        itemStats[item.id].quantity += item.quantity;
        itemStats[item.id].revenue += (item.price * item.quantity);
      });
    });

    const topSellers = Object.values(itemStats).sort((a, b) => b.quantity - a.quantity);
    return { totalRev, orderCount: orders.length, topSellers };
  }, [orders]);

  // ================= 後台商品上架邏輯 =================
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price || !user) return alert('請填寫餐點名稱與價格');
    
    const itemToAdd = {
      id: `m_${Date.now()}`,
      name: newItem.name,
      price: parseInt(newItem.price),
      description: newItem.description,
      image: newItem.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=400&q=80'
    };

    const targetCategory = menuData.find(c => c.id === newItem.categoryId);
    if (targetCategory) {
      const updatedItems = [...targetCategory.items, itemToAdd];
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'menu', newItem.categoryId), { items: updatedItems });
        alert('商品上架成功，已同步至所有客人手機！');
        setNewItem({ categoryId: menuData[0]?.id || 'c1', name: '', price: '', description: '', image: '' });
        setPreviewImage(null);
      } catch (error) {
        console.error("上架失敗:", error);
      }
    }
  };

  // ================= 員工登入邏輯 =================
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'Aeon.1388') {
      setShowLoginModal(false); setPasswordInput(''); setLoginError('');
      setSystemRole('admin'); 
    } else {
      setLoginError('密碼錯誤，請重新輸入');
    }
  };

  const handleLogout = () => setSystemRole('customer');

  // ================= 視圖元件 =================
  const StaffNavBar = () => {
    if (systemRole === 'customer') return null;
    return (
      <div className="bg-gray-900 text-white text-sm py-2 px-4 flex justify-between items-center z-50 relative shadow-md">
        <span className="text-gray-300 font-bold flex items-center gap-2">
          <Lock size={14} className="text-rose-400" /> 員工模式已登入
        </span>
        <div className="flex gap-2 items-center">
          <button onClick={() => setSystemRole('kitchen')} className={`px-4 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${systemRole === 'kitchen' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            後廚系統
            {pendingOrders.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                {pendingOrders.length}
              </span>
            )}
          </button>
          <button onClick={() => setSystemRole('admin')} className={`px-4 py-1.5 rounded-lg font-medium transition ${systemRole === 'admin' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>後台管理</button>
          <div className="w-px h-4 bg-gray-700 mx-1"></div>
          <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg transition text-red-400 hover:bg-red-500 hover:text-white flex items-center gap-1">
            <LogOut size={14} /> 登出
          </button>
        </div>
      </div>
    );
  };

  const PrintReceiptModal = () => {
    if (!printingOrder) return null;
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-gray-100 p-6 rounded-2xl w-full max-w-sm flex flex-col items-center">
          <div className="w-full bg-white shadow-md p-6 font-mono text-sm text-gray-800 relative pb-12 mb-4" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>
            <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundImage: 'radial-gradient(circle at 5px 0, transparent 5px, white 6px)', backgroundSize: '10px 10px' }}></div>
            <div className="absolute bottom-0 left-0 right-0 h-2" style={{ backgroundImage: 'radial-gradient(circle at 5px 10px, transparent 5px, white 6px)', backgroundSize: '10px 10px' }}></div>
            
            <div className="text-center mb-4 mt-2">
              <h2 className="text-xl font-bold mb-1">AURA Southern Alley</h2>
              <p className="text-xs text-gray-500">訂單明細收據</p>
            </div>
            
            <div className="border-b-2 border-dashed border-gray-300 pb-2 mb-2 flex justify-between">
              <span>單號: {printingOrder.id}</span>
              <span>{printingOrder.time}</span>
            </div>
            
            <div className="flex justify-between items-center mb-4 bg-gray-100 p-2 rounded">
              <span className="font-bold">{printingOrder.type === 'takeout' ? '🛍️ 外帶自取' : `🍽️ 內用 - ${printingOrder.table}`}</span>
            </div>

            <div className="space-y-2 mb-4 border-b-2 border-dashed border-gray-300 pb-4">
              {printingOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="flex-1">{item.name} <span className="text-xs text-gray-500">x{item.quantity}</span></span>
                  <span>${item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-bold text-lg">
              <span>總計金額</span>
              <span>${printingOrder.total}</span>
            </div>
            <div className="text-center mt-6 text-xs text-gray-400">-- 感謝您的光臨 --</div>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={() => setPrintingOrder(null)} className="flex-1 py-3 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">取消</button>
            <button onClick={() => { alert('已送出列印指令給印表機！'); setPrintingOrder(null); }} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <Printer size={18} /> 確認列印
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 等待 Firebase 資料載入
  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-[#faf8f7] flex items-center justify-center flex-col gap-4">
        <Store size={48} className="text-rose-500 animate-pulse" />
        <p className="text-gray-500 font-bold tracking-widest">系統連線中...</p>
      </div>
    );
  }

  // ================= 視圖 1：顧客點餐系統 =================
  if (systemRole === 'customer') {
    if (orderStatus === 'success') {
      return (
        <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-6 font-sans">
          <StaffNavBar />
          <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-sm w-full text-center border border-white">
            <div className="flex justify-center mb-6 relative">
              <div className="absolute inset-0 bg-rose-200 rounded-full animate-ping opacity-20"></div>
              <CheckCircle2 className="text-rose-500 relative z-10" size={80} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 tracking-wide">訂單已送出</h2>
            <p className="text-gray-500 mb-6 text-sm">您的餐點正由職人用心準備中，請稍候。</p>
            
            <div className="bg-rose-50/50 rounded-2xl p-5 mb-8 text-left border border-rose-100">
              <div className="flex justify-between text-sm text-gray-600 mb-3 border-b border-rose-100 pb-2">
                <span>取餐方式</span>
                <span className={`font-bold ${orderType === 'takeout' ? 'text-orange-600' : 'text-blue-600'}`}>
                  {orderType === 'takeout' ? '🛍️ 外帶' : '🍽️ 內用'}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-3">
                <span>{orderType === 'takeout' ? '取餐代碼' : '桌號'}</span>
                <span className="font-bold text-gray-800">{orderType === 'takeout' ? '前台叫號' : tableNumber}</span>
              </div>
              <div className="border-t border-rose-200/50 my-3 pt-3 flex justify-between font-bold text-gray-800 text-lg">
                <span>總計</span>
                <span className="text-rose-600">NT$ {totalAmount}</span>
              </div>
            </div>
            <button onClick={resetOrder} className="w-full bg-rose-500 text-white font-bold py-4 rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-200">
              返回美麗菜單
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#faf8f7] font-sans pb-24 lg:pb-0 flex flex-col">
        <StaffNavBar />
        
        {/* 左側主內容區 */}
        <div className="flex-1 flex flex-col lg:mr-96">
          <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-rose-100">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center w-full justify-between sm:w-auto gap-2 text-rose-500">
                <div className="flex items-center gap-2">
                  <Store size={26} strokeWidth={2.5} />
                  <h1 className="text-xl font-bold tracking-widest font-serif">AURA Southern Alley</h1>
                </div>
                <button onClick={() => setShowLoginModal(true)} className="sm:hidden p-2 text-gray-400 bg-gray-50/80 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors shadow-sm border border-gray-100">
                  <Lock size={18} />
                </button>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex bg-rose-50 p-1 rounded-full border border-rose-100">
                  <button onClick={() => setOrderType('dineIn')} className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 transition-all ${orderType === 'dineIn' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500'}`}>
                    <Utensils size={14} /> 內用
                  </button>
                  <button onClick={() => setOrderType('takeout')} className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 transition-all ${orderType === 'takeout' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-500'}`}>
                    <ShoppingBag size={14} /> 外帶
                  </button>
                </div>

                {orderType === 'dineIn' && (
                  <div className="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-full font-bold text-sm border border-rose-100 flex items-center shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse mr-1"></span>
                    <select value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="bg-transparent outline-none cursor-pointer text-rose-700 font-bold appearance-none pr-5 pl-1" style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23be123c%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '10px auto' }}>
                      {tables.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
                
                <button onClick={() => setShowLoginModal(true)} className="hidden sm:block p-2 text-gray-400 bg-gray-50/80 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors shadow-sm border border-gray-100" title="店鋪管理登入">
                  <Lock size={18} />
                </button>
              </div>
            </div>
          </header>

          <div className="bg-white/90 backdrop-blur-md border-b border-rose-50 sticky top-[73px] sm:top-[68px] z-10">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="flex overflow-x-auto py-4 gap-4 hide-scrollbar">
                {menuData.map((category) => (
                  <button key={category.id} onClick={() => setActiveCategory(category.id)} className={`flex items-center gap-2 px-6 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all ${activeCategory === category.id ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 'bg-[#f5f1f0] text-gray-500 hover:bg-rose-100 hover:text-rose-600'}`}>
                    {getCategoryIcon(category.icon)}
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full pb-32">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {menuData.find(c => c.id === activeCategory)?.items.map((item) => {
                const cartItem = cart.find(c => c.id === item.id);
                const quantity = cartItem ? cartItem.quantity : 0;

                return (
                  <div key={item.id} className="bg-white rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all border border-rose-50 flex flex-col p-6 items-center text-center relative group">
                    
                    {/* 圖片縮小約兩倍 (w-20 h-20)，並改為圓形質感設計 */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gray-50 relative shrink-0 shadow-inner mb-4 border-4 border-white group-hover:border-rose-50 transition-colors">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                    </div>
                    
                    <div className="flex-1 flex flex-col w-full">
                      <div className="mb-4">
                        {/* 文字放大 2pt (text-lg -> text-xl) 並置中 */}
                        <h3 className="text-xl font-extrabold text-gray-800 leading-tight mb-2">{item.name}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed px-2">{item.description}</p>
                      </div>
                      
                      <div className="mt-auto flex flex-col gap-4 w-full">
                        {/* 價格字體放大 */}
                        <span className="text-xl font-bold text-rose-500">${item.price}</span>
                        
                        {/* 滿版漸層 + 加入購物車按鈕，大幅增加點擊引導 */}
                        {quantity === 0 ? (
                          <button onClick={() => addToCart(item)} className="w-full bg-gradient-to-r from-rose-400 to-rose-500 text-white py-3.5 rounded-full flex items-center justify-center font-bold hover:from-rose-500 hover:to-rose-600 transition-all shadow-[0_4px_15px_rgba(244,63,94,0.3)] hover:shadow-[0_6px_20px_rgba(244,63,94,0.4)] gap-2 active:scale-95">
                            <Plus size={20} /> 加入購物車
                          </button>
                        ) : (
                          <div className="flex items-center justify-between w-full bg-rose-50/80 rounded-full p-1.5 border border-rose-100 shadow-inner">
                            <button onClick={() => updateQuantity(item.id, -1)} className="bg-white text-rose-500 w-11 h-11 rounded-full flex items-center justify-center shadow-sm hover:bg-rose-100 transition-colors active:scale-90"><Minus size={20} /></button>
                            <span className="font-extrabold text-gray-900 text-lg w-10 text-center">{quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="bg-rose-500 text-white w-11 h-11 rounded-full flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors active:scale-90"><Plus size={20} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        </div>

        {/* 桌面版側邊購物車保持不變 */}
        <div className="hidden lg:flex w-96 bg-white border-l border-rose-100 flex-col shadow-2xl z-20 fixed right-0 top-10 bottom-0">
          <div className="p-6 border-b border-rose-50 flex items-center gap-3 bg-rose-50/30">
            <ShoppingCart className="text-rose-500" size={24} />
            <h2 className="text-xl font-bold text-gray-800 font-serif tracking-wide">您的餐點</h2>
            <span className="ml-auto bg-white text-rose-500 px-3 py-1 rounded-full text-xs font-bold border border-rose-100 shadow-sm">{totalItems} 項</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-2"><Cake size={40} className="text-rose-200" /></div>
                <p className="text-gray-400 font-medium tracking-wide">購物車空空的，挑些甜點吧！</p>
              </div>
            ) : (
              <div className="space-y-5">
                {cart.map(item => (
                  <div key={item.id} className="flex gap-4 group">
                    <img src={item.image} alt={item.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-gray-800 text-sm">{item.name}</h4>
                        <span className="font-bold text-rose-500">${item.price * item.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 rounded-full bg-gray-50 text-gray-500 hover:bg-rose-50 hover:text-rose-500 transition-colors"><Minus size={12} /></button>
                        <span className="text-xs font-bold w-4 text-center text-gray-700">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 rounded-full bg-gray-50 text-gray-500 hover:bg-rose-50 hover:text-rose-500 transition-colors"><Plus size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-rose-50/30 border-t border-rose-100">
            <div className="flex justify-between items-end mb-4">
              <span className="text-gray-500 font-bold text-sm mb-1">總計金額</span>
              <span className="text-3xl font-bold text-gray-900 tracking-tight"><span className="text-lg mr-1 text-rose-500">$</span>{totalAmount}</span>
            </div>
            <button disabled={cart.length === 0} onClick={handleSubmitOrder} className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${cart.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-rose-500 shadow-xl hover:-translate-y-1'}`}>
              送出訂單 ({orderType === 'takeout' ? '外帶' : '內用'})
            </button>
          </div>
        </div>

        {/* 美化後的手機版懸浮深色購物車 (Floating Cart) - 改為置中短膠囊 */}
        <div className="lg:hidden fixed bottom-6 left-0 right-0 flex justify-center z-30 pb-safe pointer-events-none px-4">
          <div className="bg-gray-900 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.3)] p-2 pr-3 flex items-center gap-4 sm:gap-6 border border-gray-700 backdrop-blur-xl pointer-events-auto">
            <div className="flex items-center">
              <button onClick={() => setIsCartOpen(true)} className="relative p-3.5 bg-gray-800/80 rounded-full text-rose-400 ml-1 hover:bg-gray-700 transition-colors">
                <ShoppingCart size={24} />
                {totalItems > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[12px] w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 border-gray-900 shadow-sm">{totalItems}</span>}
              </button>
              <div className="flex flex-col items-start ml-3">
                <span className="text-gray-400 text-[11px] font-bold tracking-wider mb-0.5 whitespace-nowrap">購物車總計</span>
                <span className="text-xl font-bold text-white leading-none">${totalAmount}</span>
              </div>
            </div>
            <button disabled={cart.length === 0} onClick={() => setIsCartOpen(true)} className={`px-5 py-3 rounded-full font-bold text-sm transition-all shadow-md whitespace-nowrap ${cart.length === 0 ? 'bg-gray-800 text-gray-500' : 'bg-gradient-to-r from-rose-400 to-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] active:scale-95'}`}>
              查看明細
            </button>
          </div>
        </div>

        {/* 手機版 Modal */}
        {isCartOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
            <div className="bg-white w-full h-[85vh] rounded-t-[2rem] relative flex flex-col shadow-2xl animate-slide-up">
              <div className="p-5 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsCartOpen(false)} className="p-2 -ml-2 text-gray-400 bg-gray-50 rounded-full"><ChevronLeft size={20} /></button>
                  <h2 className="text-lg font-bold text-gray-800 ml-2">購物車明細</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="flex gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                    <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover" />
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-800 text-sm pr-4">{item.name}</h4>
                        <button onClick={() => updateQuantity(item.id, -item.quantity)} className="text-gray-300 p-1"><X size={16} /></button>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-rose-500">${item.price * item.quantity}</span>
                        <div className="flex items-center gap-3 bg-gray-50 rounded-full p-1 border border-gray-100">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-600 shadow-sm"><Minus size={16} /></button>
                          <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-500 text-white shadow-sm"><Plus size={16} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-5 bg-white border-t border-gray-100 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.03)] flex flex-col gap-3">
                <button disabled={cart.length === 0} onClick={handleSubmitOrder} className={`w-full py-4 rounded-full font-bold text-lg flex justify-center items-center gap-2 transition-transform ${cart.length === 0 ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white shadow-xl shadow-gray-300 active:scale-95'}`}>
                  確認結帳 ({orderType === 'takeout' ? '外帶' : '內用'}) • ${totalAmount}
                </button>
              </div>
            </div>
          </div>
        )}

        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}></div>
            <div className="bg-white p-8 rounded-3xl shadow-2xl relative z-10 w-full max-w-sm mx-4 animate-fade-in">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2"><X size={20} /></button>
              <div className="flex justify-center mb-4"><div className="bg-rose-50 p-4 rounded-full text-rose-500"><Lock size={32} /></div></div>
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-6 font-serif tracking-wider">店鋪管理登入</h2>
              <form onSubmit={handleLogin}>
                <div className="mb-4">
                  <input type="password" placeholder="請輸入密碼" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-center tracking-widest text-lg" autoFocus />
                </div>
                {loginError && <p className="text-rose-500 text-sm text-center mb-4 font-bold">{loginError}</p>}
                <button type="submit" className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-rose-500 transition-colors shadow-lg">確認登入</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================= 視圖 2：後廚接單系統 =================
  if (systemRole === 'kitchen') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <StaffNavBar />
        <PrintReceiptModal />
        <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <ChefHat size={28} className="text-orange-400" />
            <h1 className="text-xl font-bold tracking-wider">後廚看板 KDS</h1>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-800 px-4 py-1.5 rounded-full flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              待製作：{pendingOrders.length} 單
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-x-auto">
          <div className="flex gap-6 min-w-max">
            {pendingOrders.map(order => (
              <div key={order.id} className={`w-80 bg-white rounded-xl shadow-sm border-t-4 flex flex-col flex-shrink-0 animate-fade-in ${order.type === 'takeout' ? 'border-t-orange-500' : 'border-t-blue-500'}`}>
                <div className={`p-4 border-b border-gray-100 ${order.type === 'takeout' ? 'bg-orange-50/50' : 'bg-blue-50/30'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${order.type === 'takeout' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {order.type === 'takeout' ? '🛍️ 外帶' : '🍽️ 內用'}
                      </span>
                      <span className="font-bold text-xl text-slate-800">{order.table}</span>
                    </div>
                    <button onClick={() => handlePrint(order)} className="text-gray-400 hover:text-gray-800 transition-colors p-1" title="列印明細"><Printer size={20} /></button>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 text-sm">
                  <span className="flex items-center gap-1"><Clock size={14} /> {order.time}</span>
                  <span className="font-mono text-xs">{order.id}</span>
                </div>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto">
                <ul className="space-y-4">
                  {order.items.map((item, idx) => (
                    <li key={idx} onClick={() => toggleItemCompleted(order.id, item.id)} className={`flex justify-between items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0 cursor-pointer transition-all group ${item.completed ? 'opacity-50' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent group-hover:border-green-400'}`}>
                          <Check size={14} />
                        </div>
                        <span className={`font-bold text-lg transition-all ${item.completed ? 'text-gray-500 line-through' : 'text-slate-700'}`}>{item.name}</span>
                      </div>
                      <span className={`font-bold px-3 py-1 rounded-lg text-lg transition-colors ${item.completed ? 'bg-gray-100 text-gray-400' : 'bg-slate-100 text-slate-800'}`}>x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-gray-50 rounded-b-xl border-t border-gray-100 flex gap-2">
                  <button onClick={() => markOrderCompleted(order.id)} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-sm">
                    <Check size={20} /> 完成出餐
                  </button>
                </div>
              </div>
            ))}

            {completedOrders.slice(0, 5).map(order => (
               <div key={order.id} className="w-80 bg-gray-50 rounded-xl shadow-sm border border-gray-200 flex flex-col flex-shrink-0 opacity-70">
                 <div className="p-4 border-b border-gray-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-500 line-through">{order.table} (已完成)</span>
                      <button onClick={() => handlePrint(order)} className="text-gray-400 hover:text-gray-800"><Printer size={18} /></button>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{order.id}</span>
                 </div>
               </div>
            ))}

            {pendingOrders.length === 0 && (
              <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400">
                <Coffee size={48} className="mb-4 opacity-30" />
                <p className="text-lg">目前沒有待製作的訂單</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ================= 視圖 3：後台管理系統 =================
  if (systemRole === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <StaffNavBar />
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
          <div className="flex items-center gap-3 text-blue-600">
            <Settings size={24} />
            <h1 className="text-xl font-bold text-gray-800">店長後台管理</h1>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto hide-scrollbar">
            <button onClick={() => setAdminTab('reports')} className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${adminTab === 'reports' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <BarChart3 size={18} /> 今日結算
            </button>
            <button onClick={() => setAdminTab('products')} className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${adminTab === 'products' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <ClipboardList size={18} /> 商品上架
            </button>
            <button onClick={() => setAdminTab('qrcodes')} className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${adminTab === 'qrcodes' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <QrCode size={18} /> 桌位碼
            </button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto w-full p-4 sm:p-6 mt-2">
          
          {adminTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-medium text-blue-100">雲端累計總營收</span>
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm"><BarChart3 size={24} /></div>
                  </div>
                  <h3 className="text-4xl font-bold tracking-tight"><span className="text-2xl mr-1">$</span>{reportStats.totalRev.toLocaleString()}</h3>
                </div>
                
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-bold text-gray-500">雲端累計總單數</span>
                    <div className="bg-orange-50 p-2 rounded-xl text-orange-500"><Receipt size={24} /></div>
                  </div>
                  <h3 className="text-4xl font-bold text-gray-800">{reportStats.orderCount} <span className="text-lg text-gray-400 font-medium">單</span></h3>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden">
                <div className="bg-gray-50/50 p-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><span className="text-2xl">🔥</span> 暢銷單品排行榜</h2>
                </div>
                <div className="p-2 sm:p-6">
                  {reportStats.topSellers.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">目前尚未有銷售紀錄，趕快去前台下單測試看看吧！</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-gray-400 text-sm border-b border-gray-100">
                            <th className="font-medium pb-3 pl-4">排名</th>
                            <th className="font-medium pb-3">商品名稱</th>
                            <th className="font-medium pb-3 text-right">銷售數量</th>
                            <th className="font-medium pb-3 text-right pr-4">創造營收</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportStats.topSellers.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className="py-4 pl-4"><span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'}`}>{idx + 1}</span></td>
                              <td className="py-4 font-bold text-gray-800">{item.name}</td>
                              <td className="py-4 text-right font-bold text-blue-600">{item.quantity}</td>
                              <td className="py-4 text-right font-medium text-gray-600 pr-4">${item.revenue.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'products' && (
            <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden">
              <div className="bg-blue-50/50 p-6 border-b border-gray-100 flex items-center gap-3">
                <ClipboardList className="text-blue-500" />
                <h2 className="text-lg font-bold text-gray-800">新增商品上架 (自動同步)</h2>
              </div>
              <form onSubmit={handleAddItem} className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/3 flex flex-col gap-2">
                  <label className="text-sm font-bold text-gray-700 mb-1">商品圖片</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl h-64 flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-400 transition-colors bg-gray-50">
                    {previewImage ? (
                      <img src={previewImage} alt="預覽" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon size={40} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 font-medium">點擊或拖曳上傳圖片</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => {
                      if(e.target.files[0]) {
                        const url = URL.createObjectURL(e.target.files[0]);
                        setPreviewImage(url);
                        setNewItem({...newItem, image: url});
                      }
                    }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                </div>

                <div className="w-full md:w-2/3 space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">商品分類</label>
                      <select value={newItem.categoryId} onChange={(e) => setNewItem({...newItem, categoryId: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none">
                        {menuData.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">商品名稱</label>
                      <input type="text" required placeholder="例如：提拉米蘇" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">價格 (NT$)</label>
                    <input type="number" required min="0" placeholder="150" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-md flex items-center gap-2">
                      <Plus size={18} /> 確認上架
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {adminTab === 'qrcodes' && (
            <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden">
               <div className="bg-blue-50/50 p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <QrCode className="text-blue-500" />
                  <h2 className="text-lg font-bold text-gray-800">桌位專屬 QR Code 下載與列印</h2>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {tables.map(table => {
                  const baseUrl = 'https://aura-suothern-alley.netlify.app';
                  const orderUrl = `${baseUrl}?table=${encodeURIComponent(table)}`;
                  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(orderUrl)}&margin=10`;

                  return (
                    <div key={table} className="border border-gray-200 rounded-2xl p-5 flex flex-col items-center hover:shadow-lg transition-shadow bg-gray-50 group">
                      <h3 className="font-bold text-xl text-gray-800 mb-4">{table}</h3>
                      <div className="bg-white p-2 rounded-xl shadow-sm mb-2">
                        <img src={qrImageUrl} alt={`${table} QR Code`} className="w-32 h-32 object-contain group-hover:scale-105 transition-transform" loading="lazy" />
                      </div>
                      <p className="text-xs text-gray-400 mb-4 text-center break-all w-full line-clamp-2" title={orderUrl}>{orderUrl}</p>
                      <div className="flex gap-2 w-full">
                        <button className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white font-bold py-2 rounded-xl transition-colors text-sm">下載圖片</button>
                        <button onClick={() => { setTableNumber(table); setOrderType('dineIn'); setSystemRole('customer'); }} className="flex-1 bg-green-100 text-green-700 hover:bg-green-600 hover:text-white font-bold py-2 rounded-xl transition-colors text-sm">
                          模擬掃描
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
