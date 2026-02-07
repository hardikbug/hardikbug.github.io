
import React, { useState } from 'react';
import { translations } from '../types';

interface ReviewsProps {
  onBack: () => void;
  language: string;
}

const Reviews: React.FC<ReviewsProps> = ({ onBack, language }) => {
  const t = translations[language] || translations['English'];
  const [activeFilter, setActiveFilter] = useState('All');

  const vendors = [
    {
      id: '1',
      name: 'Krishna Seed Store',
      location: 'Sirsa Main Road',
      rating: 4.8,
      reviews: 124,
      status: 'Verified',
      latestReview: 'Best quality basmati seeds, germination was 95%.',
      tags: ['Seeds', 'Reliable']
    },
    {
      id: '2',
      name: 'Jai Kisan Fertilizers',
      location: 'Mandi Chowk',
      rating: 4.2,
      reviews: 89,
      status: 'Trusted',
      latestReview: 'Always have stock of urea even in peak season.',
      tags: ['Fertilizer', 'Fair Price']
    },
    {
      id: '3',
      name: 'Deepak Agri Tools',
      location: 'Old Market',
      rating: 3.5,
      reviews: 45,
      status: 'Unverified',
      latestReview: 'Pricing is high, but machinery is durable.',
      tags: ['Tools']
    }
  ];

  const filters = ['All', 'Seeds', 'Fertilizer', 'Tools'];

  return (
    <div className="flex flex-col min-h-screen animate-in slide-in-from-right duration-300 bg-slate-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-black uppercase tracking-widest">{t.vendorRadar}</h2>
        <div className="w-10"></div>
      </header>

      <main className="p-6 space-y-6">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {filters.map(f => (
            <button 
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-wider whitespace-nowrap border-2 transition-all ${activeFilter === f ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900' : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-slate-400'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Top Rated Near You</h4>
          {vendors.map((v) => (
            <div key={v.id} className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-slate-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-lg active:scale-[0.98]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h5 className="text-lg font-black text-slate-900 dark:text-white mb-0.5">{v.name}</h5>
                  <p className="text-xs text-slate-400 flex items-center gap-1 font-bold">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    {v.location}
                  </p>
                </div>
                <div className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${v.status === 'Verified' ? 'bg-emerald-100 text-emerald-600' : v.status === 'Trusted' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                  {v.status}
                </div>
              </div>

              <div className="flex items-center gap-4 mb-5">
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-100 dark:border-amber-900/30">
                  <span className="material-symbols-outlined text-amber-500 text-base fill-1">star</span>
                  <span className="text-sm font-black text-amber-600 dark:text-amber-500">{v.rating}</span>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.reviews} Reviews</p>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl mb-5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs">format_quote</span>
                  Latest Review
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium italic">"{v.latestReview}"</p>
              </div>

              <div className="flex gap-2">
                {v.tags.map(t => (
                  <span key={t} className="text-[9px] font-black px-3 py-1 bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-slate-300 rounded-full uppercase tracking-tighter">#{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <button className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
          Rate a Vendor
        </button>
      </main>
    </div>
  );
};

export default Reviews;
