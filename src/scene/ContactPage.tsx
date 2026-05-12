import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const body = new URLSearchParams();
      body.set("form-name", "contact");
      body.set("email", email);
      body.set("message", message);
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
      setEmail("");
      setMessage("");
    } catch (err) {
      console.warn("[contact] submit failed:", err);
      setStatus("error");
    }
  };

  const disabled = status === "sending";
  const inputCls =
    "bg-white/40 border border-[#3B362C] px-2 py-1 text-[16px] outline-none focus:bg-white/70 disabled:opacity-60";

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex gap-3 items-start">
        <img
          src="/images/contact_portrait.webp"
          alt=""
          className="w-44 h-44 object-cover border-2 border-[#3B362C] flex-shrink-0"
          draggable={false}
        />
        <div className="space-y-2 flex-1 min-w-0">
          <p className="text-[20px] font-bold">CONTACT</p>
          <p className="break-all">email: robinsongermain@gmail.com</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-1.5" name="contact">
        <input
          type="email"
          name="email"
          required
          placeholder="your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={disabled}
          className={inputCls}
        />
        <textarea
          name="message"
          required
          rows={3}
          placeholder="say something"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={disabled}
          className={`${inputCls} resize-none`}
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={disabled}
            className="px-3 py-1 bg-[#B5483B] text-[#F5F1E5] border border-[#3B362C] hover:bg-[#9c3e33] disabled:opacity-60"
          >
            {status === "sending" ? "sending..." : "send"}
          </button>
          {status === "sent" && <span className="text-[14px]">sent!</span>}
          {status === "error" && (
            <span className="text-[14px] text-[#B5483B]">error — try again</span>
          )}
        </div>
      </form>
    </div>
  );
}
