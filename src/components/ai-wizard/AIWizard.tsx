'use client';

import { useDemoConfig } from '@/context/DemoConfigContext';
import { useFakeBills } from '@/hooks/useFakeBills';
import { useDemoMerchant } from '@/context/DemoMerchantContext';
import { SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Suggestion = {
    id: string;
    message: string;
    actionLabel: string;
    action: () => Promise<void>;
};


export const AIWizard = () => {
    const { language } = useDemoConfig();
    const { account, isSignedIn } = useDemoMerchant();
    const router = useRouter();
    const pathname = usePathname();

    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(true);
    const [lastShownOnRoute, setLastShownOnRoute] = useState<string | null>(null);

    const pathnameWithoutLanguage = pathname.replace(`/${language}`, '');

    // Get bills from local storage
    const { bills } = useFakeBills();
    const openBills = useMemo(() => (bills ?? []).filter(b => b.status === 'open'), [bills]);
    const openCount = openBills.length;

    // Pages where we show the approvals suggestion
    const approvalSuggestionPages = ['/dashboard', '/dashboard/suppliers'];
    const isOnApprovalPage = approvalSuggestionPages.includes(pathnameWithoutLanguage);

    const shouldShowApprovalSuggestion = useMemo(() => {
        if (!isSignedIn || !account) return false;
        return isOnApprovalPage;
    }, [isSignedIn, account, isOnApprovalPage]);

    const handleApprovalAction = async () => {
        router.push(`/${language}/dashboard/suppliers?tab=item-invoices`);
        setIsOpen(false);
        setIsMinimized(true);
    };

    // Current suggestion based on route and state
    const currentSuggestion: Suggestion | null = useMemo(() => {
        if (shouldShowApprovalSuggestion) {
            const count = openCount > 0 ? openCount : 14;
            return {
                id: 'pending-approvals',
                message: `Action Required: You have ${count} supplier payment${count !== 1 ? 's' : ''} pending authorisation, including scheduled invoices and batch disbursements. Timely approval ensures uninterrupted supplier relationships and avoids late payment fees.`,
                actionLabel: 'Review pending payments',
                action: handleApprovalAction,
            };
        }
        return null;
    }, [shouldShowApprovalSuggestion, openCount]);

    // Auto-expand only on the home dashboard; collapse when navigating away
    useEffect(() => {
        if (pathnameWithoutLanguage !== '/dashboard') {
            setIsOpen(false);
            setIsMinimized(true);
            return;
        }
        if (currentSuggestion && lastShownOnRoute !== pathnameWithoutLanguage) {
            setIsOpen(true);
            setIsMinimized(false);
            setLastShownOnRoute(pathnameWithoutLanguage);
        }
    }, [currentSuggestion, pathnameWithoutLanguage, lastShownOnRoute]);

    // Don't render if not signed in
    if (!isSignedIn || !account) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* Chat Panel */}
            {isOpen && !isMinimized && (
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="h-5 w-5 text-white" />
                            <span className="font-semibold text-white text-sm">
                                AI Assistant
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                setIsMinimized(true);
                            }}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        {currentSuggestion ? (
                            <div className="space-y-4">
                                {/* AI Message */}
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
                                        <SparklesIcon className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="flex-1 bg-gray-50 rounded-xl rounded-tl-none px-4 py-3">
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            {currentSuggestion.message}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={currentSuggestion.action}
                                    className="w-full bg-brand-primary hover:bg-brand-primary/90 text-brand-primary-contrasting font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    {currentSuggestion.actionLabel}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                    <SparklesIcon className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="text-sm text-gray-500">
                                    No suggestions right now.
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    I&apos;ll notify you when I have insights.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => {
                    if (isMinimized) {
                        setIsOpen(true);
                        setIsMinimized(false);
                    } else {
                        setIsMinimized(true);
                    }
                }}
                className={`group relative w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${currentSuggestion
                    ? 'bg-gradient-to-br from-brand-primary to-brand-secondary hover:scale-105'
                    : 'bg-white border border-gray-200 hover:border-brand-primary'
                    }`}
            >
                <SparklesIcon
                    className={`h-6 w-6 transition-colors ${currentSuggestion
                        ? 'text-white'
                        : 'text-gray-400 group-hover:text-brand-primary'
                        }`}
                />

                {/* Notification Badge */}
                {currentSuggestion && isMinimized && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-primary rounded-full flex items-center justify-center animate-pulse">
                        <span className="text-[10px] text-white font-bold">1</span>
                    </span>
                )}
            </button>
        </div>
    );
};

