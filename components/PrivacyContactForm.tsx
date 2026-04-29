"use client";

import { useState } from "react";
import { submitContactRequest, type RequestType } from "@/lib/supabase/contact";

const REQUEST_TYPES: Array<{ value: RequestType; label: string }> = [
  { value: "access", label: "Data access" },
  { value: "deletion", label: "Data deletion" },
  { value: "correction", label: "Data correction" },
  { value: "other", label: "Other" },
];

export function PrivacyContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [requestType, setRequestType] = useState<RequestType>("access");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const ok = await submitContactRequest({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      request_type: requestType,
      message: message.trim(),
    });

    setLoading(false);
    if (ok) {
      setSubmitted(true);
    } else {
      setError("Something went wrong. Please email hello@yaozhou.me directly.");
    }
  };

  if (submitted) {
    return (
      <div className="bg-teal-light border border-teal/20 rounded-[12px] px-5 py-6">
        <h3 className="font-serif font-bold text-lg text-ink">
          Request received
        </h3>
        <p className="mt-2 font-sans text-sm text-ink/70 leading-relaxed">
          We&apos;ll respond within 30 days, usually much sooner. If
          you don&apos;t hear back, email us directly at{" "}
          <a
            href="mailto:hello@yaozhou.me"
            className="text-teal underline hover:no-underline"
          >
            hello@yaozhou.me
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="block text-[11px] font-sans font-medium text-ink/60 mb-1.5 tracking-wide"
        >
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2.5 rounded-[8px] border border-ink/15 bg-white font-sans text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-teal/20"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-[11px] font-sans font-medium text-ink/60 mb-1.5 tracking-wide"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-3 py-2.5 rounded-[8px] border border-ink/15 bg-white font-sans text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-teal/20"
        />
      </div>

      <div>
        <label
          htmlFor="type"
          className="block text-[11px] font-sans font-medium text-ink/60 mb-1.5 tracking-wide"
        >
          Request type
        </label>
        <select
          id="type"
          value={requestType}
          onChange={(e) => setRequestType(e.target.value as RequestType)}
          className="w-full px-3 py-2.5 rounded-[8px] border border-ink/15 bg-white font-sans text-sm text-ink focus:outline-none focus:ring-2 focus:ring-teal/20"
        >
          {REQUEST_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-[11px] font-sans font-medium text-ink/60 mb-1.5 tracking-wide"
        >
          Message
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you need…"
          className="w-full px-3 py-2.5 rounded-[8px] border border-ink/15 bg-white font-sans text-sm leading-relaxed text-ink placeholder:text-ink/30 resize-y focus:outline-none focus:ring-2 focus:ring-teal/20"
        />
      </div>

      {error && (
        <p className="text-sm font-sans text-coral">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 min-h-[48px] rounded-[12px] bg-[#2563EB] text-white text-sm font-sans font-medium hover:opacity-90 transition-colors disabled:opacity-50"
      >
        {loading ? "Sending\u2026" : "Send request"}
      </button>
    </form>
  );
}
