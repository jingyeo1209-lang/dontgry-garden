import { CategoryPage, categoryMetadata } from "@/components/CategoryPage";

export const revalidate = 60;
export const metadata = categoryMetadata("ttong");

export default function Page() {
  return <CategoryPage category="ttong" />;
}
