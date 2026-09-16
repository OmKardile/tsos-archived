import { Link } from 'react-router-dom';
import { useState } from 'react';

const features = [
  {
    icon: '⚡',
    title: 'Lightning POS',
    desc: 'Tap-to-add, swipe-to-complete. Orders in under 3 seconds.',
  },
  {
    icon: '📊',
    title: 'Live Dashboard',
    desc: 'Real-time sales, peak hours, and top items — updated every second.',
  },
  {
    icon: '🍳',
    title: 'Kitchen Display',
    desc: 'Orders land on the KDS instantly. No paper, no confusion.',
  },
  {
    icon: '📱',
    title: 'Online Ordering',
    desc: 'Customers order from their phone. QR code on every table.',
  },
  {
    icon: '📦',
    title: 'Inventory Tracking',
    desc: 'Low-stock alerts before you run out. Auto-deduct on every sale.',
  },
  {
    icon: '👥',
    title: 'Customer Profiles',
    desc: 'Track favorites, visit history, and run loyalty campaigns.',
  },
];

const steps = [
  { num: '01', title: 'Sign up', desc: 'Create your account in 60 seconds. No credit card required.' },
  { num: '02', title: 'Add your menu', desc: 'Upload items, set prices, organize by category.' },
  { num: '03', title: 'Start selling', desc: 'Open the POS, take orders, get paid. That\'s it.' },
];

const testimonials = [
  { name: 'Priya Sharma', role: 'Owner, Chai & Co.', quote: 'We cut our average order time from 4 minutes to 90 seconds.' },
  { name: 'Rahul Verma', role: 'Manager, Urban Diner', quote: 'The KDS alone saved us ₹40,000/month in wasted orders.' },
  { name: 'Ananya Patel', role: 'Founder, Spice Route', quote: 'Finally a POS that understands the Indian market. UPI, QR codes, everything.' },
];

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background font-sans text-text">
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-divider">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-text">
            <span className="text-action">TS</span>OS
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
            <a href="#features" className="hover:text-text transition">Features</a>
            <a href="#how" className="hover:text-text transition">How it works</a>
            <a href="#testimonials" className="hover:text-text transition">Reviews</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text transition"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="px-5 py-2 text-sm font-semibold text-white bg-action hover:bg-action-hover rounded-lg transition"
            >
              Get started free
            </Link>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-text-secondary"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M6 6l12 12M6 18L18 6" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-divider bg-background px-6 py-4 flex flex-col gap-3">
            <a href="#features" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-text-secondary">Features</a>
            <a href="#how" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-text-secondary">How it works</a>
            <a href="#testimonials" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-text-secondary">Reviews</a>
            <hr className="border-divider" />
            <Link to="/login" className="text-sm font-medium text-text-secondary">Log in</Link>
            <Link to="/signup" className="text-sm font-semibold text-white bg-action hover:bg-action-hover rounded-lg text-center py-2">
              Get started free
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 bg-action-soft text-action text-xs font-semibold rounded-full mb-6">
            Built for Indian restaurants
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text leading-tight tracking-tight">
            Your POS should be{' '}
            <span className="text-action">as fast as your food</span>
          </h1>
          <p className="mt-6 text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            TSOS is a modern point-of-sale built for busy restaurants. Take orders in seconds,
            track inventory in real-time, and grow your business with built-in analytics.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-action hover:bg-action-hover rounded-xl transition shadow-lg shadow-action/20"
            >
              Start for free →
            </Link>
            <a
              href="#how"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-medium text-text border border-divider hover:border-text-secondary rounded-xl transition"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-text-muted">No credit card · Free 14-day trial · Cancel anytime</p>
        </div>
      </section>

      {/* ── HERO VISUAL ── */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-divider bg-surface shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-divider bg-surface-secondary">
              <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
              <span className="w-3 h-3 rounded-full bg-[#28C840]" />
              <span className="ml-4 text-xs text-text-muted font-medium">TSOS Dashboard</span>
            </div>
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Today\'s Sales', value: '₹1,24,580', color: 'text-completed' },
                { label: 'Orders', value: '186', color: 'text-action' },
                { label: 'Avg. Time', value: '2.4 min', color: 'text-attention' },
                { label: 'Customers', value: '94', color: 'text-text' },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-divider bg-background p-4">
                  <p className="text-xs text-text-muted font-medium">{kpi.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <div className="rounded-xl border border-divider bg-background p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-text">Recent Orders</span>
                  <span className="text-xs text-action font-medium">View all</span>
                </div>
                {['Masala Chai × 2', 'Paneer Tikka', 'Veg Biryani'].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-t border-divider first:border-0">
                    <span className="text-sm text-text-secondary">{item}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      i === 0 ? 'bg-completed-soft text-completed' :
                      i === 1 ? 'bg-attention-soft text-attention' :
                      'bg-action-soft text-action'
                    }`}>
                      {i === 0 ? 'Completed' : i === 1 ? 'Preparing' : 'New'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 px-6 bg-surface-secondary">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-text">
              Everything you need to run your restaurant
            </h2>
            <p className="mt-4 text-text-secondary max-w-xl mx-auto">
              One platform that handles orders, inventory, staff, and analytics — so you can focus on the food.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-divider bg-surface p-6 hover:shadow-md transition"
              >
                <span className="text-3xl">{f.icon}</span>
                <h3 className="mt-4 text-lg font-semibold text-text">{f.title}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-text">
              Up and running in 3 steps
            </h2>
            <p className="mt-4 text-text-secondary">
              No complicated setup. No training manuals. Just sign up and sell.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-action-soft text-action text-xl font-bold mb-4">
                  {s.num}
                </div>
                <h3 className="text-lg font-semibold text-text">{s.title}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-20 px-6 bg-surface-secondary">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-text">
              Trusted by restaurants across India
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-divider bg-surface p-6"
              >
                <p className="text-sm text-text-secondary leading-relaxed italic">
                  "{t.quote}"
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-action-soft flex items-center justify-center text-action font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">{t.name}</p>
                    <p className="text-xs text-text-muted">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-text">
            Ready to transform your restaurant?
          </h2>
          <p className="mt-4 text-text-secondary max-w-xl mx-auto">
            Join 500+ restaurants already using TSOS. Start your free trial today — no credit card required.
          </p>
          <div className="mt-10">
            <Link
              to="/signup"
              className="inline-block px-10 py-4 text-base font-semibold text-white bg-action hover:bg-action-hover rounded-xl transition shadow-lg shadow-action/20"
            >
              Get started free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-divider py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-text-muted">
            <span className="font-semibold text-text-secondary">TSOS</span> © {new Date().getFullYear()} All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-text-muted">
            <a href="#" className="hover:text-text transition">Privacy</a>
            <a href="#" className="hover:text-text transition">Terms</a>
            <a href="mailto:hello@tsos.dev" className="hover:text-text transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
