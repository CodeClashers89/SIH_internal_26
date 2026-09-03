import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Plus, Trash2, Bot, User, Sparkles,
  RefreshCw, AlertCircle, Check, MessageSquare,
  TrendingUp, Tag, Handshake, Package, Truck,
  BarChart3, Users, Globe, ChevronRight, ShieldCheck,
  Eye, MapPin, Clock, UserCheck, DollarSign, Search,
  MoreVertical, Pencil, Pin, X, Loader2, Minus
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
  },
  {
    key: 'language',
    icon: Globe,
    area: 'Language support',
    desc: 'Communicate seamlessly in English, Hindi, Hinglish, or regional languages',
  }
];

// Dynamic Sub-Menu Mapping per area (Location & Context Aware)
const getSubMenusMapping = (locationName = 'Pune') => ({
  market: {
    areaName: 'Market Insights',
    icon: TrendingUp,
    options: [
      { key: 'market_check', label: `Check today's rates near ${locationName}`, prompt: `What are the current market prices for tomatoes in ${locationName}?`, icon: TrendingUp },
      { key: 'market_rec', label: 'Get selling price recommendation', icon: Sparkles, isDisambiguated: true, type: 'crop_recommendation' },
      { key: 'market_trends', label: 'Price trend for Tomato & Onion', prompt: `Compare recent market price trends for vegetables in ${locationName}`, icon: BarChart3 },
      { key: 'market_compare', label: `Compare rates in mandis near ${locationName}`, prompt: `Compare rates for Tomato across mandis near ${locationName}`, icon: Globe },
    ]
  },
  listings: {
    areaName: 'Listings',
    icon: Tag,
    options: [
      { key: 'create_listing', label: 'Create new produce listing', isForm: true, formType: 'create_listing', icon: Plus },
      { key: 'update_listing', label: 'Update existing listing', icon: RefreshCw, isDisambiguated: true, type: 'select_listing_update' },
      { key: 'delete_listing', label: 'Delete a listing', icon: Trash2, isDisambiguated: true, type: 'select_listing_delete' },
      { key: 'view_listings', label: 'View all my active listings', prompt: 'Show all my active product listings', icon: Tag },
    ]
  },
  contracts: {
    areaName: 'Bulk Contracts',
    icon: Handshake,
    options: [
      { key: 'find_contracts', label: 'Find bulk buyer requirements', prompt: 'Show available bulk buyer requirements for my farm', icon: Handshake },
      { key: 'submit_offer', label: 'Submit an offer to a buyer', icon: Send, isDisambiguated: true, type: 'select_bulk_requirement' },
      { key: 'view_offers', label: 'View my submitted offers', prompt: 'Show all my submitted offers for bulk requirements', icon: MessageSquare },
    ]
  },
  orders: {
    areaName: 'Orders',
    icon: Package,
    options: [
      { key: 'view_orders', label: 'Show active & pending orders', prompt: 'Show all my active and pending orders', icon: Package },
      { key: 'order_details', label: 'View order details & status', icon: Eye, isDisambiguated: true, type: 'select_order_item' },
      { key: 'mark_packed', label: 'Mark order as packed', prompt: 'How do I mark an order as packed?', icon: Check },
      { key: 'shipment_status', label: 'Check shipment & driver status', icon: Truck, isDisambiguated: true, type: 'select_shipment_tracking' },
    ]
  },
  logistics: {
    areaName: 'Logistics',
    icon: Truck,
    options: [
      { key: 'track_logistics', label: 'Track live shipment & driver', icon: Truck, isDisambiguated: true, type: 'select_shipment_tracking' },
      { key: 'pickup_address', label: 'Get pickup & delivery address', icon: MapPin, isDisambiguated: true, type: 'select_shipment_tracking' },
      { key: 'delivery_schedule', label: 'Coordinate delivery schedule', prompt: 'Check expected delivery schedule for my active orders', icon: Clock },
    ]
  },
  stats: {
    areaName: 'Farm Stats',
    icon: BarChart3,
    options: [
      { key: 'earnings', label: 'View 30-day earnings analytics', prompt: 'Show my earnings for the last 30 days', icon: TrendingUp },
      { label: 'View trust score & ratings', prompt: 'Show my trust score, average rating, and freshness metrics', icon: ShieldCheck },
      { label: 'View active listings summary', prompt: 'Show a summary of my active listings and farm stats', icon: BarChart3 },
    ]
  },
  buyer: {
    areaName: 'Buyer Info',
    icon: Users,
    options: [
      { key: 'find_buyers', label: 'Find potential produce buyers', icon: Users, isDisambiguated: true, type: 'select_buyer_crop' },
      { label: 'View buyer preferences & notes', prompt: 'Show buyer preferences and notes for my crops', icon: UserCheck },
    ]
  },
  language: {
    areaName: 'Language Support',
    icon: Globe,
    options: [
      { label: 'Communicate in Hindi', prompt: 'Can we communicate in Hindi?', icon: Globe },
      { label: 'Communicate in Hinglish', prompt: 'Can we communicate in Hinglish?', icon: Globe },
      { label: 'Communicate in Gujarati', prompt: 'Can we communicate in Gujarati?', icon: Globe },
    ]
  }
});

