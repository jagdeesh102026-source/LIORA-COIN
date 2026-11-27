'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { TestnetPurchaseTerminal } from '../../components/TestnetPurchaseTerminal';
import { PrelaunchOfferingCard } from '../../components/prelaunch/PrelaunchOfferingCard';
import { useWeb3Wallet } from '../../hooks/useWeb3Wallet';
import { useDemoStore } from '../../lib/demo/useDemoStore';
import { isTestnetSandboxEnabled } from '../../config/tokenConfig';
import { AllocationEngine } from '../../lib/commerce/allocationEngine';
import { ExchangeRatePolicy } from '../../lib/commerce/exchangeRatePolicy';
import { 
  FiatCurrencyCode, 
  SUPPORTED_FIAT_CURRENCIES, 
  FIAT_CURRENCY_REGISTRY,
  CANONICAL_MIN_PURCHASE_INR 
} from '../../lib/commerce/fiatCurrencies';
import { 
  AlertCircle, 
  Wallet, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Check,
  Info,
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Globe2,
  ChevronDown
} from 'lucide-react';

export default function BuyPage() {
  const { 
    isConnected, 
    address, 
    chainName, 
    isSupportedChain, 
    isWrongNetwork, 
    switchToBscTestnet, 
    switchToBscMainnet 
  } = useWeb3Wallet();

  const { activeUser } = useDemoStore();
  const isDevSandbox = isTestnetSandboxEnabled();

  // Purchase Mode: 'prelaunch' (30-day offering curve), 'testnet' (dev-only BSC Testnet #97) or 'fiat' (multi-currency pricing simulator)
  const [purchaseMode, setPurchaseMode] = useState<'prelaunch' | 'testnet' | 'fiat'>('prelaunch');

  // Multi-currency state
  const [selectedCurrency, setSelectedCurrency] = useState<FiatCurrencyCode>('INR');
  const [amountInput, setAmountInput] = useState<string>('100000');
  const [customWallet, setCustomWallet] = useState<string>('');
  const [useConnectedWallet, setUseConnectedWallet] = useState<boolean>(true);

  // Accessible custom currency dropdown state
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [focusedCurrencyIndex, setFocusedCurrencyIndex] = useState<number>(-1);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const currencyButtonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Flags dictionary matching each supported fiat currency
  const currencyFlags: Record<FiatCurrencyCode, string> = {
    INR: '🇮🇳',
    USD: '🇺🇸',
    EUR: '🇪🇺',
    GBP: '🇬🇧',
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (
        currencyDropdownRef.current &&
        !currencyDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCurrencyDropdownOpen(false);
        setFocusedCurrencyIndex(-1);
      }
    };

    if (isCurrencyDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isCurrencyDropdownOpen]);

  // Canonical reference pricing parameters
  const tokenPriceInr = 0.20; // Official launch benchmark price ₹0.20 INR
  const activeCurrencyConfig = FIAT_CURRENCY_REGISTRY[selectedCurrency];

  // USD exchange rate reference from registry (avoid hardcoding 84.50)
  const usdConfig = FIAT_CURRENCY_REGISTRY.USD;
  const usdRateToInr = usdConfig ? usdConfig.provisionalExchangeRateToInr : 84.50;
  // Unit token price in USD derived from canonical INR benchmark
  const tokenPriceUsd = tokenPriceInr / usdRateToInr; // e.g. 0.20 / 84.50 ≈ $0.002367 USD

  // Derive quote based on selected currency
  const quote = useMemo(() => {
    return ExchangeRatePolicy.createQuote(selectedCurrency);
  }, [selectedCurrency]);

  // Validation
  const numericAmount = Number(amountInput) || 0;
  const validation = useMemo(() => {
    return ExchangeRatePolicy.validatePurchase(numericAmount, quote);
  }, [numericAmount, quote]);

  // INR Equivalent calculation
  const inrEquivalent = useMemo(() => {
    if (numericAmount <= 0) return 0;
    return validation.inrEquivalent ?? ExchangeRatePolicy.convertToInr(numericAmount, quote);
  }, [numericAmount, quote, validation.inrEquivalent]);

  // USD Equivalent for token calculation (converts dynamic INR equivalent using USD rate, without hardcoding or misapplying USD rate to EUR/GBP)
  const usdEquivalent = useMemo(() => {
    if (numericAmount <= 0) return 0;
    if (selectedCurrency === 'USD') return numericAmount;
    return inrEquivalent > 0 && usdRateToInr > 0 ? inrEquivalent / usdRateToInr : 0;
  }, [numericAmount, selectedCurrency, inrEquivalent, usdRateToInr]);

  // Calculate tokens based on canonical price in INR (eliminates hardcoded USD/INR divisor for EUR and GBP)
  const buyerTokensCount = inrEquivalent > 0 && tokenPriceInr > 0
    ? BigInt(Math.floor((inrEquivalent / tokenPriceInr) * 1e4)) * (10n ** 14n)
    : 0n;

  // Candidate Interpretation A & B allocations
  const allocA = useMemo(() => AllocationEngine.calculateInterpretationA(buyerTokensCount), [buyerTokensCount]);
  const allocB = useMemo(() => AllocationEngine.calculateInterpretationB(buyerTokensCount), [buyerTokensCount]);

  // Quick select chips per currency
  const quickSelectChips = useMemo(() => {
    switch (selectedCurrency) {
      case 'INR':
        return [100000, 250000, 500000, 1000000];
      case 'USD':
        return [1184, 3000, 6000, 12000];
      case 'EUR':
        return [1090, 2750, 5500, 11000];
      case 'GBP':
        return [933, 2500, 5000, 10000];
      default:
        return [100000, 250000, 500000, 1000000];
    }
  }, [selectedCurrency]);

  const handleCurrencyChange = (newCurrency: FiatCurrencyCode) => {
    setSelectedCurrency(newCurrency);
    const newQuote = ExchangeRatePolicy.createQuote(newCurrency);
    // Automatically set default to the minimum of that currency
    setAmountInput(newQuote.minOrderInCurrency.toString());
  };

  const handleCurrencySelect = (code: FiatCurrencyCode) => {
    handleCurrencyChange(code);
    setIsCurrencyDropdownOpen(false);
    setFocusedCurrencyIndex(-1);
    currencyButtonRef.current?.focus();
  };

  // Keyboard navigation for dropdown trigger button
  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setIsCurrencyDropdownOpen(true);
      const currentIndex = SUPPORTED_FIAT_CURRENCIES.indexOf(selectedCurrency);
      const nextIndex = e.key === 'ArrowDown'
        ? (currentIndex + 1) % SUPPORTED_FIAT_CURRENCIES.length
        : (currentIndex - 1 + SUPPORTED_FIAT_CURRENCIES.length) % SUPPORTED_FIAT_CURRENCIES.length;
      setFocusedCurrencyIndex(nextIndex);
      setTimeout(() => optionRefs.current[nextIndex]?.focus(), 20);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsCurrencyDropdownOpen((prev) => !prev);
      if (!isCurrencyDropdownOpen) {
        const currentIndex = SUPPORTED_FIAT_CURRENCIES.indexOf(selectedCurrency);
        setFocusedCurrencyIndex(currentIndex);
      }
    } else if (e.key === 'Escape' && isCurrencyDropdownOpen) {
      e.preventDefault();
      setIsCurrencyDropdownOpen(false);
      setFocusedCurrencyIndex(-1);
    }
  };

  // Keyboard navigation inside dropdown options
  const handleOptionKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % SUPPORTED_FIAT_CURRENCIES.length;
      setFocusedCurrencyIndex(nextIndex);
      optionRefs.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + SUPPORTED_FIAT_CURRENCIES.length) % SUPPORTED_FIAT_CURRENCIES.length;
      setFocusedCurrencyIndex(prevIndex);
      optionRefs.current[prevIndex]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const code = SUPPORTED_FIAT_CURRENCIES[index];
      handleCurrencySelect(code);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setIsCurrencyDropdownOpen(false);
      setFocusedCurrencyIndex(-1);
      currencyButtonRef.current?.focus();
    }
  };

  // Destination wallet
  const targetWallet = useConnectedWallet && address ? address : customWallet;
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(targetWallet.trim());

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-prominent)] bg-[var(--bg-elevated)] text-xs text-secondary">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Multi-Currency Fiat Gateway (BNB Smart Chain BEP-20)</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white">Purchase Liora Coin</h1>
          <p className="text-secondary text-sm sm:text-base leading-relaxed">
            Acquire Liora Coin (LIORA) tokens with authorized fiat payments. Minimum order requirement is <strong>₹1,00,000 INR</strong> (or international currency equivalent). Delivered directly to your self-custodial wallet on BNB Smart Chain.
          </p>
        </div>

        {/* Brand Emblem */}
        <div className="relative shrink-0 flex items-center justify-center self-start md:self-auto">
          <div 
            className="absolute rounded-full filter blur-xl opacity-40 pointer-events-none"
            style={{
              width: 120,
              height: 120,
              background: 'radial-gradient(circle, rgba(217,170,74,0.45) 0%, transparent 70%)',
            }}
          />
          <Image
            src="/assets/liora-logo-512.png"
            alt="Liora Coin Official Brand Emblem"
            width={96}
            height={96}
            className="relative object-contain filter drop-shadow-md"
          />
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex border-b border-[var(--border-subtle)] gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setPurchaseMode('prelaunch')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            purchaseMode === 'prelaunch'
              ? 'border-amber-400 text-white bg-amber-500/10 rounded-t-xl'
              : 'border-transparent text-secondary hover:text-white'
          }`}
        >
          <span>🚀 30-Day Offering Curve</span>
          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-semibold">
            ₹0.20 → $0.30 Cap
          </span>
        </button>

        {isDevSandbox && (
          <button
            type="button"
            onClick={() => setPurchaseMode('testnet')}
            className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              purchaseMode === 'testnet'
                ? 'border-[var(--brand-accent)] text-white bg-blue-500/10 rounded-t-xl'
                : 'border-transparent text-secondary hover:text-white'
            }`}
          >
            <span>⚡ Testnet BNB Purchase</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-[var(--brand-accent)] font-semibold">
              Sandbox #97
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setPurchaseMode('fiat')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            purchaseMode === 'fiat'
              ? 'border-[var(--brand-accent)] text-white bg-blue-500/10 rounded-t-xl'
              : 'border-transparent text-secondary hover:text-white'
          }`}
        >
          <span>🧮 Fiat Pricing Simulator</span>
          <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-500/20 text-zinc-300 font-semibold">
            Provisional
          </span>
        </button>
      </div>

      {purchaseMode === 'prelaunch' ? (
        <PrelaunchOfferingCard userWalletAddress={address || activeUser?.walletAddress || undefined} userId={activeUser?.id} />
      ) : purchaseMode === 'testnet' && isDevSandbox ? (
        <TestnetPurchaseTerminal />
      ) : (
        <>
          {/* 2. Honest Staging & Disabled Notice */}
          <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 text-amber-200 text-xs sm:text-sm space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Checkout Gateway Staged — Live Purchases Temporarily Inactive</span>
            </div>
            <p className="leading-relaxed text-amber-200/80">
              Live payment processing and blockchain fulfillment are currently disabled. Activation requires final payment gateway provider approval, confirmation of the official initial token price, and regulatory VDA compliance clearance. This interface provides pre-launch calculation and order modeling only.
            </p>
          </div>

          {/* 3. Main Calculator & Order Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Purchase Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card elevated className="border border-[var(--border-prominent)] space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Order Configuration</span>
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                Min: ₹1,00,000 INR
              </span>
            </div>

            {/* Currency Selector */}
            <div className="space-y-1.5" ref={currencyDropdownRef}>
              <div className="flex items-center justify-between">
                <label 
                  id="currency-select-label"
                  htmlFor="currency-select-button" 
                  className="text-xs font-semibold text-secondary"
                >
                  Select Payment Currency
                </label>
                <span className="text-[11px] text-muted">
                  {selectedCurrency === 'INR' ? 'Canonical Base Currency' : 'Evaluated Fiat Currency'}
                </span>
              </div>

              {/* Accessible Custom Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  id="currency-select-button"
                  ref={currencyButtonRef}
                  aria-haspopup="listbox"
                  aria-expanded={isCurrencyDropdownOpen}
                  aria-labelledby="currency-select-label currency-select-button"
                  onClick={() => setIsCurrencyDropdownOpen((prev) => !prev)}
                  onKeyDown={handleTriggerKeyDown}
                  className="w-full flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-[var(--border-prominent)] bg-[var(--bg-elevated)] hover:border-[var(--brand-accent)] hover:bg-[var(--bg-glass-hover)] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)] focus:border-transparent text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl leading-none select-none shrink-0" aria-hidden="true">
                      {currencyFlags[selectedCurrency]}
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-sm text-white tracking-wide">
                        {activeCurrencyConfig.code}
                      </span>
                      <span className="text-xs font-bold text-[var(--brand-accent)] px-2 py-0.5 rounded-md bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20">
                        {activeCurrencyConfig.symbol}
                      </span>
                      <span className="text-secondary text-xs truncate hidden xs:inline">
                        — {activeCurrencyConfig.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {selectedCurrency === 'INR' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold hidden sm:inline-block">
                        Canonical Base
                      </span>
                    )}
                    <ChevronDown 
                      className={`w-4 h-4 text-secondary transition-transform duration-200 group-hover:text-white ${
                        isCurrencyDropdownOpen ? 'rotate-180 text-[var(--brand-accent)]' : ''
                      }`}
                      aria-hidden="true" 
                    />
                  </div>
                </button>

                {/* Dropdown Menu Options */}
                {isCurrencyDropdownOpen && (
                  <div
                    role="listbox"
                    id="currency-select-listbox"
                    aria-labelledby="currency-select-label"
                    className="absolute z-30 mt-1.5 w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-accent)] shadow-2xl overflow-hidden p-1.5 backdrop-blur-xl animate-fadeIn space-y-1"
                  >
                    {SUPPORTED_FIAT_CURRENCIES.map((code, index) => {
                      const cfg = FIAT_CURRENCY_REGISTRY[code];
                      const isSelected = selectedCurrency === code;
                      return (
                        <button
                          key={code}
                          ref={(el) => { optionRefs.current[index] = el; }}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          tabIndex={focusedCurrencyIndex === index ? 0 : -1}
                          onClick={() => handleCurrencySelect(code)}
                          onKeyDown={(e) => handleOptionKeyDown(e, index)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg text-left text-xs transition-all duration-150 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)] ${
                            isSelected
                              ? 'bg-[var(--brand-accent)]/15 border border-[var(--brand-accent)] text-white shadow-sm'
                              : 'bg-[var(--bg-elevated)] border border-transparent text-secondary hover:bg-[var(--brand-accent)] hover:border-[var(--brand-accent)] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xl leading-none select-none shrink-0" aria-hidden="true">
                              {currencyFlags[code]}
                            </span>
                            <div className="flex items-baseline gap-2 min-w-0">
                              <span className="font-bold text-sm text-white group-hover:text-white tracking-wide">
                                {cfg.code}
                              </span>
                              <span className="text-secondary group-hover:text-white/90 truncate">
                                — {cfg.name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                              isSelected
                                ? 'text-[var(--brand-accent)] bg-[var(--brand-accent)]/20 border-[var(--brand-accent)]/40'
                                : 'text-secondary border-[var(--border-subtle)] bg-[var(--bg-secondary)] group-hover:text-white group-hover:border-white/30 group-hover:bg-white/10'
                            }`}>
                              {cfg.symbol}
                            </span>
                            <div className="w-5 flex items-center justify-center">
                              {isSelected && (
                                <Check className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 shrink-0" aria-hidden="true" />
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Multi-Currency Status Note */}
              {selectedCurrency !== 'INR' && (
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-secondary space-y-1 mt-2">
                  <div className="flex items-center gap-1.5 text-white font-semibold">
                    <Info className="w-3.5 h-3.5 text-[var(--brand-accent)] shrink-0" />
                    <span>Currency Valuation & Compliance</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-secondary">
                    Reference conversion: 1 {selectedCurrency} ≈ ₹{quote.rateToInr.toFixed(2)} INR. 
                    Minimum requirement in {selectedCurrency} is calculated with ceiling rounding to <strong>{quote.currencySymbol}{quote.minOrderInCurrency.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> to guarantee the ₹1,00,000 INR baseline is satisfied.
                  </p>
                </div>
              )}
            </div>

            {/* Currency Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-secondary">
                <span>Enter Purchase Amount ({selectedCurrency})</span>
                <span>
                  Min: {quote.currencySymbol}{quote.minOrderInCurrency.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({selectedCurrency === 'INR' ? '₹1,00,000' : '₹1,00,000 equiv.'})
                </span>
              </div>

              <div className="currency-input-container">
                <span className="currency-symbol">{quote.currencySymbol}</span>
                <input
                  type="number"
                  min={quote.minOrderInCurrency}
                  step={selectedCurrency === 'INR' ? '1000' : '10'}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder={quote.minOrderInCurrency.toString()}
                  className="currency-input-field"
                />
                <span className="currency-badge">
                  {selectedCurrency}
                </span>
              </div>

              {/* Quick Select Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {quickSelectChips.map((amt) => {
                  const isMin = amt === quickSelectChips[0];
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmountInput(amt.toString())}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        amountInput === amt.toString()
                          ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)]/10 text-white'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-secondary hover:text-white'
                      }`}
                    >
                      {quote.currencySymbol}{amt.toLocaleString('en-US')}
                      {isMin && ' (Min)'}
                    </button>
                  );
                })}
              </div>

              {/* Validation Feedback */}
              {!validation.isValid && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{validation.errorMessage}</span>
                </div>
              )}

              {/* Live INR Conversion Confirmation */}
              {validation.isValid && selectedCurrency !== 'INR' && (
                <div className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Converts to ₹{inrEquivalent.toLocaleString('en-IN', { maximumFractionDigits: 2 })} INR (Meets ₹1,00,000 requirement).
                  </span>
                </div>
              )}
            </div>

            {/* Destination Wallet Address Input & Network Guard */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between text-xs text-secondary">
                <span className="font-semibold text-white">Destination Wallet (BEP-20)</span>
                {isConnected && (
                  <button
                    type="button"
                    onClick={() => setUseConnectedWallet(!useConnectedWallet)}
                    className="text-[var(--brand-accent)] hover:underline"
                  >
                    {useConnectedWallet ? 'Enter different address' : 'Use connected wallet'}
                  </button>
                )}
              </div>

              {/* Connected Wallet View */}
              {useConnectedWallet && isConnected && address ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[var(--brand-accent)] shrink-0" />
                      <span className="text-xs font-mono text-white truncate max-w-xs">{address}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold shrink-0 ${
                      isSupportedChain 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {isSupportedChain ? 'Connected (BSC)' : 'Wrong Network'}
                    </span>
                  </div>

                  {/* Network Warning Banner */}
                  {isWrongNetwork && (
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Unsupported Network: {chainName}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Liora Coin operates strictly on <strong>BNB Smart Chain</strong>. Please switch your wallet network to continue.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        {isDevSandbox && (
                          <button
                            type="button"
                            onClick={switchToBscTestnet}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border-prominent)] bg-[var(--bg-elevated)] text-xs text-white"
                          >
                            Switch to BSC Testnet (#97)
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={switchToBscMainnet}
                          className="px-3 py-1.5 rounded-lg btn-metallic text-xs font-semibold text-white"
                        >
                          Switch to BSC Mainnet (#56)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Custom Address View */
                <div className="space-y-1">
                  <input
                    type="text"
                    value={customWallet}
                    onChange={(e) => setCustomWallet(e.target.value)}
                    placeholder="0x... (BNB Smart Chain BEP-20 address)"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-mono text-white focus:outline-none focus:border-[var(--brand-accent)]"
                  />
                  {customWallet && !isValidAddress && (
                    <span className="text-[11px] text-rose-400 flex items-center gap-1.5 pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Please enter a valid 42-character BSC address starting with 0x.</span>
                    </span>
                  )}
                  {customWallet && isValidAddress && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Valid BEP-20 address format on BNB Smart Chain.</span>
                    </span>
                  )}
                </div>
              )}
              <span className="text-[11px] text-secondary">
                Purchased tokens are delivered strictly on <strong>BNB Smart Chain (BEP-20)</strong>.
              </span>
            </div>

            {/* Exchange Basis Information Bar */}
            <div className="p-3 rounded-xl bg-[var(--bg-elevated)]/60 border border-[var(--border-subtle)] space-y-1 text-xs text-secondary">
              <div className="flex justify-between">
                <span>{selectedCurrency}/INR Reference Rate:</span>
                <span className="text-white font-semibold">1 {selectedCurrency} = ₹{quote.rateToInr.toFixed(2)} INR</span>
              </div>
              <div className="flex justify-between">
                <span>Benchmark Token Price:</span>
                <span className="text-white font-semibold">
                  ₹{tokenPriceInr.toFixed(2)} INR (~${tokenPriceUsd.toFixed(5)} USD)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Quote Validity Window:</span>
                <span className="text-emerald-400 font-semibold">15 Minutes (Staged)</span>
              </div>
            </div>

            {/* Disabled Action Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-4 rounded-xl bg-slate-800 text-slate-400 font-bold text-sm cursor-not-allowed border border-slate-700 flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Checkout Staged — Live Purchases Disabled</span>
              </button>
              <p className="text-[11px] text-muted text-center pt-2">
                This purchase terminal is currently in staged pre-launch mode.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Order Summary & 70:30 Allocation Breakdown (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card elevated className="border border-[var(--border-accent)] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h2 className="text-base font-bold text-white">Order Summary</h2>
              <Badge status="PROVISIONAL" />
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-secondary">Amount Payable ({selectedCurrency}):</span>
                <span className="text-white font-bold">
                  {quote.currencySymbol}{numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">INR Equivalent:</span>
                <span className="text-white font-semibold">₹{inrEquivalent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Canonical Minimum:</span>
                <span className="text-white font-semibold">₹{CANONICAL_MIN_PURCHASE_INR.toLocaleString('en-IN')} INR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Minimum Compliance:</span>
                <span className={validation.isValid ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  {validation.isValid ? '✓ Satisfied' : '✗ Below Minimum'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Network Gas Fee:</span>
                <span className="text-emerald-400 font-semibold">Sponsored (Protocol)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Statutory Tax & TDS:</span>
                <span className="text-secondary">Subject to Sec 194S (India)</span>
              </div>
            </div>

            {/* Calculated Token Breakdown */}
            <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
              <div className="text-xs uppercase font-bold tracking-wider text-[var(--brand-accent)]">
                Token Allocation Breakdown
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Customer Delivery</span>
                  <span className="text-base font-extrabold text-[var(--brand-accent)]">
                    {AllocationEngine.formatTokens(buyerTokensCount)} LIORA
                  </span>
                </div>
                <p className="text-[11px] text-secondary">
                  100% of your purchased tokens will be delivered to your wallet upon confirmed payment.
                </p>
              </div>

              {/* Reserve Allocation Card */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Protocol Liquidity Reserve</span>
                  <span className="text-sm font-bold text-amber-400">
                    +{AllocationEngine.formatTokens(allocA.reserveAllocation)} LIORA
                  </span>
                </div>
                <p className="text-[11px] text-secondary leading-relaxed">
                  A separate 30% allocation is directed to the liquidity reserve to build depth for secondary DEX trading on BNB Smart Chain.
                </p>
              </div>
            </div>

            {/* Delivery Destination Confirmation */}
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1 text-xs">
              <span className="text-secondary">Delivery Destination:</span>
              <div className="font-mono text-white break-all text-[11px]">
                {isValidAddress ? targetWallet : <span className="text-muted">Enter valid address above</span>}
              </div>
            </div>
          </Card>

          {/* Security & Regulatory Transparency Box */}
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2 text-xs text-secondary">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <ShieldCheck className="w-4 h-4 text-[var(--brand-accent)]" />
              <span>Security & Non-Custodial Delivery</span>
            </div>
            <ul className="space-y-1 list-disc list-inside text-[11px]">
              <li>Never share your private keys or seed phrase.</li>
              <li>Tokens are transferred directly on BNB Smart Chain (BEP-20).</li>
              <li>Transactions are verifiable on BscScan.</li>
            </ul>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
