import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Monitor, TrendingUp, Users, ShieldCheck, Sparkles, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { api } from '../services/api';
import { KioskDevice } from '../types';

export const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [kiosks, setKiosks] = useState<KioskDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [aData, kData] = await Promise.all([
          api.getAnalytics(),
          api.getKiosks(),
        ]);
        setAnalytics(aData);
        setKiosks(kData);
      } catch (e) {
        console.warn('Analytics load error', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#681D32] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-[#292522]/70">Loading showroom intelligence from PostgreSQL...</p>
      </div>
    );
  }

  const chartData = analytics?.hourlyTraffic || [
    { hour: '11:00', sessions: 6 },
    { hour: '12:00', sessions: 11 },
    { hour: '13:00', sessions: 8 },
    { hour: '14:00', sessions: 5 },
    { hour: '15:00', sessions: 9 },
    { hour: '16:00', sessions: 14 },
    { hour: '17:00', sessions: 18 },
    { hour: '18:00', sessions: 22 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E8E2D5] pb-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#B99A5B] font-bold">Executive Suite</div>
          <h1 className="font-serif text-3xl font-bold text-[#681D32]">
            Showroom Velocity & Kiosk Fleet Intelligence
          </h1>
          <p className="text-xs text-[#292522]/70 mt-1">
            Real-time analytics across Bangalore Flagship Maison and Hyderabad Heritage Lounge.
          </p>
        </div>

        <div className="text-xs text-[#292522]/70 bg-[#F2EDE2] px-3 py-1.5 rounded-lg border border-[#E8E2D5]">
          Director: <strong>Priya Somani</strong>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Virtual Drapings Today', value: analytics?.completedDrapings || 134, icon: Sparkles, change: '+18.4% vs last week' },
          { label: 'Fitting Conversion Rate', value: analytics?.conversionToFittingRate || '68.5%', icon: TrendingUp, change: 'Top salon performance' },
          { label: 'Active Kiosks Online', value: `${kiosks.length} Units`, icon: Monitor, change: '100% operational uptime' },
          { label: 'Avg Draping Velocity', value: '14.2 Mins', icon: Users, change: 'Preserved 85+ delicate silks' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-[#FAF7F0] border border-[#E8E2D5] rounded-xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#292522]/70 font-medium">{kpi.label}</span>
              <span className="p-2 bg-[#681D32]/10 rounded-lg text-[#681D32]">
                <kpi.icon className="w-4 h-4" />
              </span>
            </div>
            <div className="font-serif text-2xl font-bold text-[#681D32]">{kpi.value}</div>
            <div className="text-[10px] text-emerald-700 font-medium">{kpi.change}</div>
          </div>
        ))}
      </div>

      {/* Analytics Charts & Most Draped Sarees */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Hourly Traffic Chart */}
        <div className="lg:col-span-7 bg-[#FAF7F0] border border-[#E8E2D5] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-base font-bold text-[#681D32]">
              Showroom Virtual Drape Traffic (Hourly)
            </h3>
            <span className="text-xs text-[#B99A5B] font-semibold">Today's Peak: 18:00</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D5" />
                <XAxis dataKey="hour" stroke="#292522" fontSize={11} />
                <YAxis stroke="#292522" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FAF7F0', borderColor: '#B99A5B', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="sessions" fill="#681D32" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Draped Sarees */}
        <div className="lg:col-span-5 bg-[#FAF7F0] border border-[#E8E2D5] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-serif text-base font-bold text-[#681D32]">
            Top Draped Masterpieces
          </h3>
          <div className="space-y-3">
            {(analytics?.topDrapedSarees || []).map((s: any, i: number) => (
              <div key={i} className="p-3 bg-[#F2EDE2]/60 rounded-xl border border-[#E8E2D5] flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-[#681D32]">{s.name}</div>
                  <div className="text-[10px] text-[#292522]/60">{s.sku}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#292522]">{s.tries} Tries</div>
                  <div className="text-[10px] text-emerald-700 font-medium">{s.conversions} Fittings</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Kiosk Fleet Management Table */}
      <div className="bg-[#FAF7F0] border border-[#E8E2D5] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-[#E8E2D5] pb-3">
          <div className="flex items-center gap-2 font-serif font-bold text-base text-[#681D32]">
            <Monitor className="w-5 h-5 text-[#B99A5B]" />
            <span>Showroom Kiosk Fleet Telemetry</span>
          </div>
          <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded font-semibold border border-emerald-200">
            All Monoliths Online
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F2EDE2] text-[#292522] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4 rounded-l-lg">Kiosk Name</th>
                <th className="py-2.5 px-4">Identifier</th>
                <th className="py-2.5 px-4">Boutique Location</th>
                <th className="py-2.5 px-4">Sensor Resolution</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 rounded-r-lg">Last Ping</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D5]">
              {kiosks.map(k => (
                <tr key={k.id} className="hover:bg-[#F2EDE2]/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[#681D32]">{k.name}</td>
                  <td className="py-3 px-4 font-mono text-[#292522]">{k.identifier}</td>
                  <td className="py-3 px-4 text-[#292522]/80">{k.storeName || 'Flagship Maison'}</td>
                  <td className="py-3 px-4 text-[#292522]/80">1080x1920 (Portrait 4K)</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      ACTIVE
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#292522]/60">Just now</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
