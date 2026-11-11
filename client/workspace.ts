import { LIMITS, type Project, type RequestReview } from '../shared/schema';
export function appendReview(project: Project, review: RequestReview): Project {
  if (project.document.hash !== review.documentHash) return project;
  const reviews = [review, ...project.reviews.filter(r => r.id !== review.id)].slice(0, LIMITS.reviews);
  return { ...project, reviews, drafts: project.drafts.filter(d => reviews.some(r => r.id === d.reviewId)) };
}
