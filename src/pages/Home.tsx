import { useNavigate, Link } from 'react-router-dom';
import { getRandomText } from '../utils/textSelection';

export default function Home() {
  const navigate = useNavigate();

  const handleQuickStart = (difficulty: 'easy' | 'medium' | 'hard') => {
    const item = getRandomText(difficulty);
    navigate('/practice', { state: { text: item.content, title: item.title } });
  };

  const handleRandom = () => {
    const item = getRandomText();
    navigate('/practice', { state: { text: item.content, title: item.title } });
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-3">TypeType</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400">提升你的打字速度</p>
      </div>

      {/* Quick Start */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-6 transition-colors duration-200">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-5">快速开始</h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => handleQuickStart('easy')}
            className="py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-medium
                       hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:shadow-md transition-all duration-200 border border-emerald-200 dark:border-emerald-800"
          >
            简单
          </button>
          <button
            onClick={() => handleQuickStart('medium')}
            className="py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-medium
                       hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:shadow-md transition-all duration-200 border border-amber-200 dark:border-amber-800"
          >
            中等
          </button>
          <button
            onClick={() => handleQuickStart('hard')}
            className="py-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 font-medium
                       hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:shadow-md transition-all duration-200 border border-rose-200 dark:border-rose-800"
          >
            困难
          </button>
        </div>

        <button
          onClick={handleRandom}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium
                     hover:bg-indigo-700 hover:shadow-md transition-all duration-200"
        >
          随机练习
        </button>
      </div>

      {/* Custom Link */}
      <div className="text-center">
        <Link
          to="/custom"
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium hover:underline transition-colors duration-200"
        >
          使用导入文章练习 →
        </Link>
      </div>
    </div>
  );
}
