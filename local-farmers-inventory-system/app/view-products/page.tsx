import ProductOverview from "../../src/components/ProductOverview.jsx";

export default async function ViewProductsPage() {
  // ProductOverview is a client component that fetches its own data.
  // We intentionally render it as a standalone section to keep the "View Products" page focused.
  return (
    <div>
      <ProductOverview />
    </div>
  );
}
