import type {
  Product,
  ProductDetailsPage,
  ProductListingPage,
} from "../../commerce/types.ts";
import { STALE } from "../../utils/fetch.ts";
import type { RequestURLParam } from "../../website/functions/requestToParam.ts";
import { AppContext } from "../mod.ts";

import { getBreadCrumbs, toProduct } from "../utils/transform.ts";
import { NuvemShopSort, ProductBaseNuvemShop } from "../utils/types.ts";

export interface Props {
  /**
   * @description overides the query term
   */
  term?: string;
  /**
   * @title Items per page
   * @description number of products per page to display
   */
  limit: number;
  // Sort in NuvemShort do not work when using q in query params
  // sort?: NuvemShopSort;
}

/**
 * @title NuvemShop Integration - Product Listing Page
 */
async function loader(
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<ProductListingPage | null> {
  const { api } = ctx;
  const { url: baseUrl } = req;
  const url = new URL(baseUrl);

  const per_page = props.limit ?? 10;
  const page = Number(url.searchParams.get("page")) || 0;

  const minPrice = url.searchParams.get("min_price");
  const maxPrice = url.searchParams.get("max_price");

  // Sort in NuvemShort do not work when using q in query params
  // const sort = props.sort || url.searchParams.get("sort") as NuvemShopSort;

  let q = props.term || url.searchParams.get("q") ||
    decodeURIComponent(url.pathname) ||
    undefined;

  q = q?.replace("/", "");

  let result: ProductBaseNuvemShop[] | undefined;

  try {
    const response = await api["GET /products/"]({
      q: q,
      page,
      per_page,
      price_max: maxPrice,
      price_min: minPrice,
    });
    result = await response.json();
  } catch {
    result = [];
  }

  const products = result?.map((product) => {
    return [...toProduct(product, new URL(req.url), null)];
  }).flat();

  const nextPage = new URLSearchParams(url.searchParams);
  nextPage.set("page", (page + 1).toString());

  const previousPage = new URLSearchParams(url.searchParams);
  previousPage.set("page", (page - 1).toString());

  return {
    "@type": "ProductListingPage",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          name: q || "",
          item: `${q}`,
          position: 1,
        },
      ],
      numberOfItems: 1,
    },
    products: products ?? [],
    pageInfo: {
      nextPage: `?${nextPage}`,
      previousPage: `?${previousPage}`,
      currentPage: page,
    },
    // sortOptions: NUVEMSHOP_SORT_OPTIONS, Sort in NuvemShort do not work when using q in query params
    sortOptions: [],
    // filters: toFilters(
    //   result || [],
    //   typeof minPrice === "number" ? minPrice : parseFloat(minPrice || "0"),
    //   typeof maxPrice === "number" ? maxPrice : parseFloat(maxPrice || "0"),
    //   req.url,
    // ),
    filters: [], // NuvemShop right now don't receive product variant query params in products route
  };
}

export default loader;
