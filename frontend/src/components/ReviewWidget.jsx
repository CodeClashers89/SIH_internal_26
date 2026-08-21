import React, { useState, useEffect } from 'react';
import { Star, MessageSquareCode, Loader2, Sparkles } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ReviewWidget = ({ farmerId }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/reviews/?farmer=${farmerId}`);
      setReviews(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (farmerId) {
      fetchReviews();
    }
  }, [farmerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await api.post('/reviews/', {
        farmer: farmerId,
        rating,
        comment
      });
      setReviews([response.data, ...reviews]);
      setComment('');
      setRating(5);
    } catch (err) {
      setError(err.response?.data?.non_field_errors?.[0] || err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg text-slate-800">Farmer Reviews & Ratings</h3>
          <p className="text-xs text-slate-500">Feedback from retail consumers and wholesale bulk buyers.</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-amber-500 justify-end">
            <Star className="h-5 w-5 fill-amber-400 stroke-none" />
            <span className="font-extrabold text-lg text-slate-800">{getAverageRating()}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">{reviews.length} reviews total</span>
        </div>
      </div>

      {/* Review Submission Form for Consumers/Buyers */}
      {user && ['consumer', 'bulk_buyer'].includes(user.role) && (
        <form onSubmit={handleSubmit} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Write a Review</h4>
          
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 mr-2">Rating:</span>
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setRating(num)}
                className="text-amber-500 hover:scale-110 transition-transform"
              >
                <Star className={`h-5 w-5 ${num <= rating ? 'fill-amber-400 stroke-none' : 'text-slate-300'}`} />
              </button>
            ))}
          </div>

          <div>
            <textarea
              rows="2"
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the crop quality? Was shipping scheduled correctly?"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-all flex items-center gap-1"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Submit Feedback'}
          </button>
        </form>
      )}

      {/* Reviews list */}
      <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center py-6 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : reviews.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No reviews recorded yet for this farmer.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600">
                    {r.reviewer_details?.username?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 capitalize">{r.reviewer_details?.username}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded capitalize">
                    {r.reviewer_details?.role?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center text-amber-500">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 stroke-none" />
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-500 pl-7 leading-relaxed">{r.comment}</p>
              <span className="text-[9px] text-slate-400 pl-7">{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewWidget;
