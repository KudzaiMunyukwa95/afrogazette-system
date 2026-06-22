import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, DollarSign, FileText, CheckSquare } from 'lucide-react';

const FinanceNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { name: 'Overview', path: '/finance/overview', icon: BarChart3 },
        { name: 'Expenses', path: '/finance/expenses', icon: DollarSign },
        { name: 'Requisitions', path: '/finance/requisitions', icon: CheckSquare },
        { name: 'Reports', path: '/finance/reports', icon: FileText },
    ];

    return (
        <div className="bg-white border-b border-gray-200 mb-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex space-x-8 overflow-x-auto">
                    {tabs.map((tab) => {
                        const isActive = location.pathname === tab.path;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.name}
                                onClick={() => navigate(tab.path)}
                                className={`
                  flex items-center py-4 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors
                  ${isActive
                                        ? 'border-red-600 text-red-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }
                `}
                            >
                                <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-red-600' : 'text-gray-400'}`} />
                                {tab.name}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default FinanceNav;
