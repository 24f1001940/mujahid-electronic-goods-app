// src/app/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Fuse from 'fuse.js';
import {
  Search, Mic, Sun, Moon, Lock, Unlock, Eye, EyeOff, ShoppingCart,
  Plus, Trash2, Upload, Printer, Send, Mail, Wrench,
  Package, QrCode, Layers, ShieldCheck, Phone, MapPin, Image as ImageIcon,
  BookOpen, TrendingUp, FileText, Download, Database, History,
  Store, Info, Compass, AlertTriangle, RotateCcw, Wallet, Clock, Award,
  Cloud, Smartphone, ShoppingBag, X, ChevronLeft, ChevronRight, LayoutDashboard
} from 'lucide-react';
import {
  db,
  initDatabase,
  SHOP_CONFIG,
  clearTestTransactionsOnly,
  wipeEntireDatabaseClean,
  reloadDefaultShopData
} from '@/lib/db';
import { generateInvoicePDF } from '@/lib/pdfGenerator';
import { syncDeviceWithCloud } from '@/lib/cloudSync';
import { calculatePayment } from '@/lib/finance';

export default function MujahidElectronicApp() {
  // Navigation & Theme State
  const [darkMode, setDarkMode] = useState(true);
  const [lang, setLang] = useState('en');
  const [publicSection, setPublicSection] = useState('store'); // 'store' | 'track' | 'about'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState('pos');
  const [adminNavCollapsed, setAdminNavCollapsed] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [sendingEmail, setSendingEmail] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [todayStr, setTodayStr] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const autoSyncTimer = useRef(null);
  const syncInFlight = useRef(false);
  const isAdminRef = useRef(false);
  const isOnlineRef = useRef(isOnline);

  // Public Website Customer Multi-Item Cart
  const [publicCart, setPublicCart] = useState([]);
  const [showPublicCartModal, setShowPublicCartModal] = useState(false);
  const [publicCustomerName, setPublicCustomerName] = useState('');
  const [publicCustomerPhone, setPublicCustomerPhone] = useState('');
  const [publicCustomerAddress, setPublicCustomerAddress] = useState('');

  // Database Collections
  const [products, setProducts] = useState([]);
  const [qrs, setQrs] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [khataList, setKhataList] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [orders, setOrders] = useState([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [publicTrackQuery, setPublicTrackQuery] = useState('');
  const [warrantySearchPhone, setWarrantySearchPhone] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showSecretCost, setShowSecretCost] = useState(false);

  // Admin POS Cart & Checkout States
  const [cart, setCart] = useState([]);
  const [custName, setCustName] = useState(SHOP_CONFIG.defaultTestCustomer.name);
  const [custPhone, setCustPhone] = useState(SHOP_CONFIG.defaultTestCustomer.phone);
  const [custEmail, setCustEmail] = useState(SHOP_CONFIG.defaultTestCustomer.email);
  const [extraDiscount, setExtraDiscount] = useState(0);
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [cashPaidInput, setCashPaidInput] = useState('');
  const [upiPaidInput, setUpiPaidInput] = useState('');
  const [otherPaidInput, setOtherPaidInput] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [selectedQrId, setSelectedQrId] = useState(1);

  // Forms
  const [newProd, setNewProd] = useState({
    name: '', hi: '', ur: '', category: 'Portable PA & Mics', keywords: '',
    displayPrice: '', minPrice: '', costPrice: '', stock: '',
    warranty: '6 Months Warranty', isLegacyStock: false, arrivalDate: '', image: ''
  });
  const [newQr, setNewQr] = useState({ name: '', upiId: '', customQrImage: '' });
  const [newRepair, setNewRepair] = useState({
    customerName: 'Test Customer',
    customerPhone: '9625035483',
    customerEmail: 'pluakalu@gmail.com',
    itemName: '',
    estimatedCost: '',
    advancePaid: ''
  });
  const [newExpense, setNewExpense] = useState({ title: '', amount: '', category: 'Shop Kharcha' });
  const [newRaw, setNewRaw] = useState({ name: '', stock: '', unitCost: '', qtyPerKit: '1' });

  const refreshAllData = useCallback(async () => {
    const [p, q, r, inv, kh, exp, raw, ord] = await Promise.all([
      db.products.toArray(),
      db.qrs.toArray(),
      db.repairs.reverse().toArray(),
      db.invoices.reverse().toArray(),
      db.khata.reverse().toArray(),
      db.expenses.reverse().toArray(),
      db.rawMaterials.toArray(),
      db.orders.reverse().toArray()
    ]);
    setProducts(p);
    setQrs(q);
    setRepairs(r);
    setInvoices(inv);
    setKhataList(kh);
    setExpenses(exp);
    setRawMaterials(raw);
    setOrders(ord);
    if (q.length > 0 && !selectedQrId) setSelectedQrId(q[0].id);
  }, [selectedQrId]);

  const runCloudSync = useCallback(async ({ replaceCloud = false, notify = false } = {}) => {
    if (syncInFlight.current || !isAdminRef.current || !isOnlineRef.current) return { success: false };
    syncInFlight.current = true;
    setSyncingCloud(true);
    try {
      const result = await syncDeviceWithCloud({ replaceCloud });
      if (result.success) await refreshAllData();
      if (notify) alert(result.message);
      return result;
    } finally {
      syncInFlight.current = false;
      setSyncingCloud(false);
    }
  }, [refreshAllData]);

  const scheduleAutoSync = useCallback(() => {
    if (!isAdminRef.current || !isOnlineRef.current || syncInFlight.current) return;
    window.clearTimeout(autoSyncTimer.current);
    autoSyncTimer.current = window.setTimeout(() => {
      runCloudSync();
    }, 1200);
  }, [runCloudSync]);

  // Client Initialization + Offline Service Worker + Install App Prompt
  useEffect(() => {
    const todayTimer = window.setTimeout(() => setTodayStr(new Date().toISOString().slice(0, 10)), 0);

    const setup = async () => {
      await initDatabase();
      await refreshAllData();
      try {
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        setIsAdmin(session.authenticated === true);
        isAdminRef.current = session.authenticated === true;
        if (session.authenticated === true) scheduleAutoSync();
      } catch {
        setIsAdmin(false);
        isAdminRef.current = false;
      }
    };
    setup();

    // Register Offline Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Listen for Windows / Android PWA Install Prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleOnline = () => {
      isOnlineRef.current = true;
      setIsOnline(true);
      scheduleAutoSync();
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
      setIsOnline(false);
    };
    const handleFocus = () => scheduleAutoSync();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearTimeout(todayTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      window.clearTimeout(autoSyncTimer.current);
    };
  }, [refreshAllData, scheduleAutoSync]);

  useEffect(() => {
    isAdminRef.current = isAdmin;
    if (!isAdmin) return undefined;
    scheduleAutoSync();
    const interval = window.setInterval(scheduleAutoSync, 15000);
    return () => window.clearInterval(interval);
  }, [isAdmin, scheduleAutoSync]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [darkMode]);

  // Install App on Windows / Android / iOS
  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      alert(
        '📲 To Install Mujahid Electronic Goods App:\n\n' +
        '• On Windows Laptop (Chrome/Edge): Click the Install icon in the right side of the address bar.\n' +
        '• On Android Chrome: Tap ⋮ (Menu) -> "Add to Home screen / Install app".\n' +
        '• On iPhone (Safari): Tap Share -> "Add to Home Screen".'
      );
    }
  };

  // Cloud Sync Trigger
  const handleCloudSync = async () => {
    await runCloudSync({ notify: true });
  };

  const replaceCloudWithLocalData = async () => {
    await runCloudSync({ replaceCloud: true, notify: true });
  };

  const selectAdminTab = (tab) => {
    setAdminTab(tab);
    setAdminNavCollapsed(true);
    scheduleAutoSync();
  };

  // ================= CATEGORIES & 2-3 CHAR FUZZY SEARCH =================
  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['ALL', ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let baseList = selectedCategory === 'ALL'
      ? products
      : products.filter(p => p.category === selectedCategory);

    const q = searchQuery.trim().toLowerCase();
    if (!q) return baseList;

    const fuse = new Fuse(baseList, {
      keys: ['name', 'hi', 'ur', 'keywords', 'category'],
      threshold: 0.45,
      ignoreLocation: true,
      minMatchCharLength: 2
    });
    const fuseResults = fuse.search(q).map(r => r.item);

    const subResults = baseList.filter(p => {
      const hay = `${p.name} ${p.hi || ''} ${p.ur || ''} ${p.keywords || ''}`.toLowerCase();
      if (hay.includes(q)) return true;
      const tokens = q.split(/\s+/);
      return tokens.every(token => {
        let tIdx = 0;
        for (let i = 0; i < hay.length && tIdx < token.length; i++) {
          if (hay[i] === token[tIdx]) tIdx++;
        }
        return tIdx === token.length;
      });
    });

    const combined = [...fuseResults];
    subResults.forEach(item => {
      if (!combined.some(c => c.id === item.id)) combined.push(item);
    });
    return combined;
  }, [products, searchQuery, selectedCategory]);

  const featuredProducts = useMemo(
    () => products.filter(product => product.image).slice(0, 6),
    [products]
  );
  const activeFeaturedProduct = featuredProducts.length
    ? featuredProducts[featuredIndex % featuredProducts.length]
    : null;

  useEffect(() => {
    if (featuredProducts.length < 2) return undefined;
    const carouselTimer = window.setInterval(() => {
      setFeaturedIndex(index => (index + 1) % featuredProducts.length);
    }, 5000);
    return () => window.clearInterval(carouselTimer);
  }, [featuredProducts.length]);

  // ================= VOICE SEARCH =================
  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Use Chrome or Edge on Windows/Android for Voice Search!');
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'ur' ? 'ur-IN' : 'en-IN';
    setIsListening(true);
    recognition.start();
    recognition.onresult = (event) => {
      setSearchQuery(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  // ================= PUBLIC CUSTOMER MULTI-ITEM CART =================
  const addToPublicCart = (prod) => {
    setPublicCart(prev => {
      const exists = prev.find(i => i.id === prod.id);
      const requestedQty = (exists?.qty || 0) + 1;
      const availableStock = Number(prod.stock) || 0;
      if (requestedQty > availableStock) {
        alert(
          availableStock > 0
            ? `Only ${availableStock} unit${availableStock === 1 ? '' : 's'} of "${prod.name}" are currently available. Please contact us for more.`
            : `"${prod.name}" is currently unavailable. Please contact us for availability.`
        );
        return prev;
      }
      if (exists) return prev.map(i => i.id === prod.id ? { ...i, qty: requestedQty } : i);
      return [...prev, { ...prod, qty: 1 }];
    });
  };

  const publicCartTotal = publicCart.reduce((sum, i) => sum + i.qty * i.displayPrice, 0);

  const handlePublicBuyNow = (prod) => {
    if ((Number(prod.stock) || 0) < 1) {
      alert(`"${prod.name}" is currently unavailable. Please contact us for availability.`);
      return;
    }
    const message = `Salam! I want to buy *${prod.name}* (Price: ₹${prod.displayPrice}).`;
    window.open(`https://wa.me/${SHOP_CONFIG.primaryWhatsApp}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const sendPublicCartToWhatsApp = async () => {
    if (publicCart.length === 0) return;
    if (!publicCustomerName.trim() || !publicCustomerPhone.trim()) {
      alert('Please enter your name and mobile number before placing the order.');
      return;
    }
    const unavailableItem = publicCart.find(item => item.qty > (Number(products.find(product => product.id === item.id)?.stock) || 0));
    if (unavailableItem) {
      alert(`"${unavailableItem.name}" is no longer available in the requested quantity. Please adjust your cart or contact us.`);
      return;
    }
    const now = new Date();
    const orderNo = `ORD-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${now.getTime().toString().slice(-6)}`;
    const order = {
      orderNo,
      customerName: publicCustomerName.trim(),
      customerPhone: publicCustomerPhone.trim(),
      address: publicCustomerAddress.trim(),
      items: publicCart.map(({ id, name, qty, displayPrice }) => ({ id, name, qty, displayPrice })),
      total: publicCartTotal,
      status: 'NEW',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
    };
    await db.orders.add(order);
    let msg = `Assalamu Alaikum *${SHOP_CONFIG.name} (${SHOP_CONFIG.brand})*!\n`;
    msg += `Order No: *${orderNo}*\n`;
    msg += `I want to order the following items from your online store:\n`;
    msg += `--------------------------------\n`;
    publicCart.forEach((item, idx) => {
      msg += `${idx + 1}. *${item.name}* (${item.qty} x ₹${item.displayPrice}) = *₹${item.qty * item.displayPrice}*\n`;
    });
    msg += `--------------------------------\n`;
    msg += `*Estimated Order Total: ₹${publicCartTotal}*\n`;
    if (publicCustomerName) msg += `Customer Name: ${publicCustomerName}\n`;
    msg += `Mobile: ${publicCustomerPhone}\n`;
    if (publicCustomerAddress) msg += `Location / Note: ${publicCustomerAddress}\n`;
    window.open(`https://wa.me/${SHOP_CONFIG.primaryWhatsApp}?text=${encodeURIComponent(msg)}`, '_blank');
    setPublicCart([]);
    setPublicCustomerName('');
    setPublicCustomerPhone('');
    setPublicCustomerAddress('');
    setShowPublicCartModal(false);
    await refreshAllData();
  };

  // ================= IMAGE & INLINE STOCK HANDLERS =================
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });

  const handleUpdateProductImage = async (productId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    await db.products.update(productId, { image: base64, updatedAt: new Date().toISOString() });
    await refreshAllData();
  };

  const handleQuickStockAdjust = async (prod, delta) => {
    const nextStock = Math.max(0, (Number(prod.stock) || 0) + delta);
    const now = new Date().toISOString();
    await db.transaction('rw', db.products, db.stockMovements, db.auditLogs, async () => {
      await db.products.update(prod.id, { stock: nextStock, updatedAt: now });
      await db.stockMovements.add({
        productId: prod.id,
        type: 'ADJUSTMENT',
        quantity: nextStock - (Number(prod.stock) || 0),
        previousStock: Number(prod.stock) || 0,
        newStock: nextStock,
        createdAt: now,
        syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
      });
      await db.auditLogs.add({
        action: 'ADJUST_STOCK',
        entityType: 'product',
        entityId: prod.id,
        createdAt: now,
        syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
      });
    });
    await refreshAllData();
  };

  const handleEditProductPrice = async (prod) => {
    const newFixed = prompt(`Enter new Fixed Selling Price for "${prod.name}":`, prod.displayPrice);
    if (newFixed === null) return;
    const newCost = prompt(`Enter Secret Cost Price for "${prod.name}":`, prod.costPrice);
    await db.products.update(prod.id, {
      displayPrice: Number(newFixed) || prod.displayPrice,
      costPrice: newCost !== null ? Number(newCost) : prod.costPrice,
      updatedAt: new Date().toISOString()
    });
    await refreshAllData();
  };

  const handleDeleteSingleProduct = async (prod) => {
    if (!confirm(`Delete "${prod.name}" from stock?`)) return;
    await db.products.delete(prod.id);
    await refreshAllData();
  };

  // ================= RAW MATERIALS & KIT ASSEMBLY HANDLERS =================
  const handleAddRawMaterial = async (e) => {
    e.preventDefault();
    if (!newRaw.name) return alert('Enter Raw Material / Spare Part Name!');
    await db.rawMaterials.add({
      name: newRaw.name,
      stock: Number(newRaw.stock) || 0,
      unitCost: Number(newRaw.unitCost) || 0,
      qtyPerKit: Number(newRaw.qtyPerKit) || 1,
      updatedAt: new Date().toISOString()
    });
    setNewRaw({ name: '', stock: '', unitCost: '', qtyPerKit: '1' });
    await refreshAllData();
  };

  const handleAssembleDawatKit = async () => {
    const kitsToBuild = Number(prompt('How many complete "Dawat Mic Sets" do you want to assemble from raw materials?', '1')) || 0;
    if (kitsToBuild <= 0) return;

    // Check if enough raw materials exist
    for (const rm of rawMaterials) {
      const needed = (rm.qtyPerKit || 1) * kitsToBuild;
      if (rm.stock < needed) {
        return alert(`Not enough "${rm.name}" in stock! Needed: ${needed}, Available: ${rm.stock}`);
      }
    }

    // Deduct raw materials
    for (const rm of rawMaterials) {
      const needed = (rm.qtyPerKit || 1) * kitsToBuild;
      await db.rawMaterials.update(rm.id, { stock: rm.stock - needed, updatedAt: new Date().toISOString() });
    }

    // Add to Dawat Mic Complete Set finished stock
    const dawatProd = products.find(p => p.name.toLowerCase().includes('dawat mic'));
    if (dawatProd) {
      await db.products.update(dawatProd.id, {
        stock: (Number(dawatProd.stock) || 0) + kitsToBuild,
        arrivalDate: `Assembled on ${new Date().toLocaleString('en-IN')}`,
        updatedAt: new Date().toISOString()
      });
    }

    await refreshAllData();
    alert(`✅ Assembled ${kitsToBuild} Dawat Mic Set(s)! Raw materials deducted and finished goods stock increased.`);
  };

  // ================= ADMIN LOGIN =================
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPin })
      });
      const result = await response.json();
      if (!response.ok) {
        setLoginError(result.message || 'Unable to sign in.');
        return;
      }
      setIsAdmin(true);
      setShowLoginModal(false);
      setLoginPin('');
    } catch {
      setLoginError('Unable to reach the authentication service.');
    }
  };

  const handleAdminLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAdmin(false);
    setShowSecretCost(false);
    setCart([]);
  };

  // ================= POS CART & UDHAAR CALCULATIONS =================
  const addToCart = (prod) => {
    setCart(prev => {
      const exists = prev.find(item => item.id === prod.id);
      if (exists) {
        return prev.map(item => item.id === prod.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...prod, qty: 1, negotiatedPrice: prod.displayPrice }];
    });
  };

  const updateCartItem = (id, field, val) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        if (field === 'qty') return { ...item, qty: Math.max(1, Number(val) || 1) };
        if (field === 'negotiatedPrice') return { ...item, negotiatedPrice: Math.max(0, Number(val) || 0) };
        return item;
      })
    );
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const fixedSubtotal = cart.reduce((sum, i) => sum + i.qty * i.displayPrice, 0);
  const negotiatedSubtotal = cart.reduce((sum, i) => sum + i.qty * i.negotiatedPrice, 0);
  const totalSecretCost = cart.reduce((sum, i) => sum + i.qty * (i.costPrice || 0), 0);
  const finalPayable = Math.max(0, negotiatedSubtotal - (Number(extraDiscount) || 0));
  const estimatedBillProfit = finalPayable - totalSecretCost;

  const { paymentBreakdown, paidAmount, udhaarAmount } = calculatePayment({
    finalPayable,
    paymentMode,
    paidAmountInput,
    cashPaidInput,
    upiPaidInput,
    otherPaidInput
  });

  const activeQr = qrs.find(q => Number(q.id) === Number(selectedQrId)) || qrs[0] || {
    name: 'Mujahid Electronic Goods',
    upiId: '9625035483@ybl',
    customQrImage: ''
  };

  const dynamicQrUrl = activeQr.customQrImage
    ? activeQr.customQrImage
    : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        `upi://pay?pa=${activeQr.upiId}&pn=${encodeURIComponent(activeQr.name)}&am=${paidAmount > 0 ? paidAmount : finalPayable}&cu=INR`
      )}`;

  // ================= SAVE INVOICE + KHATA LEDGER =================
  const saveInvoiceToDb = async () => {
    if (cart.length === 0) {
      alert('Add at least 1 product to the bill first!');
      return null;
    }
    const now = new Date();
    const invoiceNo = `MEG-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${now.getTime().toString().slice(-6)}-${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
    const createdAt = now.toLocaleString('en-IN');
    const dateOnly = now.toLocaleDateString('en-IN');
    const dateKey = now.toISOString().slice(0, 10);
    const updatedAt = now.toISOString();

    const invoiceData = {
      invoiceNo,
      customerName: custName || 'Walk-in Customer',
      customerPhone: custPhone || '9625035483',
      customerEmail: custEmail || 'pluakalu@gmail.com',
      items: cart,
      fixedSubtotal,
      negotiatedSubtotal,
      extraDiscount: Number(extraDiscount) || 0,
      finalPayable,
      paidAmount,
      udhaarAmount,
      secretProfit: estimatedBillProfit,
      paymentMode: udhaarAmount > 0 && paidAmount === 0 ? 'UDHAAR' : paymentMode,
      paymentBreakdown,
      qrUsed: activeQr.name,
      upiIdUsed: activeQr.upiId,
      createdAt,
      createdAtIso: now.toISOString(),
      dateOnly,
      dateKey,
      updatedAt,
      syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
    };

    await db.transaction(
      'rw',
      db.invoices,
      db.products,
      db.khata,
      db.khataTransactions,
      db.stockMovements,
      db.auditLogs,
      async () => {
        await db.invoices.add(invoiceData);

        for (const item of cart) {
          const currentProd = await db.products.get(item.id);
          if (!currentProd) throw new Error(`Product "${item.name}" is no longer available.`);
          const availableStock = Number(currentProd.stock) || 0;
          if (item.qty > availableStock) {
            throw new Error(`Only ${availableStock} unit(s) of "${item.name}" remain in stock.`);
          }
          const newStock = availableStock - item.qty;
          await db.products.update(item.id, { stock: newStock, updatedAt });
          await db.stockMovements.add({
            productId: item.id,
            type: 'SALE',
            quantity: -item.qty,
            previousStock: availableStock,
            newStock,
            referenceId: invoiceNo,
            createdAt: updatedAt,
            syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
          });
        }

        if (udhaarAmount > 0) {
          const cleanPhone = (custPhone || '9625035483').trim();
          const existingKhata = await db.khata.where('customerPhone').equals(cleanPhone).first();
          if (existingKhata) {
            await db.khata.update(existingKhata.id, {
              customerName: custName || existingKhata.customerName,
              totalUdhaar: (existingKhata.totalUdhaar || 0) + udhaarAmount,
              updatedAt
            });
          } else {
            await db.khata.add({
              customerName: custName || 'Customer',
              customerPhone: cleanPhone,
              customerEmail: custEmail || 'pluakalu@gmail.com',
              totalUdhaar: udhaarAmount,
              updatedAt
            });
          }
          await db.khataTransactions.add({
            customerPhone: cleanPhone,
            customerName: custName || 'Customer',
            type: 'CREDIT',
            amount: udhaarAmount,
            invoiceNo,
            createdAt: updatedAt,
            syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
          });
        }

        await db.auditLogs.add({
          action: 'CREATE',
          entityType: 'invoice',
          entityId: invoiceNo,
          createdAt: updatedAt,
          syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
        });
      }
    );

    await refreshAllData();
    return invoiceData;
  };

  const resetCartAfterSale = () => {
    setCart([]);
    setExtraDiscount(0);
    setPaidAmountInput('');
    setCashPaidInput('');
    setUpiPaidInput('');
    setOtherPaidInput('');
  };

  const buildBillText = (inv) => {
    let text = `*${SHOP_CONFIG.name} (${SHOP_CONFIG.brand})*\n`;
    text += `${SHOP_CONFIG.address}\n`;
    text += `Phone: ${SHOP_CONFIG.phones.join(', ')}\n`;
    text += `--------------------------------\n`;
    text += `Bill No: *${inv.invoiceNo}* | Date: ${inv.createdAt}\n`;
    text += `Customer: ${inv.customerName} (${inv.customerPhone})\n`;
    text += `--------------------------------\n`;
    inv.items.forEach((item, idx) => {
      text += `${idx + 1}. *${item.name}* (${item.warranty || 'Standard'})\n   ${item.qty} x ₹${item.negotiatedPrice} = *₹${item.qty * item.negotiatedPrice}*\n`;
    });
    text += `--------------------------------\n`;
    text += `*FINAL BILL: ₹${inv.finalPayable}*\n`;
    text += `Paid Now: *₹${inv.paidAmount}* (${inv.paymentMode})\n`;
    if (inv.udhaarAmount > 0) {
      text += `*BALANCE UDHAAR (DUE): ₹${inv.udhaarAmount}*\n`;
    }
    text += `Pay via UPI: *${inv.upiIdUsed}* (${inv.qrUsed})\n`;
    text += `Thank you for shopping at Mujahid Electronic Goods!`;
    return text;
  };

  const handleSaveAndWhatsApp = async () => {
    const inv = await saveInvoiceToDb();
    if (!inv) return;
    const msg = buildBillText(inv);
    const cleanPhone = (custPhone || '9625035483').replace(/\D/g, '').slice(-10);
    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    resetCartAfterSale();
  };

  const handleSaveAndEmail = async () => {
    const inv = await saveInvoiceToDb();
    if (!inv) return;
    setSendingEmail(true);
    try {
      const res = await fetch('/api/send-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice: inv })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Bill ${inv.invoiceNo} emailed directly from saqib29abubakar@gmail.com to ${inv.customerEmail}!`);
      } else {
        const msg = buildBillText(inv).replace(/\*/g, '');
        const subject = `Cash Memo ${inv.invoiceNo} - ${SHOP_CONFIG.name}`;
        window.open(
          `mailto:${inv.customerEmail}?cc=saqib29abubakar@gmail.com&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`,
          '_self'
        );
      }
    } catch (err) {
      const msg = buildBillText(inv).replace(/\*/g, '');
      window.open(`mailto:${inv.customerEmail}?subject=Bill ${inv.invoiceNo}&body=${encodeURIComponent(msg)}`, '_self');
    } finally {
      setSendingEmail(false);
      resetCartAfterSale();
    }
  };

  const handleSaveAndPDF = async () => {
    const inv = await saveInvoiceToDb();
    if (!inv) return;
    generateInvoicePDF(inv);
    resetCartAfterSale();
  };

  // ================= KHATA & EXPENSES HANDLERS =================
  const handleSettleKhata = async (khataItem) => {
    const amountStr = prompt(`Enter amount received from ${khataItem.customerName} (Due: ₹${khataItem.totalUdhaar}):`, khataItem.totalUdhaar);
    if (!amountStr) return;
    const received = Number(amountStr) || 0;
    if (received <= 0) return alert('Enter an amount greater than zero.');
    const newBalance = Math.max(0, khataItem.totalUdhaar - received);
    const now = new Date();
    await db.transaction('rw', db.khata, db.khataTransactions, async () => {
      if (newBalance === 0) {
        await db.khata.delete(khataItem.id);
      } else {
        await db.khata.update(khataItem.id, {
          totalUdhaar: newBalance,
          updatedAt: now.toISOString()
        });
      }
      await db.khataTransactions.add({
        customerPhone: khataItem.customerPhone,
        customerName: khataItem.customerName,
        type: 'PAYMENT',
        amount: Math.min(received, khataItem.totalUdhaar),
        paymentMode: 'CASH_OR_UPI',
        createdAt: now.toISOString(),
        syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
      });
    });
    await refreshAllData();
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return alert('Enter Expense Reason & Amount!');
    const now = new Date();
    await db.expenses.add({
      title: newExpense.title,
      amount: Number(newExpense.amount) || 0,
      category: newExpense.category,
      dateOnly: now.toLocaleDateString('en-IN'),
      dateKey: now.toISOString().slice(0, 10),
      createdAt: now.toLocaleString('en-IN'),
      createdAtIso: now.toISOString(),
      updatedAt: now.toISOString(),
      syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
    });
    setNewExpense({ title: '', amount: '', category: 'Shop Kharcha' });
    await refreshAllData();
  };

  // ================= DAILY GALLA & PROFIT CALCULATIONS =================
  const [todayYear, todayMonth, todayDay] = todayStr.split('-');
  const todayDisplayStr = todayYear ? `${todayDay}/${todayMonth}/${todayYear}` : '';
  const todayInvoices = invoices.filter(inv => todayStr && (inv.dateKey === todayStr || inv.dateOnly === todayDisplayStr));
  const todayExpensesList = expenses.filter(exp => todayStr && (exp.dateKey === todayStr || exp.dateOnly === todayDisplayStr));
  const todayTotalSales = todayInvoices.reduce((s, i) => s + (i.finalPayable || 0), 0);
  const todayCashCollected = todayInvoices.reduce((s, i) => s + (i.paymentBreakdown?.cash ?? (i.paymentMode === 'CASH' ? i.paidAmount || 0 : 0)), 0);
  const todayUpiCollected = todayInvoices.reduce((s, i) => s + (i.paymentBreakdown?.upi ?? (i.paymentMode === 'UPI' ? i.paidAmount || 0 : 0)), 0);
  const todayUdhaarGiven = todayInvoices.reduce((s, i) => s + (i.udhaarAmount || 0), 0);
  const todayTotalExpenses = todayExpensesList.reduce((s, e) => s + (e.amount || 0), 0);
  const netCashInGalla = todayCashCollected - todayTotalExpenses;
  const todayNetProfit = todayInvoices.reduce((s, i) => s + (i.secretProfit || 0), 0) - todayTotalExpenses;
  const totalMarketUdhaarPending = khataList.reduce((s, k) => s + (k.totalUdhaar || 0), 0);
  const lowStockProducts = products.filter(product => Number(product.stock) <= 3);
  const pendingRepairs = repairs.filter(repair => !['Delivered', 'Collected', 'Completed'].includes(repair.status));
  const recentInvoices = invoices.slice(0, 5);

  // ================= BACKUP, RESTORE & FACTORY RESET HANDLERS =================
  const handleDownloadBackup = async () => {
    const backupObj = {
      timestamp: new Date().toISOString(),
      shop: SHOP_CONFIG.name,
      products: await db.products.toArray(),
      invoices: await db.invoices.toArray(),
      khata: await db.khata.toArray(),
      repairs: await db.repairs.toArray(),
      expenses: await db.expenses.toArray(),
      rawMaterials: await db.rawMaterials.toArray(),
      qrs: await db.qrs.toArray(),
      stockMovements: await db.stockMovements.toArray(),
      khataTransactions: await db.khataTransactions.toArray(),
      auditLogs: await db.auditLogs.toArray(),
      orders: await db.orders.toArray(),
      repairPayments: await db.repairPayments.toArray()
    };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mujahid_Electronics_Backup_${todayStr.replace(/\//g, '-') || 'Full'}.json`;
    a.click();
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (data.products) { await db.products.clear(); await db.products.bulkPut(data.products); }
      if (data.invoices) { await db.invoices.clear(); await db.invoices.bulkPut(data.invoices); }
      if (data.khata) { await db.khata.clear(); await db.khata.bulkPut(data.khata); }
      if (data.repairs) { await db.repairs.clear(); await db.repairs.bulkPut(data.repairs); }
      if (data.expenses) { await db.expenses.clear(); await db.expenses.bulkPut(data.expenses); }
      if (data.rawMaterials) { await db.rawMaterials.clear(); await db.rawMaterials.bulkPut(data.rawMaterials); }
      if (data.qrs) { await db.qrs.clear(); await db.qrs.bulkPut(data.qrs); }
      if (data.stockMovements) { await db.stockMovements.clear(); await db.stockMovements.bulkPut(data.stockMovements); }
      if (data.khataTransactions) { await db.khataTransactions.clear(); await db.khataTransactions.bulkPut(data.khataTransactions); }
      if (data.auditLogs) { await db.auditLogs.clear(); await db.auditLogs.bulkPut(data.auditLogs); }
      if (data.orders) { await db.orders.clear(); await db.orders.bulkPut(data.orders); }
      if (data.repairPayments) { await db.repairPayments.clear(); await db.repairPayments.bulkPut(data.repairPayments); }
      await refreshAllData();
      alert('✅ Full Shop Database Restored Successfully!');
    } catch (err) {
      alert('Invalid backup file.');
    }
  };

  const handleClearTestBillsOnly = async () => {
    if (!confirm('Clear all test Bills, Udhaar Khata, Repairs, and Expenses while keeping your Products and UPI QRs?')) return;
    await clearTestTransactionsOnly();
    await refreshAllData();
    alert('✅ All test bills, khata, and repairs cleared! Your products and QRs are ready for the shopkeeper.');
  };

  const handleWipeEverythingForHandover = async () => {
    const check = prompt('⚠️ DANGER: Type DELETE to wipe 100% of the database (including all products, bills, khata, repairs) to start from complete zero:');
    if (check !== 'DELETE') return;
    await wipeEntireDatabaseClean();
    setCart([]);
    await refreshAllData();
    await replaceCloudWithLocalData();
    alert('🧹 Database 100% wiped clean! You can now hand over a fresh system from scratch.');
  };

  const handleReloadDemoData = async () => {
    if (!confirm('Reload the 8 default shop products (Ahuja NBA-15, Dawat Mic, Ajanta Clock, etc.) and default QRs?')) return;
    await reloadDefaultShopData();
    await refreshAllData();
    await replaceCloudWithLocalData();
    alert('✅ Default shop products and QRs restored!');
  };

  // ================= ADD PRODUCT, QR, REPAIR =================
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProd.name || !newProd.displayPrice) return alert('Enter Item Name & Fixed Price!');
    const arrivalStamp = newProd.isLegacyStock
      ? 'Existing / Old Stock (Date Unknown)'
      : newProd.arrivalDate
      ? new Date(newProd.arrivalDate).toLocaleString('en-IN')
      : new Date().toLocaleString('en-IN');

    await db.products.add({
      name: newProd.name,
      hi: newProd.hi || newProd.name,
      ur: newProd.ur || newProd.name,
      category: newProd.category || 'Electronics',
      keywords: newProd.keywords,
      displayPrice: Number(newProd.displayPrice),
      minPrice: Number(newProd.minPrice) || Number(newProd.displayPrice),
      costPrice: Number(newProd.costPrice) || 0,
      stock: Number(newProd.stock) || 0,
      warranty: newProd.warranty || 'No Warranty',
      isLegacyStock: newProd.isLegacyStock,
      arrivalDate: arrivalStamp,
      itemType: 'FINISHED_GOOD',
      image: newProd.image || 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80',
      updatedAt: new Date().toISOString(),
      syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
    });
    setNewProd({
      name: '', hi: '', ur: '', category: 'Portable PA & Mics', keywords: '',
      displayPrice: '', minPrice: '', costPrice: '', stock: '',
      warranty: '6 Months Warranty', isLegacyStock: false, arrivalDate: '', image: ''
    });
    await refreshAllData();
  };

  const handleAddQr = async (e) => {
    e.preventDefault();
    if (!newQr.name || (!newQr.upiId && !newQr.customQrImage)) return alert('Enter Name and UPI ID!');
    await db.qrs.add(newQr);
    setNewQr({ name: '', upiId: '', customQrImage: '' });
    await refreshAllData();
  };

  const handleAddRepair = async (e) => {
    e.preventDefault();
    if (!newRepair.customerName || !newRepair.itemName) return alert('Enter Customer & Repair Item!');
    const tokenNo = `REP-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();
    const advancePaid = Number(newRepair.advancePaid) || 0;
    await db.transaction('rw', db.repairs, db.repairPayments, async () => {
      await db.repairs.add({
        ...newRepair,
        tokenNo,
        estimatedCost: Number(newRepair.estimatedCost) || 0,
        advancePaid,
        status: 'Received',
        createdAt: new Date().toLocaleString('en-IN'),
        updatedAt: now,
        syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
      });
      if (advancePaid > 0) {
        await db.repairPayments.add({
          tokenNo,
          type: 'ADVANCE',
          amount: advancePaid,
          createdAt: now,
          syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
        });
      }
    });
    setNewRepair({ ...newRepair, itemName: '', estimatedCost: '', advancePaid: '' });
    await refreshAllData();
  };

  const getProductName = (p) => (lang === 'hi' && p.hi ? p.hi : lang === 'ur' && p.ur ? p.ur : p.name);

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-200 ${lang === 'ur' ? 'rtl' : ''}`}>
      
      {/* ==================== TOP MULTI-DEVICE NAVBAR ==================== */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* Brand Identity */}
          <div
            onClick={() => { setIsAdmin(false); setPublicSection('store'); }}
            className="flex items-center gap-3 cursor-pointer min-w-0 max-w-full"
          >
            <img
              src="/favicon.ico"
              alt={`${SHOP_CONFIG.name} icon`}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-emerald-500/30 shadow-md shrink-0 object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="font-black text-sm sm:text-xl tracking-tight text-slate-900 dark:text-white truncate">
                  {SHOP_CONFIG.name}
                </h1>
                <span className="hidden md:inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {SHOP_CONFIG.tagline}
                </span>
              </div>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Kanhaiya+Market+Hazrat+Nizamuddin+Delhi+110013"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 hover:text-emerald-500 transition min-w-0"
              >
                <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="truncate">{SHOP_CONFIG.address}</span>
              </a>
            </div>
          </div>

          {/* Public Navigation Links */}
          {!isAdmin && (
            <nav className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setPublicSection('store')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  publicSection === 'store'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Store className="w-3.5 h-3.5" /> Catalog
              </button>
              <button
                onClick={() => setPublicSection('track')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  publicSection === 'track'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" /> Track Repair / Bill
              </button>
              <button
                onClick={() => setPublicSection('about')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  publicSection === 'about'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Info className="w-3.5 h-3.5" /> About Shop
              </button>
            </nav>
          )}

          {/* Right Controls: Install App, Cloud Sync, Language, Theme, Admin Switch */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Install App on Windows / Phone Button */}
            <button
              onClick={handleInstallApp}
              className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 hover:bg-emerald-500/20 cursor-pointer"
              title="Install App on Windows Desktop, Android or iPhone"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
            </button>

            {/* Public Cart Button */}
            {!isAdmin && publicCart.length > 0 && (
              <button
                onClick={() => setShowPublicCartModal(true)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 flex items-center gap-1.5 shadow cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Cart ({publicCart.reduce((s, i) => s + i.qty, 0)})
              </button>
            )}

            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
            >
              <option value="en">🇬🇧 EN</option>
              <option value="hi">🇮🇳 हिन्दी</option>
              <option value="ur">🇮🇳 اردو</option>
            </select>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {isAdmin ? (
              <button
                onClick={handleAdminLogout}
                className="text-xs font-bold px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" /> Public Store
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" /> Admin POS
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ==================== MAIN BODY ==================== */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 flex-1 space-y-6">
        
        {/* ==================== VIEW 1: PUBLIC CUSTOMER WEBSITE ==================== */}
        {!isAdmin && (
          <>
            {publicSection === 'store' && (
              <div className="space-y-6">
                <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-emerald-500/20">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold">
                      <ShieldCheck className="w-4 h-4 text-emerald-300" /> Official Electronics Store
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black">
                      Portable PA Systems, Mics, Amplifiers & Home Electronics
                    </h2>
                    <p className="text-xs sm:text-sm text-emerald-100 flex flex-wrap gap-4 pt-1">
                      <span>📍 Shop No. 2, 165, Kanhaiya Market, Hazrat Nizamuddin, Delhi-13</span>
                      <span>📞 +91 8802572514, +91 8595431454</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <a
                      href={`https://wa.me/${SHOP_CONFIG.primaryWhatsApp}?text=${encodeURIComponent('Assalamu Alaikum! I want to inquire about electronics at Mujahid Electronic Goods.')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-white text-emerald-900 font-bold px-5 py-3 rounded-2xl text-xs sm:text-sm shadow-lg flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" /> WhatsApp Inquiry
                    </a>
                  </div>
                </div>

                {featuredProducts.length > 0 && (
                  <section className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-900 shadow-xl">
                    <div className="grid md:grid-cols-2 min-h-[230px]">
                      <div className="relative min-h-[220px] md:min-h-0 bg-slate-800">
                        <img
                          src={activeFeaturedProduct.image}
                          alt={activeFeaturedProduct.name}
                          className="absolute inset-0 w-full h-full object-cover opacity-85"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/20 via-slate-950/20 to-slate-950/80" />
                        <span className="absolute top-4 left-4 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                          Featured collection
                        </span>
                      </div>
                      <div className="flex flex-col justify-center p-6 sm:p-8 text-white">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Shop highlights</p>
                        <h3 className="mt-2 text-2xl sm:text-3xl font-black leading-tight break-words">
                          {getProductName(activeFeaturedProduct)}
                        </h3>
                        <p className="mt-2 text-sm text-slate-300">
                          Reliable audio, home and everyday electronics with direct WhatsApp ordering.
                        </p>
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <button
                            onClick={() => addToPublicCart(activeFeaturedProduct)}
                            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-white shadow hover:bg-emerald-400 cursor-pointer"
                          >
                            Add to Cart
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCategory(activeFeaturedProduct.category || 'ALL');
                              setSearchQuery('');
                            }}
                            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 cursor-pointer"
                          >
                            Browse similar
                          </button>
                          <div className="ml-auto flex items-center gap-1">
                            <button
                              onClick={() => setFeaturedIndex(index => (index - 1 + featuredProducts.length) % featuredProducts.length)}
                              aria-label="Previous featured product"
                              className="rounded-lg bg-white/10 p-2 hover:bg-white/20 cursor-pointer"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setFeaturedIndex(index => (index + 1) % featuredProducts.length)}
                              aria-label="Next featured product"
                              className="rounded-lg bg-white/10 p-2 hover:bg-white/20 cursor-pointer"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-1.5">
                          {featuredProducts.map((product, index) => (
                            <button
                              key={product.id}
                              onClick={() => setFeaturedIndex(index)}
                              aria-label={`Show featured product ${index + 1}`}
                              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                index === featuredIndex ? 'w-8 bg-emerald-400' : 'w-2 bg-white/30'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                <section className="trust-strip grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {[
                    { icon: ShieldCheck, title: 'Genuine products', detail: 'Trusted shop selection' },
                    { icon: Award, title: 'Warranty support', detail: 'Clear product coverage' },
                    { icon: Wrench, title: 'Expert repairs', detail: 'Audio and electronics service' },
                    { icon: Send, title: 'WhatsApp ordering', detail: 'Fast local assistance' }
                  ].map(({ icon: Icon, title, detail }) => (
                    <div key={title} className="trust-item">
                      <Icon className="h-5 w-5 text-cyan-400 shrink-0" />
                      <div className="min-w-0">
                        <strong>{title}</strong>
                        <span>{detail}</span>
                      </div>
                    </div>
                  ))}
                </section>

                {/* Search + Voice Bar */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type 2-3 letters ('ahu', 'thr', 'tar', 'shv', 'olc', 'daw') or tap Speak..."
                      className="w-full pl-12 pr-14 py-3 rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 outline-none text-sm sm:text-base shadow-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3.5 top-3 text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-lg"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleVoiceSearch}
                    className={`px-4 py-3 rounded-2xl font-bold text-white flex items-center gap-2 shadow cursor-pointer ${
                      isListening ? 'bg-red-600 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                    <span className="hidden sm:inline text-sm">{isListening ? 'Listening...' : 'Speak'}</span>
                  </button>
                </div>

                {/* Category Filter Pills */}
                <div className="flex w-full min-w-0 max-w-full items-center gap-2 overflow-x-auto pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {filteredProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="group bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-500/60 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative h-40 sm:h-48 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                          <span className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300">
                            🛡️ {prod.warranty || 'Standard'}
                          </span>
                        </div>
                        <div className="p-4 min-w-0">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-500">{prod.category}</span>
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5 break-words leading-snug">{getProductName(prod)}</h3>
                          {getProductName(prod) !== prod.name && <p className="text-xs text-slate-400 mt-1 break-words">{prod.name}</p>}
                        </div>
                      </div>
                      <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-end justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[11px] text-slate-400 block">Fixed Price</span>
                          <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{prod.displayPrice}</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1.5 ml-auto">
                          <button
                            onClick={() => addToPublicCart(prod)}
                            className="bg-slate-100 dark:bg-slate-700 hover:bg-emerald-500/20 text-xs font-bold px-2.5 sm:px-3 py-2.5 rounded-xl cursor-pointer whitespace-nowrap"
                            title="Add to Multi-Item Order Cart"
                          >
                            + Cart
                          </button>
                          <a
                            href={`https://wa.me/${SHOP_CONFIG.primaryWhatsApp}?text=${encodeURIComponent(`Salam! I want to buy *${prod.name}* (Price: ₹${prod.displayPrice}).`)}`}
                            onClick={(event) => {
                              event.preventDefault();
                              handlePublicBuyNow(prod);
                            }}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 sm:px-3.5 py-2.5 rounded-xl shadow whitespace-nowrap"
                          >
                            Buy Now
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PUBLIC SUB-VIEW B: TRACK REPAIR OR BILL */}
            {publicSection === 'track' && (
              <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">Track Your Repair Status or Bill Warranty</h2>
                    <p className="text-xs text-slate-400">
                      Enter your mobile number (e.g. 9625035483) or Repair Token (e.g. REP-101).
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  value={publicTrackQuery}
                  onChange={(e) => setPublicTrackQuery(e.target.value)}
                  placeholder="Enter Mobile Number or Token Number (e.g. 9625035483 or REP-101)..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700/80 border-2 border-slate-200 dark:border-slate-600 focus:border-emerald-500 outline-none text-sm"
                />

                {publicTrackQuery.trim().length >= 3 && (
                  <div className="space-y-4 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500">Matching Repair Tickets</h3>
                    {repairs
                      .filter(r =>
                        r.customerPhone?.includes(publicTrackQuery.trim()) ||
                        r.tokenNo?.toLowerCase().includes(publicTrackQuery.trim().toLowerCase())
                      )
                      .map(r => (
                        <div key={r.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-black text-emerald-500 text-sm">{r.tokenNo}</span> — <b>{r.customerName}</b>
                            <p className="text-slate-400 mt-1">{r.itemName} | Logged: {r.createdAt}</p>
                          </div>
                          <div className="text-right">
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">{r.status}</span>
                            <p className="mt-1 font-bold">Est: ₹{r.estimatedCost}</p>
                          </div>
                        </div>
                      ))}

                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500 pt-2">Matching Purchase Bills & Warranty</h3>
                    {invoices
                      .filter(inv =>
                        inv.customerPhone?.includes(publicTrackQuery.trim()) ||
                        inv.invoiceNo?.toLowerCase().includes(publicTrackQuery.trim().toLowerCase())
                      )
                      .map(inv => (
                        <div key={inv.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-black text-emerald-500 text-sm">{inv.invoiceNo}</span> — Purchased on {inv.createdAt}
                            <p className="text-slate-400 mt-1">
                              {inv.items?.map(i => `${i.name} (${i.warranty || 'Standard'})`).join(', ')}
                            </p>
                          </div>
                          <button
                            onClick={() => generateInvoicePDF(inv)}
                            className="bg-emerald-600 text-white px-3 py-2 rounded-xl font-bold cursor-pointer"
                          >
                            📥 Bill PDF
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* PUBLIC SUB-VIEW C: ABOUT SHOP */}
            {publicSection === 'about' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg space-y-5">
                  <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold">
                    <Award className="w-4 h-4" /> Official Store in Hazrat Nizamuddin
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black">
                    {SHOP_CONFIG.name}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Welcome to <b>Mujahid Electronic Goods</b>, the trusted source for portable PA mic systems, custom printed leather bags, Ahuja amplifiers, vocal microphones, heavy-duty cables, Ajanta wall clocks, Milton flasks, and grooming machines.
                  </p>
                </div>

                <div className="md:col-span-5 bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg space-y-4 flex flex-col justify-between">
                  <div className="space-y-3 text-xs sm:text-sm">
                    <h3 className="text-lg font-black flex items-center gap-2">
                      <Compass className="w-5 h-5 text-emerald-500 map-pulse" /> Visit Our Shop
                    </h3>
                    <p><b>Address:</b> {SHOP_CONFIG.address}</p>
                    <p><b>Phones:</b> {SHOP_CONFIG.phones.join(' , ')}</p>
                    <p><b>Timings:</b> 10:00 AM – 9:30 PM (Open All Week)</p>
                  </div>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Kanhaiya+Market+Hazrat+Nizamuddin+Delhi+110013"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow transition"
                  >
                    <MapPin className="w-4 h-4 map-pulse" /> Open Location in Google Maps
                  </a>
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================== VIEW 2: PROTECTED ADMIN SUITE ==================== */}
        {isAdmin && (
          <div className="admin-suite space-y-6">
            
            {/* Admin Navigation Bar */}
            <div className={`admin-navigation bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${adminNavCollapsed ? 'admin-navigation-collapsed' : ''}`}>
              <div className="admin-nav-heading">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">Management workspace</p>
                  <p className="admin-nav-subtitle text-xs text-slate-500 dark:text-slate-400 mt-1">Select a workspace to manage the shop</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex status-pill">{isOnline ? '● Synced' : '● Offline'}</span>
                  <button
                    onClick={handleCloudSync}
                    disabled={syncingCloud}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1 cursor-pointer"
                  >
                    <Cloud className="w-3.5 h-3.5" /> {syncingCloud ? 'Syncing...' : 'Sync Cloud'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminNavCollapsed((collapsed) => !collapsed)}
                    className="admin-nav-toggle px-2.5 py-2 rounded-xl text-xs font-bold border border-slate-500/30 text-slate-400 cursor-pointer"
                    aria-expanded={!adminNavCollapsed}
                  >
                    {adminNavCollapsed ? 'Menu' : 'Minimize'}
                  </button>
                </div>
              </div>
              <div className="admin-nav-items" aria-hidden={adminNavCollapsed}>
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { id: 'pos', label: 'Billing (POS)', icon: ShoppingCart },
                  { id: 'khata', label: `Udhaar Khata (${khataList.length})`, icon: BookOpen },
                  { id: 'orders', label: `Online Orders (${orders.filter(o => o.status === 'NEW').length})`, icon: ShoppingBag },
                  { id: 'hisaab', label: 'Daily Galla & Kharcha', icon: TrendingUp },
                  { id: 'warranty', label: 'Warranty & Bills', icon: History },
                  { id: 'stock', label: `Stock (${products.length})`, icon: Package },
                  { id: 'raw', label: 'Raw Materials & Assembly', icon: Layers },
                  { id: 'qrs', label: 'Shopkeeper QRs', icon: QrCode },
                  { id: 'repairs', label: 'Repairs', icon: Wrench },
                  { id: 'backup', label: 'Reset DB & Cloud', icon: Database }
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => selectAdminTab(t.id)}
                      aria-current={adminTab === t.id ? 'page' : undefined}
                      className={`admin-nav-item px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        adminTab === t.id
                          ? 'bg-cyan-500 text-slate-950 shadow'
                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="admin-nav-tools flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setShowSecretCost(!showSecretCost)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border cursor-pointer ${
                    showSecretCost
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {showSecretCost ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showSecretCost ? 'Cost Visible' : 'Cost Hidden'}
                </button>
              </div>
            </div>

            {/* Admin Search Bar */}
            {(adminTab === 'pos' || adminTab === 'stock') && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Fast Search: Type 2-3 letters ('ahu', 'thr', 'tar', 'shv', 'olc')..."
                    className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm outline-none"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-xs text-slate-400">✕</button>
                  )}
                </div>
                <button onClick={handleVoiceSearch} className="px-3.5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
                  <Mic className="w-4 h-4" /> Speak
                </button>
              </div>
            )}

            {adminTab === 'dashboard' && (
              <section className="admin-dashboard space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Shop management</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Business Dashboard</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Live summary from your local shop records.</p>
                  </div>
                  <span className="status-pill">{isOnline ? '● Online sync available' : '● Offline mode'}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Today Sales', value: `₹${todayTotalSales.toLocaleString('en-IN')}`, detail: `${todayInvoices.length} invoices`, tone: 'cyan' },
                    { label: 'Cash Collected', value: `₹${todayCashCollected.toLocaleString('en-IN')}`, detail: 'After cash payments', tone: 'blue' },
                    { label: 'UPI Collected', value: `₹${todayUpiCollected.toLocaleString('en-IN')}`, detail: 'QR and UPI receipts', tone: 'violet' },
                    { label: 'Outstanding Dues', value: `₹${totalMarketUdhaarPending.toLocaleString('en-IN')}`, detail: `${khataList.length} customers`, tone: 'amber' },
                    { label: 'Today Expenses', value: `₹${todayTotalExpenses.toLocaleString('en-IN')}`, detail: `${todayExpensesList.length} entries`, tone: 'orange' },
                    { label: 'Estimated Profit', value: showSecretCost ? `₹${todayNetProfit.toLocaleString('en-IN')}` : '••••', detail: showSecretCost ? 'After expenses' : 'Reveal cost view', tone: 'green' },
                    { label: 'Pending Repairs', value: pendingRepairs.length, detail: 'Open service tickets', tone: 'blue' },
                    { label: 'Low Stock Alerts', value: lowStockProducts.length, detail: 'At or below 3 units', tone: 'red' }
                  ].map(metric => (
                    <div key={metric.label} className={`metric-card metric-${metric.tone}`}>
                      <p>{metric.label}</p>
                      <strong>{metric.value}</strong>
                      <span>{metric.detail}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                  <div className="xl:col-span-7 premium-panel">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-black text-base">Recent invoices</h3>
                        <p className="text-xs text-slate-400">Latest saved billing activity</p>
                      </div>
                      <button onClick={() => setAdminTab('pos')} className="text-xs font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer">Open POS →</button>
                    </div>
                    {recentInvoices.length === 0 ? (
                      <p className="empty-state">No invoices have been saved yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {recentInvoices.map(invoice => (
                          <div key={invoice.invoiceNo || invoice.id} className="activity-row">
                            <div className="min-w-0">
                              <strong>{invoice.invoiceNo}</strong>
                              <span className="block truncate">{invoice.customerName || 'Customer'} · {invoice.createdAt}</span>
                            </div>
                            <b>₹{Number(invoice.finalPayable || 0).toLocaleString('en-IN')}</b>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="xl:col-span-5 premium-panel">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-black text-base">Stock attention</h3>
                        <p className="text-xs text-slate-400">Products needing a review</p>
                      </div>
                      <button onClick={() => setAdminTab('stock')} className="text-xs font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer">Manage stock →</button>
                    </div>
                    {lowStockProducts.length === 0 ? (
                      <p className="empty-state">All products have healthy stock levels.</p>
                    ) : (
                      <div className="space-y-2">
                        {lowStockProducts.slice(0, 5).map(product => (
                          <div key={product.id} className="activity-row">
                            <span className="min-w-0 truncate">{getProductName(product)}</span>
                            <b className={Number(product.stock) === 0 ? 'text-red-400' : 'text-amber-400'}>{product.stock} left</b>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ==================== TAB 1: COUNTER BILLING (POS) ==================== */}
            {adminTab === 'pos' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="admin-product-grid lg:col-span-7 grid gap-3.5 max-h-[75vh] overflow-y-auto pr-1">
                  {filteredProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="admin-product-card bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 hover:border-cyan-500 transition grid grid-cols-[64px_minmax(0,1fr)_auto] gap-3 items-center shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => addToCart(prod)}
                        className="contents cursor-pointer"
                        aria-label={`Add ${getProductName(prod)} to bill`}
                      >
                        <img src={prod.image} alt={prod.name} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                        <div className="min-w-0 self-stretch flex flex-col justify-center">
                          <h4 className="font-bold text-sm leading-snug break-words [overflow-wrap:anywhere] line-clamp-3">{getProductName(prod)}</h4>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                            <span className={`font-bold ${prod.stock <= 3 ? 'text-red-500' : 'text-emerald-500'}`}>
                              {prod.stock > 0 ? `Stock: ${prod.stock}` : 'Out of stock'}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="inline-flex items-center gap-1 min-w-0">
                              <ShieldCheck className="w-3 h-3 shrink-0 text-cyan-400" />
                              <span className="break-words [overflow-wrap:anywhere]">{prod.warranty || 'Standard warranty'}</span>
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 break-words [overflow-wrap:anywhere]">
                            {prod.isLegacyStock ? '📦 Old Stock' : `🕒 ${prod.arrivalDate || 'Arrival date not set'}`}
                          </p>
                          {showSecretCost && (
                            <p className="text-[11px] font-bold text-amber-500 mt-0.5 break-words [overflow-wrap:anywhere]">
                              Cost: ₹{Number(prod.costPrice || 0).toLocaleString('en-IN')} • Min: ₹{Number(prod.minPrice || 0).toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                      </button>

                      <div className="min-w-[78px] flex flex-col items-end gap-2">
                        <span className="text-base sm:text-lg font-black text-cyan-600 dark:text-cyan-300 whitespace-nowrap">
                          ₹{Number(prod.displayPrice || 0).toLocaleString('en-IN')}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <label className="cursor-pointer p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-cyan-400" title="Upload Real Photo">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpdateProductImage(prod.id, e)} />
                          </label>
                          <button
                            type="button"
                            onClick={() => addToCart(prod)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg cursor-pointer whitespace-nowrap"
                          >
                            + Bill
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right 5 Cols: Active Cash Memo */}
                <div id="printable-receipt" className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-3">
                      <div>
                        <h3 className="font-black text-base uppercase">{SHOP_CONFIG.name}</h3>
                        <p className="text-[11px] text-slate-400">{SHOP_CONFIG.address}</p>
                        <p className="text-[11px] text-slate-400">📞 {SHOP_CONFIG.phones.join(' | ')}</p>
                      </div>
                      <button onClick={resetCartAfterSale} className="text-xs text-red-500 font-bold cursor-pointer">Clear</button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 my-3">
                      <input
                        type="text"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        placeholder="Customer Name"
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/70 text-xs font-medium outline-none"
                      />
                      <input
                        type="tel"
                        value={custPhone}
                        onChange={(e) => setCustPhone(e.target.value)}
                        placeholder="WhatsApp Mobile"
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/70 text-xs font-medium outline-none"
                      />
                      <input
                        type="email"
                        value={custEmail}
                        onChange={(e) => setCustEmail(e.target.value)}
                        placeholder="Customer Email"
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/70 text-xs font-medium outline-none"
                      />
                    </div>

                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {cart.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                          Tap any item on the left to add to this Cash Memo.
                        </div>
                      ) : (
                        cart.map((item) => (
                          <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold">{item.name} <span className="text-slate-400">(Fixed: ₹{item.displayPrice})</span></span>
                              <button onClick={() => removeFromCart(item.id)} className="text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <span>Qty:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) => updateCartItem(item.id, 'qty', e.target.value)}
                                  className="w-14 px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-bold"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span>Bargain ₹:</span>
                                <input
                                  type="number"
                                  value={item.negotiatedPrice}
                                  onChange={(e) => updateCartItem(item.id, 'negotiatedPrice', e.target.value)}
                                  className="w-20 px-2 py-1 rounded bg-white dark:bg-slate-800 border-2 border-emerald-500 font-bold text-emerald-500"
                                />
                              </div>
                              <span className="font-black">₹{item.qty * item.negotiatedPrice}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-500 font-semibold">Extra Lump-Sum Bargain Discount (₹):</span>
                      <input
                        type="number"
                        min="0"
                        value={extraDiscount}
                        onChange={(e) => setExtraDiscount(e.target.value)}
                        className="w-24 px-2 py-1 text-right rounded bg-slate-100 dark:bg-slate-700 font-bold"
                      />
                    </div>

                    <div className="flex justify-between items-center text-xl font-black text-emerald-600 dark:text-emerald-400">
                      <span>FINAL BILL:</span>
                      <span>₹{finalPayable}</span>
                    </div>

                    {showSecretCost && cart.length > 0 && (
                      <div className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg flex justify-between">
                        <span>🔒 Secret Cost: ₹{totalSecretCost}</span>
                        <span>Net Profit: ₹{estimatedBillProfit}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-700/40 p-2.5 rounded-xl text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 block">Mode</label>
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                          className="w-full mt-1 px-2 py-1.5 rounded bg-white dark:bg-slate-800 font-bold"
                        >
                          <option value="UPI">UPI QR</option>
                          <option value="CASH">Cash</option>
                          <option value="SPLIT">Split Cash + UPI</option>
                          <option value="UDHAAR">Full Udhaar</option>
                        </select>
                      </div>
                      <div className={paymentMode === 'SPLIT' ? 'col-span-2' : ''}>
                        <label className="text-[10px] text-slate-400 block">Paid Now (₹)</label>
                        {paymentMode === 'SPLIT' ? (
                          <div className="grid grid-cols-3 gap-1 mt-1">
                            <input type="number" min="0" placeholder="Cash" value={cashPaidInput} onChange={(e) => setCashPaidInput(e.target.value)} className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-800 font-bold text-emerald-500" />
                            <input type="number" min="0" placeholder="UPI" value={upiPaidInput} onChange={(e) => setUpiPaidInput(e.target.value)} className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-800 font-bold text-emerald-500" />
                            <input type="number" min="0" placeholder="Other" value={otherPaidInput} onChange={(e) => setOtherPaidInput(e.target.value)} className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-800 font-bold text-emerald-500" />
                          </div>
                        ) : (
                          <input type="number" min="0" placeholder={String(finalPayable)} value={paidAmountInput} onChange={(e) => setPaidAmountInput(e.target.value)} className="w-full mt-1 px-2 py-1.5 rounded bg-white dark:bg-slate-800 font-bold text-emerald-500" />
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Udhaar Due (₹)</label>
                        <div className={`mt-1 px-2 py-1.5 rounded font-black ${udhaarAmount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-white dark:bg-slate-800 text-slate-400'}`}>
                          ₹{udhaarAmount}
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 min-w-0">
                        <span className="text-[11px] font-bold uppercase text-slate-400">Receive UPI On QR:</span>
                        <select
                          value={selectedQrId}
                          onChange={(e) => setSelectedQrId(Number(e.target.value))}
                          className="w-full sm:w-auto max-w-full min-w-0 text-xs font-bold bg-white dark:bg-slate-800 rounded px-2 py-1"
                        >
                          {qrs.map((q) => (
                            <option key={q.id} value={q.id}>{q.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg">
                        <div>
                          <p className="text-xs font-bold">{activeQr.name}</p>
                          <p className="text-[11px] text-emerald-500">{activeQr.upiId}</p>
                        </div>
                        <img src={dynamicQrUrl} alt="QR" className="w-16 h-16 rounded bg-white p-1 border" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={handleSaveAndWhatsApp}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" /> Save & WhatsApp
                      </button>
                      <button
                        onClick={handleSaveAndEmail}
                        disabled={sendingEmail}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" /> {sendingEmail ? 'Sending...' : 'Save & Email Bill'}
                      </button>
                      <button
                        onClick={handleSaveAndPDF}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" /> Save & PDF Receipt
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="bg-slate-200 dark:bg-slate-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Receipt
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 2: UDHAAR KHATA LEDGER ==================== */}
            {adminTab === 'khata' && (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h3 className="font-black text-lg">📒 Customer Udhaar / Khata Ledger</h3>
                    <p className="text-xs text-slate-400">Automatically tracks customers with pending balance.</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl font-black text-sm">
                    Total Pending Udhaar: ₹{totalMarketUdhaarPending}
                  </div>
                </div>

                {khataList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">🎉 Zero pending Udhaar! All customers are settled.</p>
                ) : (
                  <div className="space-y-2.5">
                    {khataList.map((k) => (
                      <div key={k.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3">
                        <div>
                          <h4 className="font-bold text-sm">{k.customerName} <span className="text-emerald-500">({k.customerPhone})</span></h4>
                          <p className="text-xs text-slate-400">Updated: {k.updatedAt}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-red-500 mr-2">Due: ₹{k.totalUdhaar}</span>
                          <a
                            href={`https://wa.me/91${k.customerPhone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                              `Assalamu Alaikum *${k.customerName}*,\nReminder from *${SHOP_CONFIG.name}*.\nYour pending Khata balance is *₹${k.totalUdhaar}*.\nPay via UPI: *${activeQr.upiId}*`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl"
                          >
                            💬 WhatsApp Reminder
                          </a>
                          <button
                            onClick={() => handleSettleKhata(k)}
                            className="bg-amber-500 text-slate-950 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
                          >
                            ✓ Receive Cash/UPI
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {adminTab === 'orders' && (
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <div>
                      <h3 className="font-black text-lg">🛍️ Online Customer Orders</h3>
                      <p className="text-xs text-slate-400">Orders submitted from the public catalog are saved locally before WhatsApp opens.</p>
                    </div>
                    {orders.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">No online orders yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {orders.map((order) => (
                          <div key={order.id || order.orderNo} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                            <div className="flex flex-wrap justify-between gap-3">
                              <div>
                                <p className="font-black text-emerald-500">{order.orderNo}</p>
                                <p className="text-sm font-bold">{order.customerName} <span className="text-emerald-500">({order.customerPhone})</span></p>
                                <p className="text-xs text-slate-400">{order.address || 'No address/note'} | {new Date(order.createdAt).toLocaleString('en-IN')}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-base">₹{order.total}</p>
                                <select
                                  value={order.status}
                                  onChange={async (event) => {
                                    await db.orders.update(order.id, {
                                      status: event.target.value,
                                      updatedAt: new Date().toISOString(),
                                      syncStatus: isOnline ? 'SYNCED' : 'PENDING_SYNC'
                                    });
                                    await refreshAllData();
                                  }}
                                  className="mt-1 bg-white dark:bg-slate-800 rounded px-2 py-1 text-xs font-bold"
                                >
                                  <option value="NEW">New</option>
                                  <option value="CONFIRMED">Confirmed</option>
                                  <option value="READY">Ready for Pickup</option>
                                  <option value="DELIVERED">Delivered</option>
                                  <option value="CANCELLED">Cancelled</option>
                                </select>
                              </div>
                            </div>
                            <div className="mt-3 space-y-1 text-xs">
                              {order.items?.map((item) => (
                                <p key={item.id}><b>{item.qty}x</b> {item.name} — ₹{item.displayPrice * item.qty}</p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
            )}

            {/* ==================== TAB 3: DAILY GALLA, KHARCHA & SECRET PROFIT ==================== */}
            {adminTab === 'hisaab' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-400">Today Sales ({todayStr})</span>
                    <p className="text-xl font-black text-emerald-500 mt-1">₹{todayTotalSales}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-400">Net Cash in Galla</span>
                    <p className="text-xl font-black text-blue-400 mt-1">₹{netCashInGalla}</p>
                    <span className="text-[10px] text-slate-400">Cash ₹{todayCashCollected} - Kharcha ₹{todayTotalExpenses}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-400">UPI QR Received</span>
                    <p className="text-xl font-black text-purple-400 mt-1">₹{todayUpiCollected}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-400">Today Shop Kharcha</span>
                    <p className="text-xl font-black text-orange-400 mt-1">₹{todayTotalExpenses}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-400">Today Udhaar Given</span>
                    <p className="text-xl font-black text-red-400 mt-1">₹{todayUdhaarGiven}</p>
                  </div>
                  <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/30">
                    <span className="text-xs text-amber-300 font-bold">🔒 Net Profit (After Kharcha)</span>
                    <p className="text-xl font-black text-amber-400 mt-1">
                      {showSecretCost ? `₹${todayNetProfit}` : '•••• (Hidden)'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <form onSubmit={handleAddExpense} className="lg:col-span-5 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 h-fit">
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-orange-400" /> Log Daily Shop Kharcha (Tea, Rickshaw, Packing)
                    </h4>
                    <input
                      type="text"
                      placeholder="Expense Detail (e.g. Tea & Water, Auto Fare)"
                      value={newExpense.title}
                      onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Amount Spent (₹)"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs outline-none"
                    />
                    <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer">
                      + Deduct from Cash Galla
                    </button>
                  </form>

                  <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <h4 className="font-bold text-sm">Today&apos;s Kharcha Log</h4>
                    {todayExpensesList.length === 0 ? (
                      <p className="text-xs text-slate-400">No shop expenses logged today.</p>
                    ) : (
                      todayExpensesList.map(exp => (
                        <div key={exp.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 flex justify-between items-center text-xs">
                          <span><b>{exp.title}</b> ({exp.createdAt})</span>
                          <span className="font-black text-orange-400">-₹{exp.amount}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 4: WARRANTY & BILL HISTORY ==================== */}
            {adminTab === 'warranty' && (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="font-bold text-base">🛡️ Customer Warranty & Past Bill Checker</h3>
                <input
                  type="text"
                  value={warrantySearchPhone}
                  onChange={(e) => setWarrantySearchPhone(e.target.value)}
                  placeholder="Search by Customer Mobile (9625035483), Name, or Bill No..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm outline-none"
                />
                <div className="space-y-3">
                  {invoices
                    .filter(inv =>
                      !warrantySearchPhone ||
                      inv.customerPhone?.includes(warrantySearchPhone) ||
                      inv.customerName?.toLowerCase().includes(warrantySearchPhone.toLowerCase()) ||
                      inv.invoiceNo?.toLowerCase().includes(warrantySearchPhone.toLowerCase())
                    )
                    .map(inv => (
                      <div key={inv.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3 text-xs">
                        <div>
                          <span className="font-black text-emerald-500 text-sm">{inv.invoiceNo}</span> — <b>{inv.customerName}</b> ({inv.customerPhone})
                          <p className="text-slate-400 mt-0.5">Date: <b>{inv.createdAt}</b> | QR: {inv.qrUsed}</p>
                          <div className="mt-2 space-y-1">
                            {inv.items?.map((it, idx) => (
                              <span key={idx} className="inline-block mr-2 px-2 py-1 rounded bg-slate-200 dark:bg-slate-800">
                                {it.name} ({it.qty}x ₹{it.negotiatedPrice}) — <b>🛡️ {it.warranty || 'Standard'}</b>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <span className="text-base font-black text-emerald-500 block">Bill: ₹{inv.finalPayable}</span>
                          <button
                            onClick={() => generateInvoicePDF(inv)}
                            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold cursor-pointer"
                          >
                            📥 Download PDF
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ==================== TAB 5: STOCK, QUICK-EDIT & REAL PHOTOS ==================== */}
            {adminTab === 'stock' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form onSubmit={handleAddProduct} className="lg:col-span-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 h-fit">
                  <h3 className="font-bold text-base">➕ Add Product, Warranty & Photo</h3>
                  <input
                    type="text"
                    placeholder="Product Name"
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Category (e.g. Amplifiers, Mics, Cables)"
                    value={newProd.category}
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="2-3 Letter Search Tags (e.g. ahu, nb15, tar)"
                    value={newProd.keywords}
                    onChange={(e) => setNewProd({ ...newProd, keywords: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Fixed ₹"
                      value={newProd.displayPrice}
                      onChange={(e) => setNewProd({ ...newProd, displayPrice: e.target.value })}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold"
                    />
                    <input
                      type="number"
                      placeholder="Min ₹"
                      value={newProd.minPrice}
                      onChange={(e) => setNewProd({ ...newProd, minPrice: e.target.value })}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Secret Cost ₹"
                      value={newProd.costPrice}
                      onChange={(e) => setNewProd({ ...newProd, costPrice: e.target.value })}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Stock Qty"
                      value={newProd.stock}
                      onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Warranty (e.g. 6 Months)"
                      value={newProd.warranty}
                      onChange={(e) => setNewProd({ ...newProd, warranty: e.target.value })}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                    />
                  </div>

                  <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-center">
                    <label className="cursor-pointer flex flex-col items-center text-xs text-emerald-500 font-bold">
                      <Upload className="w-4 h-4 mb-1" />
                      <span>Upload Real Product Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) setNewProd({ ...newProd, image: await fileToBase64(file) });
                        }}
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProd.isLegacyStock}
                      onChange={(e) => setNewProd({ ...newProd, isLegacyStock: e.target.checked })}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <span>Existing / Old Stock (Date Unknown)</span>
                  </label>

                  {!newProd.isLegacyStock && (
                    <input
                      type="datetime-local"
                      value={newProd.arrivalDate}
                      onChange={(e) => setNewProd({ ...newProd, arrivalDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                    />
                  )}

                  <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer">
                    + Save Product
                  </button>
                </form>

                <div className="lg:col-span-8 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 max-h-[75vh] overflow-y-auto">
                  <h3 className="font-bold text-base">Inventory, Quick Stock Adjust & Photo Manager</h3>
                  {filteredProducts.map((p) => (
                    <div key={p.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img src={p.image} alt={p.name} className="w-14 h-14 rounded-xl object-cover border" />
                        <div>
                          <h4 className="font-bold text-sm">{p.name}</h4>
                          <p className="text-xs text-slate-400">Arrival: <span className="text-emerald-500 font-semibold">{p.arrivalDate}</span></p>
                          <p className="text-xs text-slate-400">
                            Fixed: <b>₹{p.displayPrice}</b> | 🛡️ {p.warranty}
                            {showSecretCost && ` | 🔒 Cost: ₹${p.costPrice}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-300 dark:border-slate-600 text-xs">
                          <button onClick={() => handleQuickStockAdjust(p, -1)} className="px-2 font-black text-red-500 cursor-pointer">−</button>
                          <span className="font-bold px-1">Stock: {p.stock}</span>
                          <button onClick={() => handleQuickStockAdjust(p, 1)} className="px-2 font-black text-emerald-500 cursor-pointer">+</button>
                        </div>

                        <button
                          onClick={() => handleEditProductPrice(p)}
                          className="bg-slate-200 dark:bg-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          ✏️ Price
                        </button>

                        <label className="cursor-pointer bg-emerald-600/10 text-emerald-500 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" /> Photo
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpdateProductImage(p.id, e)} />
                        </label>

                        <button
                          onClick={() => handleDeleteSingleProduct(p)}
                          className="p-1.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 cursor-pointer"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ==================== TAB 6: WORKING RAW MATERIALS & KIT ASSEMBLY ==================== */}
            {adminTab === 'raw' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form onSubmit={handleAddRawMaterial} className="lg:col-span-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 h-fit">
                  <h3 className="font-bold text-base">⚙️ Add Spare Part / Raw Material</h3>
                  <p className="text-xs text-slate-400">
                    Track bags, mic capsules, chargers, and batteries used to assemble complete sets.
                  </p>
                  <input
                    type="text"
                    placeholder="Part Name (e.g. Dawat Leather Bag)"
                    value={newRaw.name}
                    onChange={(e) => setNewRaw({ ...newRaw, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Stock Qty"
                      value={newRaw.stock}
                      onChange={(e) => setNewRaw({ ...newRaw, stock: e.target.value })}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Unit Cost ₹"
                      value={newRaw.unitCost}
                      onChange={(e) => setNewRaw({ ...newRaw, unitCost: e.target.value })}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Used/Kit"
                      value={newRaw.qtyPerKit}
                      onChange={(e) => setNewRaw({ ...newRaw, qtyPerKit: e.target.value })}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                    />
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer">
                    + Save Raw Material
                  </button>
                </form>

                <div className="lg:col-span-8 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <h3 className="font-bold text-base">Spare Parts Stock & 1-Click Dawat Kit Assembler</h3>
                      <p className="text-xs text-slate-400">Assembling a kit automatically deducts spare parts and adds +1 to Dawat Mic Complete Set.</p>
                    </div>
                    <button
                      onClick={handleAssembleDawatKit}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow cursor-pointer"
                    >
                      ⚡ Assemble Dawat Mic Set
                    </button>
                  </div>

                  <div className="space-y-2">
                    {rawMaterials.map((rm) => (
                      <div key={rm.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-sm">{rm.name}</span>
                          <p className="text-slate-400">Used per Kit: {rm.qtyPerKit} | Unit Cost: ₹{rm.unitCost}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => { await db.rawMaterials.update(rm.id, { stock: Math.max(0, rm.stock - 1), updatedAt: new Date().toISOString() }); await refreshAllData(); }}
                            className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 font-bold cursor-pointer"
                          >−</button>
                          <span className="font-black text-emerald-500 text-sm px-2">Stock: {rm.stock}</span>
                          <button
                            onClick={async () => { await db.rawMaterials.update(rm.id, { stock: rm.stock + 1, updatedAt: new Date().toISOString() }); await refreshAllData(); }}
                            className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 font-bold cursor-pointer"
                          >+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 7: SHOPKEEPER QRS ==================== */}
            {adminTab === 'qrs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form onSubmit={handleAddQr} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 h-fit">
                  <h3 className="font-bold text-base">➕ Add Shopkeeper / Partner UPI QR</h3>
                  <input
                    type="text"
                    placeholder="Shopkeeper Name"
                    value={newQr.name}
                    onChange={(e) => setNewQr({ ...newQr, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="UPI ID (e.g. 9625035483@ybl)"
                    value={newQr.upiId}
                    onChange={(e) => setNewQr({ ...newQr, upiId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                  />
                  <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer">
                    Save Shopkeeper QR
                  </button>
                </form>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <h3 className="font-bold text-base">Saved QRs</h3>
                  {qrs.map((q) => (
                    <div key={q.id} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold">{q.name}</p>
                        <p className="text-emerald-500">{q.upiId}</p>
                      </div>
                      <button
                        onClick={async () => { await db.qrs.delete(q.id); await refreshAllData(); }}
                        className="text-red-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ==================== TAB 8: REPAIRS ==================== */}
            {adminTab === 'repairs' && (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="font-bold text-base">🛠️ Repair Job Sheets</h3>
                <form onSubmit={handleAddRepair} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={newRepair.customerName}
                    onChange={(e) => setNewRepair({ ...newRepair, customerName: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                  />
                  <input
                    type="tel"
                    placeholder="Mobile"
                    value={newRepair.customerPhone}
                    onChange={(e) => setNewRepair({ ...newRepair, customerPhone: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Item & Fault Description"
                    value={newRepair.itemName}
                    onChange={(e) => setNewRepair({ ...newRepair, itemName: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs sm:col-span-2"
                  />
                  <input
                    type="number"
                    placeholder="Est. Cost ₹"
                    value={newRepair.estimatedCost}
                    onChange={(e) => setNewRepair({ ...newRepair, estimatedCost: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"
                  />
                  <button type="submit" className="sm:col-span-5 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer">
                    + Create Repair Ticket
                  </button>
                </form>
                <div className="space-y-2">
                  {repairs.map((r) => (
                    <div key={r.id} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-black text-emerald-500">{r.tokenNo}</span> — <b>{r.customerName}</b> ({r.customerPhone})
                        <p className="text-slate-400">{r.itemName} | {r.createdAt}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">₹{r.estimatedCost}</span>
                        <select
                          value={r.status}
                          onChange={async (e) => { await db.repairs.update(r.id, { status: e.target.value, updatedAt: new Date().toISOString(), syncStatus: 'PENDING_SYNC' }); await refreshAllData(); }}
                          className="bg-white dark:bg-slate-800 rounded px-2 py-1 font-bold"
                        >
                          <option value="Received">Received</option>
                          <option value="In Repair">In Repair</option>
                          <option value="Ready">Ready</option>
                          <option value="Delivered">Delivered</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ==================== TAB 9: DELETE ALL DB (HANDOVER) & CLOUD BACKUP ==================== */}
            {adminTab === 'backup' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-red-500/40 space-y-4">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="w-6 h-6" />
                    <h3 className="font-black text-base">Delete Testing DB & Handover to Shopkeeper</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Once you finish testing, use these buttons to clean the database so the shopkeeper starts fresh from Day 1.
                  </p>
                  <div className="space-y-2.5 pt-1">
                    <button
                      onClick={handleClearTestBillsOnly}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow cursor-pointer"
                    >
                      🧹 Clear Only Test Bills, Khata & Repairs (Keep Products & QRs)
                    </button>
                    <button
                      onClick={handleWipeEverythingForHandover}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" /> Delete 100% All DB (Start Completely From Zero)
                    </button>
                    <button
                      onClick={handleReloadDemoData}
                      className="w-full bg-slate-200 dark:bg-slate-700 hover:opacity-90 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reload Default 8 Shop Products & Demo Data
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-500" /> 1-Click Backup, Restore & Cloud Sync
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Download a full JSON backup to your laptop/phone or sync with Supabase PostgreSQL Cloud.
                  </p>
                  <div className="flex flex-col gap-2.5 pt-1">
                    <button
                      onClick={handleCloudSync}
                      disabled={syncingCloud}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow cursor-pointer"
                    >
                      <Cloud className="w-4 h-4" /> {syncingCloud ? 'Syncing with Cloud...' : 'Sync Device with Cloud Now'}
                    </button>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <button
                        onClick={handleDownloadBackup}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4" /> Download Backup (.JSON)
                      </button>
                      <label className="flex-1 bg-slate-200 dark:bg-slate-700 font-bold px-4 py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer">
                        <Upload className="w-4 h-4" /> Restore Backup File
                        <input type="file" accept=".json" className="hidden" onChange={handleRestoreBackup} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      {/* ==================== PUBLIC CUSTOMER MULTI-ITEM CART MODAL ==================== */}
      {showPublicCartModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="font-black text-lg flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-500" /> Your Order Bag
              </h3>
              <button onClick={() => setShowPublicCartModal(false)} className="p-1 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {publicCart.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold">{item.name}</p>
                    <p className="text-slate-400">₹{item.displayPrice} x {item.qty}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-emerald-500">₹{item.qty * item.displayPrice}</span>
                    <button
                      onClick={() => setPublicCart(prev => prev.filter(i => i.id !== item.id))}
                      className="text-red-400 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <input
                type="text"
                placeholder="Your Name"
                value={publicCustomerName}
                onChange={(e) => setPublicCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs outline-none"
              />
              <input
                type="tel"
                placeholder="Mobile Number"
                value={publicCustomerPhone}
                onChange={(e) => setPublicCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs outline-none"
              />
              <input
                type="text"
                placeholder="Delivery Address / Note (Optional)"
                value={publicCustomerAddress}
                onChange={(e) => setPublicCustomerAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs outline-none"
              />
              <div className="flex justify-between items-center text-base font-black pt-1">
                <span>Estimated Total:</span>
                <span className="text-emerald-500">₹{publicCartTotal}</span>
              </div>
              <button
                onClick={sendPublicCartToWhatsApp}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs shadow cursor-pointer"
              >
                💬 Send Complete Order on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {!isAdmin && (
        <nav className="public-bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_-8px_24px_rgba(15,23,42,0.12)]">
          <div className="max-w-xl mx-auto px-3 py-2 flex items-center justify-around gap-1">
            <img
              src="/favicon.ico"
              alt={`${SHOP_CONFIG.name} icon`}
              className="w-8 h-8 rounded-lg border border-emerald-500/30 shrink-0 object-cover"
            />
            {[
              { id: 'store', label: 'Catalog', icon: Store },
              { id: 'track', label: 'Track', icon: Wrench },
              { id: 'about', label: 'About', icon: Info }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setPublicSection(id)}
                className={`flex-1 max-w-28 flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer ${
                  publicSection === id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
            <button
              onClick={() => publicCart.length > 0 && setShowPublicCartModal(true)}
              className={`flex-1 max-w-28 flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer ${
                publicCart.length > 0 ? 'text-amber-500 hover:bg-amber-500/10' : 'text-slate-400'
              }`}
              aria-label="Open cart"
            >
              <ShoppingBag className="w-4 h-4" />
              Cart{publicCart.length > 0 ? ` (${publicCart.reduce((s, i) => s + i.qty, 0)})` : ''}
            </button>
          </div>
        </nav>
      )}

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 mt-12">
        <div className="max-w-7xl mx-auto w-full min-w-0 px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex w-full max-w-full items-center gap-3 min-w-0">
            <img
              src="/favicon.ico"
              alt={`${SHOP_CONFIG.name} icon`}
              className="w-9 h-9 rounded-lg border border-emerald-500/30 shrink-0 object-cover"
            />
            <div className="min-w-0 max-w-full">
              <span className="font-bold text-slate-800 dark:text-slate-200">{SHOP_CONFIG.name} ({SHOP_CONFIG.tagline})</span>
              <p className="truncate">{SHOP_CONFIG.address}</p>
            </div>
          </div>
          <div className="w-full min-w-0 max-w-full text-center sm:text-right">
            <p>📞 {SHOP_CONFIG.phones.join(' | ')}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Offline-First Cross-Platform Suite (Windows • Android • iOS)</p>
          </div>
        </div>
      </footer>

      {/* ==================== ADMIN LOGIN MODAL ==================== */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAdminLogin}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-black text-lg">🔒 Owner / Son Admin Login</h3>
              <button type="button" onClick={() => setShowLoginModal(false)} className="text-xs text-slate-400 cursor-pointer">Close</button>
            </div>
            <div>
              <label className="text-xs text-slate-400">Admin Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold mt-1 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Admin Password</label>
              <input
                type="password"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold mt-1 outline-none"
              />
            </div>
            {loginError && <p className="text-xs font-semibold text-red-500">{loginError}</p>}
            <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl text-xs shadow cursor-pointer">
              Unlock Admin Suite
            </button>
          </form>
        </div>
      )}
    </div>
  );
}