'use client';
import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { MessageCircle, Pencil, Star } from 'lucide-react';
import { Link, usePathname } from '@/i18n/routing';
import { getReviews, createReview, setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import type { ReviewResponse } from '@/types/review';

const empty:ReviewResponse={data:[],meta:{total:0,average:0,distribution:{}}};
export default function TraditionalProductReviews({productId,onReviewSubmitted,initialReviews}:{productId:string;onReviewSubmitted?:()=>void;initialReviews?:ReviewResponse}) {
  const pathname=usePathname();
  const locale=useLocale(), en=locale!=='vi', t=(vi:string,english:string)=>en?english:vi;
  const [data,setData]=useState(initialReviews || empty), [loading,setLoading]=useState(!initialReviews);
  const {user,session}=useAuth();
  const [showForm,setShowForm]=useState(false), [rating,setRating]=useState(5), [comment,setComment]=useState('');
  const [submitting,setSubmitting]=useState(false), [error,setError]=useState<string|null>(null), [success,setSuccess]=useState(false);
  const meta=data.meta || empty.meta, reviews=data.data || [];
  useEffect(()=>{if(initialReviews)return;let active=true;getReviews(productId).then(result=>{if(active){setData(result);setLoading(false);}});return()=>{active=false;};},[productId,initialReviews]);
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();if(!user || submitting)return;setSubmitting(true);setError(null);
    try {if(session?.access_token)setAccessToken(session.access_token);await createReview(productId,rating,comment.trim());setData(await getReviews(productId));onReviewSubmitted?.();setSuccess(true);setComment('');setRating(5);setShowForm(false);}
    catch(err){const message=err instanceof Error?err.message:'';setError(message.includes('already reviewed')||message.includes('đã đánh giá')?t('Bạn đã đánh giá sản phẩm này trước đó.','You have already reviewed this product.'):message || t('Chưa thể gửi đánh giá. Vui lòng thử lại.','Could not submit your review. Please try again.'));}finally{setSubmitting(false);}
  };
  const stars=(count:number)=><span className="pd-review-stars" role="img" aria-label={t(`${count} trên 5 sao`,`${count} out of 5 stars`)}>{[1,2,3,4,5].map(star=><Star key={star} size={16} aria-hidden="true" fill={star<=count?'currentColor':'none'}/>)}</span>;
  if(loading)return <p className="pd-review-loading" role="status">{t('Đang tải đánh giá…','Loading reviews…')}</p>;
  return <div className="pd-reviews">
    <div className="pd-reviews-heading"><div><h3>{t('Đánh giá từ khách hàng','Customer reviews')}</h3><p>{meta.total?t(`${meta.total} chia sẻ về sản phẩm`,`${meta.total} customer reviews`):t('Chia sẻ cảm nhận của bạn về sản phẩm này.','Share your experience with this product.')}</p></div><button type="button" className="pd-review-write" aria-expanded={showForm} aria-controls="review-form-panel" onClick={()=>setShowForm(!showForm)}><Pencil size={16}/>{showForm?t('Đóng biểu mẫu','Close form'):t('Viết đánh giá','Write a review')}</button></div>
    {success && <p className="pd-review-success" role="status">{t('Cảm ơn bạn! Đánh giá đã được gửi thành công.','Thank you! Your review has been submitted.')}</p>}
    {showForm && <div className="pd-review-form-panel" id="review-form-panel"><h4>{t('Chia sẻ trải nghiệm của bạn','Share your experience')}</h4>{!user?<p className="pd-review-signin"><Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>{t('Đăng nhập để viết đánh giá','Sign in to write a review')}</Link></p>:<form onSubmit={submit}>
      {error && <p className="pd-review-error" role="alert">{error}</p>}
      <fieldset className="pd-review-rating"><legend>{t('Đánh giá của bạn','Your rating')}</legend><div>{[1,2,3,4,5].map(star=><label key={star}><input type="radio" name="review-rating" value={star} checked={rating===star} onChange={()=>setRating(star)}/><span aria-hidden="true"><Star size={26} fill={star<=rating?'currentColor':'none'}/></span><span className="sr-only">{star} {t('sao','stars')}</span></label>)}</div></fieldset>
      <label className="pd-review-label" htmlFor="review-comment">{t('Nội dung đánh giá','Your review')}</label><textarea id="review-comment" value={comment} onChange={e=>setComment(e.target.value)} required maxLength={3000} rows={4} placeholder={t('Bạn cảm thấy thế nào về sản phẩm này?','How was your experience with this product?')}/><button className="shop-btn pd-review-submit" type="submit" disabled={submitting||!comment.trim()}>{submitting?t('Đang gửi…','Submitting…'):t('Gửi đánh giá','Submit review')}</button>
    </form>}</div>}
    {meta.total>0?<><div className="pd-review-summary"><div className="pd-review-average"><strong>{Number(meta.average||0).toFixed(1)}</strong><div>{stars(Math.round(Number(meta.average)||0))}<p>{t('trên 5','out of 5')} · {meta.total} {t('đánh giá','reviews')}</p></div></div><div className="pd-review-distribution" aria-label={t('Phân bố đánh giá','Rating distribution')}>{[5,4,3,2,1].map(star=>{const count=Number(meta.distribution?.[star]||0);return <div key={star} aria-label={t(`${star} sao: ${count} đánh giá`,`${star} stars: ${count} reviews`)}><span>{star}<Star size={12} fill="currentColor"/></span><span className="pd-review-track"><span style={{width:`${Math.min(100,Math.max(0,count/meta.total*100))}%`}}/></span><span>{count}</span></div>;})}</div></div><div className="pd-review-list">{reviews.map(review=><article className="pd-review-item" key={review.id}><div className="pd-review-avatar">{review.user?.avatar_url?<Image src={review.user.avatar_url} alt="" width={44} height={44}/>: (review.user?.full_name||'K').charAt(0).toUpperCase()}</div><div className="pd-review-body"><div className="pd-review-item-heading"><strong>{review.user?.full_name || t('Khách hàng','Customer')}</strong><time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString(en?'en-GB':'vi-VN',{year:'numeric',month:'long',day:'numeric'})}</time></div>{stars(review.rating)}{review.comment && <p>{review.comment}</p>}</div></article>)}</div></>:<div className="pd-review-empty"><span><MessageCircle size={22}/></span><div><h4>{t('Chưa có đánh giá nào','No reviews yet')}</h4><p>{t('Hãy là người đầu tiên chia sẻ cảm nhận về sản phẩm.','Be the first to share your experience.')}</p></div></div>}
  </div>;
}
