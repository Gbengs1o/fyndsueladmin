'use client';

import React from 'react';
import { HelpCircle, Target, Zap, Users, BarChart3, TrendingUp } from 'lucide-react';

const guideItems = [
    {
        icon: <Users size={20} />,
        title: "Community Reach",
        description: "Your brand's total visibility. We combine Profile Views (app exploration), Verified Reports (physical presence), and Driver Favorites (loyalty) into one factual score.",
        tip: "Higher reach means more drivers have you in mind for their next refuel."
    },
    {
        icon: <Zap size={20} />,
        title: "Verified Interactions",
        description: "The 'Heartbeat' of your station. This tracks hard actions like drivers submitting price reports or reviews. It is the most reliable sign of engagement.",
        tip: "Frequent updates in the feed show a healthy, trusted relationship with your drivers."
    },
    {
        icon: <BarChart3 size={20} />,
        title: "Conversion Efficiency",
        description: "Measures your 'Closing Power'. It tracks how many drivers who viewed your station profile actually took an action (visit, report, or review).",
        tip: "If this is low, consider updating your price or running a promotion to entice viewers."
    },
    {
        icon: <TrendingUp size={20} />,
        title: "Capacity Usage",
        description: "Your efficiency at peak hours. It compares your busiest day to the maximum capacity you configure in the settings.",
        tip: "Low usage means you have room to grow! High usage (~90%+) suggests you might need more staff during peaks."
    }
];

export default function AnalyticsHelp() {
    return (
        <section className="mt-16 p-10 bg-card rounded-3xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <HelpCircle size={24} />
                </div>
                <div>
                    <h2 className="m-0 text-2xl font-bold">Understanding Your Analytics</h2>
                    <p className="m-0 mt-1 text-muted-foreground text-sm">
                        A guide to using your data to drive station growth.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {guideItems.map((item, i) => (
                    <div key={i} className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="text-primary">{item.icon}</div>
                            <h3 className="m-0 text-lg font-semibold">{item.title}</h3>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground m-0">
                            {item.description}
                        </p>
                        <div className="p-3 bg-background rounded-xl text-sm border-l-4 border-l-primary italic">
                            <strong>Pro Tip:</strong> {item.tip}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 p-6 bg-green-500/5 rounded-2xl border border-green-500/20 flex items-center gap-4">
                <Target size={24} className="text-green-500 shrink-0" />
                <p className="m-0 text-sm text-foreground">
                    <strong>Goal for this week:</strong> Aim to increase your <strong>Conversion Efficiency</strong> by keeping your fuel prices updated. Drivers are 3x more likely to visit stations with "Fresh" verified prices.
                </p>
            </div>
        </section>
    );
}
