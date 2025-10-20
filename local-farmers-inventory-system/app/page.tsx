
import dynamic from 'next/dynamic';
import ProductOverview from '../src/components/ProductOverview.jsx';
const RecoveryRedirect = dynamic(() => import('../src/components/RecoveryRedirect.jsx'), { ssr: false });
import apiService from "../src/services/api";

export default async function Home() {
  // Fetch products and categories from Supabase for the product overview
  const products = await apiService.getProducts();
  const categories = await apiService.getCategories();

  return (
    <>
      <RecoveryRedirect />
      <ProductOverview />
    </>
  );
}
