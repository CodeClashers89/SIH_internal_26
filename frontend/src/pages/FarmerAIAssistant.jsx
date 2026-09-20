import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Plus, Trash2, Bot, User, Sparkles,
  RefreshCw, AlertCircle, Check, MessageSquare,
  TrendingUp, Tag, Handshake, Package, Truck,
  BarChart3, Users, Globe, ChevronRight, ChevronLeft, ShieldCheck,
  Eye, MapPin, Clock, UserCheck, DollarSign, Search,
  MoreVertical, Pencil, Pin, X, Loader2, Minus,
  ArrowLeft, Home, ShoppingBag, FileCheck, Calendar,
  Mic, MicOff, Volume2, VolumeX, Copy, CheckCheck,
  PanelLeftClose, PanelLeft, ArrowUpRight
} from 'lucide-react';
import './FarmerAIAssistant.css';

// Capabilities Overview Data
const CAPABILITIES_DATA = [
  {
    key: 'market',
    icon: TrendingUp,
    area: 'Market insights',
    desc: 'Check real-time Mandi arrival rates, price trends & smart selling recommendations',
  },
  {
    key: 'listings',
    icon: Tag,
    area: 'Listings',
    desc: 'Create, update & manage your crop listings for retail & wholesale buyers',
  },
  {
    key: 'contracts',
    icon: Handshake,
    area: 'Bulk contracts',
    desc: 'Review bulk buyer requirements, submit offers & negotiate contracts',
  },
  {
    key: 'orders',
    icon: Package,
    area: 'Orders',
    desc: 'Track incoming orders, update status & confirm transport handovers',
  },
  {
    key: 'logistics',
    icon: Truck,
    area: 'Logistics',
    desc: 'Monitor shipment progress, driver assignments & delivery OTPs',
  },
  {
    key: 'stats',
    icon: BarChart3,
    area: 'Farm stats',
    desc: 'View earnings analytics, trust score, average ratings & freshness metrics',
  },
  {
    key: 'buyer',
    icon: Users,
    area: 'Buyer info',
    desc: 'Find potential retail consumers and wholesale food processors',
  }
];

// Helper to strip any leaked XML / tool calling tags from message content
const cleanMessageContent = (content) => {
  if (!content || typeof content !== 'string') return '';
  return content
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, '')
    .replace(/<invoke[\s\S]*?<\/invoke>/gi, '')
    .replace(/<\/?(?:tool_call|function_calls|invoke|parameter|function)[^>]*>/gi, '')
    .trim();
};

// Helper to translate crop/product names into user's selected language
const translateCropName = (cropName, selectedLanguage = 'english') => {
  if (!cropName) return '';
  const lang = selectedLanguage ? String(selectedLanguage).toLowerCase() : 'english';
  if (lang === 'english') return cropName;

  const CROP_DICTIONARY = {
    gujarati: {
      'onion': 'ડુંગળી',
      'onions': 'ડુંગળી',
      'red onions': 'લાલ ડુંગળી',
      'tomato': 'ટામેટાં',
      'tomatoes': 'ટામેટાં',
      'fresh tomatoes': 'તાજા ટામેટાં',
      'yellow mustard seeds (sarson)': 'પીળી રાઈ (સરસવ)',
      'yellow mustard seeds': 'પીળી રાઈ (સરસવ)',
      'mustard seeds': 'રાઈ / સરસવ',
      'mustard': 'સરસવ / રાઈ',
      'sarson': 'સરસવ',
      'aged basmati rice 1121 (raw)': 'બાસમતી ચોખા 1121 (કાચા)',
      'aged basmati rice 1121': 'બાસમતી ચોખા 1121',
      'basmati rice 1121 (raw)': 'બાસમતી ચોખા 1121 (કાચા)',
      'basmati rice 1121': 'બાસમતી ચોખા 1121',
      'basmati rice': 'બાસમતી ચોખા',
      'traditional sharbati wheat': 'પરંપરાગત શરબતી ઘઉં',
      'sharbati wheat': 'શરબતી ઘઉં',
      'wheat': 'ઘઉં',
      'rice': 'ચોખા',
      'potato': 'બટાકા',
      'potatoes': 'બટાકા',
      'garlic': 'લસણ',
      'ginger': 'આદુ',
      'chilli': 'મરચાં',
      'chili': 'મરચાં',
      'green chilli': 'લીલા મરચાં',
      'cotton': 'કપાસ',
      'groundnut': 'મગફળી',
      'groundnuts': 'મગફળી',
      'peanuts': 'મગફળી',
      'sugarcane': 'શેરડી',
      'maize': 'મકાઈ',
      'corn': 'મકાઈ',
    },
    hindi: {
      'onion': 'प्याज',
      'onions': 'प्याज',
      'red onions': 'लाल प्याज',
      'tomato': 'टमाटर',
      'tomatoes': 'टमाटर',
      'fresh tomatoes': 'ताजे टमाटर',
      'yellow mustard seeds (sarson)': 'पीली सरसों',
      'yellow mustard seeds': 'पीली सरसों',
      'mustard seeds': 'सरसों',
      'mustard': 'सरसों',
      'sarson': 'सरसों',
      'aged basmati rice 1121 (raw)': 'बासमती चावल 1121 (कच्चा)',
      'aged basmati rice 1121': 'बासमती चावल 1121',
      'basmati rice 1121 (raw)': 'बासमती चावल 1121 (कच्चा)',
      'basmati rice 1121': 'बासमती चावल 1121',
      'basmati rice': 'बासमती चावल',
      'traditional sharbati wheat': 'पारंपरिक शरबती गेहूं',
      'sharbati wheat': 'शरबती गेहूं',
      'wheat': 'गेहूं',
      'rice': 'चावल',
      'potato': 'आलू',
      'potatoes': 'आलू',
      'garlic': 'लहसुन',
      'ginger': 'अदरक',
      'chilli': 'मिर्च',
      'chili': 'मिर्च',
      'green chilli': 'हरी मिर्च',
      'cotton': 'कपास',
      'groundnut': 'मूंगफली',
      'groundnuts': 'मूंगफली',
      'peanuts': 'मूंगफली',
      'sugarcane': 'गन्ना',
      'maize': 'मक्का',
      'corn': 'मक्का',
    }
  };

  const dict = CROP_DICTIONARY[lang] || {};
  const lower = String(cropName).trim().toLowerCase();
  if (dict[lower]) return dict[lower];

  let translated = String(cropName);
  const sortedEntries = Object.entries(dict).sort((a, b) => b[0].length - a[0].length);
  for (const [key, val] of sortedEntries) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKey, 'gi');
    if (regex.test(translated)) {
      translated = translated.replace(regex, val);
    }
  }
  return translated;
};

