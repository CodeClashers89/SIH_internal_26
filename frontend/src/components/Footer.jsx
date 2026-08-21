import React from 'react';
import { Sprout, Phone, Mail, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4 col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 text-white">
              <Sprout className="h-8 w-8 text-emerald-400 stroke-[2.5]" />
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
                KisanConnect
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm">
              Empowering farmers and food producer organizations (FPOs) by establishing direct connections with retail consumers and bulk processing industries. Eliminating intermediaries, maximizing revenue, and ensuring local freshness.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Links</h3>
            <ul className="space-y-2.5 text-sm">
              <li><a href="/marketplace" className="hover:text-emerald-400 transition-colors">Buy Fresh Produce</a></li>
              <li><a href="/register?role=farmer" className="hover:text-emerald-400 transition-colors">Sell on KisanConnect</a></li>
              <li><a href="/register?role=bulk_buyer" className="hover:text-emerald-400 transition-colors">Bulk Purchasing Portal</a></li>
              <li><a href="/login" className="hover:text-emerald-400 transition-colors">Account Login</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Contact Info</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                <span>Agricultural Development Office, Pune, MH, India</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-400" />
                <span>+91 20 2568 9900</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-400" />
                <span>support@kisanconnect.org</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} KisanConnect Marketplace. All rights reserved.</p>
          <div className="flex space-x-6 text-sm text-slate-400">
            <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
