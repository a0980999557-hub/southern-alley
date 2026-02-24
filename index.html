import React, { useState } from 'react';

const menuData = {
  "經典咖啡": [
    { id: 1, name: "玫瑰海鹽拿鐵", price: 160, desc: "醇厚拿鐵與玫瑰香氣的優雅結合" },
    { id: 2, name: "雲朵焦糖瑪奇朵", price: 180, desc: "綿密奶泡與焦糖的香甜層次" },
    { id: 3, name: "南巷精品手沖", price: 200, desc: "嚴選單品豆，品嚐最純粹的咖啡風味" },
    { id: 4, name: "燕麥奶拿鐵", price: 170, desc: "健康新選擇，濃郁堅果香氣" }
  ],
  "微光茶飲": [
    { id: 5, name: "炭香烏龍歐蕾", price: 150, desc: "嚴選炭焙烏龍與鮮乳的完美比例" },
    { id: 6, name: "蜂蜜柚子茶", price: 130, desc: "清爽果香，舒緩身心的好選擇" },
    { id: 7, name: "紅玉紅茶", price: 120, desc: "台茶18號，自帶天然肉桂與薄荷香" }
  ],
  "手作甜點": [
    { id: 8, name: "焦糖布丁", price: 100, desc: "口感滑順，苦甜焦糖的成熟滋味" },
    { id: 9, name: "巴斯克乳腺蛋糕", price: 150, desc: "濃郁乳酪香氣，入口即化" },
    { id: 10, name: "法式檸檬塔", price: 140, desc: "酸甜適中，酥脆塔殼的經典美味" }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState("經典咖啡");
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
    setCart([...cart, item]);
  };

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 標題欄 */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-red-500 text-center">🏠 南巷微光</h1>
        <p className="text-center text-gray-500 text-sm">線上點餐系統</p>
      </header>

      {/* 分類選單 */}
      <div className="flex overflow-x-auto bg-white border-b px-2 py-3 sticky top-[72px] z-10 no-scrollbar">
        {Object.keys(menuData).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-6 py-2 rounded-full mr-2 text-sm font-medium transition-all ${
              activeTab === tab ? "bg-red-500 text-white shadow-md" : "bg-gray-100 text-gray-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 商品列表 */}
      <main className="p-4 space-y-4">
        {menuData[activeTab].map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transition-transform active:scale-95">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
              <p className="text-gray-500 text-xs mb-2">{item.desc}</p>
              <span className="text-red-500 font-bold">${item.price}</span>
            </div>
            <button
              onClick={() => addToCart(item)}
              className="bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shadow-sm hover:bg-red-600"
            >
              +
            </button>
          </div>
        ))}
      </main>

      {/* 底部購物車資訊 */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center z-20 animate-bounce-short">
          <div>
            <span className="text-sm opacity-80">已點 {cart.length} 份商品</span>
            <div className="text-xl font-bold">總計 ${total}</div>
          </div>
          <button 
            onClick={() => alert('點餐成功！')}
            className="bg-red-500 px-6 py-2 rounded-xl font-bold hover:bg-red-600"
          >
            去結帳
          </button>
        </div>
      )}
    </div>
  );
}
