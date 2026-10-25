import { ProductList } from "../components/ProductList"

export function ProductPage() {
  return (
    <section>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Catálogo</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Explora todos nuestros productos.</p>
      </header>
      <ProductList />
    </section>
  )
}
