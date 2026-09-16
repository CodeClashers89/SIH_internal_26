import React from 'react';
import { Bell, CheckCircle2, Clock3, FileCheck2, Truck } from 'lucide-react';

const notifications = [
  {
    id: 1,
    title: 'Farmer offer received',
    message: 'A buyer sent a new offer for Tomato Bulk Order #42.',
    time: '10 minutes ago',
    icon: FileCheck2,
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  {
    id: 2,
    title: 'Wholesale contract updated',
    message: 'Wholesale contract #108 status changed to Active.',
    time: '1 hour ago',
    icon: CheckCircle2,
    tone: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  {
    id: 3,
    title: 'Dispatch scheduled',
    message: 'Your APMC Mandi, Pune drop is scheduled for dispatch.',
    time: '3 hours ago',
    icon: Truck,
    tone: 'bg-amber-50 text-amber-700 border-amber-100',
  },
];

const FarmerNotifications = () => (
  <div className="min-h-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Notifications</h1>
            <p className="text-sm text-slate-500 mt-1">Stay updated on offers, contracts, and deliveries.</p>
          </div>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">3 new</span>
    </div>

    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      {notifications.map(({ id, title, message, time, icon: Icon, tone }) => (
        <article key={id} className="flex items-start gap-4 p-5 sm:p-6 border-b last:border-b-0 border-slate-100 hover:bg-slate-50/70 transition-colors">
          <div className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center ${tone}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-extrabold text-sm text-slate-800">{title}</h2>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Clock3 className="h-3 w-3" />{time}</span>
            </div>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{message}</p>
          </div>
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 mt-2" aria-label="Unread" />
        </article>
      ))}
    </div>
  </div>
);

export default FarmerNotifications;
