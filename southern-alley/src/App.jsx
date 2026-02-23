import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, X, Coffee, Cake, Soup, CheckCircle2, 
  Store, ChevronLeft, Image as ImageIcon, ClipboardList, Settings, 
  Leaf, Clock, Check, ChefHat, QrCode, Printer, Lock, LogOut, 
  Utensils, ShoppingBag, BarChart3, Receipt
} from 'lucide-react';

// --- 引入 Firebase 雲端模組 ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';

// --- Firebase 初始化設定 (已根據您的截圖校對) ---
const firebaseConfig = {
  apiKey: "AIzaSyDQ5mXUrQ1oJgdbeVMJEunDpCIJ5jWNuJM",
  authDomain: "aura-cafe-64b34.firebaseapp.com",
  projectId: "aura-cafe-64b34",
  storageBucket: "aura-cafe-64b34.firebasestorage.app",
  messagingSenderId: "653695103878",
  appId: "1:653695103878:web:242def6a9d94a0ca0bb207"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "aura-cafe-64b34"; // 您的專案 ID

// --- 預設菜單資料 ---
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
    ]
  }
];

// --- 工具元件 ---
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
  const [systemRole, setSystemRole] = useState('customer'); // 預設為顧客模式
  
  // 狀態管理
  const [menuData, setMenuData] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [tables] = useState(['窗邊 A1', '窗邊 A2', '沙發 B1', '沙發 B2', '吧台 C1', '包廂 VIP']);
  const [cart, setCart] = useState([]);
  const [orderStatus, setOrderStatus] = useState('ordering');
  const [tableNumber, setTableNumber] = useState(tables[0]);
  const [orderType, setOrderType] = useState('dineIn'); 

  // 連線 Firebase
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("匿名登入失敗，請確認 Firebase 設定", err));
    const unsubscribeAuth = onAuthStateChanged(auth, setUser);
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsubOrders = onSnapshot(ordersRef, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(fetchedOrders.sort((a, b) => b.timestamp - a.timestamp));
    });

    const menuRef = collection(db, 'artifacts', appId, 'public', 'data', 'menu');
    const unsubMenu = onSnapshot(menuRef, (snapshot) => {
      if (snapshot.empty) {
        INITIAL_MENU.forEach(async (cat) => await setDoc(doc(menuRef, cat.id), cat));
        setMenuData(INITIAL_MENU);
      } else {
        const fetchedMenu = snapshot.docs.map(doc => doc.data());
        setMenuData(fetchedMenu.sort((a, b) => a.id.localeCompare(b.id)));
      }
      setIsDataLoaded(true);
    });
    return () => { unsubOrders(); unsubMenu(); };
  }, [user]);

  // 下單邏輯
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const newOrder = {
      id: orderId,
      table: orderType === 'takeout' ? '外帶' : tableNumber,
      items: cart,
      total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      status: 'pending',
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now()
    };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), newOrder);
    setOrderStatus('success');
    setCart([]);
  };

  if (!isDataLoaded) return <div className="h-screen flex items-center justify-center font-bold">南巷微光 載入中...</div>;

  // 簡化版介面 (正式發佈時會包含完整 UI)
  return (
    <div className="min-h-screen bg-[#faf8f7] p-4">
      {orderStatus === 'success' ? (
        <div className="text-center py-20">
          <CheckCircle2 size={80} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold">訂單已送出！</h2>
          <button onClick={() => setOrderStatus('ordering')} className="mt-6 bg-rose-500 text-white px-8 py-2 rounded-full">返回菜單</button>
        </div>
      ) : (
        <div>
          <header className="flex justify-between items-center mb-6">
             <h1 className="text-xl font-bold text-rose-500 flex items-center gap-2"><Store /> AURA 南巷微光</h1>
             <button onClick={() => {
               const pwd = prompt("請輸入員工密碼：");
               if(pwd === "Aeon.1388") setSystemRole('kitchen');
             }} className="text-gray-400"><Lock size={18} /></button>
          </header>
          
          {systemRole === 'customer' ? (
            <div className="grid gap-4">
              {menuData[0]?.items.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                  <div>
                    <h3 className="font-bold">{item.name}</h3>
                    <p className="text-rose-500 font-bold">${item.price}</p>
                  </div>
                  <button onClick={() => setCart([...cart, {...item, quantity: 1}])} className="bg-rose-500 text-white p-2 rounded-full"><Plus size={18} /></button>
                </div>
              ))}
              {cart.length > 0 && (
                <button onClick={handleSubmitOrder} className="fixed bottom-6 left-6 right-6 bg-gray-900 text-white py-4 rounded-full font-bold shadow-xl">
                  確認下單 (${cart.reduce((s, i) => s + i.price, 0)})
                </button>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 text-white p-4 rounded-2xl min-h-[400px]">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><ChefHat /> 後廚看板</h2>
              {orders.filter(o => o.status === 'pending').map(o => (
                <div key={o.id} className="bg-slate-800 p-3 rounded-lg mb-2 flex justify-between items-center">
                  <span>{o.table} - {o.items[0]?.name}...</span>
                  <button onClick={async () => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id), {status: 'done'})} className="bg-green-600 px-3 py-1 rounded">完成</button>
                </div>
              ))}
              <button onClick={() => setSystemRole('customer')} className="mt-4 text-slate-400 text-sm underline">切換回顧客模式</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}