// Reusable Sub-Feature Selection Menu Component
const SubFeatureMenu = ({ areaKey, locationName, onSelectOption, onBack }) => {
  const subMenuMap = getSubMenusMapping(locationName);
  const menuConfig = subMenuMap[areaKey] || subMenuMap.listings;
  const AreaIcon = menuConfig.icon;
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
            What would you like to do with <strong className="text-emerald-800 font-extrabold">{menuConfig.areaName}</strong>?
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
            ← back to all topics
          </button>
        </div>
      )}
    </div>
  );
};

// Reusable Disambiguation Prompt Menu Component (Universal Disambiguation Rule)
const DisambiguationMenu = ({ title, options, showSearch, showShowAll, onSelectOption, onShowAll, onBack }) => {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
            placeholder="Search items..."
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
              <span className="opt-label font-bold text-emerald-700">Show all of them</span>
            </div>
            <ChevronRight className="h-4 w-4 opt-arrow shrink-0 stroke-[2]" />
          </button>
        )}
      </div>

      {onBack && (
        <div className="sub-menu-footer">
          <button type="button" className="btn-back-link" onClick={onBack}>
            ← back
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
            <span className="font-bold text-slate-900">{initialData?.name}</span>
            <span className="text-xs text-slate-500">
              {initialData?.quantity} {initialData?.unit} @ ₹{initialData?.price_per_unit}/{initialData?.unit}
            </span>
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
              ← cancel
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
const CapabilitiesCard = ({ onSelectArea }) => {
  return (
    <div className="capabilities-card animate-cardEntrance">
      <div className="capabilities-header">
        <div className="capabilities-badge">
          <Bot className="h-4 w-4 text-emerald-600" />
          <span>KisanConnect AI Assistant</span>
        </div>
        <p className="capabilities-intro">
          I can help you manage every part of your farm business on KisanConnect:
        </p>
      </div>

      <div className="capabilities-table-wrapper">
        <table className="capabilities-table">
          <thead>
            <tr>
              <th className="th-area">Area</th>
              <th className="th-desc">What I can do for you</th>
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES_DATA.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <tr
                  key={item.key}
                  className="capabilities-row animate-rowFade"
                  style={{ animationDelay: `${idx * 35}ms` }}
                  onClick={() => onSelectArea(item.key)}
                  title={`Click to open options for ${item.area}`}
                >
                  <td className="td-area">
                    <div className="area-cell">
                      <IconComp className="h-4.5 w-4.5 text-emerald-600 shrink-0 stroke-[2]" />
                      <span>{item.area}</span>
                    </div>
                  </td>
                  <td className="td-desc">{item.desc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="capabilities-closing">
        Just click any area above to choose a specific action, or tell me which task you'd like to start with...
      </p>
    </div>
  );
};

// Persistent Global Quick Action Shortcut Chips Row (8 Static Categories)
const QuickActionChips = ({ activeArea, onSelectArea, disabled }) => {
  const chips = [
    { key: 'market', label: 'Market Insights', icon: TrendingUp },
    { key: 'listings', label: 'Listings', icon: Tag },
    { key: 'contracts', label: 'Bulk Contracts', icon: Handshake },
    { key: 'orders', label: 'Orders', icon: Package },
    { key: 'logistics', label: 'Logistics', icon: Truck },
    { key: 'stats', label: 'Farm Stats', icon: BarChart3 },
    { key: 'buyer', label: 'Buyer Info', icon: Users },
    { key: 'language', label: 'Language', icon: Globe },
  ];

  return (
    <div className="quick-actions-row">
      <span className="quick-actions-label">QUICK ACTIONS:</span>
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
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [assistantThinking, setAssistantThinking] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState(null);

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

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [convToDelete, setConvToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);
  const renameInputRef = useRef(null);

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
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/products/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.results || response.data || [];
      setLiveListings(data);
      return data;
    } catch (err) {
      console.error('Error querying live listings:', err);
      return [];
    }
  };

  // Query Live Database for Farmer Orders (Shipment Disambiguation)
  const fetchLiveOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/orders/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.results || response.data || [];
      setLiveOrders(data);
      return data;
    } catch (err) {
      console.error('Error querying live orders:', err);
      return [];
    }
  };

  const loadConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/chat/conversations/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(response.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadConversationMessages = async (convId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/chat/conversations/${convId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveConversation(response.data);
      setMessages(response.data.messages || []);
      flowClear();
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const createConversation = async () => {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_BASE_URL}/chat/conversations/`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const newConvId = response.data.id;
    setSelectedConvId(newConvId);
    setActiveConversation({
      id: newConvId,
      title: 'New Conversation',
      message_count: 0,
      is_pinned: false,
    });
    setMessages([]);
    await loadConversations();
    return newConvId;
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
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/chat/conversations/${convId}/`,
        { title: trimmed },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/chat/conversations/${conv.id}/`,
        { is_pinned: newPinnedState },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/chat/`,
        {
          conversation_id: conversationId,
          message: userText,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

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

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || assistantThinking) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    const targetConversationId = selectedConvId || (await createConversation());
    await sendChatMessage(targetConversationId, userMessage);
  };

  // Trigger sub-menu branch when an area is clicked
  const handleAreaClick = async (areaKey) => {
    if (assistantThinking) return;
    if (!selectedConvId) {
      await createConversation();
    }
    // Clear the stack and push a fresh sub-menu
    setFlowStack([{ type: 'subMenu', data: { areaKey } }]);
  };

  // Handle option selection from SubFeatureMenu (Supports Live DB & Disambiguation Rules)
  const handleSubMenuOptionSelect = async (option) => {
    if (assistantThinking) return;
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

      if (option.type === 'crop_recommendation') {
        const cropOptions = freshListings.length > 0
          ? freshListings.map((l) => ({
              label: l.name,
              sublabel: `${l.quantity} ${l.unit} available in ${farmerLocation}`,
              prompt: `Give me a price recommendation for ${l.name} in ${farmerLocation} based on market data`,
              icon: Tag,
            }))
          : [
              { label: 'Fresh Tomatoes', sublabel: `500 kg available in ${farmerLocation}`, prompt: `Give me a price recommendation for Tomato in ${farmerLocation} based on market data`, icon: Tag },
              { label: 'Red Onions', sublabel: `300 kg available in ${farmerLocation}`, prompt: `Give me a price recommendation for Onion in ${farmerLocation} based on market data`, icon: Tag },
            ];

        flowPush({
          type: 'disambiguation',
          data: {
            title: `You have ${freshListings.length || 2} crops — which one would you like a price recommendation for?`,
            options: cropOptions,
            showShowAll: true,
            showAllPrompt: `Give me price recommendations for all my crops in ${farmerLocation}`,
          },
        });
        return;
      }

      if (option.type === 'select_listing_update') {
        const updateOptions = freshListings.length > 0
          ? freshListings.map((l) => ({
              label: `${l.name} (#${l.id})`,
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
            title: 'Which of your active listings would you like to update?',
            options: updateOptions,
          },
        });
        return;
      }

      if (option.type === 'select_listing_delete') {
        const deleteOptions = freshListings.length > 0
          ? freshListings.map((l) => ({
              label: `${l.name} (#${l.id})`,
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
            title: 'Which listing would you like to delete?',
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
          await sendChatMessage(targetConversationId, 'Show all my orders');
          return;
        }

        if (activeOrders.length === 1) {
          await sendChatMessage(targetConversationId, `Get details for order #${activeOrders[0].id}`);
          return;
        }

        const orderOptions = activeOrders.map((o) => ({
          label: `Order #${o.id}`,
          sublabel: `${o.buyer?.username || o.buyer || 'Buyer'} • ${o.status.replace('_', ' ')} • ₹${o.total_amount}`,
          prompt: `Get details for order #${o.id}`,
          icon: Package,
        }));

        flowPush({
          type: 'disambiguation',
          data: {
            title: `You have ${activeOrders.length} active orders — which one would you like details for?`,
            options: orderOptions,
            showShowAll: true,
            showAllPrompt: 'Show all my active orders and shipments',
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
            'Check if I have any shipments currently in progress (packed or in transit). If none, let me know clearly.'
          );
          return;
        }

        if (trackable.length === 1) {
          // Single shipment — auto-show tracking directly
          await sendChatMessage(
            targetConversationId,
            `Show detailed shipment and driver status for order #${trackable[0].id}`
          );
          return;
        }

        // Multiple trackable shipments — disambiguate
        const shipmentOptions = trackable.map((o) => {
          const driverInfo = o.shipment?.partner?.name || o.driver_name;
          const sublabel = [
            o.buyer?.username || o.buyer || 'Buyer',
            o.status.replace('_', ' '),
            `₹${o.total_amount}`,
            driverInfo ? `Driver: ${driverInfo}` : 'No driver yet',
          ].join(' • ');
          return {
            label: `Order #${o.id}`,
            sublabel,
            prompt: `Show detailed shipment and driver status for order #${o.id}`,
            icon: Truck,
          };
        });

        flowPush({
          type: 'disambiguation',
          data: {
            title: `You have ${trackable.length} shipments in progress — which one?`,
            options: shipmentOptions,
            showShowAll: true,
            showAllPrompt: 'Show all my active shipments and driver statuses',
          },
        });
        return;
      }

      if (option.type === 'select_bulk_requirement') {
        flowPush({
          type: 'disambiguation',
          data: {
            title: 'Which bulk buyer requirement would you like to respond to?',
            options: [
              { label: 'Requirement #1: Tomato (1,000 kg)', sublabel: 'Requested by Retail Mart Pune', prompt: 'Help me submit an offer for Bulk Requirement #1', icon: Handshake },
              { label: 'Requirement #2: Onion (2,000 kg)', sublabel: 'Requested by Agri Processing Co.', prompt: 'Help me submit an offer for Bulk Requirement #2', icon: Handshake },
            ],
          },
        });
        return;
      }

      if (option.type === 'select_buyer_crop') {
        flowPush({
          type: 'disambiguation',
          data: {
            title: 'Which crop are you looking for potential buyers for?',
            options: [
              { label: 'Tomato Buyers', sublabel: 'Retail consumers & bulk processors', prompt: 'Find potential retail and wholesale buyers for Tomatoes', icon: Users },
              { label: 'Onion Buyers', sublabel: 'Regional wholesalers & hotel buyers', prompt: 'Find potential retail and wholesale buyers for Onions', icon: Users },
            ],
            showShowAll: true,
            showAllPrompt: 'Find all potential buyers for my produce',
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

    const token = localStorage.getItem('token');
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

        const res = await axios.post(`${API_BASE_URL}/products/`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

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

        await axios.patch(`${API_BASE_URL}/products/${prodId}/`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        flowClear();
        await fetchLiveListings();

        // Feed confirmation into chat thread
        const confirmationText = `Updated listing **${activeForm.initialData.name} (#${prodId})** successfully! New price: **₹${data.price_per_unit}/${activeForm.initialData.unit}**, Quantity: **${data.quantity} ${activeForm.initialData.unit}**.`;
        await sendChatMessage(targetConversationId, confirmationText);
      } else if (activeForm.action === 'delete') {
        const prodId = activeForm.initialData.id;
        await axios.delete(`${API_BASE_URL}/products/${prodId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

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
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/chat/conversations/${convToDelete}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  // Group pinned and unpinned conversations
  const pinnedConversations = conversations.filter((c) => c.is_pinned);
  const unpinnedConversations = conversations.filter((c) => !c.is_pinned);

  // Render individual conversation row with rename, pin, and menu
  const renderConversationItem = (conv) => {
    const isEditing = editingConvId === conv.id;
    const isMenuOpen = activeMenuConvId === conv.id;
    const hasRenameError = renameErrorConvId === conv.id;
    const hasPinError = pinErrorConvId === conv.id;

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
                <Pin className="h-3 w-3 text-emerald-600 fill-emerald-600 shrink-0 inline-pin-icon" />
              )}
              <span className="conv-title">{conv.title || 'Untitled Chat'}</span>
              {(hasRenameError || hasPinError) && (
                <span className="inline-error-indicator" title="Couldn't save changes — please try again">
                  <AlertCircle className="h-3.5 w-3.5 text-emerald-700" />
                </span>
              )}
            </div>
          )}
          {!isEditing && (
            <div className="conv-meta">
              {conv.message_count} {conv.message_count === 1 ? 'message' : 'messages'}
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
                  <span>Rename</span>
                </button>
                <button
                  type="button"
                  className="context-menu-item"
                  onClick={() => handleTogglePin(conv)}
                >
                  <Pin className={`h-3.5 w-3.5 text-emerald-600 stroke-[2] ${conv.is_pinned ? 'fill-emerald-600' : ''}`} />
                  <span>{conv.is_pinned ? 'Unpin' : 'Pin to top'}</span>
                </button>
                <div className="context-menu-divider" />
                <button
                  type="button"
                  className="context-menu-item delete-item"
                  onClick={() => handleDeleteConversation(conv.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-slate-400 stroke-[2]" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="farmer-ai-assistant">
      <div className="assistant-container">
        {/* Sidebar - Conversations List */}
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title-group">
              <div className="icon-pulse-badge">
                <Sparkles className="h-4 w-4 text-emerald-600 stroke-[2.2]" />
              </div>
              <h2>AI Assistant</h2>
            </div>
            <button className="btn-new" onClick={handleNewConversation}>
              <Plus className="h-4 w-4 stroke-[2.2]" />
              <span>New Chat</span>
            </button>
          </div>

          <div className="conversations-list">
            {conversations.length === 0 ? (
              <div className="no-conversations">
                <MessageSquare className="h-8 w-8 text-emerald-300 mx-auto mb-2 opacity-60" />
                <p>No conversations yet</p>
                <span className="text-xs text-slate-400">Click + New Chat to begin</span>
              </div>
            ) : (
              <>
                {/* Pinned Section */}
                {pinnedConversations.length > 0 && (
                  <div className="pinned-section">
                    <div className="sidebar-section-header">
                      <span>PINNED</span>
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
                        <span>ALL CONVERSATIONS</span>
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
        </div>

        {/* Main Chat Area */}
        <div className="chat-area">
          {!selectedConvId ? (
            <div className="welcome-screen">
              <div className="welcome-container animate-fadeInUp">
                {/* Personalized Greeting Header */}
                <div className="welcome-header">
                  <div className="greeting-line">
                    <span className="leaf-motif">🌱</span>
                    <h1>{greetingText}, {farmerName}</h1>
                  </div>
                  <p className="welcome-subtext">Your AI assistant for KisanConnect ({farmerLocation})</p>
                </div>

                {/* Contextual Action Rows List */}
                <div className="welcome-actions-list">
                  <div
                    className="action-row animate-rowFade"
                    style={{ animationDelay: '60ms' }}
                    onClick={() => handleAreaClick('market')}
                  >
                    <div className="action-row-icon">
                      <TrendingUp className="h-5 w-5 text-emerald-600 stroke-[2]" />
                    </div>
                    <div className="action-row-content">
                      <span className="action-row-title">Check today's Mandi rates near {farmerLocation}</span>
                      <span className="action-row-sub">Real-time arrival prices & smart selling recommendations</span>
                    </div>
                    <ChevronRight className="h-5 w-5 action-row-arrow" />
                  </div>

                  <div
                    className="action-row animate-rowFade"
                    style={{ animationDelay: '120ms' }}
                    onClick={() => handleAreaClick('orders')}
                  >
                    <div className="action-row-icon">
                      <Package className="h-5 w-5 text-emerald-600 stroke-[2]" />
                    </div>
                    <div className="action-row-content">
                      <span className="action-row-title">Track live status & driver on active orders</span>
                      <span className="action-row-sub">See pickup, transit progression, and driver tracking</span>
                    </div>
                    <ChevronRight className="h-5 w-5 action-row-arrow" />
                  </div>

                  <div
                    className="action-row animate-rowFade"
                    style={{ animationDelay: '180ms' }}
                    onClick={() => handleAreaClick('listings')}
                  >
                    <div className="action-row-icon">
                      <Tag className="h-5 w-5 text-emerald-600 stroke-[2]" />
                    </div>
                    <div className="action-row-content">
                      <span className="action-row-title">Create or manage crop listings for buyers</span>
                      <span className="action-row-sub">Post tomatoes, onions, or grains with structured stepper controls</span>
                    </div>
                    <ChevronRight className="h-5 w-5 action-row-arrow" />
                  </div>

                  <div
                    className="action-row animate-rowFade"
                    style={{ animationDelay: '240ms' }}
                    onClick={() => handleAreaClick('contracts')}
                  >
                    <div className="action-row-icon">
                      <Handshake className="h-5 w-5 text-emerald-600 stroke-[2]" />
                    </div>
                    <div className="action-row-content">
                      <span className="action-row-title">Explore bulk buyer requirements & submit offers</span>
                      <span className="action-row-sub">Review volume demands and negotiate contract deals</span>
                    </div>
                    <ChevronRight className="h-5 w-5 action-row-arrow" />
                  </div>
                </div>

                <div className="welcome-footer-hint">
                  <span>Tip: Select any area above to open specific action options, or ask anything in chat.</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="header-left">
                  <div className="green-dot-active" />
                  <h2>{activeConversation?.title || 'Active Conversation'}</h2>
                </div>
                <div className="header-right">
                  <span className="chat-info-badge">
                    {activeConversation?.message_count ?? messages.length} messages
                  </span>
                </div>
              </div>

              {/* Messages Display Area */}
              <div className="messages-container">
                {messages.length === 0 && flowStack.length === 0 ? (
                  <div className="empty-chat-wrapper">
                    <CapabilitiesCard onSelectArea={handleAreaClick} />
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={msg.id || idx}
                        className={`message message-${msg.role} animate-fadeInUp`}
                      >
                        <div className="message-header-row">
                          {!isUser && <span className="assistant-pulse-dot" />}
                          <span className="message-role">
                            {isUser ? 'YOU' : 'ASSISTANT'}
                          </span>
                        </div>
                        <div className="message-bubble-wrapper">
                          <div className={`message-content markdown-body ${isUser ? 'bubble-user' : 'bubble-assistant'}`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                        <div className="message-time-row">
                          <span>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          {isUser && (
                            msg.status === 'error' ? (
                              <button
                                className="retry-btn"
                                title="Failed to send. Click to retry."
                                onClick={() => handleSubMenuOptionSelect(msg.content)}
                              >
                                <AlertCircle className="h-3.5 w-3.5 text-slate-500 hover:text-emerald-700" />
                                <span>Retry</span>
                              </button>
                            ) : (
                              <Check className="h-3.5 w-3.5 text-emerald-200 ml-1 stroke-[2.5]" />
                            )
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Sub-Feature Selection Menu Bubble */}
                {activeSubMenuArea && (
                  <div className="message message-assistant animate-fadeInUp">
                    <div className="message-header-row">
                      <span className="assistant-pulse-dot" />
                      <span className="message-role">ASSISTANT</span>
                    </div>
                    <SubFeatureMenu
                      areaKey={activeSubMenuArea}
                      locationName={farmerLocation}
                      onSelectOption={handleSubMenuOptionSelect}
                      onBack={() => flowPop()}
                    />
                  </div>
                )}

                {/* Universal Disambiguation Prompt Menu Bubble */}
                {disambiguationState && (
                  <div className="message message-assistant animate-fadeInUp">
                    <div className="message-header-row">
                      <span className="assistant-pulse-dot" />
                      <span className="message-role">ASSISTANT</span>
                    </div>
                    <DisambiguationMenu
                      title={disambiguationState.title}
                      options={disambiguationState.options}
                      showShowAll={disambiguationState.showShowAll}
                      onSelectOption={handleSubMenuOptionSelect}
                      onShowAll={() => handleSubMenuOptionSelect(disambiguationState.showAllPrompt)}
                      onBack={() => flowPop()}
                    />
                  </div>
                )}

                {/* Structured Form Card (Create / Update / Delete) */}
                {activeForm && (
                  <div className="message message-assistant animate-fadeInUp">
                    <div className="message-header-row">
                      <span className="assistant-pulse-dot" />
                      <span className="message-role">ASSISTANT</span>
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
                )}

                {/* Assistant Typing Indicator (3 pulsing green dots) */}
                {assistantThinking && (
                  <div className="message message-assistant animate-fadeInUp">
                    <div className="message-header-row">
                      <span className="assistant-pulse-dot" />
                      <span className="message-role">ASSISTANT</span>
                    </div>
                    <div className="message-content bubble-assistant typing-bubble">
                      <div className="typing-dots">
                        <span className="dot dot-1" />
                        <span className="dot dot-2" />
                        <span className="dot dot-3" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Persistent Global Quick Action Shortcut Bar (8 Core Static Categories) */}
              <QuickActionChips
                activeArea={activeSubMenuArea}
                onSelectArea={handleAreaClick}
                disabled={assistantThinking}
              />

              {/* Input Area */}
              <form className="input-form" onSubmit={handleSendMessage}>
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder="Ask about market prices, create listings, check orders..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={assistantThinking}
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || assistantThinking}
                    className="btn-send"
                    title="Send Message"
                  >
                    <Send className="h-4 w-4 stroke-[2.2]" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
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
