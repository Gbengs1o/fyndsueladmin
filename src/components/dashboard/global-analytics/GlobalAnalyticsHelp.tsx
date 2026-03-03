'use client';

import React from 'react';
import { BookOpen, MapPin, Target, Users } from 'lucide-react';

export default function GlobalAnalyticsHelp() {
    return (
        <div className="bg-card rounded-3xl border border-border shadow-sm p-8 mt-8 flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                    <BookOpen size={24} />
                </div>
                <h3 className="text-xl font-bold m-0 mb-2 text-foreground">Understanding Global Platform Metrics</h3>
                <p className="text-muted-foreground text-sm m-0 leading-relaxed">
                    This dashboard aggregates data across all mapped stations and registered drivers nationwide to give you a bird's-eye view of Fynd Fuel's health.
                </p>
            </div>

            <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-muted/30 p-5 rounded-2xl border border-border">
                    <Users size={20} className="text-primary mb-3" />
                    <h4 className="font-semibold text-sm m-0 mb-1">Platform Reach vs Active Audience</h4>
                    <p className="text-xs text-muted-foreground m-0">
                        Tracks total registrations against how many users actually submitted reports or verified prices within the selected timeframe. Focus gamification on regions with high drop-off.
                    </p>
                </div>

                <div className="bg-muted/30 p-5 rounded-2xl border border-border">
                    <Target size={20} className="text-green-500 mb-3" />
                    <h4 className="font-semibold text-sm m-0 mb-1">Data Volume & Traffic</h4>
                    <p className="text-xs text-muted-foreground m-0">
                        High reporting volume means accurate, fresh prices. Look for dips in the Engagement Chart—these usually indicate app issues or a stable economy reducing driver incentive to check prices.
                    </p>
                </div>
            </div>

        </div>
    );
}
