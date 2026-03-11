import React from 'react';

const AdminLogs: React.FC = () => {
  const features = [
    { label: 'User Actions', desc: 'Track login, logout, and user activities', color: '#3b82f6', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> },
    { label: 'Data Changes', desc: 'Monitor all data modifications', color: '#22c55e', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg> },
    { label: 'Error Tracking', desc: 'Identify and resolve system errors', color: '#ef4444', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg> },
    { label: 'Advanced Filtering', desc: 'Search and filter logs efficiently', color: '#a78bfa', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg> },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white">System Logs</h1>
        <p className="text-zinc-500 text-sm mt-1">Monitor system activity and audit trails</p>
      </div>

      <div className="rounded-xl p-6 sm:p-10 text-center" style={{ background: '#0f0f12', border: '1px solid rgba(255,255,255,.06)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(6,182,212,.08)', border: '1px solid rgba(6,182,212,.15)' }}>
          <svg className="w-7 h-7" style={{ color: '#06b6d4' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
        </div>
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-1.5">Logging System Coming Soon</h2>
        <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">We're implementing comprehensive logging to track all system activities and changes.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left max-w-2xl mx-auto">
          {features.map((f) => (
            <div key={f.label} className="rounded-lg p-3.5 transition-colors" style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}>
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${f.color}12`, color: f.color }}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white mb-0.5">{f.label}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-zinc-600 mt-6">This feature is currently in development.</p>
      </div>
    </div>
  );
};

export default AdminLogs;
