import React, { useState, useMemo } from "react";
import { Eye, EyeOff, Shield, Check, X, Zap, Lock, AlertTriangle } from "lucide-react";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;500;600;700&display=swap');`;

const COMMON_PASSWORDS = [
  "password", "123456", "12345678", "qwerty", "letmein", "admin",
  "welcome", "monkey", "dragon", "football", "iloveyou", "master",
  "sunshine", "princess", "abc123", "password1", "123456789", "111111",
];

const SEQUENCES = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

const POLICIES = [
  {
    id: "nist",
    label: "NIST SP 800-63B",
    minLength: 8,
    requireClasses: 0,
    blockCommon: true,
    blockRepeats: false,
    note: "Length over complexity. No forced rotation, no arbitrary composition rules.",
  },
  {
    id: "iso",
    label: "ISO/IEC 27001",
    minLength: 10,
    requireClasses: 3,
    blockCommon: true,
    blockRepeats: true,
    note: "Requires length plus mixed character classes and no dictionary terms.",
  },
  {
    id: "pci",
    label: "PCI DSS 4.0",
    minLength: 12,
    requireClasses: 3,
    blockCommon: true,
    blockRepeats: true,
    note: "Strict minimum length with full complexity and breach-list screening.",
  },
];

function hasSequence(pw) {
  const lower = pw.toLowerCase();
  for (const seq of SEQUENCES) {
    for (let i = 0; i <= seq.length - 4; i++) {
      const fwd = seq.slice(i, i + 4);
      const rev = fwd.split("").reverse().join("");
      if (lower.includes(fwd) || lower.includes(rev)) return true;
    }
  }
  return false;
}

function hasRepeats(pw) {
  return /(.)\1\1/.test(pw);
}

function isCommon(pw) {
  const lower = pw.toLowerCase();
  return COMMON_PASSWORDS.some((c) => lower.includes(c));
}

function poolSize(pw) {
  let n = 0;
  if (/[a-z]/.test(pw)) n += 26;
  if (/[A-Z]/.test(pw)) n += 26;
  if (/[0-9]/.test(pw)) n += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) n += 32;
  return n || 1;
}