// Dynamic Sub-Menu Mapping per area (Location, Context & Language Aware)
const getSubMenusMapping = (locationName = 'Pune', selectedLanguage = 'english') => {
  const lang = selectedLanguage ? String(selectedLanguage).toLowerCase() : 'english';

  if (lang === 'gujarati') {
    const menus = {
      inventory: {
        areaName: 'પાક ઇન્વેન્ટરી',
        icon: Package,
        titleTemplate: (areaName) => <>તમે <strong className="text-emerald-800 font-extrabold">{areaName}</strong> સાથે શું કરવા માંગો છો?</>,
        backText: '← પાછા બધી શ્રેણીઓ પર',
        options: [
          { key: 'inv_analyze', label: 'મારી સક્રિય પાક ઇન્વેન્ટરીનું વિશ્લેષણ કરો', prompt: 'મારી સક્રિય પાક ઇન્વેન્ટરીનું વિશ્લેષણ કરો: બધા ઉત્પાદનો, સ્ટોક, એકમ દીઠ ભાવ, લણણીની તારીખો અને બાકી તાજગી તપાસો.', icon: Package },
          { key: 'inv_freshness', label: 'તાજગી અને શેલ્ફ-લાઇફ જોખમ તપાસો', prompt: 'ઇન્વેન્ટરીમાં રહેલા મારા તમામ પાકની તાજગી અને બગાડનું જોખમ તપાસો અને જરૂરી પગલાં સૂચવો.', icon: Sparkles },
          { key: 'create_listing', label: 'નવી પાક યાદી બનાવો (ચેટ ફોર્મ)', isForm: true, formType: 'create_listing', icon: Plus },
          { key: 'update_listing', label: 'હાલની યાદીનો ભાવ અથવા સ્ટોક અપડેટ કરો', icon: RefreshCw, isDisambiguated: true, type: 'select_listing_update' },
          { key: 'delete_listing', label: 'ઇન્વેન્ટરીમાંથી પાક યાદી કાઢી નાખો', icon: Trash2, isDisambiguated: true, type: 'select_listing_delete' },
          { key: 'open_dashboard_inventory', label: 'ડેશબોર્ડમાં પાક ઇન્વેન્ટરી ખોલો →', dashboardHash: '#inventory', icon: Eye },
        ]
      },
      orders: {
        areaName: 'રિટેલ ઓર્ડર',
        icon: ShoppingBag,
        titleTemplate: (areaName) => <>તમે <strong className="text-emerald-800 font-extrabold">{areaName}</strong> સાથે શું કરવા માંગો છો?</>,
        backText: '← પાછા બધી શ્રેણીઓ પર',
        options: [
          { key: 'view_orders', label: 'સક્રિય અને બાકી રિટેલ ઓર્ડરનું વિશ્લેષણ કરો', prompt: 'મારા બધા રિટેલ ઓર્ડર બતાવો અને ગ્રાહક વિગતો, ઓર્ડર કરેલ પાક, સ્થિતિ અને કુલ રકમનું વિશ્લેષણ કરો.', icon: ShoppingBag },
          { key: 'shipment_status', label: 'લાઇવ શિપમેન્ટ અને ડ્રાઇવર સ્થિતિ ટ્રૅક કરો', icon: Truck, isDisambiguated: true, type: 'select_shipment_tracking' },
          { key: 'order_details', label: 'ઓર્ડર વિગતો અને સ્થિતિ જુઓ', icon: Eye, isDisambiguated: true, type: 'select_order_item' },
          { key: 'mark_packed', label: 'પેકિંગ અને ડિસ્પેચ માર્ગદર્શિકા', prompt: 'મારા રિટેલ ઓર્ડર માટે પેકેજિંગ ધોરણો અને લોજિસ્ટિક્સ હેન્ડઓવર પગલાં શું છે?', icon: Check },
          { key: 'open_dashboard_orders', label: 'ડેશબોર્ડમાં રિટેલ ઓર્ડર ખોલો →', dashboardHash: '#orders', icon: Eye },
        ]
      },
      quotes: {
        areaName: 'જથ્થાબંધ બિડ્સ',
        icon: Handshake,
        titleTemplate: (areaName) => <>તમે <strong className="text-emerald-800 font-extrabold">{areaName}</strong> સાથે શું કરવા માંગો છો?</>,
        backText: '← પાછા બધી શ્રેણીઓ પર',
        options: [
          { key: 'quotes_analyze', label: 'આવતી જથ્થાબંધ બિડ્સ અને ક્વોટ્સ જુઓ', prompt: 'ખરીદદારો તરફથી આવેલી તમામ જથ્થાબંધ બિડ્સ અને ક્વોટ વિનંતીઓ બતાવો.', icon: Handshake },
          { key: 'quotes_compare', label: 'બિડ્સના ભાવની મંડી દર સાથે સરખામણી કરો', prompt: 'મને મળેલી જથ્થાબંધ બિડ્સના ભાવોની વર્તમાન મંડી દરો સાથે સરખામણી કરો અને નફો તપાસો.', icon: TrendingUp },
          { key: 'quotes_advice', label: 'વાટાઘાટો અને કાઉન્ટર-ઓફર ભલામણ', prompt: 'મને જથ્થાબંધ બિડ્સ સ્વીકારવા કે કાઉન્ટર-ઓફર કરવા અંગે ભલામણ આપો.', icon: Sparkles },
          { key: 'open_dashboard_quotes', label: 'ડેશબોર્ડમાં જથ્થાબંધ બિડ્સ ખોલો →', dashboardHash: '#quotes', icon: Eye },
        ]
      },
      sourcing: {
        areaName: 'બલ્ક માંગ',
        icon: FileCheck,
        titleTemplate: (areaName) => <>તમે <strong className="text-emerald-800 font-extrabold">{areaName}</strong> સાથે શું કરવા માંગો છો?</>,
        backText: '← પાછા બધી શ્રેણીઓ પર',
        options: [
          { key: 'find_contracts', label: 'મારા પાક સાથે મેળ ખાતી બલ્ક માંગ શોધો', prompt: 'મારા ઉપલબ્ધ પાક સાથે મેળ ખાતી બલ્ક ખરીદદારની જરૂરિયાતો શોધો અને તેનું વિશ્લેષણ કરો.', icon: FileCheck },
          { key: 'submit_offer', label: 'બલ્ક ખરીદદારને ઓફર સબમિટ કરો', icon: Send, isDisambiguated: true, type: 'select_bulk_requirement' },
          { key: 'view_offers', label: 'મારી સબમિટ કરેલી બલ્ક ઓફરો જુઓ', prompt: 'બલ્ક જરૂરિયાતો માટે મારી બધી સબમિટ કરેલી ઓફરો અને તેમની સ્થિતિ બતાવો.', icon: MessageSquare },
          { key: 'open_dashboard_sourcing', label: 'ડેશબોર્ડમાં બલ્ક માંગ ખોલો →', dashboardHash: '#sourcing', icon: Eye },
        ]
      },
      contracts: {
        areaName: 'કોન્ટ્રાક્ટ',
        icon: Calendar,
        titleTemplate: (areaName) => <>તમે <strong className="text-emerald-800 font-extrabold">{areaName}</strong> સાથે શું કરવા માંગો છો?</>,
        backText: '← પાછા બધી શ્રેણીઓ પર',
        options: [
          { key: 'contracts_active', label: 'સક્રિય પ્રી-હાર્વેસ્ટ કોન્ટ્રાક્ટ્સ તપાસો', prompt: 'મારા સક્રિય પ્રી-હાર્વેસ્ટ કોન્ટ્રાક્ટ્સ, સંમત લઘુત્તમ ભાવો અને ડિલિવરી તારીખો બતાવો.', icon: Calendar },
          { key: 'contracts_guidance', label: 'પ્રી-હાર્વેસ્ટ કોન્ટ્રાક્ટ માટે સલાહ', prompt: 'મારા આગામી પાક માટે પ્રી-હાર્વેસ્ટ કોન્ટ્રાક્ટ કેવી રીતે સુરક્ષિત કરવા અને કયા ભાવ રાખવા તે સમજાવો.', icon: Sparkles },
          { key: 'contracts_terms', label: 'ચુકવણી શરતો અને ગેરંટી ચકાસો', prompt: 'મારા ખેતી કરારો માટે ચુકવણીની સુરક્ષા અને એસ્ક્રો ગેરંટી તપાસો.', icon: ShieldCheck },
          { key: 'open_dashboard_contracts', label: 'ડેશબોર્ડમાં કોન્ટ્રાક્ટ ખોલો →', dashboardHash: '#contracts', icon: Eye },
        ]
      },
      markets: {
        areaName: 'બજાર ભાવ',
        icon: MapPin,
        titleTemplate: (areaName) => <>તમે <strong className="text-emerald-800 font-extrabold">{areaName}</strong> સાથે શું કરવા માંગો છો?</>,
        backText: '← પાછા બધી શ્રેણીઓ પર',
        options: [
          { key: 'market_check', label: `${locationName} નજીકના આજના મંડી ભાવ જુઓ`, prompt: `${locationName} નજીક શાકભાજી અને અનાજના આજના મંડી ભાવ શું છે?`, icon: MapPin },
          { key: 'market_rec', label: 'સ્માર્ટ વેચાણ કિંમત ભલામણ મેળવો', icon: Sparkles, isDisambiguated: true, type: 'crop_recommendation' },
          { key: 'market_compare', label: `${locationName} નજીકની મંડીઓમાં ભાવ સરખાવો`, prompt: `${locationName} નજીકની વિવિધ મંડીઓમાં પાકના ભાવ સરખાવો.`, icon: Globe },
          { key: 'market_trends', label: 'ભાવનું વલણ અને માંગ આગાહી જુઓ', prompt: `${locationName} નજીક મારા પાક માટે ભાવનું વલણ અને માંગ આગાહી દર્શાવો.`, icon: TrendingUp },
          { key: 'open_dashboard_markets', label: 'ડેશબોર્ડમાં બજાર ભાવ ખોલો →', dashboardHash: '#markets', icon: Eye },
        ]
      },
      language: {
        areaName: 'ભાષા સહાય',
        icon: Globe,
        titleTemplate: (areaName) => <>તમે કઈ ભાષા પસંદ કરવા માંગો છો?</>,
        backText: '← પાછા બધી શ્રેણીઓ પર',
        options: [
          { label: 'ઇંગ્લિશમાં વાતચીત કરો', prompt: 'Please converse with me in English', icon: Globe },
          { label: 'હિન્દીમાં વાતચીત કરો', prompt: 'કૃપા કરીને મારી સાથે હિન્દીમાં વાત કરો (Hindi)', icon: Globe },
          { label: 'ગુજરાતીમાં વાતચીત કરો', prompt: 'કૃપા કરીને મારી સાથે ગુજરાતીમાં વાત કરો (Gujarati)', icon: Globe },
        ]
      }
    };
    menus.listings = menus.inventory;
    menus.market = menus.markets;
    return menus;
  }

  if (lang === 'hindi') {
    const menus = {
      inventory: {
        areaName: 'फसल इन्वेंटरी',
        icon: Package,
        titleTemplate: (areaName) => <>आप <strong className="text-emerald-800 font-extrabold">{areaName}</strong> के साथ क्या करना चाहते हैं?</>,
        backText: '← वापस सभी विषयों पर',
        options: [
          { key: 'inv_analyze', label: 'मेरी सक्रिय फसल इन्वेंटरी का विश्लेषण करें', prompt: 'मेरी सक्रिय फसल इन्वेंटरी का विश्लेषण करें: सभी सक्रिय फसलें, स्टॉक मात्रा, प्रति यूनिट मूल्य, कटाई तिथि और शेष ताज़गी जांचें।', icon: Package },
          { key: 'inv_freshness', label: 'ताज़गी और शेल्फ-लाइफ जोखिम जांचें', prompt: 'इन्वेंटरी में मेरी फसलों की ताज़गी प्रतिशत और खराब होने के जोखिम का विश्लेषण करें, और उचित सुझाव दें।', icon: Sparkles },
          { key: 'create_listing', label: 'नई फसल सूची बनाएं (चैट फॉर्म)', isForm: true, formType: 'create_listing', icon: Plus },
          { key: 'update_listing', label: 'मौजूदा सूची का मूल्य या स्टॉक अपडेट करें', icon: RefreshCw, isDisambiguated: true, type: 'select_listing_update' },
          { key: 'delete_listing', label: 'इन्वेंटरी से फसल सूची हटाएं', icon: Trash2, isDisambiguated: true, type: 'select_listing_delete' },
          { key: 'open_dashboard_inventory', label: 'डैशबोर्ड में फसल इन्वेंटरी खोलें →', dashboardHash: '#inventory', icon: Eye },
        ]
      },
      orders: {
        areaName: 'खुदरा ऑर्डर',
        icon: ShoppingBag,
        titleTemplate: (areaName) => <>आप <strong className="text-emerald-800 font-extrabold">{areaName}</strong> के साथ क्या करना चाहते हैं?</>,
        backText: '← वापस सभी विषयों पर',
        options: [
          { key: 'view_orders', label: 'सक्रिय और लंबित खुदरा ऑर्डर का विश्लेषण करें', prompt: 'मेरे सभी खुदरा ऑर्डर दिखाएं और खरीदार विवरण, ऑर्डर की गई फसलें, स्थिति और कुल राशि का विश्लेषण करें।', icon: ShoppingBag },
          { key: 'shipment_status', label: 'लाइव शिपमेंट और ड्राइवर स्थिति ट्रैक करें', icon: Truck, isDisambiguated: true, type: 'select_shipment_tracking' },
          { key: 'order_details', label: 'ऑर्डर का विस्तृत विवरण देखें', icon: Eye, isDisambiguated: true, type: 'select_order_item' },
          { key: 'mark_packed', label: 'पैकिंग और डिस्पैच दिशानिर्देश', prompt: 'मेरे खुदरा ऑर्डर के लिए पैकेजिंग मानक और डिलीवरी हैंडओवर प्रक्रिया क्या है?', icon: Check },
          { key: 'open_dashboard_orders', label: 'डैशबोर्ड में खुदरा ऑर्डर खोलें →', dashboardHash: '#orders', icon: Eye },
        ]
      },
      quotes: {
        areaName: 'थोक बोलियां',
        icon: Handshake,
        titleTemplate: (areaName) => <>आप <strong className="text-emerald-800 font-extrabold">{areaName}</strong> के साथ क्या करना चाहते हैं?</>,
        backText: '← वापस सभी विषयों पर',
        options: [
          { key: 'quotes_analyze', label: 'आने वाली थोक बोलियां और कोट्स देखें', prompt: 'खरीदारों से प्राप्त सभी थोक बोलियां और कोटेशन अनुरोध दिखाएं।', icon: Handshake },
          { key: 'quotes_compare', label: 'थोक बोलियों की मंडी दरों से तुलना करें', prompt: 'मेरी थोक बोलियों में पेश की गई कीमतों की मौजूदा मंडी दरों से तुलना करें और लाभ का विश्लेषण करें।', icon: TrendingUp },
          { key: 'quotes_advice', label: 'सौदा और काउंटर-ऑफर सुझाव', prompt: 'थोक बोलियों को स्वीकार करने या काउंटर-ऑफर भेजने पर सुझाव दें।', icon: Sparkles },
          { key: 'open_dashboard_quotes', label: 'डैशबोर्ड में थोक बोलियां खोलें →', dashboardHash: '#quotes', icon: Eye },
        ]
      },
      sourcing: {
        areaName: 'बल्क मांग',
        icon: FileCheck,
        titleTemplate: (areaName) => <>आप <strong className="text-emerald-800 font-extrabold">{areaName}</strong> के साथ क्या करना चाहते हैं?</>,
        backText: '← वापस सभी विषयों पर',
        options: [
          { key: 'find_contracts', label: 'मेरी फसलों से मेल खाती बल्क मांग खोजें', prompt: 'मेरी उपलब्ध फसलों से मेल खाने वाली कॉर्पोरेट और थोक खरीदार मांगें खोजें।', icon: FileCheck },
          { key: 'submit_offer', label: 'बल्क खरीदार को ऑफर भेजें', icon: Send, isDisambiguated: true, type: 'select_bulk_requirement' },
          { key: 'view_offers', label: 'मेरे द्वारा भेजे गए ऑफर और स्थिति देखें', prompt: 'थोक आवश्यकताओं के लिए मेरे द्वारा भेजे गए सभी ऑफर और उनकी स्थिति दिखाएं।', icon: MessageSquare },
          { key: 'open_dashboard_sourcing', label: 'डैशबोर्ड में बल्क मांग खोलें →', dashboardHash: '#sourcing', icon: Eye },
        ]
      },
      contracts: {
        areaName: 'अनुबंध',
        icon: Calendar,
        titleTemplate: (areaName) => <>आप <strong className="text-emerald-800 font-extrabold">{areaName}</strong> के साथ क्या करना चाहते हैं?</>,
        backText: '← वापस सभी विषयों पर',
        options: [
          { key: 'contracts_active', label: 'सक्रिय प्री-हार्वेस्ट अनुबंधों का विश्लेषण करें', prompt: 'मेरे सक्रिय प्री-हार्वेस्ट अनुबंध, अनुबंधित फसलें, तय न्यूनतम मूल्य और डिलीवरी तिथियां दिखाएं।', icon: Calendar },
          { key: 'contracts_guidance', label: 'प्री-हार्वेस्ट अनुबंध के अवसर और मार्गदर्शन', prompt: 'आगामी फसलों के लिए प्री-हार्वेस्ट अनुबंध कैसे सुरक्षित करें और क्या दरें तय करनी चाहिए, समझाएं।', icon: Sparkles },
          { key: 'contracts_terms', label: 'भुगतान शर्तें और गारंटी जांचें', prompt: 'मेरे कृषि अनुबंधों के लिए भुगतान सुरक्षा और एस्क्रो गारंटी की समीक्षा करें।', icon: ShieldCheck },
          { key: 'open_dashboard_contracts', label: 'डैशबोर्ड में अनुबंध खोलें →', dashboardHash: '#contracts', icon: Eye },
        ]
      },
      markets: {
        areaName: 'मंडी भाव',
        icon: MapPin,
        titleTemplate: (areaName) => <>आप <strong className="text-emerald-800 font-extrabold">{areaName}</strong> के साथ क्या करना चाहते हैं?</>,
        backText: '← वापस सभी विषयों पर',
        options: [
          { key: 'market_check', label: `${locationName} के पास आज के मंडी भाव देखें`, prompt: `${locationName} के पास सब्जियों और अनाजों के आज के मंडी भाव क्या हैं?`, icon: MapPin },
          { key: 'market_rec', label: 'स्मार्ट बिक्री मूल्य अनुशंसा प्राप्त करें', icon: Sparkles, isDisambiguated: true, type: 'crop_recommendation' },
          { key: 'market_compare', label: `${locationName} के पास मंडियों के भाव की तुलना करें`, prompt: `${locationName} के पास विभिन्न मंडियों में फसलों के भाव की तुलना करें।`, icon: Globe },
          { key: 'market_trends', label: 'मूल्य रुझान और मांग पूर्वानुमान देखें', prompt: `${locationName} के पास मेरी फसलों के हालिया मूल्य रुझान और मांग पूर्वानुमान का विश्लेषण करें।`, icon: TrendingUp },
          { key: 'open_dashboard_markets', label: 'डैशबोर्ड में मंडी भाव खोलें →', dashboardHash: '#markets', icon: Eye },
        ]
      },
      language: {
        areaName: 'भाषा सहायता',
        icon: Globe,
        titleTemplate: (areaName) => <>आप कौन सी भाषा चुनना चाहते हैं?</>,
        backText: '← वापस सभी विषयों पर',
        options: [
          { label: 'अंग्रेजी में बात करें', prompt: 'Please converse with me in English', icon: Globe },
          { label: 'हिंदी में बात करें', prompt: 'कृपया मुझसे हिंदी में बात करें (Hindi)', icon: Globe },
          { label: 'गुजराती में बात करें', prompt: 'કૃપા કરીને મારી સાથે ગુજરાતીમાં વાત કરો (Gujarati)', icon: Globe },
        ]
      }
    };
    menus.listings = menus.inventory;
    menus.market = menus.markets;
    return menus;
  }

  const menus = {
    inventory: {
      areaName: 'Crop Inventory',
      icon: Package,
      titleTemplate: (areaName) => <>What would you like to do with <strong className="text-emerald-800 font-extrabold">{areaName}</strong>?</>,
      backText: '← back to all sections',
      options: [
        { key: 'inv_analyze', label: 'Analyze my active crop inventory', prompt: 'Show and analyze my active crop inventory: review all active crops, quantities in stock, current price per unit, harvest dates, and remaining freshness.', icon: Package },
        { key: 'inv_freshness', label: 'Check freshness & shelf-life risk', prompt: 'Analyze the freshness percentages, shelf life, and spoilage risk of all my crops in inventory, and suggest actions for low freshness items.', icon: Sparkles },
        { key: 'create_listing', label: 'Create new produce listing (in-chat form)', isForm: true, formType: 'create_listing', icon: Plus },
        { key: 'update_listing', label: 'Update listing price or stock', icon: RefreshCw, isDisambiguated: true, type: 'select_listing_update' },
        { key: 'delete_listing', label: 'Delete a listing from inventory', icon: Trash2, isDisambiguated: true, type: 'select_listing_delete' },
        { key: 'open_dashboard_inventory', label: 'Open Crop Inventory in Dashboard →', dashboardHash: '#inventory', icon: Eye },
      ]
    },
    orders: {
      areaName: 'Retail Orders',
      icon: ShoppingBag,
      titleTemplate: (areaName) => <>What would you like to do with <strong className="text-emerald-800 font-extrabold">{areaName}</strong>?</>,
      backText: '← back to all sections',
      options: [
        { key: 'view_orders', label: 'Analyze active & pending retail orders', prompt: 'Show all my retail orders and analyze incoming, confirmed, and packed orders with buyer details, quantities, and payment amounts.', icon: ShoppingBag },
        { key: 'shipment_status', label: 'Track live shipment & driver status', icon: Truck, isDisambiguated: true, type: 'select_shipment_tracking' },
        { key: 'order_details', label: 'View specific order details & OTP', icon: Eye, isDisambiguated: true, type: 'select_order_item' },
        { key: 'mark_packed', label: 'Packaging & logistics dispatch guide', prompt: 'What are the packaging standards, dispatch procedure, and delivery OTP steps for my retail orders?', icon: Check },
        { key: 'open_dashboard_orders', label: 'Open Retail Orders in Dashboard →', dashboardHash: '#orders', icon: Eye },
      ]
    },
    quotes: {
      areaName: 'Wholesale Bids',
      icon: Handshake,
      titleTemplate: (areaName) => <>What would you like to do with <strong className="text-emerald-800 font-extrabold">{areaName}</strong>?</>,
      backText: '← back to all sections',
      options: [
        { key: 'quotes_analyze', label: 'Analyze incoming wholesale bids & quotes', prompt: 'Show all incoming wholesale bids and quote requests from buyers, including offered prices and requested quantities.', icon: Handshake },
        { key: 'quotes_compare', label: 'Compare wholesale bids with mandi rates', prompt: 'Compare the prices offered in my wholesale bids against current benchmark mandi rates in the region and analyze profit margins.', icon: TrendingUp },
        { key: 'quotes_advice', label: 'Accept / Counter-offer recommendations', prompt: 'Give me recommendations on whether to accept, decline, or submit counter-offers on my wholesale bids based on current market trends.', icon: Sparkles },
        { key: 'open_dashboard_quotes', label: 'Open Wholesale Bids in Dashboard →', dashboardHash: '#quotes', icon: Eye },
      ]
    },
    sourcing: {
      areaName: 'Bulk Demands',
      icon: FileCheck,
      titleTemplate: (areaName) => <>What would you like to do with <strong className="text-emerald-800 font-extrabold">{areaName}</strong>?</>,
      backText: '← back to all sections',
      options: [
        { key: 'find_contracts', label: 'Find bulk demands matching my crops', prompt: 'Search and analyze corporate and institutional bulk buyer demands that match the crops I have available.', icon: FileCheck },
        { key: 'submit_offer', label: 'Submit an offer to a bulk buyer', icon: Send, isDisambiguated: true, type: 'select_bulk_requirement' },
        { key: 'view_offers', label: 'View status of my submitted bulk offers', prompt: 'Show all my submitted offers for bulk requirements, along with buyer response status and delivery terms.', icon: MessageSquare },
        { key: 'open_dashboard_sourcing', label: 'Open Bulk Demands in Dashboard →', dashboardHash: '#sourcing', icon: Eye },
      ]
    },
    contracts: {
      areaName: 'Contracts',
      icon: Calendar,
      titleTemplate: (areaName) => <>What would you like to do with <strong className="text-emerald-800 font-extrabold">{areaName}</strong>?</>,
      backText: '← back to all sections',
      options: [
        { key: 'contracts_active', label: 'Analyze active pre-harvest contracts', prompt: 'Show and analyze my active pre-harvest farming contracts: contracted crops, quantities, minimum guaranteed prices, and delivery deadlines.', icon: Calendar },
        { key: 'contracts_guidance', label: 'Pre-harvest contract guidance & pricing', prompt: 'Explain how I can secure pre-harvest contracts for my upcoming crops and what target prices and terms I should negotiate.', icon: Sparkles },
        { key: 'contracts_terms', label: 'Review payment terms & buyer guarantees', prompt: 'Check the payment security, advance percentages, and escrow guarantees available for my agricultural contracts.', icon: ShieldCheck },
        { key: 'open_dashboard_contracts', label: 'Open Contracts in Dashboard →', dashboardHash: '#contracts', icon: Eye },
      ]
    },
    markets: {
      areaName: 'Market Prices',
      icon: MapPin,
      titleTemplate: (areaName) => <>What would you like to do with <strong className="text-emerald-800 font-extrabold">{areaName}</strong>?</>,
      backText: '← back to all sections',
      options: [
        { key: 'market_check', label: `Check today's rates near ${locationName}`, prompt: `What are the current mandi market prices for vegetables and grains near ${locationName}?`, icon: MapPin },
        { key: 'market_rec', label: 'Get smart AI selling price recommendation', icon: Sparkles, isDisambiguated: true, type: 'crop_recommendation' },
        { key: 'market_compare', label: `Compare rates across mandis near ${locationName}`, prompt: `Compare market prices for my crops across mandis near ${locationName} to identify the most profitable market.`, icon: Globe },
        { key: 'market_trends', label: 'Price trend & demand forecast', prompt: `Analyze recent market price trends and demand forecast for vegetables and grains near ${locationName}.`, icon: TrendingUp },
        { key: 'open_dashboard_markets', label: 'Open Market Prices in Dashboard →', dashboardHash: '#markets', icon: Eye },
      ]
    },
    language: {
      areaName: 'Language Support',
      icon: Globe,
      titleTemplate: (areaName) => <>Which language would you like to use?</>,
      backText: '← back to all sections',
      options: [
        { label: 'Communicate in English', prompt: 'Please converse with me in English', icon: Globe },
        { label: 'Communicate in Hindi', prompt: 'Can we communicate in Hindi?', icon: Globe },
        { label: 'Communicate in Gujarati', prompt: 'Can we communicate in Gujarati?', icon: Globe },
      ]
    }
  };
  menus.listings = menus.inventory;
  menus.market = menus.markets;
  return menus;
};

