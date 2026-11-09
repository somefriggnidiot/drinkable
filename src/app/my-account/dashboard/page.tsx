import { requirePageMember } from "@/lib/access";
import { pool } from "@/db";
import { Dashboard } from "@/components/dashboard";
export const metadata = { title: "My account" };
export default async function AccountDashboard() {
  const member = await requirePageMember();
  const [bookmarks, owned, submissions, reviews, claims] = await Promise.all([
    pool.query(
      "SELECT b.id,b.name,b.slug FROM bookmark f JOIN brewery b ON b.id=f.brewery_id WHERE f.user_id=$1 AND b.status='published' ORDER BY f.created_at DESC",
      [member.id],
    ),
    pool.query(
      "SELECT b.id,b.name,b.slug,b.status FROM ownership o JOIN brewery b ON b.id=o.brewery_id WHERE o.user_id=$1 ORDER BY b.name",
      [member.id],
    ),
    pool.query(
      "SELECT id,name,slug,status FROM brewery WHERE submitted_by=$1 ORDER BY created_at DESC",
      [member.id],
    ),
    pool.query(
      "SELECT r.id,r.message,r.hidden,b.name,b.slug FROM review r JOIN brewery b ON b.id=r.brewery_id WHERE r.user_id=$1 ORDER BY r.updated_at DESC",
      [member.id],
    ),
    pool.query(
      "SELECT c.id,c.status,b.name FROM claim c JOIN brewery b ON b.id=c.brewery_id WHERE c.user_id=$1 ORDER BY c.created_at DESC",
      [member.id],
    ),
  ]);
  return (
    <Dashboard
      member={member}
      bookmarks={bookmarks.rows}
      owned={owned.rows}
      submissions={submissions.rows}
      reviews={reviews.rows}
      claims={claims.rows}
    />
  );
}