function formatCrackTime(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return "INSTANT";
  const units = [
    ["century", 3153600000],
    ["year", 31536000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [label, size] of units) {
    if (seconds >= size) {
      const val = seconds / size;
      const display = val >= 1000 ? val.toExponential(1) : val.toFixed(val < 10 ? 1 : 0);
      return `${display} ${label}${val >= 2 ? "s" : ""}`;
    }
  }
  return "INSTANT";
}

function analyze(pw, policy) {
  const rules = [
    { id: "length", label: `Minimum ${policy.minLength} characters`, pass: pw.length >= policy.minLength },
    { id: "upper", label: "Contains uppercase letter", pass: /[A-Z]/.test(pw) },
    { id: "lower", label: "Contains lowercase letter", pass: /[a-z]/.test(pw) },
    { id: "digit", label: "Contains a digit", pass: /[0-9]/.test(pw) },
    { id: "symbol", label: "Contains a symbol", pass: /[^a-zA-Z0-9]/.test(pw) },
    { id: "common", label: "Not a common/breached password", pass: pw.length > 0 && !isCommon(pw) },
    { id: "sequence", label: "No sequential character runs", pass: pw.length > 0 && !hasSequence(pw) },
    { id: "repeat", label: "No 3+ repeated characters", pass: pw.length > 0 && !hasRepeats(pw) },
  ];

  const pool = poolSize(pw);
  const entropy = pw.length > 0 ? +(pw.length * Math.log2(pool)).toFixed(1) : 0;
  const guesses = Math.pow(pool, pw.length);
  const crackSeconds = guesses / 1e10; // offline fast-hash assumption
  const crackTime = pw.length > 0 ? formatCrackTime(crackSeconds) : "—";

  const activeRuleIds = ["length", "common"];
  if (policy.requireClasses >= 3) activeRuleIds.push("upper", "lower", "digit", "symbol");
  if (policy.blockRepeats) activeRuleIds.push("repeat");
  activeRuleIds.push("sequence");

  const relevantRules = rules.filter((r) => activeRuleIds.includes(r.id));
  const passedCount = relevantRules.filter((r) => r.pass).length;
  const compliant = pw.length > 0 && passedCount === relevantRules.length;

  const scoreBase = pw.length === 0 ? 0 : Math.min(100, Math.round((entropy / 80) * 100));
  let score = scoreBase;
  if (isCommon(pw)) score = Math.min(score, 15);
  if (hasSequence(pw) && pw.length > 0) score = Math.max(0, score - 20);

  let verdict = "NO INPUT";
  let verdictColor = "#0a0a0a";
  let verdictBg = "#eceae3";
  if (pw.length > 0) {
    if (score < 30) { verdict = "WEAK"; verdictColor = "#0a0a0a"; verdictBg = "#ff5b52"; }
    else if (score < 60) { verdict = "MODERATE"; verdictColor = "#0a0a0a"; verdictBg = "#ffc23c"; }
    else if (score < 85) { verdict = "STRONG"; verdictColor = "#0a0a0a"; verdictBg = "#8ce07a"; }
    else { verdict = "VERY STRONG"; verdictColor = "#0a0a0a"; verdictBg = "#4fd67e"; }
  }

  return { rules, relevantRules, passedCount, entropy, crackTime, compliant, score, verdict, verdictColor, verdictBg };
}

const SAMPLES = [
  { label: "Weak", value: "password123" },
  { label: "Common", value: "Qwerty12" },
  { label: "Sequential", value: "Abcd1234!" },
  { label: "Compliant", value: "Tr0ub4dor&Kite91" },
];

const INK = "#0a0a0a";
const PAPER = "#fbfaf6";
const PANEL = "#ffffff";
const ACCENT = "#ff6a1a";
const MUTED = "#6b6f76";

const boxShadow = "5px 5px 0 " + INK;
const boxShadowSm = "3px 3px 0 " + INK;
const borderHard = `2.5px solid ${INK}`;

function Panel({ children, style = {} }) {
  return (
    <div
      style={{
        background: PANEL,
        border: borderHard,
        boxShadow: boxShadow,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <div style={{ width: 10, height: 10, background: INK }} />
      <div
        style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: 15,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function PasswordPolicyAnalyzer() {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [policyId, setPolicyId] = useState("nist");

  const policy = POLICIES.find((p) => p.id === policyId);
  const result = useMemo(() => analyze(pw, policy), [pw, policy]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PAPER,
        backgroundImage: `radial-gradient(${INK}22 1.5px, transparent 1.5px)`,
        backgroundSize: "22px 22px",
        color: INK,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <style>{FONT_IMPORT}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "36px 20px 60px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
            paddingBottom: 18,
            marginBottom: 24,
            borderBottom: borderHard,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Zap size={34} color={ACCENT} strokeWidth={2.5} fill={ACCENT} />
            <div>
              <div
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: 30,
                  lineHeight: 1,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  textShadow: `3px 3px 0 ${INK}22`,
                }}
              >
                Password <span style={{ color: ACCENT, WebkitTextStroke: `1px ${INK}` }}>Policy</span> Analyzer
              </div>
              <div style={{ fontSize: 11, color: MUTED, letterSpacing: 1, textTransform: "uppercase", marginTop: 6 }}>
                Local · Entropy &amp; Compliance Scoring · No API Required
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: INK,
              color: PAPER,
              padding: "8px 14px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              boxShadow: boxShadowSm,
              border: borderHard,
            }}
          >
            <AlertTriangle size={13} /> LOCAL ONLY
          </div>
        </div>

        {/* Stat boxes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Strength Score", value: pw ? `${result.score}/100` : "—" },
            { label: "Entropy (bits)", value: pw ? result.entropy : "—" },
            { label: "Time to Crack", value: result.crackTime },
            { label: "Rules Passed", value: pw ? `${result.passedCount}/${result.relevantRules.length}` : "—" },
          ].map((s) => (
            <Panel key={s.label} style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{s.label}</div>
            </Panel>
          ))}
        </div>

        {/* Policy selector */}
        <Panel style={{ padding: 18, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Policy
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            {POLICIES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPolicyId(p.id)}
                style={{
                  padding: "9px 16px",
                  border: borderHard,
                  boxShadow: policyId === p.id ? boxShadowSm : "none",
                  background: policyId === p.id ? ACCENT : PAPER,
                  color: INK,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  cursor: "pointer",
                  transform: policyId === p.id ? "translate(-2px,-2px)" : "none",
                  transition: "transform 0.1s ease",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: MUTED }}>{policy.note}</div>
        </Panel>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20 }}>
          {/* Left: input + rules */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Panel style={{ padding: 18 }}>
              <SectionTitle>Test Password</SectionTitle>
              <div style={{ position: "relative" }}>
                <input
                  type={show ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Type or paste a password..."
                  style={{
                    width: "100%",
                    background: PAPER,
                    border: borderHard,
                    padding: "12px 42px 12px 12px",
                    color: INK,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={() => setShow((s) => !s)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: INK, cursor: "pointer" }}
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: MUTED }}>TRY:</span>
                {SAMPLES.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setPw(s.value)}
                    style={{
                      fontSize: 11,
                      padding: "6px 10px",
                      border: `1.5px solid ${INK}`,
                      background: PAPER,
                      color: INK,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel style={{ padding: 18 }}>
              <SectionTitle>Rule Checklist — {policy.label}</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.relevantRules.map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        flexShrink: 0,
                        border: `1.5px solid ${INK}`,
                        background: pw ? (r.pass ? "#8ce07a" : "#ff5b52") : PAPER,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {r.pass ? <Check size={13} color={INK} strokeWidth={3} /> : <X size={13} color={pw ? INK : "#c9c6bd"} strokeWidth={3} />}
                    </div>
                    <span style={{ color: pw ? INK : "#a5a29a" }}>{r.label}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* Right: verdict panel */}
          <Panel style={{ padding: 22, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                border: borderHard,
                background: result.verdictBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={32} color={INK} strokeWidth={2} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: 26,
                  color: INK,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                {result.verdict}
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                Overall Assessment
              </div>
            </div>

            <div style={{ width: "100%", height: 14, background: PAPER, border: `1.5px solid ${INK}`, overflow: "hidden" }}>
              <div style={{ width: `${result.score}%`, height: "100%", background: ACCENT, transition: "width 0.3s ease", borderRight: result.score > 0 && result.score < 100 ? `1.5px solid ${INK}` : "none" }} />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 14px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.5,
                background: pw.length === 0 ? PAPER : result.compliant ? "#8ce07a" : "#ff5b52",
                color: INK,
                border: borderHard,
              }}
            >
              <Zap size={13} />
              {pw.length === 0 ? "AWAITING INPUT" : result.compliant ? `${policy.label} COMPLIANT` : `FAILS ${policy.label}`}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