// Reusable Sub-Feature Selection Menu Component
const SubFeatureMenu = ({ areaKey, locationName, onSelectOption, onBack, selectedLanguage = 'english' }) => {
  const subMenuMap = getSubMenusMapping(locationName, selectedLanguage);
  const menuConfig = subMenuMap[areaKey] || subMenuMap.inventory || subMenuMap.markets;
  const AreaIcon = menuConfig?.icon || Package;
  const [selectedIdx, setSelectedIdx] = useState(null);

  const handleOptionClick = (option, idx) => {
    setSelectedIdx(idx);
    setTimeout(() => {
      onSelectOption(option);
    }, 180);
  };

  return (
    <div className="sub-menu-bubble animate-fadeInUp">
      <div className="sub-menu-header">
        <div className="sub-menu-title-row">
          <AreaIcon className="h-4.5 w-4.5 text-emerald-600 shrink-0 stroke-[2]" />
          <span>
            {menuConfig.titleTemplate ? menuConfig.titleTemplate(menuConfig.areaName) : (
              <>What would you like to do with <strong className="text-emerald-800 font-extrabold">{menuConfig.areaName}</strong>?</>
            )}
          </span>
        </div>
      </div>

      <div className="sub-menu-options-list">
        {menuConfig.options.map((opt, i) => {
          const OptIcon = opt.icon;
          const isSelected = selectedIdx === i;
          return (
            <button
              key={i}
              type="button"
              className={`sub-menu-option-row ${isSelected ? 'selected' : ''}`}
              onClick={() => handleOptionClick(opt, i)}
            >
              <div className="opt-left">
                <OptIcon className="h-4 w-4 opt-icon stroke-[2]" />
                <span className="opt-label">{opt.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 opt-arrow shrink-0 stroke-[2]" />
            </button>
          );
        })}
      </div>

      {onBack && (
        <div className="sub-menu-footer">
          <button type="button" className="btn-back-link" onClick={onBack}>
            {menuConfig.backText || '← back to all topics'}
          </button>
        </div>
      )}
    </div>
  );
};

// Reusable Disambiguation Prompt Menu Component (Universal Disambiguation Rule)
const DisambiguationMenu = ({ title, options, showSearch, showShowAll, onSelectOption, onShowAll, onBack, selectedLanguage = 'english' }) => {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const lang = selectedLanguage ? String(selectedLanguage).toLowerCase() : 'english';
  const showAllText = lang === 'gujarati' ? 'બધા બતાવો' : lang === 'hindi' ? 'सभी दिखाएं' : 'Show all of them';
  const backText = lang === 'gujarati' ? '← પાછા' : lang === 'hindi' ? '← वापस' : '← back';
  const searchPlaceholder = lang === 'gujarati' ? 'આઇટમ્સ શોધો...' : lang === 'hindi' ? 'खोजें...' : 'Search items...';

  const filteredOptions = searchQuery
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchQuery.toLowerCase()) || (opt.sublabel && opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase())))
    : options;

  const handleOptionClick = (option, idx) => {
    setSelectedIdx(idx);
    setTimeout(() => {
      onSelectOption(option);
    }, 180);
  };

  return (
    <div className="sub-menu-bubble animate-fadeInUp">
      <div className="sub-menu-header">
        <div className="sub-menu-title-row">
          <Sparkles className="h-4.5 w-4.5 text-emerald-600 shrink-0 stroke-[2]" />
          <span className="text-slate-800 font-semibold">{title}</span>
        </div>
      </div>

      {showSearch && options.length > 5 && (
        <div className="disambiguation-search-bar">
          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      <div className="sub-menu-options-list">
        {filteredOptions.map((opt, i) => {
          const OptIcon = opt.icon || Tag;
          const isSelected = selectedIdx === i;
          return (
            <button
              key={i}
              type="button"
              className={`sub-menu-option-row ${isSelected ? 'selected' : ''}`}
              onClick={() => handleOptionClick(opt, i)}
            >
              <div className="opt-left">
                <OptIcon className="h-4 w-4 opt-icon shrink-0 stroke-[2]" />
                <div className="flex flex-col text-left">
                  <span className="opt-label">{opt.label}</span>
                  {opt.sublabel && <span className="text-[11px] text-slate-500 font-medium">{opt.sublabel}</span>}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 opt-arrow shrink-0 stroke-[2]" />
            </button>
          );
        })}

        {showShowAll && (
          <button
            type="button"
            className="sub-menu-option-row show-all-row"
            onClick={onShowAll}
          >
            <div className="opt-left">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 stroke-[2]" />
              <span className="opt-label font-bold text-emerald-700">{showAllText}</span>
            </div>
            <ChevronRight className="h-4 w-4 opt-arrow shrink-0 stroke-[2]" />
          </button>
        )}
      </div>

      {onBack && (
        <div className="sub-menu-footer">
          <button type="button" className="btn-back-link" onClick={onBack}>
            {backText}
          </button>
        </div>
      )}
    </div>
  );
};

// Reusable Structured Form Component (Create / Update / Delete)
const StructuredActionForm = ({ action, initialData, onSubmit, onCancel, isSubmitting, error }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    category: initialData?.category || 'vegetables',
    price_per_unit: initialData?.price_per_unit ?? 20,
    quantity: initialData?.quantity ?? 100,
    unit: initialData?.unit || 'kg',
    description: initialData?.description || '',
  });

  const categories = [
    { key: 'vegetables', label: 'Vegetables' },
    { key: 'fruits', label: 'Fruits' },
    { key: 'grains', label: 'Grains' },
    { key: 'pulses', label: 'Pulses' },
  ];

  const units = ['kg', 'quintal', 'ton'];

  const handleStepPrice = (delta) => {
    setFormData((prev) => ({
      ...prev,
      price_per_unit: Math.max(1, (Number(prev.price_per_unit) || 0) + delta),
    }));
  };

  const handleStepQuantity = (delta) => {
    setFormData((prev) => ({
      ...prev,
      quantity: Math.max(1, (Number(prev.quantity) || 0) + delta),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isDelete = action === 'delete';
  const isUpdate = action === 'update';

  return (
    <div className="structured-form-card animate-fadeInUp">
      <div className="form-card-header">
        <div className="form-title-group">
          {isDelete ? (
            <Trash2 className="h-4.5 w-4.5 text-emerald-700 shrink-0 stroke-[2]" />
          ) : isUpdate ? (
            <Pencil className="h-4.5 w-4.5 text-emerald-600 shrink-0 stroke-[2]" />
          ) : (
            <Plus className="h-4.5 w-4.5 text-emerald-600 shrink-0 stroke-[2]" />
          )}
          <span className="form-title">
            {isDelete
              ? `Delete Listing: ${initialData?.name || 'Item'}`
              : isUpdate
              ? `Update ${initialData?.name || 'Listing'}`
              : 'Create New Produce Listing'}
          </span>
        </div>
      </div>

      {error && (
        <div className="form-error-banner animate-fadeInUp">
          <AlertCircle className="h-4 w-4 text-emerald-800 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isDelete ? (
        <div className="delete-summary-box">
          <p className="delete-warning-text">
            Are you sure you want to permanently remove this listing? Buyers will no longer be able to discover or order this crop.
          </p>
          <div className="delete-item-preview">
            <div className="delete-item-icon-col">
              <Trash2 className="h-5 w-5 text-red-500 stroke-[2]" />
            </div>
            <div className="delete-item-info">
              <span className="delete-item-name">{initialData?.name || 'Produce Item'}</span>
              <div className="delete-item-badges">
                <span className="delete-item-badge">📦 {initialData?.quantity} {initialData?.unit || 'kg'}</span>
                <span className="delete-item-badge">🏷️ ₹{initialData?.price_per_unit}/{initialData?.unit || 'kg'}</span>
              </div>
            </div>
          </div>

          <div className="form-actions-row">
            <button
              type="button"
              className="btn-form-cancel"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-form-delete"
              disabled={isSubmitting}
              onClick={() => onSubmit({ id: initialData?.id })}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 stroke-[2]" />
                  <span>Delete Listing</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="structured-form-body">
          {/* Crop Title */}
          {!isUpdate && (
            <div className="form-field-group">
              <label className="form-field-label">Crop / Product Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Fresh Tomatoes, Red Onions"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          )}

          {/* Category Pills */}
          {!isUpdate && (
            <div className="form-field-group">
              <label className="form-field-label">Category</label>
              <div className="pill-group">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    className={`form-pill-btn ${formData.category === cat.key ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, category: cat.key })}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stepper Inputs Row (Price & Quantity) */}
          <div className="form-row-duo">
            {/* Price Stepper */}
            <div className="form-field-group">
              <label className="form-field-label">Price per {formData.unit}</label>
              <div className="stepper-wrapper">
                <button
                  type="button"
                  className="btn-stepper"
                  onClick={() => handleStepPrice(-1)}
                  title="Decrease price"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="stepper-input-box">
                  <span className="stepper-prefix">₹</span>
                  <input
                    type="number"
                    min="1"
                    className="stepper-input"
                    value={formData.price_per_unit}
                    onChange={(e) => setFormData({ ...formData, price_per_unit: Number(e.target.value) })}
                    required
                  />
                </div>
                <button
                  type="button"
                  className="btn-stepper"
                  onClick={() => handleStepPrice(1)}
                  title="Increase price"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Quantity Stepper */}
            <div className="form-field-group">
              <label className="form-field-label">Available Quantity</label>
              <div className="stepper-wrapper">
                <button
                  type="button"
                  className="btn-stepper"
                  onClick={() => handleStepQuantity(-10)}
                  title="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="stepper-input-box">
                  <input
                    type="number"
                    min="1"
                    className="stepper-input"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    required
                  />
                  <span className="stepper-suffix">{formData.unit}</span>
                </div>
                <button
                  type="button"
                  className="btn-stepper"
                  onClick={() => handleStepQuantity(10)}
                  title="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="form-field-group">
            <label className="form-field-label">Notes / Description (Optional)</label>
            <input
              type="text"
              className="form-input"
              maxLength={120}
              placeholder="e.g. Fresh harvest from polyhouse, Grade A quality"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Form Actions */}
          <div className="form-actions-row">
            <button
              type="button"
              className="btn-form-cancel"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-form-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isUpdate ? (
                'Save Changes'
              ) : (
                'Create Listing'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// Capabilities Card Component
const CapabilitiesCard = ({ onSelectArea, selectedLanguage = 'english' }) => {
  const lang = selectedLanguage ? String(selectedLanguage).toLowerCase() : 'english';

  const titleText = lang === 'gujarati' ? 'કિસાનકનેક્ટ AI સહાયક' : lang === 'hindi' ? 'किसानकनेक्ट AI सहायक' : 'KisanConnect AI Assistant';
  const introText = lang === 'gujarati'
    ? 'હું કિસાનકનેક્ટ પર તમારા ફાર્મ વ્યવસાયના દરેક ભાગનું સંચાલન કરવામાં મદદ કરી શકું છું:'
    : lang === 'hindi'
    ? 'मैं किसानकनेक्ट पर आपके फार्म व्यवसाय के हर हिस्से को प्रबंधित करने में मदद कर सकता हूं:'
    : 'I can help you manage every part of your farm business on KisanConnect:';

  const thArea = lang === 'gujarati' ? 'શ્રેણી' : lang === 'hindi' ? 'क्षेत्र' : 'Area';
  const thDesc = lang === 'gujarati' ? 'હું તમારા માટે શું કરી શકું છું' : lang === 'hindi' ? 'मैं आपके लिए क्या कर सकता हूं' : 'What I can do for you';
  const closingText = lang === 'gujarati'
    ? 'ચોક્કસ ક્રિયા પસંદ કરવા માટે ઉપરની કોઈપણ શ્રેણી પર ક્લિક કરો, અથવા મને જણાવો કે તમે કયું કાર્ય શરૂ કરવા માંગો છો...'
    : lang === 'hindi'
    ? 'विशिष्ट कार्य चुनने के लिए ऊपर दिए गए किसी भी क्षेत्र पर क्लिक करें, या मुझे बताएं कि आप किस कार्य से शुरू करना चाहते हैं...'
    : "Just click any area above to choose a specific action, or tell me which task you'd like to start with...";

  const getTranslatedCap = (item) => {
    if (lang === 'gujarati') {
      const gMap = {
        market: { area: 'બજાર ભાવ', desc: 'રીઅલ-ટાઇમ મંડી ભાવ, વલણો અને સ્માર્ટ વેચાણ ભલામણો જુઓ' },
        listings: { area: 'યાદીઓ', desc: 'રિટેલ અને હોલસેલ ખરીદદારો માટે તમારી પાક યાદીઓ બનાવો અને મેનેજ કરો' },
        contracts: { area: 'બલ્ક કોન્ટ્રાક્ટ', desc: 'મોટા ખરીદદારોની જરૂરિયાતો જુઓ અને કોન્ટ્રાક્ટ વાટાઘાટો કરો' },
        orders: { area: 'ઓર્ડર', desc: 'આવતા ઓર્ડર ટ્રૅક કરો, સ્થિતિ અપડેટ કરો અને ટ્રાન્સપોર્ટ કન્ફર્મ કરો' },
        logistics: { area: 'લોજિસ્ટિક્સ', desc: 'શિપમેન્ટ પ્રગતિ અને ડ્રાઇવર અસાઇનમેન્ટ્સનું નિરીક્ષણ કરો' },
        stats: { area: 'ફાર્મ આંકડા', desc: 'કમાણી વિશ્લેષણ, ટ્રસ્ટ સ્કોર અને ગુણવત્તા આંકડા જુઓ' },
        buyer: { area: 'ખરીદનાર માહિતી', desc: 'સંભવિત ગ્રાહકો અને ફૂડ પ્રોસેસર્સ શોધો' },
      };
      return gMap[item.key] || { area: item.area, desc: item.desc };
    }
    if (lang === 'hindi') {
      const hMap = {
        market: { area: 'मंडी भाव', desc: 'रियल-टाइम मंडी भाव, रुझान और स्मार्ट बिक्री सिफारिशें देखें' },
        listings: { area: 'सूचियां', desc: 'खुदरा और थोक खरीदारों के लिए अपनी फसल सूचियां बनाएं और प्रबंधित करें' },
        contracts: { area: 'बल्क अनुबंध', desc: 'थोक खरीदारों की आवश्यकताएं देखें और अनुबंध बातचीत करें' },
        orders: { area: 'ऑर्डर', desc: 'आने वाले ऑर्डर ट्रैक करें, स्थिति अपडेट करें और ट्रांसपोर्ट कन्फर्म करें' },
        logistics: { area: 'लॉजिस्टिक्स', desc: 'शिपमेंट प्रगति और ड्राइवर असाइनमेंट की निगरानी करें' },
        stats: { area: 'फार्म आंकड़े', desc: 'कमाई विश्लेषण, ट्रस्ट स्कोर और गुणवत्ता आंकड़े देखें' },
        buyer: { area: 'खरीदार जानकारी', desc: 'संभावित ग्राहकों और खाद्य प्रोसेसरों को खोजें' },
      };
      return hMap[item.key] || { area: item.area, desc: item.desc };
    }
    return { area: item.area, desc: item.desc };
  };

  return (
    <div className="capabilities-card animate-cardEntrance">
      <div className="capabilities-header">
        <div className="capabilities-badge">
          <Bot className="h-4 w-4 text-emerald-600" />
          <span>{titleText}</span>
        </div>
        <p className="capabilities-intro">{introText}</p>
      </div>

      <div className="capabilities-table-wrapper">
        <table className="capabilities-table">
          <thead>
            <tr>
              <th className="th-area">{thArea}</th>
              <th className="th-desc">{thDesc}</th>
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES_DATA.map((item, idx) => {
              const IconComp = item.icon;
              const cap = getTranslatedCap(item);
              return (
                <tr
                  key={item.key}
                  className="capabilities-row animate-rowFade"
                  style={{ animationDelay: `${idx * 35}ms` }}
                  onClick={() => onSelectArea(item.key)}
                  title={`Click to open options for ${cap.area}`}
                >
                  <td className="td-area">
                    <div className="area-cell">
                      <IconComp className="h-4.5 w-4.5 text-emerald-600 shrink-0 stroke-[2]" />
                      <span>{cap.area}</span>
                    </div>
                  </td>
                  <td className="td-desc">{cap.desc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="capabilities-closing">{closingText}</p>
    </div>
  );
};

// Interactive Language Selection Component
const LanguageSelectionMenu = ({ onSelectLanguage }) => {
  const languages = [
    {
      key: 'english',
      name: 'English',
      native: 'English',
      flag: '🇬🇧',
      prompt: 'Please converse with me in English',
      sub: 'Standard English for all insights & data',
    },
    {
      key: 'hindi',
      name: 'Hindi',
      native: 'हिंदी',
      flag: '🇮🇳',
      prompt: 'कृपया मुझसे हिंदी में बात करें (Hindi)',
      sub: 'देवनागरी हिंदी में मंडी भाव और जानकारी',
    },
    {
      key: 'gujarati',
      name: 'Gujarati',
      native: 'ગુજરાતી',
      flag: '🇮🇳',
      prompt: 'કૃપા કરીને મારી સાથે ગુજરાતીમાં વાત કરો (Gujarati)',
      sub: 'ગુજરાતીમાં બજાર ભાવ અને ખેતી સહાય',
    },
  ];

  return (
    <div className="language-menu-card animate-fadeInUp">
      <div className="language-card-header">
        <div className="language-badge">
          <Globe className="h-4 w-4 text-emerald-600 stroke-[2]" />
          <span>Language Preference / भाषा चुनें / ભાષા પસંદ કરો</span>
        </div>
        <p className="language-card-subtitle">
          Select your preferred language to begin this conversation:
        </p>
      </div>

      <div className="language-options-grid">
        {languages.map((lang) => (
          <button
            key={lang.key}
            type="button"
            className="language-option-btn"
            onClick={() => onSelectLanguage(lang)}
          >
            <span className="lang-flag">{lang.flag}</span>
            <div className="lang-info">
              <span className="lang-native">{lang.native}</span>
              <span className="lang-sub">{lang.sub}</span>
            </div>
            <ChevronRight className="h-4 w-4 lang-arrow text-emerald-500 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

// Quick Actions Bar Connected to Farmer Dashboard Navigation
const QUICK_ACTIONS_TRANSLATIONS = {
  english: {
    title: 'QUICK ACTIONS:',
    inventory: 'Crop Inventory',
    orders: 'Retail Orders',
    quotes: 'Wholesale Bids',
    sourcing: 'Bulk Demands',
    contracts: 'Contracts',
    markets: 'Market Prices',
  },
  gujarati: {
    title: 'ઝડપી ક્રિયાઓ:',
    inventory: 'પાક ઇન્વેન્ટરી',
    orders: 'રિટેલ ઓર્ડર',
    quotes: 'જથ્થાબંધ બિડ્સ',
    sourcing: 'બલ્ક માંગ',
    contracts: 'કોન્ટ્રાક્ટ',
    markets: 'બજાર ભાવ',
  },
  hindi: {
    title: 'त्वरित कार्य:',
    inventory: 'फसल इन्वेंटरी',
    orders: 'खुदरा ऑर्डर',
    quotes: 'थोक बोलियां',
    sourcing: 'बल्क मांग',
    contracts: 'अनुबंध',
    markets: 'मंडी भाव',
  },
};

const QuickActionChips = ({ activeArea, onSelectArea, disabled, selectedLanguage = 'english' }) => {
  const langKey = selectedLanguage ? String(selectedLanguage).toLowerCase() : 'english';
  const t = QUICK_ACTIONS_TRANSLATIONS[langKey] || QUICK_ACTIONS_TRANSLATIONS.english;

  const chips = [
    { key: 'inventory', label: t.inventory, icon: Package },
    { key: 'orders', label: t.orders, icon: ShoppingBag },
    { key: 'quotes', label: t.quotes, icon: Handshake },
    { key: 'sourcing', label: t.sourcing, icon: FileCheck },
    { key: 'contracts', label: t.contracts, icon: Calendar },
    { key: 'markets', label: t.markets, icon: MapPin },
  ];

  return (
    <div className="quick-actions-row">
      <span className="quick-actions-label">{t.title}</span>
      <div className="chips-container">
        {chips.map((chip) => {
          const ChipIcon = chip.icon;
          const isActive = activeArea === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              className={`action-chip ${isActive ? 'active-chip' : ''}`}
              disabled={disabled}
              onClick={() => onSelectArea(chip.key)}
            >
              <ChipIcon className={`h-3.5 w-3.5 shrink-0 stroke-[2] ${isActive ? 'text-emerald-800' : 'text-emerald-600'}`} />
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const FarmerAIAssistant = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [assistantThinking, setAssistantThinking] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('english');

  // === Flow Stack Navigation ===
  // Each entry: { type: 'subMenu' | 'disambiguation' | 'form', data: {...} }
  // Back pops one entry. The currently visible overlay is flowStack[flowStack.length - 1].
  const [flowStack, setFlowStack] = useState([]);

  // Derived state from flowStack top for rendering convenience
  const currentFlow = flowStack.length > 0 ? flowStack[flowStack.length - 1] : null;
  const activeSubMenuArea = currentFlow?.type === 'subMenu' ? currentFlow.data.areaKey : null;
  const disambiguationState = currentFlow?.type === 'disambiguation' ? currentFlow.data : null;
  const activeForm = currentFlow?.type === 'form' ? currentFlow.data : null;

  // Flow stack helpers
  const flowPush = (entry) => setFlowStack((prev) => [...prev, entry]);
  const flowPop = () => setFlowStack((prev) => prev.slice(0, -1));
  const flowClear = () => setFlowStack([]);
  const flowReplace = (entry) => setFlowStack((prev) => [...prev.slice(0, -1), entry]);

  // Structured Form State (Create / Update / Delete)
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Live Queried Farmer Data (for 100% database-grounded actions)
  const [liveListings, setLiveListings] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]);

  // Sidebar Menu & Rename States
  const [activeMenuConvId, setActiveMenuConvId] = useState(null);
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [renameErrorConvId, setRenameErrorConvId] = useState(null);
  const [pinErrorConvId, setPinErrorConvId] = useState(null);

  // Modern UI states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [convToDelete, setConvToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);
  const renameInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  // Personalized Location
  const farmerLocation = user?.district || user?.city || 'Pune';

  // Time-aware personalized greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const farmerName = user?.first_name || user?.username || 'Farmer';
  const greetingText = getGreeting();

  // Cleanup speech synthesis & audio on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, assistantThinking, flowStack]);

  // Load conversations & live data on mount
  useEffect(() => {
    loadConversations();
    fetchLiveListings();
    fetchLiveOrders();
  }, []);

  // Load conversation messages when selected
  useEffect(() => {
    if (selectedConvId) {
      loadConversationMessages(selectedConvId);
    }
  }, [selectedConvId]);

  // Close context menu on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuConvId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveMenuConvId(null);
        if (editingConvId) {
          setEditingConvId(null);
          setEditingTitle('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingConvId]);

  // Focus rename input when editing begins
  useEffect(() => {
    if (editingConvId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingConvId]);

  // Query Live Database for Farmer Listings (Query-Before-Response)
  const fetchLiveListings = async () => {
    try {
      const farmerQuery = user?.id ? `?farmer=${encodeURIComponent(user.id)}` : '';
      const response = await api.get(`/products/${farmerQuery}`);
      const data = response.data.results || response.data || [];
      const farmerListings = user?.id
        ? data.filter((listing) => String(listing.farmer) === String(user.id))
        : data;
      const activeListings = farmerListings.filter((item) => {
        const isZeroFreshness = !item.stored_in_cold_storage && Number(item.freshness_percentage ?? 100) === 0;
        return !isZeroFreshness;
      });
      setLiveListings(activeListings);
      return activeListings;
    } catch (err) {
      console.error('Error querying live listings:', err);
      return [];
    }
  };

  // Query Live Database for Farmer Orders (Shipment Disambiguation)
  const fetchLiveOrders = async () => {
    try {
      const response = await api.get('/orders/');
      const data = response.data.results || response.data || [];
      setLiveOrders(data);
      return data;
    } catch (err) {
      console.error('Error querying live orders:', err);
      return [];
    }
  };

  const fetchBulkRequirements = async () => {
    try {
      const response = await api.get('/orders/bulk-requirements/');
      return response.data.results || response.data || [];
    } catch (err) {
      console.error('Error querying bulk requirements:', err);
      return [];
    }
  };

  const loadConversations = async () => {
    try {
      const response = await api.get('/chat/conversations/');
      setConversations(response.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadConversationMessages = async (convId) => {
    try {
      const response = await api.get(`/chat/conversations/${convId}/`);
      setActiveConversation(response.data);
      setMessages(response.data.messages || []);
      if (response.data?.state?.language) {
        setSelectedLanguage(response.data.state.language.toLowerCase());
      }
      flowClear();
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const createConversation = async () => {
    try {
      const response = await api.post('/chat/conversations/', {});
      const newConvId = response.data.id;
      setSelectedConvId(newConvId);
      setActiveConversation({
        id: newConvId,
        title: 'New Conversation',
        message_count: 0,
        is_pinned: false,
      });
      setMessages([]);
      setSelectedLanguage('english');
      await loadConversations();
      return newConvId;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  // Inline Rename Conversation Handler (Optimistic Update)
  const handleStartRename = (conv) => {
    setActiveMenuConvId(null);
    setEditingConvId(conv.id);
    setEditingTitle(conv.title || 'New Conversation');
    setRenameErrorConvId(null);
  };

  const handleCancelRename = () => {
    setEditingConvId(null);
    setEditingTitle('');
  };

  const handleConfirmRename = async (convId) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      handleCancelRename();
      return;
    }

    const previousConversations = [...conversations];
    const prevConv = conversations.find((c) => c.id === convId);
    const prevTitle = prevConv?.title || 'New Conversation';

    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, title: trimmed } : c))
    );
    if (activeConversation && activeConversation.id === convId) {
      setActiveConversation((prev) => ({ ...prev, title: trimmed }));
    }
    setEditingConvId(null);
    setRenameErrorConvId(null);

    try {
      await api.patch(`/chat/conversations/${convId}/`, { title: trimmed });
    } catch (err) {
      console.error('Failed to rename conversation:', err);
      setConversations(previousConversations);
      if (activeConversation && activeConversation.id === convId) {
        setActiveConversation((prev) => ({ ...prev, title: prevTitle }));
      }
      setRenameErrorConvId(convId);
      setTimeout(() => setRenameErrorConvId(null), 4000);
    }
  };

  // Pin / Unpin Conversation Handler (Optimistic Update)
  const handleTogglePin = async (conv) => {
    setActiveMenuConvId(null);
    const newPinnedState = !conv.is_pinned;
    const previousConversations = [...conversations];

    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === conv.id
          ? {
              ...c,
              is_pinned: newPinnedState,
              pinned_at: newPinnedState ? new Date().toISOString() : null,
            }
          : c
      );
      return updated.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
        if (a.is_pinned && b.is_pinned) {
          return new Date(b.pinned_at || 0) - new Date(a.pinned_at || 0);
        }
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      });
    });

    if (activeConversation && activeConversation.id === conv.id) {
      setActiveConversation((prev) => ({ ...prev, is_pinned: newPinnedState }));
    }
    setPinErrorConvId(null);

    try {
      await api.patch(`/chat/conversations/${conv.id}/`, { is_pinned: newPinnedState });
    } catch (err) {
      console.error('Failed to toggle pin:', err);
      setConversations(previousConversations);
      setPinErrorConvId(conv.id);
      setTimeout(() => setPinErrorConvId(null), 4000);
    }
  };

  const sendChatMessage = async (conversationId, userText) => {
    const tempUserMsgId = `temp-${Date.now()}`;
    const tempUserMsg = {
      id: tempUserMsgId,
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
      status: 'sent',
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    flowClear();
    setAssistantThinking(true);

    try {
      const response = await api.post('/chat/', {
        conversation_id: conversationId,
        message: userText,
      });

      const nextConversationId = response.data.conversation_id || conversationId;
      if (selectedConvId !== nextConversationId) {
        setSelectedConvId(nextConversationId);
      }
      await loadConversations();
      await loadConversationMessages(nextConversationId);
      await fetchLiveListings();
      await fetchLiveOrders();
      return nextConversationId;
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempUserMsgId ? { ...msg, status: 'error' } : msg
        )
      );
      return conversationId;
    } finally {
      setAssistantThinking(false);
    }
  };

  // Voice Input (Speech-to-Text via Web Speech API)
  const toggleVoiceRecognition = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Please try using Google Chrome or Microsoft Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      const langMap = {
        english: 'en-IN',
        hindi: 'hi-IN',
        gujarati: 'gu-IN',
      };
      recognition.lang = langMap[selectedLanguage] || 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.onerror = (err) => {
        console.warn('Speech recognition notification:', err);
        setIsRecording(false);
      };
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setIsRecording(false);
    }
  };

  // Copy Message to Clipboard
  const handleCopyMessage = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Text-to-Speech Read Aloud (Web Speech API)
  const handleReadAloud = (id, text) => {
    if (!window.speechSynthesis) return;
    if (speakingMessageId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const plainText = text.replace(/[*#_`~[\]]/g, '');
    const utterance = new SpeechSynthesisUtterance(plainText);
    const langMap = {
      english: 'en-IN',
      hindi: 'hi-IN',
      gujarati: 'gu-IN',
    };
    utterance.lang = langMap[selectedLanguage] || 'en-IN';
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Quick Starter Suggestions per language
  const QUICK_SUGGESTIONS = {
    english: [
      { label: "🌾 Today's Mandi Rates", prompt: `What are the current mandi market prices for vegetables and grains near ${farmerLocation}?` },
      { label: "📦 My Active Produce", prompt: "Show and analyze my active crop inventory in " + farmerLocation },
      { label: "🤝 Wholesale Bids", prompt: "Show all incoming wholesale bids and compare them with mandi rates" },
      { label: "🚚 Active Shipments", prompt: "Track live shipment and driver status for my orders" },
    ],
    hindi: [
      { label: "🌾 आज के मंडी भाव", prompt: `${farmerLocation} के पास आज के ताज़ा मंडी भाव क्या हैं?` },
      { label: "📦 मेरी फसल इन्वेंटरी", prompt: "मेरी सक्रिय फसल इन्वेंटरी और स्टॉक की स्थिति दिखाएं" },
      { label: "🤝 थोक बोलियां", prompt: "खरीदारों से प्राप्त थोक बोलियां और कोट्स दिखाएं" },
      { label: "🚚 लाइव शिपमेंट", prompt: "मेरे सक्रिय ऑर्डर की डिलीवरी और ड्राइवर स्थिति ट्रैक करें" },
    ],
    gujarati: [
      { label: "🌾 આજના બજાર ભાવ", prompt: `${farmerLocation} નજીક આજના બજાર ભાવ શું છે?` },
      { label: "📦 મારી પાક યાદી", prompt: "મારી સક્રિય પાક ઇન્વેન્ટરી અને સ્ટોક બતાવો" },
      { label: "🤝 જથ્થાબંધ બિડ્સ", prompt: "મને મળેલી તમામ જથ્થાબંધ બિડ્સ બતાવો" },
      { label: "🚚 લાઇવ શિપમેન્ટ", prompt: "મારા ઓર્ડરની ડિલિવરી સ્થિતિ ટ્રૅક કરો" },
    ],
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || assistantThinking) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    const targetConversationId = selectedConvId || (await createConversation());
    await sendChatMessage(targetConversationId, userMessage);
  };

  const handleSelectLanguage = async (lang) => {
    if (assistantThinking) return;
    if (lang?.key) {
      setSelectedLanguage(lang.key.toLowerCase());
    }
    const targetConversationId = selectedConvId || (await createConversation());
    flowClear();
    if (targetConversationId) {
      await sendChatMessage(targetConversationId, lang.prompt);
    }
  };

  // Trigger sub-menu branch when an area is clicked
  const handleAreaClick = async (areaKey) => {
    if (assistantThinking) return;
    let targetId = selectedConvId;
    if (!targetId) {
      targetId = await createConversation();
    }
    if (areaKey === 'language') {
      flowPush({ type: 'language' });
      return;
    }
    // Clear the stack and push a fresh sub-menu
    setFlowStack([{ type: 'subMenu', data: { areaKey } }]);
  };

  // Handle option selection from SubFeatureMenu (Supports Live DB & Disambiguation Rules)
  const handleSubMenuOptionSelect = async (option) => {
    if (assistantThinking) return;

    // Direct Dashboard section link
    if (option.dashboardHash) {
      navigate(`/farmer-dashboard${option.dashboardHash}`);
      return;
    }

    const targetConversationId = selectedConvId || (await createConversation());

    // 1. Structured Form Triggers
    if (option.isForm && option.formType === 'create_listing') {
      flowPush({
        type: 'form',
        data: {
          action: 'create',
          initialData: { price_per_unit: 20, quantity: 500, unit: 'kg', category: 'vegetables' },
        },
      });
      return;
    }

    // 2. Disambiguation Triggers Grounded in Live Database Records
    if (option.isDisambiguated) {
      // Query fresh database listings before presenting menu
      const freshListings = await fetchLiveListings();
      const lang = selectedLanguage ? String(selectedLanguage).toLowerCase() : 'english';

      if (option.type === 'crop_recommendation') {
        const cropOptions = freshListings.length > 0
          ? freshListings.map((l) => {
              const localizedCrop = translateCropName(l.name, lang);
              return {
                label: localizedCrop,
                sublabel: lang === 'gujarati' ? `${farmerLocation}માં ${l.quantity} ${l.unit} ઉપલબ્ધ` : lang === 'hindi' ? `${farmerLocation} में ${l.quantity} ${l.unit} उपलब्ध` : `${l.quantity} ${l.unit} available in ${farmerLocation}`,
                prompt: lang === 'gujarati' ? `${farmerLocation}માં ${localizedCrop} માટે બજાર ડેટાના આધારે વેચાણ કિંમત ભલામણ આપો` : lang === 'hindi' ? `${farmerLocation} में ${localizedCrop} के लिए मंडी डेटा के आधार पर बिक्री मूल्य अनुशंसा दें` : `Give me a price recommendation for ${l.name} in ${farmerLocation} based on market data`,
                icon: Tag,
              };
            })
          : [
              { label: lang === 'gujarati' ? 'તાજા ટામેટાં' : lang === 'hindi' ? 'ताजे टमाटर' : 'Fresh Tomatoes', sublabel: lang === 'gujarati' ? `${farmerLocation}માં 500 kg ઉપલબ્ધ` : lang === 'hindi' ? `${farmerLocation} में 500 kg उपलब्ध` : `500 kg available in ${farmerLocation}`, prompt: lang === 'gujarati' ? `${farmerLocation}માં ટામેટાં માટે બજાર ડેટાના આધારે વેચાણ કિંમત ભલામણ આપો` : lang === 'hindi' ? `${farmerLocation} में टमाटर के लिए मंडी डेटा के आधार पर बिक्री मूल्य अनुशंसा दें` : `Give me a price recommendation for Tomato in ${farmerLocation} based on market data`, icon: Tag },
              { label: lang === 'gujarati' ? 'લાલ ડુંગળી' : lang === 'hindi' ? 'लाल प्याज' : 'Red Onions', sublabel: lang === 'gujarati' ? `${farmerLocation}માં 300 kg ઉપલબ્ધ` : lang === 'hindi' ? `${farmerLocation} में 300 kg उपलब्ध` : `300 kg available in ${farmerLocation}`, prompt: lang === 'gujarati' ? `${farmerLocation}માં ડુંગળી માટે બજાર ડેટાના આધારે વેચાણ કિંમત ભલામણ આપો` : lang === 'hindi' ? `${farmerLocation} में प्याज के लिए मंडी डेटा के आधार पर बिक्री मूल्य अनुशंसा दें` : `Give me a price recommendation for Onion in ${farmerLocation} based on market data`, icon: Tag },
            ];

        flowPush({
          type: 'disambiguation',
          data: {
            title: lang === 'gujarati' ? `તમારી પાસે ${freshListings.length || 2} પાક છે — તમે કોના માટે વેચાણ કિંમત ભલામણ ઇચ્છો છો?` : lang === 'hindi' ? `आपके पास ${freshListings.length || 2} फसलें हैं — आप किसके लिए बिक्री मूल्य अनुशंसा चाहते हैं?` : `You have ${freshListings.length || 2} crops — which one would you like a price recommendation for?`,
            options: cropOptions,
            showShowAll: true,
            showAllPrompt: lang === 'gujarati' ? `${farmerLocation}માં મારા બધા પાક માટે વેચાણ કિંમત ભલામણ આપો` : lang === 'hindi' ? `${farmerLocation} में मेरी सभी फसलों के लिए बिक्री मूल्य अनुशंसा दें` : `Give me price recommendations for all my crops in ${farmerLocation}`,
          },
        });
        return;
      }

      if (option.type === 'select_listing_update') {
        const updateOptions = freshListings.length > 0
          ? freshListings.map((l) => ({
              label: `${translateCropName(l.name, lang)} (#${l.id})`,
              sublabel: `${l.quantity} ${l.unit} @ ₹${l.price_per_unit}/${l.unit}`,
              isFormTrigger: true,
              listingData: l,
              icon: Tag,
            }))
          : [
              { label: 'Fresh Tomatoes (#1)', sublabel: '500 kg @ ₹20/kg', isFormTrigger: true, listingData: { id: 1, name: 'Fresh Tomatoes', price_per_unit: 20, quantity: 500, unit: 'kg' }, icon: Tag },
              { label: 'Red Onions (#2)', sublabel: '300 kg @ ₹18/kg', isFormTrigger: true, listingData: { id: 2, name: 'Red Onions', price_per_unit: 18, quantity: 300, unit: 'kg' }, icon: Tag },
            ];

        flowPush({
          type: 'disambiguation',
          data: {
            title: lang === 'gujarati' ? 'તમે તમારી કઈ સક્રિય યાદી અપડેટ કરવા માંગો છો?' : lang === 'hindi' ? 'आप अपनी कौन सी सक्रिय सूची अपडेट करना चाहते हैं?' : 'Which of your active listings would you like to update?',
            options: updateOptions,
          },
        });
        return;
      }

      if (option.type === 'select_listing_delete') {
        const deleteOptions = freshListings.length > 0
          ? freshListings.map((l) => ({
              label: `${translateCropName(l.name, lang)} (#${l.id})`,
              sublabel: `${l.quantity} ${l.unit} @ ₹${l.price_per_unit}/${l.unit}`,
              isDeleteFormTrigger: true,
              listingData: l,
              icon: Trash2,
            }))
          : [
              { label: 'Fresh Tomatoes (#1)', sublabel: '500 kg @ ₹20/kg', isDeleteFormTrigger: true, listingData: { id: 1, name: 'Fresh Tomatoes', price_per_unit: 20, quantity: 500, unit: 'kg' }, icon: Trash2 },
            ];

        flowPush({
          type: 'disambiguation',
          data: {
            title: lang === 'gujarati' ? 'તમે કઈ યાદી કાઢી નાખવા માંગો છો?' : lang === 'hindi' ? 'आप कौन सी सूची हटाना चाहते हैं?' : 'Which listing would you like to delete?',
            options: deleteOptions,
          },
        });
        return;
      }

      if (option.type === 'select_order_item') {
        // Query live orders from DB
        const freshOrders = await fetchLiveOrders();
        const activeOrders = freshOrders.filter((o) =>
          ['placed', 'confirmed', 'packed', 'in_transit'].includes(o.status)
        );

        if (activeOrders.length === 0) {
          await sendChatMessage(targetConversationId, lang === 'gujarati' ? 'મારા બધા ઓર્ડર બતાવો' : lang === 'hindi' ? 'मेरे सभी ऑर्डर दिखाएं' : 'Show all my orders');
          return;
        }

        if (activeOrders.length === 1) {
          await sendChatMessage(targetConversationId, lang === 'gujarati' ? `ઓર્ડર #${activeOrders[0].id} માટે વિગતો મેળવો` : lang === 'hindi' ? `ऑर्डर #${activeOrders[0].id} के विवरण प्राप्त करें` : `Get details for order #${activeOrders[0].id}`);
          return;
        }

        const orderOptions = activeOrders.map((o) => ({
          label: lang === 'gujarati' ? `ઓર્ડર #${o.id}` : lang === 'hindi' ? `ऑर्डर #${o.id}` : `Order #${o.id}`,
          sublabel: `${o.buyer?.username || o.buyer || 'Buyer'} • ${o.status.replace('_', ' ')} • ₹${o.total_amount}`,
          prompt: lang === 'gujarati' ? `ઓર્ડર #${o.id} માટે વિગતો મેળવો` : lang === 'hindi' ? `ऑर्डर #${o.id} के विवरण प्राप्त करें` : `Get details for order #${o.id}`,
          icon: Package,
        }));

        flowPush({
          type: 'disambiguation',
          data: {
            title: lang === 'gujarati' ? `તમારી પાસે ${activeOrders.length} સક્રિય ઓર્ડર છે — તમે કોની વિગતો ઇચ્છો છો?` : lang === 'hindi' ? `आपके पास ${activeOrders.length} सक्रिय ऑर्डर हैं — आप किसका विवरण चाहते हैं?` : `You have ${activeOrders.length} active orders — which one would you like details for?`,
            options: orderOptions,
            showShowAll: true,
            showAllPrompt: lang === 'gujarati' ? 'મારા બધા સક્રિય ઓર્ડર અને શિપમેન્ટ બતાવો' : lang === 'hindi' ? 'मेरे सभी सक्रिय ऑर्डर और शिपमेंट दिखाएं' : 'Show all my active orders and shipments',
          },
        });
        return;
      }

      // === SHIPMENT & DRIVER STATUS DISAMBIGUATION ===
      if (option.type === 'select_shipment_tracking') {
        // Query live orders from DB for trackable shipments
        const freshOrders = await fetchLiveOrders();
        const trackable = freshOrders.filter((o) =>
          ['packed', 'in_transit'].includes(o.status)
        );

        if (trackable.length === 0) {
          // No active shipments — show clear empty state message
          await sendChatMessage(
            targetConversationId,
            lang === 'gujarati' ? 'તપાસો કે મારી પાસે કોઈ શિપમેન્ટ હાલમાં ચાલુ છે કે નહીં.' : lang === 'hindi' ? 'जांचें कि क्या मेरी कोई शिपमेंट वर्तमान में चल रही है।' : 'Check if I have any shipments currently in progress (packed or in transit). If none, let me know clearly.'
          );
          return;
        }

        if (trackable.length === 1) {
          // Single shipment — auto-show tracking directly
          await sendChatMessage(
            targetConversationId,
            lang === 'gujarati' ? `ઓર્ડર #${trackable[0].id} માટે વિગતવાર શિપમેન્ટ અને ડ્રાઇવર સ્થિતિ બતાવો` : lang === 'hindi' ? `ऑर्डर #${trackable[0].id} के लिए विस्तृत शिपमेंट और ड्राइवर स्थिति दिखाएं` : `Show detailed shipment and driver status for order #${trackable[0].id}`
          );
          return;
        }

        // Multiple trackable shipments — disambiguate
        const shipmentOptions = trackable.map((o) => {
          const driverInfo =
            o.shipment?.partner_details?.name ||
            (typeof o.shipment?.partner === 'object' ? o.shipment?.partner?.name : null) ||
            o.driver_name;
          const sublabel = [
            o.buyer?.username || o.buyer || 'Buyer',
            o.status.replace('_', ' '),
            `₹${o.total_amount}`,
            driverInfo ? `Driver: ${driverInfo}` : 'No driver yet',
          ].join(' • ');
          return {
            label: lang === 'gujarati' ? `ઓર્ડર #${o.id}` : lang === 'hindi' ? `ऑर्डर #${o.id}` : `Order #${o.id}`,
            sublabel,
            prompt: lang === 'gujarati' ? `ઓર્ડર #${o.id} માટે વિગતવાર શિપમેન્ટ અને ડ્રાઇવર સ્થિતિ બતાવો` : lang === 'hindi' ? `ऑर्डर #${o.id} के लिए विस्तृत शिपमेंट और ड्राइवर स्थिति दिखाएं` : `Show detailed shipment and driver status for order #${o.id}`,
            icon: Truck,
          };
        });

        flowPush({
          type: 'disambiguation',
          data: {
            title: lang === 'gujarati' ? `તમારી પાસે પ્રગતિમાં ${trackable.length} શિપમેન્ટ છે — કઈ?` : lang === 'hindi' ? `आपकी ${trackable.length} शिपमेंट प्रगति पर हैं — कौन सी?` : `You have ${trackable.length} shipments in progress — which one?`,
            options: shipmentOptions,
            showShowAll: true,
            showAllPrompt: lang === 'gujarati' ? 'મારી બધી સક્રિય શિપમેન્ટ અને ડ્રાઇવર સ્થિતિ બતાવો' : lang === 'hindi' ? 'मेरी सभी सक्रिय शिपमेंट और ड्राइवर स्थितियां दिखाएं' : 'Show all my active shipments and driver statuses',
          },
        });
        return;
      }

      if (option.type === 'select_bulk_requirement') {
        const reqs = await fetchBulkRequirements();
        
        if (reqs.length === 0) {
          await sendChatMessage(targetConversationId, lang === 'gujarati' ? 'બલ્ક ખરીદદારની જરૂરિયાતો બતાવો' : lang === 'hindi' ? 'थोक खरीदार आवश्यकताएं दिखाएं' : 'Show bulk buyer requirements');
          return;
        }

        const reqOptions = reqs.map((r) => ({
          label: lang === 'gujarati' 
            ? `જરૂરિયાત #${r.id}: ${r.crop_name} (${r.quantity} ${r.unit})` 
            : lang === 'hindi' 
              ? `आवश्यकता #${r.id}: ${r.crop_name} (${r.quantity} ${r.unit})` 
              : `Requirement #${r.id}: ${r.crop_name} (${r.quantity} ${r.unit})`,
          sublabel: r.buyer?.username || r.buyer_name || 'Buyer',
          prompt: lang === 'gujarati' 
            ? `બલ્ક જરૂરિયાત #${r.id} માટે ઓફર સબમિટ કરવા માટે મારી મદદ કરો` 
            : lang === 'hindi' 
              ? `थोक आवश्यकता #${r.id} के लिए ऑफर भेजने में मेरी मदद करें` 
              : `Help me submit an offer for Bulk Requirement #${r.id}`,
          icon: Handshake,
        }));

        flowPush({
          type: 'disambiguation',
          data: {
            title: lang === 'gujarati' ? 'તમે કઈ બલ્ક ખરીદદારની જરૂરિયાતનો જવાબ આપવા માંગો છો?' : lang === 'hindi' ? 'आप किस थोक खरीदार आवश्यकता का उत्तर देना चाहते हैं?' : 'Which bulk buyer requirement would you like to respond to?',
            options: reqOptions,
          },
        });
        return;
      }

      if (option.type === 'select_buyer_crop') {
        flowPush({
          type: 'disambiguation',
          data: {
            title: lang === 'gujarati' ? 'તમે કયા પાક માટે સંભવિત ખરીદદારો શોધી રહ્યા છો?' : lang === 'hindi' ? 'आप किस फसल के लिए संभावित खरीदार खोज रहे हैं?' : 'Which crop are you looking for potential buyers for?',
            options: [
              { label: lang === 'gujarati' ? 'ટામેટા ખરીદદારો' : lang === 'hindi' ? 'टमाटर खरीदार' : 'Tomato Buyers', sublabel: 'Retail & Wholesale', prompt: lang === 'gujarati' ? 'ટામેટાં માટે સંભવિત રીટેલ અને હોલસેલ ખરીદદારો શોધો' : lang === 'hindi' ? 'टमाटर के लिए संभावित खुदरा और थोक खरीदार खोजें' : 'Find potential retail and wholesale buyers for Tomatoes', icon: Users },
              { label: lang === 'gujarati' ? 'ડુંગળી ખરીદદારો' : lang === 'hindi' ? 'प्याज खरीदार' : 'Onion Buyers', sublabel: 'Regional Wholesalers', prompt: lang === 'gujarati' ? 'ડુંગળી માટે સંભવિત રીટેલ અને હોલસેલ ખરીદદારો શોધો' : lang === 'hindi' ? 'प्याज के लिए संभावित खुदरा और थोक खरीदार खोजें' : 'Find potential retail and wholesale buyers for Onions', icon: Users },
            ],
            showShowAll: true,
            showAllPrompt: lang === 'gujarati' ? 'મારા પાક માટેના બધા સંભવિત ખરીદદારો શોધો' : lang === 'hindi' ? 'मेरी उपज के लिए सभी संभावित खरीदार खोजें' : 'Find all potential buyers for my produce',
          },
        });
        return;
      }
    }

    // Direct Form Triggers from Disambiguation Selection
    if (option.isFormTrigger) {
      flowPush({
        type: 'form',
        data: {
          action: 'update',
          initialData: option.listingData,
        },
      });
      return;
    }

    if (option.isDeleteFormTrigger) {
      flowPush({
        type: 'form',
        data: {
          action: 'delete',
          initialData: option.listingData,
        },
      });
      return;
    }

    const promptText = typeof option === 'string' ? option : option.prompt;
    if (promptText) {
      await sendChatMessage(targetConversationId, promptText);
    }
  };

  // Structured Form Submission Handler (Calls Live Backend API)
  const handleFormSubmit = async (data) => {
    if (!activeForm) return;
    setIsFormSubmitting(true);
    setFormError(null);

    const targetConversationId = selectedConvId || (await createConversation());

    try {
      if (activeForm.action === 'create') {
        // Compute default harvest and expiry dates
        const harvestDate = new Date().toISOString().split('T')[0];
        const expiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const payload = {
          name: data.name,
          category: data.category,
          price_per_unit: Number(data.price_per_unit),
          quantity: Number(data.quantity),
          unit: data.unit,
          harvest_date: harvestDate,
          expiry_date: expiryDate,
          description: data.description || 'Fresh harvest produce',
        };

        const res = await api.post('/products/', payload);

        flowClear();
        await fetchLiveListings();

        // Feed confirmation into chat thread
        const confirmationText = `I have created a new listing for **${data.name}**! Available quantity: **${data.quantity} ${data.unit}** at **₹${data.price_per_unit}/${data.unit}**.`;
        await sendChatMessage(targetConversationId, confirmationText);
      } else if (activeForm.action === 'update') {
        const prodId = activeForm.initialData.id;
        const payload = {
          price_per_unit: Number(data.price_per_unit),
          quantity: Number(data.quantity),
          description: data.description,
        };

        await api.patch(`/products/${prodId}/`, payload);

        flowClear();
        await fetchLiveListings();

        // Feed confirmation into chat thread
        const confirmationText = `Updated listing **${activeForm.initialData.name} (#${prodId})** successfully! New price: **₹${data.price_per_unit}/${activeForm.initialData.unit}**, Quantity: **${data.quantity} ${activeForm.initialData.unit}**.`;
        await sendChatMessage(targetConversationId, confirmationText);
      } else if (activeForm.action === 'delete') {
        const prodId = activeForm.initialData.id;
        await api.delete(`/products/${prodId}/`);

        flowClear();
        await fetchLiveListings();

        const confirmationText = `Listing **${activeForm.initialData.name} (#${prodId})** has been removed successfully.`;
        await sendChatMessage(targetConversationId, confirmationText);
      }
    } catch (err) {
      console.error('Form submission failed:', err);
      setFormError(err.response?.data?.message || err.response?.data?.error || 'Failed to save changes. Please review fields and try again.');
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleNewConversation = async () => {
    await createConversation();
  };

  const handleDeleteConversation = (convId) => {
    setActiveMenuConvId(null);
    setConvToDelete(convId);
    setShowDeleteModal(true);
  };

  const confirmDeleteConversation = async () => {
    if (!convToDelete) return;
    setIsDeleting(true);

    try {
      await api.delete(`/chat/conversations/${convToDelete}/`);
      if (selectedConvId === convToDelete) {
        setSelectedConvId(null);
        setMessages([]);
        setActiveConversation(null);
        flowClear();
      }
      setShowDeleteModal(false);
      setConvToDelete(null);
      loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Unable to delete this conversation. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setConvToDelete(null);
  };

  // Filtered conversations by search query
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    return (c.title || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Group pinned and unpinned conversations
  const pinnedConversations = filteredConversations.filter((c) => c.is_pinned);
  const unpinnedConversations = filteredConversations.filter((c) => !c.is_pinned);

  // Render individual conversation row with rename, pin, and menu
  const renderConversationItem = (conv) => {
    const isEditing = editingConvId === conv.id;
    const isMenuOpen = activeMenuConvId === conv.id;
    const hasRenameError = renameErrorConvId === conv.id;
    const hasPinError = pinErrorConvId === conv.id;
    const lang = selectedLanguage ? String(selectedLanguage).toLowerCase() : 'english';

    const getTitle = (t) => {
      if (!t || t === 'New Conversation' || t === 'Untitled Chat') {
        if (lang === 'gujarati') return 'નવી વાતચીત';
        if (lang === 'hindi') return 'नई बातचीत';
        return 'New Conversation';
      }
      return t;
    };

    const messageUnit = lang === 'gujarati' ? 'સંદેશા' : lang === 'hindi' ? 'संदेश' : (conv.message_count === 1 ? 'message' : 'messages');

    return (
      <div
        key={conv.id}
        className={`conversation-item ${selectedConvId === conv.id ? 'active' : ''} ${conv.is_pinned ? 'is-pinned-item' : ''}`}
        onClick={() => {
          if (!isEditing) setSelectedConvId(conv.id);
        }}
      >
        <div className="conv-content">
          {isEditing ? (
            <div className="inline-rename-wrapper" onClick={(e) => e.stopPropagation()}>
              <input
                ref={renameInputRef}
                type="text"
                className="inline-rename-input"
                maxLength={60}
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmRename(conv.id);
                  if (e.key === 'Escape') handleCancelRename();
                }}
              />
              <div className="rename-actions">
                <button
                  type="button"
                  className="btn-rename-save"
                  title="Save title (Enter)"
                  onClick={() => handleConfirmRename(conv.id)}
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  className="btn-rename-cancel"
                  title="Cancel (Esc)"
                  onClick={handleCancelRename}
                >
                  <X className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          ) : (
            <div className="conv-title-row">
              {conv.is_pinned && (
                <Pin className="h-3 w-3 inline-pin-icon fill-emerald-600" />
              )}
              <span className="conv-title">{getTitle(conv.title)}</span>
              {(hasRenameError || hasPinError) && (
                <span className="inline-error-indicator" title="Couldn't save changes — please try again">
                  <AlertCircle className="h-3.5 w-3.5 text-emerald-700" />
                </span>
              )}
            </div>
          )}
          {!isEditing && (
            <div className="conv-meta-row">
              <span className="conv-msg-badge">
                {conv.message_count} {messageUnit}
              </span>
            </div>
          )}
        </div>

        {/* Action Menu Trigger (MoreVertical) */}
        {!isEditing && (
          <div className="conv-actions-anchor" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={`btn-more-options ${isMenuOpen ? 'active' : ''}`}
              title="More options"
              onClick={() => setActiveMenuConvId(isMenuOpen ? null : conv.id)}
            >
              <MoreVertical className="h-3.5 w-3.5 stroke-[2]" />
            </button>

            {/* Context Menu Dropdown */}
            {isMenuOpen && (
              <div ref={menuRef} className="sidebar-context-menu animate-fadeInUp">
                <button
                  type="button"
                  className="context-menu-item"
                  onClick={() => handleStartRename(conv)}
                >
                  <Pencil className="h-3.5 w-3.5 text-emerald-600 stroke-[2]" />
                  <span>{lang === 'gujarati' ? 'નામ બદલો' : lang === 'hindi' ? 'नाम बदलें' : 'Rename'}</span>
                </button>
                <button
                  type="button"
                  className="context-menu-item"
                  onClick={() => handleTogglePin(conv)}
                >
                  <Pin className={`h-3.5 w-3.5 text-emerald-600 stroke-[2] ${conv.is_pinned ? 'fill-emerald-600' : ''}`} />
                  <span>{conv.is_pinned ? (lang === 'gujarati' ? 'અનપિન કરો' : lang === 'hindi' ? 'अनपिन करें' : 'Unpin') : (lang === 'gujarati' ? 'ટોચ પર પિન કરો' : lang === 'hindi' ? 'ऊपर पिन करें' : 'Pin to top')}</span>
                </button>
                <div className="context-menu-divider" />
                <button
                  type="button"
                  className="context-menu-item delete-item"
                  onClick={() => handleDeleteConversation(conv.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 stroke-[2]" />
                  <span>{lang === 'gujarati' ? 'કાઢી નાખો' : lang === 'hindi' ? 'हटाएं' : 'Delete'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const lang = selectedLanguage ? String(selectedLanguage).toLowerCase() : 'english';

  return (
    <div className="farmer-ai-assistant">
      <div className="assistant-container">
        {/* Sidebar - Modern Workspace Navigation */}
        <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          <div className="sidebar-brand-header">
            <Link to="/farmer-dashboard" className="brand-link" title="Return to Farmer Dashboard">
              <div className="brand-logo-icon">
                <Sparkles className="h-5 w-5 text-white stroke-[2.4]" />
              </div>
              <div className="brand-text-col">
                <span className="brand-title">KisanAI</span>
                <span className="brand-subtitle">Smart Farm Copilot</span>
              </div>
            </Link>
            <button
              type="button"
              className="btn-sidebar-collapse"
              onClick={() => setSidebarOpen(false)}
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="sidebar-actions-bar">
            <button className="btn-new-chat" onClick={handleNewConversation}>
              <div className="new-chat-left">
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>{lang === 'gujarati' ? 'નવી ચેટ' : lang === 'hindi' ? 'नई बातचीत' : 'New Chat'}</span>
              </div>
              <span className="new-chat-badge">+</span>
            </button>
            <Link to="/farmer-dashboard" className="btn-back-dashboard">
              <ArrowLeft className="h-3.5 w-3.5 stroke-[2]" />
              <span>{lang === 'gujarati' ? 'ડેશબોર્ડ પર પાછા જાઓ' : lang === 'hindi' ? 'डैशबोर्ड पर वापस जाएं' : 'Back to Dashboard'}</span>
            </Link>
          </div>

          {/* Search Conversations Input */}
          <div className="sidebar-search-container">
            <div className="sidebar-search-box">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder={lang === 'gujarati' ? 'વાતચીત શોધો...' : lang === 'hindi' ? 'बातचीत खोजें...' : 'Search conversations...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="conversations-list">
            {filteredConversations.length === 0 ? (
              <div className="no-conversations">
                <MessageSquare className="h-8 w-8 text-emerald-300 mx-auto mb-2 opacity-60" />
                <p>{lang === 'gujarati' ? 'કોઈ વાતચીત મળી નથી' : lang === 'hindi' ? 'कोई बातचीत नहीं मिली' : 'No conversations found'}</p>
                <span className="text-xs text-slate-400">{lang === 'gujarati' ? 'શરૂ કરવા માટે + નવી ચેટ પર ક્લિક કરો' : lang === 'hindi' ? 'शुरू करने के लिए + नई बातचीत पर क्लिक करें' : 'Click New Chat to begin'}</span>
              </div>
            ) : (
              <>
                {/* Pinned Section */}
                {pinnedConversations.length > 0 && (
                  <div className="pinned-section">
                    <div className="sidebar-section-header">
                      <span>{lang === 'gujarati' ? 'પિન કરેલ' : lang === 'hindi' ? 'पिन किए गए' : 'PINNED'}</span>
                    </div>
                    <div className="sidebar-group-list">
                      {pinnedConversations.map(renderConversationItem)}
                    </div>
                  </div>
                )}

                {/* All / Regular Conversations Section */}
                {unpinnedConversations.length > 0 && (
                  <div className="unpinned-section">
                    {pinnedConversations.length > 0 && (
                      <div className="sidebar-section-header all-conv-header">
                        <span>{lang === 'gujarati' ? 'બધી વાતચીતો' : lang === 'hindi' ? 'सभी बातचीत' : 'ALL CONVERSATIONS'}</span>
                      </div>
                    )}
                    <div className="sidebar-group-list">
                      {unpinnedConversations.map(renderConversationItem)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Farmer Profile Footer */}
          <div className="sidebar-farmer-footer">
            <div className="farmer-profile-badge">
              <div className="farmer-avatar-circle">
                {farmerName.charAt(0).toUpperCase()}
              </div>
              <div className="farmer-details-col">
                <span className="farmer-display-name">{farmerName}</span>
                <span className="farmer-location-tag">
                  <MapPin className="h-3 w-3" />
                  <span>{farmerLocation}</span>
                </span>
              </div>
            </div>
            <span className="text-[10.5px] font-extrabold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              FARMER
            </span>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="chat-area">
          {!selectedConvId ? (
            <div className="welcome-screen">
              <div className="welcome-container animate-fadeInUp">
                <div className="welcome-hero-banner">
                  <div className="hero-icon-ring">
                    <Sparkles className="h-8 w-8 text-white stroke-[2.4]" />
                  </div>
                  <h1>{greetingText}, {farmerName} 🌱</h1>
                  <p className="welcome-hero-sub">
                    Your dedicated AI Agricultural Copilot for {farmerLocation} District
                  </p>
                </div>

                <div className="welcome-grid">
                  <div className="welcome-card-prompt" onClick={() => handleAreaClick('market')}>
                    <div className="welcome-card-icon-box">
                      <TrendingUp className="h-5 w-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="welcome-card-title">Live Mandi Prices & Trends</div>
                      <div className="welcome-card-desc">Check real-time arrival rates and price predictions for crops near {farmerLocation}.</div>
                    </div>
                  </div>

                  <div className="welcome-card-prompt" onClick={() => handleAreaClick('inventory')}>
                    <div className="welcome-card-icon-box">
                      <Package className="h-5 w-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="welcome-card-title">Inventory & Produce Listings</div>
                      <div className="welcome-card-desc">Check crop stock, update pricing, assess freshness, or list new harvests.</div>
                    </div>
                  </div>

                  <div className="welcome-card-prompt" onClick={() => handleAreaClick('orders')}>
                    <div className="welcome-card-icon-box">
                      <ShoppingBag className="h-5 w-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="welcome-card-title">Retail Orders & Logistics</div>
                      <div className="welcome-card-desc">Track active shipments, driver assignments, delivery OTPs, and packing steps.</div>
                    </div>
                  </div>

                  <div className="welcome-card-prompt" onClick={() => handleAreaClick('contracts')}>
                    <div className="welcome-card-icon-box">
                      <Handshake className="h-5 w-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="welcome-card-title">Buyer Bids & Bulk Demands</div>
                      <div className="welcome-card-desc">Review institutional demand, negotiate contracts, and submit bulk offers.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <header className="chat-header">
                <div className="header-left">
                  {!sidebarOpen && (
                    <button
                      type="button"
                      className="btn-sidebar-toggle-main"
                      onClick={() => setSidebarOpen(true)}
                      title="Open sidebar"
                    >
                      <PanelLeft className="h-4.5 w-4.5" />
                    </button>
                  )}
                  <div className="chat-title-wrapper">
                    <h2>{activeConversation?.title || 'Active Conversation'}</h2>
                    <div className="header-status-sub">
                      <span className="green-pulse-indicator" />
                      <span>KisanConnect Agri-LLM v2.4 • Live Mandi Grounded</span>
                    </div>
                  </div>
                </div>

                <div className="header-right">
                  {/* Language Switcher in Header */}
                  <div className="lang-switcher-select-wrap">
                    <Globe className="h-3.5 w-3.5" />
                    <select
                      className="lang-select-element"
                      value={selectedLanguage}
                      onChange={(e) => {
                        const newLang = e.target.value;
                        setSelectedLanguage(newLang);
                        const prompts = {
                          english: 'Please converse with me in English',
                          hindi: 'कृपया मुझसे हिंदी में बात करें (Hindi)',
                          gujarati: 'કૃપા કરીને મારી સાથે ગુજરાતીમાં વાત કરો (Gujarati)',
                        };
                        if (selectedConvId) {
                          sendChatMessage(selectedConvId, prompts[newLang]);
                        }
                      }}
                    >
                      <option value="english">🇬🇧 English</option>
                      <option value="hindi">🇮🇳 हिंदी</option>
                      <option value="gujarati">🇮🇳 ગુજરાતી</option>
                    </select>
                  </div>

                  <span className="header-msg-counter">
                    <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                    <span>{activeConversation?.message_count ?? messages.length}</span>
                  </span>
                </div>
              </header>

              {/* Persistent Global Quick Action Shortcut Bar */}
              <QuickActionChips
                activeArea={activeSubMenuArea}
                onSelectArea={handleAreaClick}
                disabled={assistantThinking}
                selectedLanguage={selectedLanguage}
              />

              {/* Messages Display Area */}
              <div className="messages-container">
                <div className="messages-content-wrapper">
                  {messages.length === 0 && flowStack.length === 0 ? (
                    <div className="message-row message-row-assistant animate-fadeInUp">
                      <div className="message-avatar avatar-assistant">
                        <Sparkles className="h-4.5 w-4.5 stroke-[2.2]" />
                      </div>
                      <div className="message-body-col" style={{ width: '100%' }}>
                        <div className="message-meta-top">
                          <span className="sender-name">KisanConnect AI</span>
                          <span className="advisor-badge">Farm Advisor</span>
                        </div>
                        <LanguageSelectionMenu onSelectLanguage={handleSelectLanguage} />
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div
                          key={msg.id || idx}
                          className={`message-row ${isUser ? 'message-row-user' : 'message-row-assistant'} animate-fadeInUp`}
                        >
                          <div className={`message-avatar ${isUser ? 'avatar-user' : 'avatar-assistant'}`}>
                            {isUser ? (
                              <User className="h-4.5 w-4.5 stroke-[2.2]" />
                            ) : (
                              <Sparkles className="h-4.5 w-4.5 stroke-[2.2]" />
                            )}
                          </div>
                          <div className="message-body-col">
                            <div className="message-meta-top">
                              <span className="sender-name">{isUser ? farmerName : 'KisanConnect AI'}</span>
                              {!isUser && <span className="advisor-badge">Farm Advisor</span>}
                              <span className="message-timestamp">
                                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>

                            <div className={isUser ? 'bubble-user-card' : 'bubble-assistant-card'}>
                              <div className="markdown-body">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {cleanMessageContent(msg.content)}
                                </ReactMarkdown>
                              </div>

                              {!isUser && (
                                <div className="assistant-action-bar">
                                  <button
                                    type="button"
                                    className="btn-bubble-action"
                                    onClick={() => handleCopyMessage(msg.id || idx, cleanMessageContent(msg.content))}
                                    title="Copy response"
                                  >
                                    {copiedMessageId === (msg.id || idx) ? (
                                      <>
                                        <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                                        <span className="text-emerald-700 font-bold">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3.5 w-3.5" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    className={`btn-bubble-action ${speakingMessageId === (msg.id || idx) ? 'speaking-active' : ''}`}
                                    onClick={() => handleReadAloud(msg.id || idx, cleanMessageContent(msg.content))}
                                    title={speakingMessageId === (msg.id || idx) ? 'Stop reading' : 'Read aloud'}
                                  >
                                    {speakingMessageId === (msg.id || idx) ? (
                                      <>
                                        <VolumeX className="h-3.5 w-3.5" />
                                        <span>Stop</span>
                                      </>
                                    ) : (
                                      <>
                                        <Volume2 className="h-3.5 w-3.5" />
                                        <span>Listen</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>

                            {isUser && (
                              <div className="user-msg-status">
                                {msg.status === 'error' ? (
                                  <button
                                    className="retry-btn text-rose-600 font-bold flex items-center gap-1"
                                    onClick={() => handleSubMenuOptionSelect(msg.content)}
                                  >
                                    <AlertCircle className="h-3 w-3" />
                                    <span>Retry</span>
                                  </button>
                                ) : (
                                  <CheckCheck className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Language Selection Menu Bubble */}
                  {currentFlow?.type === 'language' && (
                    <div className="message-row message-row-assistant animate-fadeInUp">
                      <div className="message-avatar avatar-assistant">
                        <Sparkles className="h-4.5 w-4.5 stroke-[2.2]" />
                      </div>
                      <div className="message-body-col" style={{ width: '100%' }}>
                        <div className="message-meta-top">
                          <span className="sender-name">KisanConnect AI</span>
                          <span className="advisor-badge">Farm Advisor</span>
                        </div>
                        <LanguageSelectionMenu onSelectLanguage={handleSelectLanguage} />
                      </div>
                    </div>
                  )}

                  {/* Sub-Feature Selection Menu Bubble */}
                  {activeSubMenuArea && (
                    <div className="message-row message-row-assistant animate-fadeInUp">
                      <div className="message-avatar avatar-assistant">
                        <Sparkles className="h-4.5 w-4.5 stroke-[2.2]" />
                      </div>
                      <div className="message-body-col" style={{ width: '100%' }}>
                        <div className="message-meta-top">
                          <span className="sender-name">KisanConnect AI</span>
                          <span className="advisor-badge">Farm Advisor</span>
                        </div>
                        <SubFeatureMenu
                          areaKey={activeSubMenuArea}
                          locationName={farmerLocation}
                          onSelectOption={handleSubMenuOptionSelect}
                          onBack={() => flowPop()}
                          selectedLanguage={selectedLanguage}
                        />
                      </div>
                    </div>
                  )}

                  {/* Universal Disambiguation Prompt Menu Bubble */}
                  {disambiguationState && (
                    <div className="message-row message-row-assistant animate-fadeInUp">
                      <div className="message-avatar avatar-assistant">
                        <Sparkles className="h-4.5 w-4.5 stroke-[2.2]" />
                      </div>
                      <div className="message-body-col" style={{ width: '100%' }}>
                        <div className="message-meta-top">
                          <span className="sender-name">KisanConnect AI</span>
                          <span className="advisor-badge">Farm Advisor</span>
                        </div>
                        <DisambiguationMenu
                          title={disambiguationState.title}
                          options={disambiguationState.options}
                          showShowAll={disambiguationState.showShowAll}
                          onSelectOption={handleSubMenuOptionSelect}
                          onShowAll={() => handleSubMenuOptionSelect(disambiguationState.showAllPrompt)}
                          onBack={() => flowPop()}
                          selectedLanguage={selectedLanguage}
                        />
                      </div>
                    </div>
                  )}

                  {/* Structured Form Card (Create / Update / Delete) */}
                  {activeForm && (
                    <div className="message-row message-row-assistant animate-fadeInUp">
                      <div className="message-avatar avatar-assistant">
                        <Sparkles className="h-4.5 w-4.5 stroke-[2.2]" />
                      </div>
                      <div className="message-body-col" style={{ width: '100%' }}>
                        <div className="message-meta-top">
                          <span className="sender-name">KisanConnect AI</span>
                          <span className="advisor-badge">Farm Advisor</span>
                        </div>
                        <StructuredActionForm
                          action={activeForm.action}
                          initialData={activeForm.initialData}
                          onSubmit={handleFormSubmit}
                          onCancel={() => flowPop()}
                          isSubmitting={isFormSubmitting}
                          error={formError}
                        />
                      </div>
                    </div>
                  )}

                  {/* Assistant Typing Indicator */}
                  {assistantThinking && (
                    <div className="message-row message-row-assistant animate-fadeInUp">
                      <div className="message-avatar avatar-assistant">
                        <Sparkles className="h-4.5 w-4.5 stroke-[2.2]" />
                      </div>
                      <div className="message-body-col">
                        <div className="typing-bubble-card">
                          <div className="typing-dots">
                            <span className="dot dot-1" />
                            <span className="dot dot-2" />
                            <span className="dot dot-3" />
                          </div>
                          <span className="typing-status-text">KisanConnect AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Chat Input Dock */}
              <div className="chat-input-dock">
                <form className="input-container-main" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder={
                      selectedLanguage === 'gujarati'
                        ? 'બજાર ભાવ વિશે પૂછો, યાદી બનાવો, ઓર્ડર તપાસો...'
                        : selectedLanguage === 'hindi'
                        ? 'मंडी भाव पूछें, फसल सूची बनाएं, ऑर्डर जांचें...'
                        : 'Ask about market prices, create listings, check orders...'
                    }
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={assistantThinking}
                  />
                  <div className="input-actions-right">
                    <button
                      type="button"
                      className={`btn-mic-input ${isRecording ? 'recording-active' : ''}`}
                      onClick={toggleVoiceRecognition}
                      title={isRecording ? 'Stop listening' : 'Voice input (Speak)'}
                    >
                      {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || assistantThinking}
                      className="btn-send-main"
                      title="Send Message"
                    >
                      <Send className="h-4 w-4 stroke-[2.4]" />
                    </button>
                  </div>
                </form>
                <div className="input-disclaimer-sub">
                  KisanConnect AI provides verified mandi data & farm advisory. Grounded in live farm database.
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <h3>Delete conversation?</h3>
            <p>
              Are you sure you want to permanently delete this conversation? 
              <br />
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={cancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm-delete" 
                onClick={confirmDeleteConversation}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerAIAssistant;
