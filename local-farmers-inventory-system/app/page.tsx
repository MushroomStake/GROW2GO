
import InventoryDashboard from "../src/components/InventoryDashboard.jsx";
import apiService from "../src/services/api";

export default async function Home() {
  // Fetch products and categories from Supabase
  const products = await apiService.getProducts();
  const categories = await apiService.getCategories();

  // Handler stubs for demo (replace with actual logic or API calls)
  const handleAddProduct = async (product: any) => {
    await apiService.createProduct(product);
  };
  const handleUpdateProduct = async (id: string | number, product: any) => {
    await apiService.updateProduct(id, product);
  };
  const handleDeleteProduct = async (id: string | number) => {
    await apiService.deleteProduct(id);
  };

  return (
    <InventoryDashboard
      products={products}
      categories={categories}
    />
  );
}
