import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Info, RefreshCcw, Plus, Minus } from "lucide-react";

// Simple utility components (clean, Tailwind-styled)
const Card = ({ className = "", children }) => (
  <div className={`rounded-2xl bg-white/5 backdrop-blur-md shadow-xl ring-1 ring-white/10 ${className}`}>{children}</div>
);
const CardHeader = ({ title, subtitle, right }) => (
  <div className="flex items-start justify-between p-5">
    <div>
      <h3 className="text-lg md:text-xl font-semibold text-white tracking-tight">{title}</h3>
      {subtitle && <p className="text-sm text-white/60 mt-1">{subtitle}</p>}
    </div>
    {right}
  </div>
);
const CardBody = ({ className = "", children }) => (
  <div className={`p-5 pt-0 ${className}`}>{children}</div>
);
const Chip = ({ children, intent = "default" }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${intent === "warn"
      ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/30"
      : intent === "ok"
        ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30"
        : "bg-white/10 text-white/80 ring-1 ring-white/20"
      }`}
  >
    {children}
  </span>
);
const IconButton = ({ onClick, children, className = "", title }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`active:scale-95 transition-transform inline-flex items-center justify-center rounded-xl px-3 py-2 bg-white/10 ring-1 ring-white/20 hover:bg-white/15 text-white ${className}`}
  >
    {children}
  </button>
);

// Colors for the charts (accessible on dark backgrounds)
const CHART_COLORS = ["#60a5fa", "#f472b6", "#34d399"]; // blue, pink, green

// Helper: number formatting
const nf = (n, d = 0) => {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "0";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
};

export default function NutritionCalculatorApp() {
  // Inputs per 100g
  const [per100, setPer100] = useState({ kcal: 250, fat: 10, carb: 30, protein: 12 });

  // Portion controls
  const [grams, setGrams] = useState(100); // grams per serving
  const [servings, setServings] = useState(1);

  // Persist to localStorage so it's handy on phone reopens
  useEffect(() => {
    const saved = localStorage.getItem("nutriCalcState:v1");
    if (saved) {
      try {
        const obj = JSON.parse(saved);
        if (obj?.per100) setPer100(obj.per100);
        if (obj?.grams) setGrams(obj.grams);
        if (obj?.servings) setServings(obj.servings);
      } catch { }
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("nutriCalcState:v1", JSON.stringify({ per100, grams, servings }));
  }, [per100, grams, servings]);

  // Derived values
  const derived = useMemo(() => {
    const gTotal = grams * servings;
    const factor = gTotal / 100;

    const fatG = (per100.fat || 0) * factor;
    const carbG = (per100.carb || 0) * factor;
    const proteinG = (per100.protein || 0) * factor;

    const kcalLabel = (per100.kcal || 0) * factor; // as provided

    const kcalFromMacrosPer100 = per100.fat * 9 + per100.carb * 4 + per100.protein * 4;
    const kcalFromMacros = kcalFromMacrosPer100 * factor;

    const diffAbsPer100 = Math.abs((per100.kcal || 0) - kcalFromMacrosPer100);
    const diffPctPer100 = kcalFromMacrosPer100 > 0 ? (diffAbsPer100 / kcalFromMacrosPer100) * 100 : 0;

    const macroKcal = {
      fat: fatG * 9,
      carb: carbG * 4,
      protein: proteinG * 4,
    };
    const macroKcalTotal = macroKcal.fat + macroKcal.carb + macroKcal.protein;

    const macroPct = {
      fat: macroKcalTotal ? (macroKcal.fat / macroKcalTotal) * 100 : 0,
      carb: macroKcalTotal ? (macroKcal.carb / macroKcalTotal) * 100 : 0,
      protein: macroKcalTotal ? (macroKcal.protein / macroKcalTotal) * 100 : 0,
    };

    return {
      gTotal,
      factor,
      fatG,
      carbG,
      proteinG,
      kcalLabel,
      kcalFromMacros,
      kcalFromMacrosPer100,
      diffAbsPer100,
      diffPctPer100,
      macroKcal,
      macroKcalTotal,
      macroPct,
    };
  }, [per100, grams, servings]);

  const donutData = [
    { name: "Carbs", value: derived.macroKcal.carb },
    { name: "Protein", value: derived.macroKcal.protein },
    { name: "Fat", value: derived.macroKcal.fat },
  ];

  const gramsData = [
    { name: "Fat", grams: derived.fatG },
    { name: "Carbs", grams: derived.carbG },
    { name: "Protein", grams: derived.proteinG },
  ];

  const consistencyIntent = derived.diffPctPer100 < 5 ? "ok" : derived.diffPctPer100 < 15 ? "default" : "warn";

  const quickGramOptions = [30, 50, 75, 100, 150, 200, 250, 300];

  const resetAll = () => {
    setPer100({ kcal: 250, fat: 10, carb: 30, protein: 12 });
    setGrams(100);
    setServings(1);
  };

  // Input handler helper
  const onPer100Change = (key, value) => {
    const v = Math.max(0, Number(value ?? 0));
    setPer100((p) => ({ ...p, [key]: v }));
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, notify user
                if (confirm('New version available! Would you like to update?')) {
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch(error => console.log('Service worker registration failed:', error));
    }
  }, []);

  // Layout: mobile-first, one column; on md/lg screens, two columns
  return (
    <div className="min-h-screen w-full text-white bg-[radial-gradient(1200px_600px_at_80%_-10%,rgba(76,29,149,0.35),transparent),radial-gradient(1000px_500px_at_20%_10%,rgba(220,38,38,0.25),transparent),linear-gradient(180deg,#0b1020, #0b0f1a)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between gap-3 mb-6 md:mb-8"
        >
          <div>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Nutritional Calculator</h1>
            <p className="text-white/60 mt-1 max-w-prose text-sm md:text-base">
              Enter values per <span className="font-semibold text-white/80">100 g</span>. Adjust portion and servings to see totals, macro
              breakdowns, and calorie consistency.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <IconButton onClick={resetAll} title="Reset all">
              <RefreshCcw className="w-4 h-4" />
            </IconButton>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          {/* Left column: Inputs */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="space-y-5 md:space-y-6"
          >
            <Card>
              <CardHeader
                title="Per 100 g values"
                subtitle="These are usually on the nutrition label"
                right={<Chip intent={consistencyIntent}>Consistency check</Chip>}
              />
              <CardBody>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <LabeledNumber
                    label="Calories"
                    suffix="kcal"
                    value={per100.kcal}
                    onChange={(v) => onPer100Change("kcal", v)}
                  />
                  <LabeledNumber
                    label="Fat"
                    suffix="g"
                    value={per100.fat}
                    onChange={(v) => onPer100Change("fat", v)}
                  />
                  <LabeledNumber
                    label="Carbs"
                    suffix="g"
                    value={per100.carb}
                    onChange={(v) => onPer100Change("carb", v)}
                  />
                  <LabeledNumber
                    label="Protein"
                    suffix="g"
                    value={per100.protein}
                    onChange={(v) => onPer100Change("protein", v)}
                  />
                </div>

                <div className="mt-4 text-xs md:text-sm text-white/70 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 shrink-0 text-white/50" />
                  <p>
                    From macros: <span className="font-medium text-white">{nf(derived.kcalFromMacrosPer100, 0)} kcal</span> per 100 g. Label says
                    <span className="font-medium text-white"> {nf(per100.kcal, 0)} kcal</span>.
                    Diff: <span className={`font-medium ${consistencyIntent === "warn" ? "text-amber-300" : "text-white"}`}>{nf(derived.diffPctPer100, 1)}%</span>.
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Portion & Servings" subtitle="Adjust the portion size and number of servings" />
              <CardBody>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-white/70">Grams per serving</label>
                      <span className="text-sm font-medium">{nf(grams, 0)} g</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={1000}
                      step={1}
                      value={grams}
                      onChange={(e) => setGrams(Number(e.target.value))}
                      className="w-full accent-indigo-400"
                    />
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {quickGramOptions.map((g) => (
                        <button
                          key={g}
                          onClick={() => setGrams(g)}
                          className={`rounded-xl px-3 py-2 text-sm ring-1 ring-white/15 bg-white/5 hover:bg-white/10 text-white/80 ${grams === g ? "outline outline-2 outline-indigo-400/60 text-white" : ""
                            }`}
                        >
                          {g} g
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm text-white/70">Servings</label>
                    <div className="flex items-center gap-2">
                      <IconButton onClick={() => setServings((s) => Math.max(1, s - 1))} title="Decrease">
                        <Minus className="w-4 h-4" />
                      </IconButton>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={servings}
                        onChange={(e) => setServings(Math.max(1, Number(e.target.value || 1)))}
                        className="w-20 text-center bg-white/5 rounded-xl ring-1 ring-white/15 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <IconButton onClick={() => setServings((s) => s + 1)} title="Increase">
                        <Plus className="w-4 h-4" />
                      </IconButton>
                    </div>
                  </div>

                  <div className="pt-2 text-sm text-white/70">
                    Total considered: <span className="text-white font-medium">{nf(derived.gTotal, 0)} g</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.section>

          {/* Right column: Results & Charts */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="space-y-5 md:space-y-6"
          >
            <Card>
              <CardHeader title="Totals for your portion" subtitle="All values include servings" />
              <CardBody>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                  <Stat title="Calories" value={`${nf(derived.kcalLabel, 0)} kcal`} hint={`${nf(derived.kcalFromMacros, 0)} kcal from macros`} />
                  <Stat title="Fat" value={`${nf(derived.fatG, 1)} g`} hint={`${nf(derived.macroKcal.fat, 0)} kcal`} />
                  <Stat title="Carbs" value={`${nf(derived.carbG, 1)} g`} hint={`${nf(derived.macroKcal.carb, 0)} kcal`} />
                  <Stat title="Protein" value={`${nf(derived.proteinG, 1)} g`} hint={`${nf(derived.macroKcal.protein, 0)} kcal`} />
                </div>
              </CardBody>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-5">
              <Card>
                <CardHeader title="Macro calorie split" subtitle="Donut shows share of calories from macros" />
                <CardBody>
                  <div className="h-64 w-full">
                    <ResponsiveContainer>
                      <PieChart>
                        <Tooltip
                          contentStyle={{ background: "rgba(17, 24, 39, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                          itemStyle={{ color: "white" }}
                        />
                        <Legend wrapperStyle={{ color: "#cbd5e1" }} />
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={95}
                          paddingAngle={2}
                          isAnimationActive
                        >
                          {donutData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                    <MacroPill label="Carbs" pct={derived.macroPct.carb} color={CHART_COLORS[0]} />
                    <MacroPill label="Protein" pct={derived.macroPct.protein} color={CHART_COLORS[1]} />
                    <MacroPill label="Fat" pct={derived.macroPct.fat} color={CHART_COLORS[2]} />
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Grams by macro" subtitle="Bar chart of grams in your portion" />
                <CardBody>
                  <div className="h-64 w-full">
                    <ResponsiveContainer>
                      <BarChart data={gramsData}>
                        <XAxis dataKey="name" tick={{ fill: "#cbd5e1" }} axisLine={{ stroke: "#334155" }} tickLine={{ stroke: "#334155" }} />
                        <YAxis tick={{ fill: "#cbd5e1" }} axisLine={{ stroke: "#334155" }} tickLine={{ stroke: "#334155" }} />
                        <Tooltip
                          contentStyle={{ background: "rgba(17, 24, 39, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                          itemStyle={{ color: "white" }}
                        />
                        <Bar dataKey="grams" radius={[8, 8, 8, 8]}>
                          {gramsData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>
            </div>
          </motion.section>
        </div>

        {/* Footer */}
        <footer className="mt-8 md:mt-12 text-center text-xs text-white/50">
          <p>
            Tip: If calories differ from macro calories by more than ~5–10%, the label may round values or include fiber/polyols.
          </p>
        </footer>
      </div>
    </div>
  );
}

function LabeledNumber({ label, value, onChange, suffix }) {
  const [internal, setInternal] = useState(String(value ?? ""));
  useEffect(() => setInternal(String(value ?? "")), [value]);

  return (
    <label className="group block">
      <span className="text-xs text-white/60">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-xl bg-white/5 ring-1 ring-white/15 px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-400">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          value={internal}
          onChange={(e) => setInternal(e.target.value)}
          onBlur={() => onChange(parseFloat(internal || "0"))}
          className="w-full bg-transparent placeholder-white/40 text-white focus:outline-none"
          placeholder="0"
        />
        <span className="text-white/50 text-xs select-none">{suffix}</span>
      </div>
    </label>
  );
}

function Stat({ title, value, hint }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-white/5 to-white/0 ring-1 ring-white/10 p-4">
      <p className="text-xs text-white/60">{title}</p>
      <p className="text-lg md:text-2xl font-semibold mt-0.5">{value}</p>
      {hint && <p className="text-xs text-white/40 mt-1">{hint}</p>}
    </div>
  );
}

function MacroPill({ label, pct, color }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs text-white/70">{label}</div>
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }} />
      </div>
      <div className="text-xs text-white/60">{nf(pct, 1)}%</div>
    </div>
  );
}
