import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/donations")({
  component: DonationsLandingPage,
});

const impactStats = [
  { label: "Meals Sponsored", value: "18,420+" },
  { label: "Families Supported", value: "3,900+" },
  { label: "Community Projects", value: "128" },
];

const donationTiers = [
  {
    title: "Starter Gift",
    amount: "$25",
    detail: "Provides clean water kits for one family.",
  },
  {
    title: "Monthly Impact",
    amount: "$75",
    detail: "Supports weekly essentials for vulnerable households.",
  },
  {
    title: "Community Builder",
    amount: "$150",
    detail: "Funds local volunteer-led neighborhood programs.",
  },
];

function DonationsLandingPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[linear-gradient(130deg,#f7fef8_0%,#ecfeff_45%,#f8fafc_100%)] text-slate-900">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-emerald-300/45 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <header className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-md sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black tracking-wide text-white">
              HY
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[0.22em] text-emerald-700 uppercase">Hadyaa</p>
              <p className="truncate text-xs text-slate-600">Donation Network</p>
            </div>
          </div>
          <Button
            render={<Link to="/login" />}
            className="h-10 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800"
          >
            Admin Login
          </Button>
        </header>

        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-emerald-700 uppercase">
              <Sparkles className="size-4" />
              Transparent Giving, Real Outcomes
            </p>
            <h1 className="max-w-xl text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Turn every donation into measurable community impact.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-700 sm:text-lg">
              Fund trusted local projects with live progress tracking, public accountability, and secure donation
              handling for every campaign.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                render={<Link to="/login" />}
                className="h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-6 text-white shadow-md transition hover:brightness-105"
              >
                Start Donating
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-xl border-slate-300 bg-white/80 px-6 text-slate-800 hover:bg-white"
              >
                Explore Campaigns
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {impactStats.map((stat) => (
                <article key={stat.label} className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
                  <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                  <p className="mt-1 text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{stat.label}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-3xl border border-white/80 bg-slate-900 p-5 text-slate-50 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.7)] sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/25 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />

            <div className="relative space-y-5">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs tracking-[0.14em] text-cyan-100 uppercase">
                <WalletCards className="size-3.5" />
                Donation Spotlight
              </p>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Ramadan Family Relief Drive</h2>
                <p className="text-sm text-slate-200">
                  Help 500 families access food, shelter support, and school supplies over the next 30 days.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Raised</span>
                  <span className="font-semibold text-white">$42,800 / $60,000</span>
                </div>
                <div className="h-2 rounded-full bg-slate-700/80">
                  <div className="h-2 w-[71%] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
                </div>
              </div>

              <ul className="space-y-2 text-sm text-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-300" />
                  Audited project milestones
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-300" />
                  Daily field update summaries
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-300" />
                  Receipts and spending breakdown
                </li>
              </ul>
            </div>
          </aside>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {donationTiers.map((tier) => (
            <article
              key={tier.title}
              className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1"
            >
              <h3 className="text-lg font-bold text-slate-900">{tier.title}</h3>
              <p className="mt-1 text-3xl font-black text-emerald-700">{tier.amount}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{tier.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm backdrop-blur-md md:grid-cols-3">
          <article className="flex gap-3">
            <div className="mt-0.5 rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Secure Payments</h3>
              <p className="text-sm text-slate-600">Bank-level encryption and verified transaction records.</p>
            </div>
          </article>
          <article className="flex gap-3">
            <div className="mt-0.5 rounded-xl bg-cyan-100 p-2 text-cyan-700">
              <Users className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Community Verified</h3>
              <p className="text-sm text-slate-600">Projects reviewed by local leaders before publishing.</p>
            </div>
          </article>
          <article className="flex gap-3">
            <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-700">
              <Coins className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Transparent Allocation</h3>
              <p className="text-sm text-slate-600">Clear breakdown of how each dollar is applied.</p>
            </div>
          </article>
        </section>

        <section className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-slate-200 bg-slate-900 px-6 py-8 text-white sm:px-8 md:flex-row md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs tracking-[0.16em] text-cyan-200 uppercase">
              <HeartHandshake className="size-4" />
              Join the Impact Circle
            </p>
            <h2 className="mt-2 text-2xl font-bold">Give with confidence. Track every step.</h2>
          </div>
          <Button
            render={<Link to="/login" />}
            className="h-11 rounded-xl bg-white px-6 font-semibold text-slate-900 hover:bg-slate-100"
          >
            Donate Now
          </Button>
        </section>
      </section>
    </main>
  );
}
