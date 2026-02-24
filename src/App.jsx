import React, { useState } from 'react';

const menuData = {
  "經典咖啡": [
    { id: 1, name: "玫瑰海鹽拿鐵", price: 160, desc: "醇厚拿鐵與玫瑰香氣的優雅結合" },
    { id: 2, name: "雲朵焦糖瑪奇朵", price: 180, desc: "綿密奶泡與焦糖的香甜層次" },
    { id: 3, name: "南巷精品手沖", price: 200, desc: "嚴選單品豆，品嚐最純粹的咖啡風味" }
  ],
  "微光茶飲": [
    { id: 4, name: "炭香烏龍歐蕾", price: 150, desc: "嚴選炭焙烏龍與鮮乳的完美比例" },
    { id: 5, name: "紅玉紅茶", price: 120, desc: "台茶18號，自帶天然肉桂與薄荷香" }
  ],
  "手作甜點": [
    { id: 6, name: "焦糖布丁", price: 100, desc: "口感滑順，苦甜焦糖的成熟滋味" },
    { id: 7, name: "巴斯克乳酪蛋糕", price: 150, desc: "濃郁乳酪香氣，入口即化" }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState("經典咖啡");
  const [cart, setCart] = useState([]);

  const addToCart = (item) => setCart([...cart, item]);
  const total = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      <header className="bg-white shadow-sm p-6 sticky top-0 z-10">
        <h1 className="text-3xl font-black text-red-500 text-center">🏠 南巷微光</h1>
        <p className="text-center text-gray-400 text-xs mt-1 tracking-widest">SOUTHERN ALLEY CAFE</p>
      </header>

      <div className="flex overflow-x-auto bg-white border-b px-4 py-4 sticky top-[88px] z-10 no-scrollbar gap-3">
        {Object.keys(menuData).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-6 py-2 rounded-full text-sm font-bold transition-all ${
              activeTab === tab ? "bg-red-500 text-white shadow-lg scale-105" : "bg-gray-100 text-gray-500"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <main className="p-4 space-y-4">
        {menuData[activeTab].map((item) => (
          <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center transition-all active:scale-95">
            <div className="flex-1 pr-4">
              <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">{item.desc}</p>
              <div className="mt-3 text-red-500 font-black text-xl">${item.price}</div>
            </div>
            <button
              onClick={() => addToCart(item)}
              className="bg-red-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg active:bg-red-700"
            >
              +
            </button>
          </div>
        ))}
      </main>

      {cart.length > 0 && (
        <div className="fixed bottom-8 left-4 right-4 bg-gray-900 text-white p-5 rounded-3xl shadow-2xl flex justify-between items-center z-20">
          <div>
            <span className="text-xs text-gray-400">已點 {cart.length} 份點心</span>
            <div className="text-2xl font-black text-white">總計 ${total}</div>
          </div>
          <button onClick={() => alert('訂單已送出！')} className="bg-red-500 px-8 py-3 rounded-2xl font-bold text-lg shadow-lg">
            立即結帳
          </button>
        </div>
      )}
    </div>
  );
}
