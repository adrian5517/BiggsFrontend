
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FaUser, FaEnvelope, FaPhone, FaUsers, FaStickyNote, FaStore } from 'react-icons/fa';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

interface Branch {
  id: number;
  title: string;
}


const SampleBookingForm = ({ preselectedBranchId = '' }: { preselectedBranchId?: string }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  // Always use Asia/Manila timezone for date
  const manilaToday = dayjs().tz('Asia/Manila').format('YYYY-MM-DD');
  const [form, setForm] = useState({
    slot_id: '',
    branch_id: preselectedBranchId,
    promo_id: '',
    user_name: '',
    user_email: '',
    user_phone: '',
    // party_size: 1, // Removed party size from form state
    note: '',
    date: manilaToday,
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch branches from backend
    fetch('/api/booking/public/branches')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBranches(data);
        else if (Array.isArray(data.branches)) setBranches(data.branches);
      });
  }, []);

  // Fetch promos for selected branch
  useEffect(() => {
    if (!form.branch_id) {
      setPromos([]);
      setSlots([]);
      return;
    }
    fetch(`/api/booking/public/promos?branch_id=${form.branch_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPromos(data);
        else if (Array.isArray(data.promos)) setPromos(data.promos);
        else setPromos([]);
      });
  }, [form.branch_id]);

  // Fetch slots for selected branch and date
  useEffect(() => {
    if (!form.branch_id || !form.date) {
      setSlots([]);
      return;
    }
    fetch(`/api/booking/public/slots?branch_id=${form.branch_id}&date=${form.date}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSlots(data);
        else if (Array.isArray(data.slots)) setSlots(data.slots);
        else setSlots([]);
      });
  }, [form.branch_id, form.date]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, branch_id: preselectedBranchId }));
  }, [preselectedBranchId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Debug: log the date value on every change
    if (name === 'date') {
      console.log('[BookingForm] User selected date:', value);
    }
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Remove party_size from submission
      const { party_size, ...formWithoutPartySize } = form as any;
      // Debug: log the date value being submitted
      console.log('[BookingForm] Submitting booking with date:', formWithoutPartySize.date);
      const res = await fetch('/api/booking/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formWithoutPartySize),
      });
      if (!res.ok) throw new Error('Booking failed');
      setSubmitted(true);
      toast.success('Booking submitted!');
    } catch (err) {
      setError('Booking failed. Please try again.');
      toast.error('Booking failed. Please try again.');
    }
  };

  if (submitted) return <div className="p-8 text-center text-green-600">Booking submitted! Check your email for confirmation.</div>;

  return (
    <form className="max-w-lg mx-auto p-8 bg-white rounded-xl shadow space-y-4" onSubmit={handleSubmit}>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><FaStore className="text-blue-600" /> Sample Booking</h2>
      <div className="mb-2">
        <label className="block mb-1 font-medium">Select Branch</label>
        <select name="branch_id" value={form.branch_id} onChange={handleChange} required className="w-full border p-2 rounded bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Choose a branch</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.title}</option>
          ))}
        </select>
      </div>
      <div className="mb-2">
        <label className="block mb-1 font-medium">Select Date</label>
        <input type="date" name="date" value={form.date} min={manilaToday} onChange={handleChange} className="w-full border p-2 rounded bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
      </div>
      <div className="mb-2">
        <label className="block mb-1 font-medium">Select Promo</label>
        <select name="promo_id" value={form.promo_id} onChange={handleChange} required className="w-full border p-2 rounded bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Choose a promo</option>
          {promos.map((p) => (
            <option key={p.id} value={p.id}>{`${p.title} (${p.min_size}-${p.max_size} pax) - ₱${p.price}`}</option>
          ))}
        </select>
      </div>
      <div className="mb-2">
        <label className="block mb-1 font-medium">Select Slot</label>
        <select name="slot_id" value={form.slot_id} onChange={handleChange} required className="w-full border p-2 rounded bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Choose a slot</option>
          {slots.map((s) => (
            <option key={s.id} value={s.id}>
              {`Time: ${s.time_start} - ${s.time_end}`}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 mb-2">
        <span className="flex items-center bg-gray-100 px-2 rounded"><FaUser /></span>
        <input name="user_name" placeholder="Your Name" className="w-full border p-2 rounded bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.user_name} onChange={handleChange} required />
      </div>
      <div className="flex gap-2 mb-2">
        <span className="flex items-center bg-gray-100 px-2 rounded"><FaEnvelope /></span>
        <input name="user_email" placeholder="Email" className="w-full border p-2 rounded bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.user_email} onChange={handleChange} required />
      </div>
      <div className="flex gap-2 mb-2">
        <span className="flex items-center bg-gray-100 px-2 rounded"><FaPhone /></span>
        <input name="user_phone" placeholder="Phone" className="w-full border p-2 rounded bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.user_phone} onChange={handleChange} required />
      </div>
      {/* Party size selection removed */}
      <div className="flex gap-2 mb-2">
        <span className="flex items-center bg-gray-100 px-2 rounded"><FaStickyNote /></span>
        <textarea name="note" placeholder="Note (optional)" className="w-full border p-2 rounded bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.note} onChange={handleChange} />
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2">
        <FaStore /> Submit Booking
      </button>
    </form>
  );
};

export default SampleBookingForm;
